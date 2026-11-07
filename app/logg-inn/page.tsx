'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { FoodSticker, Mascot } from '@/components/Art'
import { GoogleIcon, Logo } from '@/components/Icons'
import { LangPicker, useT } from '@/components/I18n'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { t } = useT()

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
    if (error) setError(t('login.googleFail'))
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
    if (error) setError(t('login.mailFail'))
    else setSent(true)
  }

  return (
    <main className="page" style={{ paddingBottom: 32, justifyContent: 'space-between', minHeight: '100dvh' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none' }} aria-label={t('login.home')}><Logo /></a>
        <LangPicker />
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="sticker s1"><FoodSticker kind="apple" size={50} /></span>
        <span className="sticker s2"><FoodSticker kind="milk" size={46} /></span>
        <span className="sticker s3"><FoodSticker kind="bread" size={48} /></span>
        <span className="sticker s4"><FoodSticker kind="egg" size={40} /></span>
        <span className="sticker s5"><FoodSticker kind="fish" size={50} /></span>
        <span className="sticker s6"><FoodSticker kind="carrot" size={46} /></span>
        <Mascot mood="happy" size={170} />
      </div>
      <div className="stack" style={{ gap: 12 }}>
        <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>{t('login.h1a')}<br />{t('login.h1b')}</h1>
        <p className="muted" style={{ fontSize: 16 }}>
          {t('login.lead')}
        </p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <button className="btn btn-google" onClick={google}>
          <GoogleIcon /> {t('login.google')}
        </button>
        {sent ? (
          <div className="alert info">{t('login.sent', { email })}</div>
        ) : (
          <form onSubmit={magicLink} className="stack" style={{ gap: 10 }}>
            <label className="field">
              {t('login.orMail')}
              <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.mailPh')} />
            </label>
            <button className="btn" type="submit" disabled={busy}>{busy ? t('login.sending') : t('login.send')}</button>
          </form>
        )}
        {error && <div className="alert error" role="alert">{error}</div>}
        <p className="tiny" style={{ textAlign: 'center' }}>
          {t('disclaimer')} <a href="/personvern">{t('privacy')}</a> · <a href="/">{t('prof.about')}</a>
        </p>
      </div>
    </main>
  )
}
