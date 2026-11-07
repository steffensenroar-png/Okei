'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import { PENDING_KEY, storeGet } from '@/lib/client'
import { Logo } from './Icons'
import Nav from './Nav'

const SessionCtx = createContext<Session | null>(null)
export const useSession = () => useContext(SessionCtx)!

type State = 'loading' | 'notbeta' | 'terms' | 'ok' | 'error'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [state, setState] = useState<State>('loading')
  const [agree, setAgree] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const sb = supabase()
    let alive = true

    async function check(s: Session | null) {
      if (!alive) return
      if (!s) {
        router.replace('/')
        return
      }
      setSession(s)
      const { data: beta, error } = await sb.rpc('is_beta')
      if (!alive) return
      if (error) return setState('error')
      if (!beta) return setState('notbeta')
      const { data: settings } = await sb.from('user_settings').select('accepted_terms_at').maybeSingle()
      if (!alive) return
      setState(settings?.accepted_terms_at ? 'ok' : 'terms')
      const pending = storeGet(PENDING_KEY)
      if (pending && window.location.pathname !== '/koble') router.replace(`/koble?kode=${encodeURIComponent(pending)}`)
    }

    sb.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') router.replace('/')
      else if (s) setSession(s)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  async function accept() {
    setSaving(true)
    const { error } = await supabase()
      .from('user_settings')
      .upsert({ user_id: session!.user.id, accepted_terms_at: new Date().toISOString() })
    setSaving(false)
    if (!error) setState('ok')
  }

  async function signOut() {
    await supabase().auth.signOut()
    router.replace('/')
  }

  if (state === 'loading') {
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label="Laster" />
      </main>
    )
  }

  if (state === 'notbeta' || state === 'error') {
    return (
      <main className="page center">
        <Logo />
        <h1>{state === 'notbeta' ? 'Du har ikke tilgang' : 'Noe gikk galt'}</h1>
        <p className="muted">
          {state === 'notbeta'
            ? 'Prøv å logge ut og inn igjen.'
            : 'Vi fikk ikke kontakt med databasen. Prøv igjen om litt.'}
        </p>
        <button className="btn" onClick={signOut}>Logg ut</button>
      </main>
    )
  }

  return (
    <SessionCtx.Provider value={session}>
      {children}
      <Nav />
      {state === 'terms' && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <div className="modal">
            <h1 id="terms-title">Før du starter</h1>
            <p>Okei er i beta og er et oppslagsverk. Svarene bygger på produktdata og tekst lest av AI, og kan være feil.</p>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>Okei erstatter ikke lege. Sjekk alltid etiketten.</li>
              <li>Ved alvorlig allergisk reaksjon: ring 113.</li>
              <li>Vi lagrer profilene dine (navn, allergier) og resultatene av skann. Bilder lagres ikke.</li>
              <li>Du kan slette profiler og historikk når som helst. Les <a href="/personvern" target="_blank" rel="noopener">personvernerklæringen</a>.</li>
            </ul>
            <label className="row" style={{ alignItems: 'flex-start', fontSize: 15 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1 }} />
              <span>Jeg forstår, og samtykker til at Okei lagrer allergiopplysningene jeg legger inn.</span>
            </label>
            <button className="btn btn-primary" disabled={!agree || saving} onClick={accept}>
              {saving ? 'Lagrer…' : 'Start'}
            </button>
          </div>
        </div>
      )}
    </SessionCtx.Provider>
  )
}
