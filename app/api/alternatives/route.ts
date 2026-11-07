// Forslag til alternativer: lignende varer i norske butikker som er grønne for alle valgte profiler.
// Bare for skann der vi kjenner produktnavnet (strekkode, eller navn lest fra etiketten).

import { NextResponse } from 'next/server'
import { HttpError, userClient } from '@/lib/server/auth'
import { evaluateFamily, ProductData, ProfileAllergen, StructuredStatus } from '@/lib/rules'
import { keyFromName, type AllergenKey, type ConditionKey } from '@/lib/allergens'

export const runtime = 'nodejs'
export const maxDuration = 30

const STOP = new Set(['og', 'med', 'uten', 'i', 'på', 'av', 'for', 'til', 'stk', 'pk', 'pakke', 'original', 'naturell'])

/** Lag et søk fra produktnavnet: dropp vekt, enheter, tall og merkenavn. */
function searchQuery(name: string, brand: string | null): string {
  const brandWords = new Set((brand ?? '').toLowerCase().split(/\s+/).filter(Boolean))
  const words = name
    .toLowerCase()
    .replace(/\d+([.,]\d+)?\s*(g|kg|ml|l|cl|dl|stk|pk)\b/g, ' ')
    .split(/[^a-zæøåäöü]+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !brandWords.has(w))
  return words.slice(0, 2).join(' ')
}

export async function POST(req: Request) {
  try {
    const { db } = await userClient(req)
    const { scanId } = (await req.json()) as { scanId: string }
    if (!scanId) throw new HttpError(400, 'Mangler skann')
    const key = process.env.KASSALAPP_API_KEY
    if (!key) throw new HttpError(503, 'Produktsøk er ikke satt opp')

    const { data: scan } = await db
      .from('scans')
      .select('ean, product_name, profile_ids, profile_id, result')
      .eq('id', scanId)
      .single()
    if (!scan?.product_name) throw new HttpError(404, 'Vi kjenner ikke produktnavnet, så vi kan ikke foreslå alternativer.')

    const ids: string[] = scan.profile_ids?.length ? scan.profile_ids : [scan.profile_id].filter(Boolean)
    const { data: profiles } = await db
      .from('family_profiles')
      .select('id, name, allergens, custom_terms, conditions')
      .in('id', ids)
    if (!profiles?.length) throw new HttpError(404, 'Fant ikke profilene')

    const q = searchQuery(scan.product_name, scan.result?.product?.brand ?? null)
    if (!q) return NextResponse.json({ query: '', items: [] })

    const res = await fetch(`https://kassal.app/api/v1/products?search=${encodeURIComponent(q)}&size=40`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store'
    })
    if (!res.ok) throw new HttpError(502, 'Produktsøket svarte ikke. Prøv igjen.')
    const json = await res.json()
    const list: any[] = Array.isArray(json?.data) ? json.data : []

    const seen = new Set<string>()
    const items: { name: string; brand: string | null; ean: string | null; image: string | null; price: number | null }[] = []
    for (const p of list) {
      if (items.length >= 3) break
      const ingredients = typeof p?.ingredients === 'string' ? p.ingredients.trim() : ''
      if (!ingredients || !p?.name) continue
      if (p.ean && p.ean === scan.ean) continue
      const dedupe = p.ean ? String(p.ean) : String(p.name).toLowerCase()
      if (seen.has(dedupe)) continue
      const structured: Partial<Record<AllergenKey, StructuredStatus>> = {}
      for (const a of Array.isArray(p.allergens) ? p.allergens : []) {
        const k = keyFromName(String(a?.display_name ?? a?.name ?? a?.code ?? ''))
        if (!k) continue
        const v = String(a?.contains ?? '').toUpperCase()
        const st: StructuredStatus = v === 'YES' ? 'contains' : v.includes('TRACE') ? 'traces' : v === 'NO' ? 'free' : 'unknown'
        const cur = structured[k]
        const rank = { contains: 3, traces: 2, free: 1, unknown: 0 }
        if (!cur || rank[st] > rank[cur]) structured[k] = st
      }
      const product: ProductData = { mode: 'barcode', name: p.name, ingredientsText: ingredients, source: 'Kassalapp', found: true, structured }
      const fam = evaluateFamily(
        product,
        profiles.map((r) => ({
          id: r.id,
          name: r.name,
          allergens: (r.allergens ?? []) as ProfileAllergen[],
          customTerms: r.custom_terms ?? [],
          conditions: (r.conditions ?? []) as ConditionKey[]
        }))
      )
      if (fam.flag !== 'green') continue
      seen.add(dedupe)
      items.push({
        name: p.name,
        brand: p.brand ?? null,
        ean: p.ean ?? null,
        image: p.image ?? null,
        price: typeof p.current_price === 'number' ? p.current_price : null
      })
    }
    return NextResponse.json({ query: q, items })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof HttpError ? e.message : 'Noe gikk galt. Prøv igjen.'
    if (!(e instanceof HttpError)) console.error('alternatives error', e)
    return NextResponse.json({ error: message }, { status })
  }
}
