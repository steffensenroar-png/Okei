'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { ALLERGEN_BY_KEY, AllergenKey, CONDITIONS, ConditionKey, Severity } from '@/lib/allergens'
import { compressImage } from '@/lib/client'
import AllergenIcon from '@/components/AllergenIcon'
import { Animal, animalFor, Mascot, ModeArt } from '@/components/Art'
import { CameraIcon, FlagIcon, Logo } from '@/components/Icons'
import BarcodeScanner from '@/components/BarcodeScanner'
import { Insights } from '@/components/ResultParts'
import type { Flag, Insight } from '@/lib/rules'

interface CardProfile {
  id: string
  name: string
  avatar: string | null
  allergens: { key: AllergenKey; severity: Severity }[]
  conditions: ConditionKey[]
  custom_terms: string[]
  emergency_note: string | null
}
interface GuestResult {
  flag: Flag
  headline: string
  insights: Insight[]
  people: { name: string; flag: Flag; headline: string }[]
  product: { name: string | null; ingredientsText: string | null; source: string }
}

const SEV: Record<Severity, string> = { mild: 'mild', moderate: 'moderat', severe: 'alvorlig' }
const WORD: Record<Flag, string> = { red: 'Nei', yellow: 'Usikkert', green: 'OK' }
const ACTION: Record<Flag, string> = { red: 'Ikke gi dette.', yellow: 'Sjekk etiketten selv eller spør foreldrene.', green: 'Sjekk etiketten før servering.' }

export default function SharedCard() {
  const { token } = useParams<{ token: string }>()
  const [profiles, setProfiles] = useState<CardProfile[] | null | undefined>(undefined)
  const [mode, setMode] = useState<'barcode' | 'label'>('barcode')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GuestResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase()
      .rpc('get_shared_card', { p_token: token })
      .then(({ data }) => setProfiles(data ? ((data as { profiles: CardProfile[] }).profiles ?? []) : null))
  }, [token])

  async function run(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/guest/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, token, mode })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Noe gikk galt.')
      setResult(json)
      setTimeout(() => document.getElementById('guest-result')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noe gikk galt.')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const img = await compressImage(file)
    await run({ image: img.data, mediaType: img.mediaType })
  }

  if (profiles === undefined)
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label="Laster" />
      </main>
    )
  if (profiles === null || !profiles.length)
    return (
      <main className="page center">
        <Logo />
        <Mascot mood="unsure" size={120} />
        <h1>Kortet finnes ikke lenger</h1>
        <p className="muted">Lenken er trukket tilbake eller utløpt. Be foreldrene sende en ny.</p>
      </main>
    )

  const names = profiles.map((p) => p.name)
  const who = names.length > 1 ? names.slice(0, -1).join(', ') + ' og ' + names[names.length - 1] : names[0]

  return (
    <main className="page card-page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Logo />
        <span className="tag">Allergikort</span>
      </div>

      {profiles.map((p, i) => (
        <section key={p.id} className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            <Animal id={animalFor(p.avatar, i)} size={60} />
            <h1 style={{ fontSize: 28 }}>{p.name}</h1>
          </div>
          {(p.conditions ?? []).filter((c) => c !== 'coeliac_strict').map((c) => (
            <div key={c} className="finding" style={{ alignItems: 'center' }}>
              <AllergenIcon k={c} size={28} />
              <span>
                <b>{CONDITIONS.find((x) => x.key === c)?.label ?? c}</b>
                {c === 'coeliac' && p.conditions.includes('coeliac_strict') ? ' (svært sensitiv, også spor)' : ''}
              </span>
            </div>
          ))}
          {p.allergens.map((a) => (
            <div key={a.key} className="finding" style={{ alignItems: 'center' }}>
              <AllergenIcon k={a.key} size={28} />
              <span>
                <b>{ALLERGEN_BY_KEY[a.key]?.label ?? a.key}</b> – {SEV[a.severity]}
                {a.severity === 'severe' ? ', også «kan inneholde spor»' : ''}
              </span>
            </div>
          ))}
          {!!p.custom_terms?.length && <p className="small"><b>Unngå også:</b> {p.custom_terms.join(', ')}</p>}
          {p.emergency_note && (
            <div className="emergency">
              <strong>Ved reaksjon</strong>
              <p>{p.emergency_note}</p>
            </div>
          )}
        </section>
      ))}
      <p className="small" style={{ fontWeight: 700 }}>Ved alvorlig reaksjon: ring 113.</p>

      <section className="stack" style={{ gap: 12 }}>
        <h2>Sjekk en vare for {who}</h2>
        <div className="mode-tiles kid-tiles">
          <button className="mode-tile barcode" aria-pressed={mode === 'barcode'} onClick={() => setMode('barcode')}>
            <ModeArt mode="barcode" size={44} />
            <span>Strekkode</span>
          </button>
          <button className="mode-tile label" aria-pressed={mode === 'label'} onClick={() => setMode('label')}>
            <ModeArt mode="label" size={44} />
            <span>Etikett</span>
          </button>
        </div>
        {busy ? (
          <div className="row small muted"><div className="spinner" style={{ width: 20, height: 20 }} /> Sjekker…</div>
        ) : mode === 'barcode' ? (
          <BarcodeScanner onCode={(ean) => run({ ean })} paused={busy} />
        ) : (
          <>
            <button className="photo-drop label" onClick={() => fileRef.current?.click()}>
              <span className="photo-cta"><CameraIcon /></span>
              Ta bilde av ingredienslisten
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          </>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
      </section>

      {result && (
        <section id="guest-result" className={`guest-result ${result.flag}`}>
          <div className="row" style={{ gap: 10 }}>
            <span className="flag-icon"><FlagIcon flag={result.flag} size={28} /></span>
            <div className="stack" style={{ gap: 2 }}>
              <span className="small">{result.product.name ?? 'Varen'}</span>
              <strong style={{ fontSize: 20 }}>{WORD[result.flag]}: {result.headline}</strong>
            </div>
          </div>
          <p style={{ fontWeight: 600 }}>{ACTION[result.flag]}</p>
          {result.people.length > 1 && result.people.map((p) => (
            <span key={p.name} className="small row" style={{ gap: 6 }}><FlagIcon flag={p.flag} size={14} /> <b>{p.name}:</b> {p.headline}</span>
          ))}
          {result.product.ingredientsText && <p className="small muted">{result.product.ingredientsText}</p>}
          <p className="tiny">Kilde: {result.product.source}. Sjekk alltid etiketten.</p>
        </section>
      )}
      {result && <Insights items={result.insights} />}

      <p className="tiny" style={{ textAlign: 'center' }}>
        Kortet er delt fra <Link href="/">Okei</Link>, et oppslagsverk for matallergi. Det erstatter ikke lege. Ingenting du skanner her lagres.
      </p>
    </main>
  )
}
