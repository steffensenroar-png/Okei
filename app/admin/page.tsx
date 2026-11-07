'use client'

import { useEffect, useState } from 'react'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'

interface Invite {
  email: string
  added_at: string
}

const fmt = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })

function Admin() {
  const session = useSession()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase().from('beta_allowlist').select('email, added_at').order('added_at')
    setInvites((data ?? []) as Invite[])
  }

  useEffect(() => {
    supabase()
      .rpc('is_admin')
      .then(({ data }) => {
        setIsAdmin(!!data)
        if (data) load()
      })
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError('Sjekk e-postadressen.')
    setBusy(true)
    setError('')
    const { error } = await supabase().from('beta_allowlist').insert({ email: clean })
    setBusy(false)
    if (error) return setError(error.code === '23505' ? 'Adressen er allerede invitert.' : 'Kunne ikke legge til. Prøv igjen.')
    setEmail('')
    load()
  }

  async function remove(addr: string) {
    if (!window.confirm(`Fjerne ${addr} fra betaen? Personen kommer ikke inn lenger, men dataene slettes ikke.`)) return
    await supabase().from('beta_allowlist').delete().eq('email', addr)
    load()
  }

  if (isAdmin === null) return <main className="page center" style={{ alignItems: 'center' }}><div className="spinner" /></main>
  if (!isAdmin) {
    return (
      <main className="page">
        <h1>Ingen tilgang</h1>
        <p className="muted">Denne siden er bare for administratorer.</p>
      </main>
    )
  }

  const link = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <main className="page">
      <h1>Invitasjoner</h1>
      <p className="muted">Bare e-postadresser på listen slipper inn i betaen. Testeren logger inn med Google eller e-postlenke på adressen du legger inn.</p>

      <form onSubmit={add} className="stack">
        <label className="field">
          E-postadresse
          <input className="input" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="navn@eksempel.no" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Legger til…' : 'Inviter'}</button>
        {error && <div className="alert error" role="alert">{error}</div>}
      </form>

      <div className="alert info">
        Send lenken til testeren: <b>{link}</b>
      </div>

      <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        {invites.map((i) => (
          <div key={i.email} className="list-item">
            <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.email}</span>
              <span className="tiny">Invitert {fmt.format(new Date(i.added_at))}</span>
            </span>
            {i.email.toLowerCase() !== session.user.email?.toLowerCase() && (
              <button className="btn btn-small btn-danger" onClick={() => remove(i.email)}>Fjern</button>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Admin />
    </AuthGate>
  )
}
