'use client'

import { useEffect, useState } from 'react'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { apiPost } from '@/lib/client'
import { storedCode } from '@/components/CodeCapture'
import { useT } from '@/components/I18n'
import { Mascot } from '@/components/Art'
import { Interval, PlanId, PLANS } from '@/lib/plans'

interface Sub {
  plan: string | null
  status: string | null
  current_period_end: string | null
}

function Abonnement() {
  const session = useSession()
  const { t, locale } = useT()
  const [interval, setInterval] = useState<Interval>('month')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [error, setError] = useState('')
  const [sub, setSub] = useState<Sub | null>(null)
  const ok = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ok') === '1'

  useEffect(() => {
    setCode(storedCode())
    supabase()
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', session.user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSub((data as Sub) ?? null))
  }, [session.user.id])

  async function buy(plan: PlanId) {
    setBusy(plan)
    setError('')
    try {
      const r = await apiPost<{ url: string }>('/api/stripe/checkout', { plan, interval, code: code.trim() || undefined })
      window.location.href = r.url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err.generic'))
      setBusy(null)
    }
  }

  const price = (n: number) => new Intl.NumberFormat(locale).format(n)

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1>{t('sub.title')}</h1>
          <p className="muted">{t('sub.intro')}</p>
        </div>
        <Mascot mood={ok || sub ? 'happy' : 'wave'} size={84} />
      </div>

      {(ok || sub) && (
        <div className="alert success" role="status">
          {sub ? t('sub.active', { plan: PLANS[(sub.plan as PlanId) ?? 'personal']?.name ?? 'Okei' }) : t('sub.thanks')}
        </div>
      )}

      <div className="seg" role="group" aria-label={t('sub.title')}>
        <button aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>{t('sub.month')}</button>
        <button aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>{t('sub.year')}</button>
      </div>

      {(['family', 'personal'] as PlanId[]).map((id) => {
        const p = PLANS[id]
        const amount = interval === 'year' ? p.year : p.month
        return (
          <div key={id} className="card stack" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2>{t(`sub.${id}`)}</h2>
              <span style={{ fontSize: 22, fontWeight: 800 }}>
                {price(amount)} kr<span className="small muted">/{interval === 'year' ? t('sub.perYear') : t('sub.perMonth')}</span>
              </span>
            </div>
            <p className="small muted">{t(`sub.${id}Text`)}</p>
            {interval === 'year' && <p className="tiny">{t('sub.yearHint', { price: price(Math.round(p.year / 12)) })}</p>}
            <button className="btn btn-primary" disabled={!!busy || !!sub} onClick={() => buy(id)}>{busy === id ? t('saving') : t('sub.buy')}</button>
          </div>
        )
      })}

      <label className="field">
        {t('sub.code')}
        <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('sub.codePh')} autoCapitalize="characters" />
      </label>
      {error && <div className="alert error" role="alert">{error}</div>}
      <p className="tiny">{t('sub.fine')}</p>
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <Abonnement />
    </AuthGate>
  )
}
