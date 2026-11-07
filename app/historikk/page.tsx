'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mascot } from '@/components/Art'
import RecallBanner from '@/components/RecallBanner'
import AuthGate, { useSession } from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { StatusIcon } from '@/components/AllergenIcon'

interface Row {
  id: string
  flag: 'red' | 'yellow' | 'green'
  headline: string
  product_name: string | null
  profile_name: string | null
  owner_id: string
  created_at: string
}

const fmt = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function History() {
  const session = useSession()
  const me = session.user.id
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'mine' | 'kids'>('all')

  async function load() {
    const { data } = await supabase()
      .from('scans')
      .select('id, flag, headline, product_name, profile_name, owner_id, created_at')
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
    if (!window.confirm(hasKids ? 'Slette dine egne skann? Barnas skann ligger på deres telefoner og slettes ikke.' : 'Slette hele historikken? Dette kan ikke angres.')) return
    await supabase().from('scans').delete().eq('owner_id', me)
    load()
  }

  return (
    <main className="page">
      <h1>Historikk</h1>
      <div className="seg" role="group" aria-label="Vis">
        <Link href="/historikk" role="button" aria-current="page">Historikk</Link>
        <Link href="/trygge" role="button">Trygge varer</Link>
      </div>
      <RecallBanner />
      {hasKids && (
        <div className="seg" role="group" aria-label="Vis skann fra">
          {([['all', 'Alle'], ['mine', 'Mine'], ['kids', 'Barnas']] as const).map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      )}
      {rows === null ? (
        <div className="spinner" role="status" aria-label="Laster" />
      ) : rows.length === 0 ? (
        <div className="empty">
          <Mascot mood="wave" size={130} />
          <p className="muted">Ingen skann ennå. Det du sjekker havner her, så du finner det igjen i butikken neste gang.</p>
          <Link className="btn btn-primary" href="/skann">Skann noe</Link>
        </div>
      ) : (
        <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
          {shown.map((r) => (
            <Link key={r.id} href={`/resultat/${r.id}`} className="list-item">
              <StatusIcon status={r.flag} size={24} />
              <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                {r.owner_id !== me && <span className="kid-badge">Skannet av {r.profile_name ?? 'barnet'}</span>}
                <span style={{ fontWeight: 700, fontSize: 15 }}>{r.headline}</span>
                <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[r.product_name, r.profile_name && `for ${r.profile_name}`, fmt.format(new Date(r.created_at))].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {rows && rows.length > 0 && (
        <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={clearAll}>{hasKids ? 'Slett mine skann' : 'Slett hele historikken'}</button>
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
