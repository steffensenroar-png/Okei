'use client'

// Barnemodus: telefonen låses til én profil med et enklere oppsett, opplesning og knapp for å ringe en voksen.
// Innstillingen ligger bare på denne telefonen. En voksen låser opp med PIN.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'
import { CameraIcon } from '@/components/Icons'
import { Animal, animalFor, Mascot, ModeArt } from '@/components/Art'
import { supabase } from '@/lib/supabase-browser'
import { compressImage, FamilyProfile, postScan, storeGet, storeSet } from '@/lib/client'

export interface KidMode {
  profileId: string
  pinHash: string
  phone?: string
  callName?: string
}

const KEY = 'okei.kidmode'

export function getKidMode(): KidMode | null {
  try {
    const v = JSON.parse(storeGet(KEY) ?? 'null')
    return v && v.profileId && v.pinHash ? v : null
  } catch {
    return null
  }
}

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`okei:${pin}`))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function setKidMode(k: KidMode | null) {
  storeSet(KEY, k ? JSON.stringify(k) : '')
}

/** Les opp tekst på norsk med nettleserens innebygde stemme. */
export function speak(text: string) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'nb-NO'
    const v = synth.getVoices().find((x) => /^(nb|no|nn)/i.test(x.lang))
    if (v) u.voice = v
    u.rate = 0.95
    synth.speak(u)
  } catch {
    /* ikke støttet */
  }
}

export function CallButton({ kid }: { kid: KidMode }) {
  if (!kid.phone) return null
  return (
    <a className="btn btn-call" href={`tel:${kid.phone.replace(/[^\d+]/g, '')}`}>
      📞 Ring {kid.callName || 'en voksen'}
    </a>
  )
}

export function PinUnlock({ kid, onUnlock, onCancel }: { kid: KidMode; onUnlock: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  async function check(e: React.FormEvent) {
    e.preventDefault()
    if ((await hashPin(pin)) === kid.pinHash) onUnlock()
    else {
      setErr('Feil kode')
      setPin('')
    }
  }
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Lås opp for voksne">
      <form className="modal stack" onSubmit={check}>
        <h2>For voksne</h2>
        <p className="small muted">Skriv PIN-koden for å gå ut av barnemodus.</p>
        <input
          className="input code-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          autoFocus
          aria-label="PIN-kode"
        />
        {err && <div className="alert error" role="alert">{err}</div>}
        <button className="btn btn-primary" type="submit" disabled={pin.length < 4}>Lås opp</button>
        <button className="btn" type="button" onClick={onCancel}>Avbryt</button>
      </form>
    </div>
  )
}

export function KidScan({ kid }: { kid: KidMode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<FamilyProfile | null>(null)
  const [mode, setMode] = useState<'barcode' | 'label'>('barcode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unlock, setUnlock] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase()
      .from('family_profiles')
      .select('id, name, birth_year, allergens, custom_terms, conditions, avatar')
      .eq('id', kid.profileId)
      .maybeSingle()
      .then(({ data }) => setProfile(data as FamilyProfile | null))
  }, [kid.profileId])

  async function run(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      const res = await postScan({ ...body, mode, profileIds: [kid.profileId] })
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

  return (
    <main className="page kid">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="row" style={{ gap: 10 }}>
          {profile && <Animal id={animalFor(profile.avatar, 0)} size={52} />}
          <h1 style={{ fontSize: 26 }}>Hei{profile ? `, ${profile.name}` : ''}!</h1>
        </span>
        <button className="linkbtn small" onClick={() => setUnlock(true)}>Voksen</button>
      </div>

      <div className="mode-tiles kid-tiles">
        <button className="mode-tile barcode" aria-pressed={mode === 'barcode'} onClick={() => setMode('barcode')}>
          <ModeArt mode="barcode" size={60} />
          <span>Strekkode</span>
        </button>
        <button className="mode-tile label" aria-pressed={mode === 'label'} onClick={() => setMode('label')}>
          <ModeArt mode="label" size={60} />
          <span>Ta bilde</span>
        </button>
      </div>

      {busy ? (
        <div className="camera" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#fff' }}>
          <div className="bob"><Mascot mood="unsure" size={140} /></div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Jeg sjekker…</span>
        </div>
      ) : mode === 'barcode' ? (
        <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} />
      ) : (
        <>
          <button className="photo-drop label" onClick={() => fileRef.current?.click()}>
            <span className="photo-art"><ModeArt mode="label" size={96} /></span>
            <span className="photo-cta"><CameraIcon /></span>
            Ta bilde av ingredienslisten
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        </>
      )}

      {error && <div className="alert error" role="alert">{error}</div>}
      <CallButton kid={kid} />
      <p className="tiny" style={{ textAlign: 'center' }}>Er du usikker? Spør en voksen før du spiser.</p>

      {unlock && (
        <PinUnlock
          kid={kid}
          onCancel={() => setUnlock(false)}
          onUnlock={() => {
            setKidMode(null)
            window.location.href = '/skann'
          }}
        />
      )}
    </main>
  )
}
