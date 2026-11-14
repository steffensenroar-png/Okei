'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { Logo } from '@/components/Icons'

/** Tofaktor for administratorer: første gang settes en kodeapp opp, deretter skrives koden inn. */
export default function AdminMfa({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const mfa = supabase().auth.mfa
      const { data, error } = await mfa.listFactors()
      if (error) return setError(error.message)
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) return setFactorId(verified.id)
      // Rydd bort påbegynte oppsett, og start et nytt.
      for (const f of data.all.filter((f) => f.status !== 'verified')) await mfa.unenroll({ factorId: f.id })
      const en = await mfa.enroll({ factorType: 'totp', friendlyName: `Okei admin ${new Date().toISOString().slice(0, 10)}` })
      if (en.error) return setError(en.error.message)
      setFactorId(en.data.id)
      setQr(en.data.totp.qr_code)
      setSecret(en.data.totp.secret)
    })()
  }, [])

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError('')
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') })
    setBusy(false)
    if (error) return setError('Feil kode. Prøv igjen med koden som vises nå.')
    onDone()
  }

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <Logo />
      <h1>{qr ? 'Sett opp tofaktor' : 'Bekreft med tofaktor'}</h1>
      {qr ? (
        <>
          <p className="muted">Admin-siden viser alle brukere og salg, så den krever en ekstra kode. Skann QR-koden med en kodeapp, for eksempel Google Authenticator, Microsoft Authenticator eller 1Password.</p>
          <img src={qr} alt="QR-kode for kodeappen" width={200} height={200} style={{ background: '#fff', padding: 8, borderRadius: 12, alignSelf: 'center' }} />
          {secret && (
            <p className="tiny">Kan du ikke skanne? Skriv inn denne nøkkelen i appen: <code style={{ wordBreak: 'break-all' }}>{secret}</code></p>
          )}
        </>
      ) : (
        <p className="muted">Skriv inn den sekssifrede koden fra kodeappen din.</p>
      )}
      <form className="stack" onSubmit={verify}>
        <label className="field">
          Kode fra appen
          <input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        </label>
        {error && <div className="alert error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !factorId || code.replace(/\s/g, '').length !== 6}>{busy ? 'Sjekker …' : 'Bekreft'}</button>
      </form>
    </main>
  )
}
