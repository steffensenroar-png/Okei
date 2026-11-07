'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import BarcodeScanner from '@/components/BarcodeScanner'
import { CameraIcon, Logo } from '@/components/Icons'
import { supabase } from '@/lib/supabase-browser'
import { avatarStyle, compressImage, FamilyProfile, postScan, storeGet, storeSet } from '@/lib/client'
import type { Mode } from '@/lib/rules'

const MODES: { id: Mode; label: string; hint: string; busy: string }[] = [
  { id: 'barcode', label: 'Strekkode', hint: '', busy: 'Slår opp produktet…' },
  { id: 'label', label: 'Ingredienser', hint: 'Ta bilde av hele ingredienslisten, også «kan inneholde spor».', busy: 'Leser ingredienslisten…' },
  { id: 'food', label: 'Uemballert', hint: 'Ta bilde av maten. Vi gjetter hva det er, så svaret blir aldri grønt.', busy: 'Ser på bildet…' }
]

function Scan() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<FamilyProfile[] | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('barcode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms')
      .order('created_at')
      .then(({ data }) => {
        const list = (data ?? []) as FamilyProfile[]
        setProfiles(list)
        const saved = storeGet('okei.profile')
        setProfileId(list.find((p) => p.id === saved)?.id ?? list[0]?.id ?? null)
        const savedMode = storeGet('okei.mode') as Mode | null
        if (savedMode && MODES.some((m) => m.id === savedMode)) setMode(savedMode)
      })
  }, [])

  function pickProfile(id: string) {
    setProfileId(id)
    storeSet('okei.profile', id)
  }

  function pickMode(m: Mode) {
    setMode(m)
    setError('')
    storeSet('okei.mode', m)
  }

  async function run(body: Record<string, unknown>) {
    if (!profileId) return
    setBusy(true)
    setError('')
    try {
      const res = await postScan({ ...body, mode, profileId })
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

      <div className="stack" style={{ gap: 8 }}>
        <span className="small muted" style={{ fontWeight: 600 }}>Sjekker for</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {profiles.map((p, i) => (
            <button key={p.id} className="profile-pill" aria-pressed={p.id === profileId} onClick={() => pickProfile(p.id)}>
              <span className="avatar" style={avatarStyle(i)}>{p.name.charAt(0).toUpperCase()}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="seg" role="group" aria-label="Hva vil du sjekke?">
        {MODES.map((m) => (
          <button key={m.id} aria-pressed={m.id === mode} onClick={() => pickMode(m.id)}>{m.label}</button>
        ))}
      </div>

      {busy ? (
        <div className="camera" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#fff' }}>
          <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }} />
          <span style={{ fontWeight: 600 }}>{current.busy}</span>
        </div>
      ) : mode === 'barcode' ? (
        <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} />
      ) : (
        <>
          <button className="photo-drop" onClick={() => fileRef.current?.click()}>
            <CameraIcon />
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
