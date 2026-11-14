'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate from '@/components/AuthGate'
import { useT } from '@/components/I18n'
import { Mascot } from '@/components/Art'
import { supabase } from '@/lib/supabase-browser'
import { PENDING_KEY, storeGet, storeSet } from '@/lib/client'
import { setKidMode } from '@/components/KidMode'

interface Accepted {
  profile: string
  parent: string
  profile_id?: string
  kid_mode?: { pinHash?: string; phone?: string; callName?: string } | null
}

function Connect() {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<Accepted | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('kode') ?? ''
    const pending = storeGet(PENDING_KEY) ?? ''
    setCode((fromUrl || pending).toUpperCase())
    storeSet(PENDING_KEY, '')
  }, [])

  async function accept(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setState('busy')
    setError('')
    const { data, error } = await supabase().rpc('accept_family_invite', { p_code: code.trim() })
    if (error) {
      setState('error')
      setError(
        error.message.includes('own_code')
          ? t('link.ownCode')
          : error.message.includes('invalid_code')
            ? t('link.invalid')
            : t('link.failed')
      )
      return
    }
    const r = data as Accepted
    // Forelderen har satt opp barnemodus i koden: telefonen går rett i barnemodus.
    if (r.kid_mode?.pinHash && r.profile_id) {
      setKidMode({ profileId: r.profile_id, pinHash: r.kid_mode.pinHash, phone: r.kid_mode.phone, callName: r.kid_mode.callName })
    }
    setResult(r)
    setState('done')
  }

  if (state === 'done' && result) {
    return (
      <main className="page center">
        <div className="empty">
          <Mascot mood="happy" size={150} />
          <h1>{t('link.done')}</h1>
          <p className="muted">
            {result.kid_mode?.pinHash
              ? t('link.doneKid', { profile: result.profile })
              : t('link.doneText', { profile: result.profile, parent: result.parent || t('link.yourParent') })}
          </p>
          <Link className="btn btn-primary" href="/skann">{t('link.start')}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="hero-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1>{t('link.title')}</h1>
          <p className="muted">{t('link.intro')}</p>
        </div>
        <Mascot mood="wave" size={92} />
      </div>
      <form onSubmit={accept} className="stack">
        <label className="field">
          {t('link.code')}
          <input
            className="input code-input"
            value={code}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('link.placeholder')}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={state === 'busy' || code.trim().length < 8}>
          {state === 'busy' ? t('link.busy') : t('link.button')}
        </button>
        {error && <div className="alert error" role="alert">{error}</div>}
      </form>
    </main>
  )
}

export default function Page() {
  // Husk koden før innlogging, så barnet kommer tilbake hit etterpå.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('kode')
    if (fromUrl) storeSet(PENDING_KEY, fromUrl.toUpperCase())
  }, [])
  return (
    <AuthGate>
      <Connect />
    </AuthGate>
  )
}
