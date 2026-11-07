'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mascot } from '@/components/Art'
import RecallBanner from '@/components/RecallBanner'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { StatusIcon } from '@/components/AllergenIcon'
import { useT } from '@/components/I18n'
import type { Msg } from '@/lib/i18n/core'

interface Row {
  id: string
  flag: 'red' | 'yellow' | 'green'
  headline: string
  headlineMsg?: Msg | null
  product_name: string | null
  profile_name: string | null
  owner_id: string
  created_at: string
}


function History() {
  const session = useSession()
  const me = session.user.id
  const { t, f, locale } = useT()
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'mine' | 'kids'>('all')

  async function load() {
    const { data } = await supabase()
      .from('scans')
      .select('id, flag, headline, headlineMsg:result->headlineMsg, product_name, profile_name, owner_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    load()
  }, [])

  const hasKids = !!rows?.some((r) => r.owner_id !== me)
  const shown = (rows ?? []).filter((r) => filter === 'all' || (filter === 'mine' ? r.owner_id === me : r.owner_id !== me))

  async function clearAll() {
    if (!window.confirm(hasKids ? t('hist.confirmMine') : t('hist.confirmAll'))) return
    await supabase().from('scans').delete().eq('owner_id', me)
    load()
  }

  return (
    <main className="page">
      <h1>{t('nav.history')}</h1>
      <div className="seg" role="group" aria-label={t('hist.show')}>
        <Link href="/historikk" role="button" aria-current="page">{t('nav.history')}</Link>
        <Link href="/trygge" role="button">{t('safe.title')}</Link>
      </div>
      <RecallBanner />
      {hasKids && (
        <div className="seg" role="group" aria-label={t('hist.from')}>
          {(['all', 'mine', 'kids'] as const).map((k) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{t(`hist.${k}`)}</button>
          ))}
        </div>
      )}
      {rows === null ? (
        <div className="spinner" role="status" aria-label={t('loading')} />
      ) : rows.length === 0 ? (
        <div className="empty">
          <Mascot mood="wave" size={130} />
          <p className="muted">{t('hist.empty')}</p>
          <Link className="btn btn-primary" href="/skann">{t('scanSomething')}</Link>
        </div>
      ) : (
        <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
          {shown.map((r) => (
            <Link key={r.id} href={`/resultat/${r.id}`} className="list-item">
              <StatusIcon status={r.flag} size={24} />
              <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                {r.owner_id !== me && <span className="kid-badge">{t('hist.scannedBy', { name: r.profile_name ?? '' })}</span>}
                <span style={{ fontWeight: 700, fontSize: 15 }}>{f(r.headlineMsg, r.headline)}</span>
                <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[r.product_name, r.profile_name && t('hist.for', { name: r.profile_name }), fmt.format(new Date(r.created_at))].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {rows && rows.length > 0 && (
        <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={clearAll}>{hasKids ? t('hist.deleteMine') : t('hist.deleteAll')}</button>
      )}
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <History />
    </AuthGate>
  )
}
