'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-browser'
import type { FamilyProfile } from '@/lib/client'
import type { Wishes } from '@/lib/wishes'
import { getKidMode, hashPin, PinUnlock, setKidMode } from '@/components/KidMode'
import { Animal, animalFor } from '@/components/Art'

/** Ønsker: påvirker aldri flagget, bare informasjon og alternativer. */
export function WishesEditor({ value, onChange }: { value: Wishes; onChange: (w: Wishes) => void }) {
  const toggle = (k: keyof Wishes) => onChange({ ...value, [k]: !value[k] })
  const num = (k: 'lowcarb' | 'lowsugar', def: number) =>
    onChange({ ...value, [k]: value[k] == null ? def : null })
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h2>Ønsker</h2>
      <p className="small muted">Valgfritt. Påvirker ikke rødt, gult og grønt, men vises i resultatet og brukes når Okei foreslår alternativer.</p>
      <div className="wish-grid">
        <button type="button" className="chip" aria-pressed={value.lowcarb != null} onClick={() => num('lowcarb', 10)}>Lavkarbo</button>
        <button type="button" className="chip" aria-pressed={value.lowsugar != null} onClick={() => num('lowsugar', 5)}>Lite sukker</button>
        <button type="button" className="chip" aria-pressed={!!value.fiber} onClick={() => toggle('fiber')}>Mye fiber</button>
        <button type="button" className="chip" aria-pressed={!!value.wholegrain} onClick={() => toggle('wholegrain')}>Grovt og fullkorn</button>
        <button type="button" className="chip" aria-pressed={!!value.keyhole} onClick={() => toggle('keyhole')}>Nøkkelhullet</button>
        <button type="button" className="chip" aria-pressed={!!value.vegetarian} onClick={() => toggle('vegetarian')}>Vegetar</button>
        <button type="button" className="chip" aria-pressed={!!value.vegan} onClick={() => toggle('vegan')}>Vegansk</button>
      </div>
      {value.lowcarb != null && (
        <label className="field">
          Lavkarbo: maks gram karbohydrater per 100 g
          <input className="input" inputMode="numeric" value={value.lowcarb} onChange={(e) => onChange({ ...value, lowcarb: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
        </label>
      )}
      {value.lowsugar != null && (
        <label className="field">
          Lite sukker: maks gram sukker per 100 g
          <input className="input" inputMode="numeric" value={value.lowsugar} onChange={(e) => onChange({ ...value, lowsugar: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)) })} />
        </label>
      )}
    </div>
  )
}

interface Share {
  id: string
  token: string
  created_at: string
  expires_at: string
}

/** Del et allergikort: barnehage, skole, besteforeldre og bursdagsverter kan se allergiene og skanne mot profilen. */
export function ShareCard({ profileId, name }: { profileId: string; name: string }) {
  const [shares, setShares] = useState<Share[]>([])
  const [copied, setCopied] = useState('')

  async function load() {
    const { data } = await supabase()
      .from('share_links')
      .select('id, token, created_at, expires_at')
      .contains('profile_ids', [profileId])
      .eq('revoked', false)
      .order('created_at', { ascending: false })
    setShares((data ?? []) as Share[])
  }
  useEffect(() => {
    load()
  }, [profileId])

  async function create() {
    const { data } = await supabase().from('share_links').insert({ profile_ids: [profileId], label: name }).select('id, token, created_at, expires_at').single()
    if (data) {
      setShares((s) => [data as Share, ...s])
      send(data.token)
    }
  }
  async function send(token: string) {
    const url = `${window.location.origin}/kort/${token}`
    const text = `Her er ${name}s allergikort i Okei. Du kan se hva ${name} ikke tåler, og skanne varer for å sjekke.`
    try {
      if (navigator.share) return await navigator.share({ title: `${name}s allergikort`, text, url })
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(''), 2500)
    } catch {
      /* avbrutt */
    }
  }
  async function revoke(id: string) {
    if (!window.confirm('Trekke tilbake lenken? Den slutter å virke med en gang.')) return
    await supabase().from('share_links').update({ revoked: true }).eq('id', id)
    load()
  }

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2>Del {name}s allergikort</h2>
      <p className="small muted">
        Til barnehage, skole, besteforeldre eller foreldre som arrangerer bursdag. De ser allergiene og nødinfo, og kan skanne varer mot {name}s profil uten å logge inn. Lenken kan trekkes tilbake når som helst.
      </p>
      {shares.map((s) => (
        <div key={s.id} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <span className="small">
            Lenke laget {new Date(s.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
          </span>
          <span className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-small" onClick={() => send(s.token)}>{copied === s.token ? 'Kopiert' : 'Send'}</button>
            <button type="button" className="btn btn-small btn-danger" onClick={() => revoke(s.id)}>Trekk tilbake</button>
          </span>
        </div>
      ))}
      <button type="button" className="btn" onClick={create}>Lag ny lenke til allergikortet</button>
      <Link className="linkbtn" href={`/kokkekort?id=${profileId}`}>Lag kokkekort til restaurant og reise</Link>
    </div>
  )
}

/** Barnemodus på denne telefonen. */
export function KidModeSetup({ profiles }: { profiles: FamilyProfile[] }) {
  const [open, setOpen] = useState(false)
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? '')
  const [pin, setPin] = useState('')
  const [phone, setPhone] = useState('')
  const [callName, setCallName] = useState('mamma')
  const [error, setError] = useState('')

  async function start(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return setError('Velg hvem telefonen er til.')
    if (!/^\d{4,8}$/.test(pin)) return setError('PIN må være 4 til 8 sifre.')
    setKidMode({ profileId, pinHash: await hashPin(pin), phone: phone.trim() || undefined, callName: callName.trim() || undefined })
    window.location.href = '/skann'
  }

  if (!profiles.length) return null
  return (
    <div className="card stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Barnemodus</h2>
        {!open && <button type="button" className="btn btn-small" onClick={() => setOpen(true)}>Slå på</button>}
      </div>
      <p className="small muted">Gjør denne telefonen enklere for et barn: én profil, store knapper, opplesning av svaret og knapp for å ringe en voksen. En voksen går ut med PIN.</p>
      {open && (
        <form className="stack" onSubmit={start}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {profiles.map((p, i) => (
              <button type="button" key={p.id} className="profile-pill" aria-pressed={profileId === p.id} onClick={() => setProfileId(p.id)}>
                <Animal id={animalFor(p.avatar, i)} size={32} /> {p.name}
              </button>
            ))}
          </div>
          <label className="field">
            PIN for voksne (4–8 sifre)
            <input className="input" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} maxLength={8} />
          </label>
          <div className="grid2">
            <label className="field">
              Hvem skal barnet ringe?
              <input className="input" value={callName} onChange={(e) => setCallName(e.target.value)} placeholder="mamma" maxLength={20} />
            </label>
            <label className="field">
              Telefonnummer
              <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Valgfritt" maxLength={20} />
            </label>
          </div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit">Start barnemodus</button>
        </form>
      )}
    </div>
  )
}

/** I barnemodus må en voksen låse opp før profiler kan endres. */
export function KidGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'check' | 'locked' | 'open'>('check')
  const kid = typeof window !== 'undefined' ? getKidMode() : null
  useEffect(() => setState(getKidMode() ? 'locked' : 'open'), [])
  if (state === 'check') return null
  if (state === 'locked' && kid)
    return (
      <main className="page center">
        <PinUnlock kid={kid} onUnlock={() => setState('open')} onCancel={() => (window.location.href = '/skann')} />
      </main>
    )
  return <>{children}</>
}
