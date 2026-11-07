'use client'

import { useT } from '@/components/I18n'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import { PENDING_KEY, storeGet } from '@/lib/client'
import { isLang } from '@/lib/i18n/core'
import { Logo } from './Icons'
import Nav from './Nav'

const SessionCtx = createContext<Session | null>(null)
export const useSession = () => useContext(SessionCtx)!

type State = 'loading' | 'notbeta' | 'terms' | 'ok' | 'error'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { t, lang, setLang } = useT()
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
        router.replace('/logg-inn')
        return
      }
      setSession(s)
      const { data: beta, error } = await sb.rpc('is_beta')
      if (!alive) return
      if (error) return setState('error')
      if (!beta) return setState('notbeta')
      const { data: settings } = await sb.from('user_settings').select('accepted_terms_at, language').maybeSingle()
      if (!alive) return
      // Språket følger kontoen mellom enheter, med mindre denne enheten har valgt selv.
      if (settings?.language && isLang(settings.language) && !storeGet('okei.lang')) setLang(settings.language)
      setState(settings?.accepted_terms_at ? 'ok' : 'terms')
      const pending = storeGet(PENDING_KEY)
      if (pending && window.location.pathname !== '/koble') router.replace(`/koble?kode=${encodeURIComponent(pending)}`)
    }

    sb.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') router.replace('/logg-inn')
      else if (s) setSession(s)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  // Lagre språkvalg på kontoen.
  useEffect(() => {
    function onLang(e: Event) {
      const l = (e as CustomEvent).detail
      supabase()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session) supabase().from('user_settings').upsert({ user_id: data.session.user.id, language: l })
        })
    }
    window.addEventListener('okei:lang', onLang)
    return () => window.removeEventListener('okei:lang', onLang)
  }, [])

  async function accept() {
    setSaving(true)
    const { error } = await supabase()
      .from('user_settings')
      .upsert({ user_id: session!.user.id, accepted_terms_at: new Date().toISOString(), language: lang })
    setSaving(false)
    if (!error) setState('ok')
  }

  async function signOut() {
    await supabase().auth.signOut()
    router.replace('/logg-inn')
  }

  if (state === 'loading') {
    return (
      <main className="page center" style={{ alignItems: 'center' }}>
        <div className="spinner" role="status" aria-label={t('loading')} />
      </main>
    )
  }

  if (state === 'notbeta' || state === 'error') {
    return (
      <main className="page center">
        <Logo />
        <h1>{state === 'notbeta' ? t('auth.noAccess') : t('auth.error')}</h1>
        <p className="muted">
          {state === 'notbeta'
            ? t('auth.noAccess.text')
            : t('auth.error.text')}
        </p>
        <button className="btn" onClick={signOut}>{t('logout')}</button>
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
            <h1 id="terms-title">{t('terms.title')}</h1>
            <p>{t('terms.intro')}</p>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
              <li>{t('terms.doctor')}</li>
              <li>{t('terms.113')}</li>
              <li>{t('terms.store')}</li>
              <li>{t('terms.delete')} <a href="/personvern" target="_blank" rel="noopener">{t('terms.privacyLink')}</a>.</li>
            </ul>
            <label className="row" style={{ alignItems: 'flex-start', fontSize: 15 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1 }} />
              <span>{t('terms.consent')}</span>
            </label>
            <button className="btn btn-primary" disabled={!agree || saving} onClick={accept}>
              {saving ? t('saving') : t('terms.start')}
            </button>
          </div>
        </div>
      )}
    </SessionCtx.Provider>
  )
}
