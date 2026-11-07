import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 21600 // 6 timer

// Tilbakekallinger fra Mattilsynet som gjelder allergener. Leses fra den offentlige oversikten og caches.
// Matchingen mot familiens skann skjer i nettleseren, så ingen persondata sendes noe sted.

const BASE = 'https://www.mattilsynet.no'
const ALLERGEN_RE =
  /allergen|udeklarert|ikke deklarert|manglende (allergi)?merking|feil etikett|melk|egg|gluten|hvete|nøtt|mandl|mandel|peanøtt|sennep|soya|sesam|selleri|skalldyr|reker|fisk|lupin|sulfitt|bløtdyr/i

export interface Recall {
  title: string
  url: string
  eans: string[]
  published: string | null
}

function strip(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

async function get(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Okei/0.1 (allergiapp, beta)' }, next: { revalidate } })
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

export async function GET() {
  const list: Recall[] = []
  const seen = new Set<string>()
  for (const page of [0, 1, 2, 3]) {
    const html = await get(`${BASE}/tilbakekallinger${page ? `?index=${page}` : ''}`)
    if (!html) continue
    const re = /href="((?:https:\/\/www\.mattilsynet\.no)?\/tilbakekallinger\/[a-z0-9\-]+)"[^>]*>([\s\S]*?)<\/a>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      const url = m[1].startsWith('http') ? m[1] : BASE + m[1]
      const title = strip(m[2])
      if (!title || seen.has(url) || !ALLERGEN_RE.test(title)) continue
      seen.add(url)
      list.push({ title, url, eans: [], published: null })
    }
  }
  // Hent detaljer for de nyeste, for strekkoder og dato.
  await Promise.all(
    list.slice(0, 20).map(async (r) => {
      const html = await get(r.url)
      if (!html) return
      const text = strip(html)
      r.eans = [...new Set(text.match(/\b\d{8}(?:\d{4,6})?\b/g) ?? [])].filter((x) => x.length === 8 || x.length === 13)
      const d = text.match(/Publisert\s*(\d{1,2}\.\d{1,2}\.\d{4})/)
      r.published = d ? d[1] : null
    })
  )
  return NextResponse.json({ recalls: list.slice(0, 40), fetchedAt: new Date().toISOString() })
}
