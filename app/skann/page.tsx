'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGate, { useSession } from '@/components/AuthGate'
import BarcodeScanner from '@/components/BarcodeScanner'
import { CameraIcon, Logo } from '@/components/Icons'
import { supabase } from '@/lib/supabase-browser'
import { compressImage, FamilyProfile, postScan, storeGet, storeSet } from '@/lib/client'
import { Animal, animalFor, Mascot, ModeArt } from '@/components/Art'
import type { Mode } from '@/lib/rules'

const MODES: { id: Mode; label: string; hint: string; busy: string }[] = [
  { id: 'barcode', label: 'Strekkode', hint: '', busy: 'Slår opp produktet…' },
  { id: 'label', label: 'Etikett', hint: 'Ta bilde av hele ingredienslisten, også «kan inneholde spor».', busy: 'Leser ingredienslisten…' },
  { id: 'food', label: 'Mat uten pakke', hint: 'Ta bilde av maten. Vi gjetter hva det er, så svaret blir aldri grønt.', busy: 'Ser på bildet…' }
]

function Scan() {
  const router = useRouter()
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
      .then(({ data }) => setSharedWith([...new Set((data ?? []).map((l: { parent_email: string | null }) => l.parent_email ?? 'en forelder'))]))
  }, [session.user.id])

  useEffect(() => {
    supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms, conditions, avatar')
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
      const res = await postScan({ ...body, mode, profileIds: selected })
      router.push(`/resultat/${res.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
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
      setError(err instanceof Error ? err.message : 'Kunne ikke lese bildet.')
    }
  }

  if (profiles === null) {
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label="Laster" />
      </main>
    )
  }

  if (!profiles.length) {
    return (
      <main className="page center">
        <Logo />
        <div style={{ alignSelf: 'center' }}><Mascot mood="wave" size={150} /></div>
        <h1>Hvem skal vi passe på?</h1>
        <p className="muted">Lag en profil med allergiene først. Du kan legge til barn etterpå.</p>
        <Link className="btn btn-primary" href="/profiler?ny=1">Lag første profil</Link>
      </main>
    )
  }

  const current = MODES.find((m) => m.id === mode)!

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Logo />
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 19 }}>Hvem handler du for?</h2>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {profiles.length > 1 && (
            <button className="profile-pill" aria-pressed={selected.length === profiles.length} onClick={toggleAll}>
              <span className="family-stack" aria-hidden="true">
                {profiles.slice(0, 3).map((p, i) => (
                  <Animal key={p.id} id={animalFor(p.avatar, i)} size={28} />
                ))}
              </span>
              Hele familien
            </button>
          )}
          {profiles.map((p, i) => (
            <button key={p.id} className="profile-pill" aria-pressed={selected.includes(p.id)} onClick={() => toggleProfile(p.id)}>
              <Animal id={animalFor(p.avatar, i)} size={36} />
              {p.name}
              <span className="check" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      </div>

      {sharedWith.length > 0 && (
        <p className="share-note">
          <span aria-hidden="true">👀</span> Det du skanner, ser {sharedWith.join(' og ')}.
        </p>
      )}

      <div className="mode-tiles" role="group" aria-label="Hva vil du sjekke?">
        {MODES.map((m) => (
          <button key={m.id} className={`mode-tile ${m.id}`} aria-pressed={m.id === mode} onClick={() => pickMode(m.id)}>
            <ModeArt mode={m.id} size={48} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {busy ? (
        <div className="camera" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#fff' }}>
          <div className="bob"><Mascot mood="unsure" size={120} /></div>
          <span style={{ fontWeight: 600 }}>{current.busy}</span>
        </div>
      ) : mode === 'barcode' ? (
        <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} />
      ) : (
        <>
          <button className={`photo-drop ${mode}`} onClick={() => fileRef.current?.click()}>
            <span className="photo-art"><ModeArt mode={mode} size={96} /></span>
            <span className="photo-cta"><CameraIcon /></span>
            {mode === 'label' ? 'Ta bilde av ingredienslisten' : 'Ta bilde av maten'}
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>{current.hint}</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </>
      )}

      {error && <div className="alert error" role="alert">{error}</div>}
      <p className="tiny" style={{ textAlign: 'center' }}>Okei er et oppslagsverk og erstatter ikke lege. Sjekk alltid etiketten.</p>
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
