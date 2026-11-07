'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { normalize } from '@/lib/allergens'
import { storeGet, storeSet } from '@/lib/client'

interface Recall {
  title: string
  url: string
  eans: string[]
  published: string | null
}
interface Match {
  recall: Recall
  product: string
  when: string
}

const STOP = new Set(['med', 'og', 'uten', 'for', 'til', 'gram', 'stk', 'pakke', 'original', 'norge', 'coop', 'rema', 'kiwi', 'meny', 'extra', 'first', 'price'])
const words = (s: string) =>
  normalize(s)
    .replace(/[^a-zæøå0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w))

/** Sammenlign Mattilsynets tilbakekallinger med varene familien har skannet siste år. Skjer bare i nettleseren. */
function match(recalls: Recall[], scans: { ean: string | null; product_name: string | null; created_at: string }[]): Match[] {
  const out: Match[] = []
  for (const r of recalls) {
    const rw = new Set(words(r.title))
    for (const s of scans) {
      const byEan = !!s.ean && r.eans.includes(s.ean)
      const sw = s.product_name ? words(s.product_name) : []
      const common = sw.filter((w) => rw.has(w))
      const byName = sw.length >= 2 && common.length >= 2 && common.length / sw.length >= 0.6
      if (byEan || byName) {
        out.push({ recall: r, product: s.product_name ?? s.ean ?? 'en vare', when: s.created_at })
        break
      }
    }
  }
  return out
}

export default function RecallBanner() {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const since = new Date(Date.now() - 365 * 864e5).toISOString()
      const [{ data: scans }, res] = await Promise.all([
        supabase().from('scans').select('ean, product_name, created_at').gte('created_at', since).limit(1000),
        fetch('/api/recalls').then((r) => (r.ok ? r.json() : { recalls: [] })).catch(() => ({ recalls: [] }))
      ])
      if (!alive || !scans?.length) return
      const dismissed: string[] = JSON.parse(storeGet('okei.recallsSeen') ?? '[]')
      setMatches(match(res.recalls ?? [], scans).filter((m) => !dismissed.includes(m.recall.url)))
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!matches.length) return null

  function dismiss(url: string) {
    const d: string[] = JSON.parse(storeGet('okei.recallsSeen') ?? '[]')
    storeSet('okei.recallsSeen', JSON.stringify([...d, url].slice(-200)))
    setMatches((m) => m.filter((x) => x.recall.url !== url))
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {matches.map((m) => (
        <div key={m.recall.url} className="recall" role="alert">
          <span className="recall-icon" aria-hidden="true">!</span>
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
            <strong>Tilbakekalt: {m.recall.title}</strong>
            <span className="small">
              Du skannet «{m.product}» {new Date(m.when).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}. Sjekk om det er samme vare og parti.
            </span>
            <span className="row" style={{ gap: 12 }}>
              <a className="small" href={m.recall.url} target="_blank" rel="noreferrer">Les hos Mattilsynet</a>
              <button className="linkbtn small" onClick={() => dismiss(m.recall.url)}>Skjul</button>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
