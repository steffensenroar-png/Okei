'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mascot } from '@/components/Art'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { StatusIcon } from '@/components/AllergenIcon'

interface Row {
  id: string
  flag: 'red' | 'yellow' | 'green'
  headline: string
  product_name: string | null
  profile_name: string | null
  created_at: string
}

const fmt = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function History() {
  const [rows, setRows] = useState<Row[] | null>(null)

  async function load() {
    const { data } = await supabase()
      .from('scans')
      .select('id, flag, headline, product_name, profile_name, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    setRows((data ?? []) as Row[])
  }

  useEffect(() => {
    load()
  }, [])

  async function clearAll() {
    if (!window.confirm('Slette hele historikken? Dette kan ikke angres.')) return
    const { data } = await supabase().auth.getUser()
    if (!data.user) return
    await supabase().from('scans').delete().eq('owner_id', data.user.id)
    load()
  }

  return (
    <main className="page">
      <h1>Historikk</h1>
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
          {rows.map((r) => (
            <Link key={r.id} href={`/resultat/${r.id}`} className="list-item">
              <StatusIcon status={r.flag} size={24} />
              <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
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
        <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={clearAll}>Slett hele historikken</button>
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
