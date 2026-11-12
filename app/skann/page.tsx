'use client'

import { useT } from '@/components/I18n'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGate, { useSession } from '@/components/AuthGate'
import BarcodeScanner from '@/components/BarcodeScanner'
import { CameraIcon, Logo, LogoMark } from '@/components/Icons'
import { supabase } from '@/lib/supabase-browser'
import { compressImage, FamilyProfile, postScan, storeGet, storeSet } from '@/lib/client'
import { animalFor, Avatar, Mascot, ModeArt } from '@/components/Art'
import RecallBanner from '@/components/RecallBanner'
import { KidScan, getKidMode } from '@/components/KidMode'

type Mode = 'barcode' | 'label' | 'food' | 'menu' | 'product'

// Tekster: mode.<id>, mode.<id>.hint, mode.<id>.busy, mode.<id>.photo i språkfilene.
const MODES: { id: Mode }[] = [{ id: 'barcode' }, { id: 'label' }, { id: 'food' }, { id: 'menu' }, { id: 'product' }]

function PenReminder({ profiles }: { profiles: FamilyProfile[] }) {
  const { t, locale } = useT()
  const soon = profiles.filter((p) => p.epipen_expiry && new Date(p.epipen_expiry).getTime() - Date.now() < 30 * 864e5)
  if (!soon.length) return null
  return (
    <div className="stack" style={{ gap: 8 }}>
      {soon.map((p) => {
        const past = new Date(p.epipen_expiry!).getTime() < Date.now()
        return (
          <Link key={p.id} href={`/profiler?id=${p.id}`} className="pen-note">
            💉 {t(past ? 'pen.expired' : 'pen.soon', { name: p.name, date: new Date(p.epipen_expiry!).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })}
          </Link>
        )
      })}
    </div>
  )
}

function Scan() {
  const [kid, setKid] = useState<ReturnType<typeof getKidMode>>(null)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    setKid(getKidMode())
    setChecked(true)
  }, [])
  if (!checked) return null
  if (kid) return <KidScan kid={kid} />
  return <FullScan />
}

function FullScan() {
  const router = useRouter()
  const { t, lang } = useT()
  const session = useSession()
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const [profiles, setProfiles] = useState<FamilyProfile[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('barcode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase()
      .from('family_links')
      .select('parent_email')
      .eq('child_id', session.user.id)
      .then(({ data }) => setSharedWith([...new Set((data ?? []).map((l: { parent_email: string | null }) => l.parent_email ?? t('aParent')))]))
  }, [session.user.id])

  useEffect(() => {
    supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms, conditions, avatar, photo, epipen_expiry')
      .order('created_at')
      .then(({ data }) => {
        const list = (data ?? []) as FamilyProfile[]
        setProfiles(list)
        let saved: string[] = []
        try {
          saved = JSON.parse(storeGet('okei.profiles') ?? '[]')
        } catch {
          saved = []
        }
        const valid = saved.filter((id) => list.some((p) => p.id === id))
        setSelected(valid.length ? valid : list[0] ? [list[0].id] : [])
        const savedMode = storeGet('okei.mode') as Mode | null
        if (savedMode && MODES.some((m) => m.id === savedMode)) setMode(savedMode)
      })
  }, [])

  function saveSelection(next: string[]) {
    setSelected(next)
    storeSet('okei.profiles', JSON.stringify(next))
  }

  function toggleProfile(id: string) {
    if (selected.includes(id)) {
      if (selected.length > 1) saveSelection(selected.filter((x) => x !== id))
    } else {
      saveSelection([...selected, id])
    }
  }

  function toggleAll() {
    if (!profiles) return
    const all = profiles.map((p) => p.id)
    saveSelection(selected.length === all.length ? [all[0]] : all)
  }

  function pickMode(m: Mode) {
    setMode(m)
    setError('')
    storeSet('okei.mode', m)
  }

  async function run(body: Record<string, unknown>) {
    if (!selected.length) return
    setBusy(true)
    setError('')
    try {
      const res = await postScan({ ...body, mode, profileIds: selected, lang })
      router.push(`/resultat/${res.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err.generic'))
      setBusy(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const img = await compressImage(file)
      await run({ image: img.data, mediaType: img.mediaType })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('err.image'))
    }
  }

  if (profiles === null) {
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label={t('loading')} />
      </main>
    )
  }

  if (!profiles.length) {
    return (
      <main className="page center">
        <Logo />
        <div style={{ alignSelf: 'center' }}><Mascot mood="wave" size={150} /></div>
        <h1>{t('scan.whoFirst')}</h1>
        <p className="muted">{t('scan.noProfiles')}</p>
        <Link className="btn btn-primary" href="/profiler?ny=1">{t('scan.firstProfile')}</Link>
      </main>
    )
  }


  return (
    <main className="page scan-page">
      <div className="scan-who" role="group" aria-label={t('scan.who')}>
        <div className="chip-scroll">
          {profiles.length > 1 && (
            <button className="who-chip" aria-pressed={selected.length === profiles.length} onClick={toggleAll}>
              <span className="family-stack" aria-hidden="true">
                {profiles.slice(0, 3).map((p, i) => (
                  <Avatar key={p.id} photo={p.photo} id={animalFor(p.avatar, i)} size={22} />
                ))}
              </span>
              {t('scan.all')}
            </button>
          )}
          {profiles.map((p, i) => (
            <button key={p.id} className="who-chip" aria-pressed={selected.includes(p.id)} onClick={() => toggleProfile(p.id)}>
              <Avatar photo={p.photo} id={animalFor(p.avatar, i)} size={26} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {sharedWith.length > 0 && (
        <p className="share-line">
          <span aria-hidden="true">👀</span> {t('scan.sharedWith', { names: sharedWith })}
        </p>
      )}

      <RecallBanner />
      <PenReminder profiles={profiles} />

      <div className="mode-bar" role="group" aria-label={t('scan.what')}>
        {MODES.map((m) => (
          <button key={m.id} className={`mode-btn ${m.id}`} aria-pressed={m.id === mode} aria-label={t(`mode.${m.id}`)} onClick={() => pickMode(m.id)}>
            <ModeArt mode={m.id} size={28} />
            <span>{t(`mode.${m.id}.short`)}</span>
          </button>
        ))}
      </div>

      <div className="scan-stage">
      <span className="cam-logo" aria-hidden="true"><LogoMark size={22} />Okei</span>
      {busy ? (
        <div className="camera scan-fill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#fff' }}>
          <div className="bob"><Mascot mood="unsure" size={120} /></div>
          <span style={{ fontWeight: 600 }}>{t(`mode.${mode}.busy`)}</span>
        </div>
      ) : mode === 'barcode' ? (
        <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} fill />
      ) : (
        <>
          <button className={`photo-drop scan-fill ${mode}`} onClick={() => fileRef.current?.click()}>
            <span className="photo-art"><ModeArt mode={mode} size={84} /></span>
            <span className="photo-cta"><CameraIcon /></span>
            {t(`mode.${mode}.photo`)}
            <span className="photo-hint">{t(`mode.${mode}.hint`)}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </>
      )}
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Scan />
    </AuthGate>
  )
}
