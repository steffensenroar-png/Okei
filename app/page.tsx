'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { GoogleIcon, Logo } from '@/components/Icons'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace('/skann')
      })
  }, [router])

  async function google() {
    setError('')
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/skann` }
    })
    if (error) setError('Google-innlogging feilet. Prøv igjen.')
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/skann` }
    })
    setBusy(false)
    if (error) setError('Kunne ikke sende lenken. Sjekk adressen og prøv igjen.')
    else setSent(true)
  }

  return (
    <main className="page" style={{ paddingBottom: 32, justifyContent: 'space-between', minHeight: '100dvh' }}>
      <Logo />
      <div className="stack" style={{ gap: 14 }}>
        <span className="tag" style={{ alignSelf: 'flex-start', background: 'var(--brand-tint)', color: 'var(--brand)', fontWeight: 700 }}>
          Lukket beta
        </span>
        <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>Ta bilde.<br />Få svar på sekunder.</h1>
        <p className="muted" style={{ fontSize: 16 }}>
          Okei sjekker mat mot dine og barnas allergier og viser rødt, gult eller grønt flagg.
        </p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <button className="btn btn-google" onClick={google}>
          <GoogleIcon /> Fortsett med Google
        </button>
        {sent ? (
          <div className="alert info">Sjekk e-posten din. Vi har sendt en innloggingslenke til {email}.</div>
        ) : (
          <form onSubmit={magicLink} className="stack" style={{ gap: 10 }}>
            <label className="field">
              Eller få en innloggingslenke på e-post
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="navn@eksempel.no" />
            </label>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sender…' : 'Send lenke'}</button>
          </form>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
        <p className="tiny" style={{ textAlign: 'center' }}>
          Okei er et oppslagsverk og erstatter ikke lege. Sjekk alltid etiketten. <a href="/personvern">Personvern</a>
        </p>
      </div>
    </main>
  )
}
