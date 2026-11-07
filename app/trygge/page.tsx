'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabase-browser'
import { Mascot } from '@/components/Art'

interface Safe {
  id: string
  ean: string
  name: string | null
  brand: string | null
  image: string | null
  created_at: string
}

function SafeList() {
  const [rows, setRows] = useState<Safe[] | null>(null)

  async function load() {
    const { data } = await supabase().from('safe_products').select('id, ean, name, brand, image, created_at').order('name')
    setRows((data ?? []) as Safe[])
  }
  useEffect(() => {
    load()
  }, [])

  async function remove(id: string) {
    await supabase().from('safe_products').delete().eq('id', id)
    load()
  }

  return (
    <main className="page">
      <div className="hero-row">
        <div className="stack" style={{ gap: 6 }}>
          <h1>Trygge varer</h1>
          <p className="muted">Varer som har fått grønt for familien. Skanner du en av dem igjen og ingredienslisten er endret, sier Okei fra.</p>
        </div>
        <Mascot mood="happy" size={84} />
      </div>
      <div className="seg" role="group" aria-label="Vis">
        <Link href="/historikk" role="button">Historikk</Link>
        <Link href="/trygge" role="button" aria-current="page">Trygge varer</Link>
      </div>
      {rows === null ? (
        <div className="spinner" role="status" aria-label="Laster" />
      ) : !rows.length ? (
        <div className="empty">
          <p className="muted">Ingen trygge varer ennå. Trykk «Lagre som trygg vare» når en vare får grønt.</p>
          <Link className="btn btn-primary" href="/skann">Skann noe</Link>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} className="card row" style={{ gap: 12 }}>
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" width={48} height={48} style={{ objectFit: 'contain', borderRadius: 8, background: '#fff', flex: 'none' }} />
              ) : (
                <span aria-hidden="true" style={{ fontSize: 28 }}>⭐</span>
              )}
              <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{r.name ?? r.ean}</span>
                <span className="small muted">{[r.brand, `lagret ${new Date(r.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`].filter(Boolean).join(' · ')}</span>
              </span>
              <button className="btn btn-small" onClick={() => remove(r.id)} aria-label={`Fjern ${r.name ?? r.ean}`}>Fjern</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default function Page() {
  return (
    <AuthGate>
      <SafeList />
    </AuthGate>
  )
}
