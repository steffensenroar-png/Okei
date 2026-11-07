// Forslag til alternativer: lignende varer i norske butikker som er grønne for alle valgte profiler.
// Bare for skann der vi kjenner produktnavnet (strekkode, eller navn lest fra etiketten).

import { NextResponse } from 'next/server'
import { errorResponse, HttpError, userClient } from '@/lib/server/auth'
import { evaluateFamily, ProductData, ProfileAllergen, StructuredStatus } from '@/lib/rules'
import { keyFromName, type AllergenKey, type ConditionKey } from '@/lib/allergens'
import { mapNutrition } from '@/lib/server/products'
import { evaluateWishes, hasWishes, Wishes } from '@/lib/wishes'

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
    if (!scan?.product_name) throw new HttpError(404, 'Vi kjenner ikke produktnavnet, så vi kan ikke foreslå alternativer.', 'no_product_name')

    const ids: string[] = scan.profile_ids?.length ? scan.profile_ids : [scan.profile_id].filter(Boolean)
    const { data: profiles } = await db
      .from('family_profiles')
      .select('id, name, allergens, custom_terms, conditions, wishes')
      .in('id', ids)
    if (!profiles?.length) throw new HttpError(404, 'Fant ikke profilene', 'no_profiles')

    const q = searchQuery(scan.product_name, scan.result?.product?.brand ?? null)
    if (!q) return NextResponse.json({ query: '', items: [] })

    const res = await fetch(`https://kassal.app/api/v1/products?search=${encodeURIComponent(q)}&size=40`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store'
    })
    if (!res.ok) throw new HttpError(502, 'Produktsøket svarte ikke. Prøv igjen.', 'search_down')
    const json = await res.json()
    const list: any[] = Array.isArray(json?.data) ? json.data : []

    // Ønsker fra alle valgte profiler slås sammen: strengeste grense vinner.
    const wishes: Wishes = {}
    for (const r of profiles) {
      const w = (r.wishes ?? {}) as Wishes
      if (w.lowcarb != null) wishes.lowcarb = Math.min(wishes.lowcarb ?? 1e9, w.lowcarb)
      if (w.lowsugar != null) wishes.lowsugar = Math.min(wishes.lowsugar ?? 1e9, w.lowsugar)
      for (const k of ['fiber', 'wholegrain', 'keyhole', 'vegetarian', 'vegan'] as const) if (w[k]) wishes[k] = true
    }
    const useWishes = hasWishes(wishes)

    const seen = new Set<string>()
    const items: { name: string; brand: string | null; ean: string | null; image: string | null; price: number | null; notes: string[]; score: number }[] = []
    for (const p of list) {
      if (items.length >= (useWishes ? 12 : 3)) break
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
      const labels = (Array.isArray(p.labels) ? p.labels : []).map((l: any) => String(l?.display_name ?? l?.name ?? ''))
      const product: ProductData = {
        mode: 'barcode',
        name: p.name,
        ingredientsText: ingredients,
        source: 'Kassalapp',
        found: true,
        structured,
        nutrition: mapNutrition(Array.isArray(p.nutrition) ? p.nutrition : []),
        labels,
        keyhole: labels.some((l: string) => /nøkkelhull/i.test(l))
      }
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
      const notes = useWishes ? evaluateWishes(product, wishes) : []
      if (notes.some((n) => n.ok === false && (n.key === 'vegan' || n.key === 'vegetarian'))) continue
      seen.add(dedupe)
      items.push({
        name: p.name,
        brand: p.brand ?? null,
        ean: p.ean ?? null,
        image: p.image ?? null,
        price: typeof p.current_price === 'number' ? p.current_price : null,
        notes: notes.filter((n) => n.ok === true).map((n) => n.label),
        score: notes.filter((n) => n.ok === true).length - notes.filter((n) => n.ok === false).length
      })
    }
    // Varer som oppfyller flest ønsker først.
    items.sort((a, b) => b.score - a.score)
    return NextResponse.json({ query: q, items: items.slice(0, 3).map(({ score, ...i }) => i) })
  } catch (e) {
    return errorResponse(e, 'alternatives error')
  }
}
