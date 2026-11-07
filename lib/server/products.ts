// Produktoppslag på strekkode: Kassalapp (norske varer) først, så Open Food Facts.

import { AllergenKey, keyFromName } from '../allergens'
import { ProductData, StructuredStatus } from '../rules'

const TIMEOUT_MS = 8000

async function getJson(url: string, headers: Record<string, string>): Promise<any | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function mapContains(v: unknown): StructuredStatus {
  const s = String(v ?? '').toUpperCase()
  if (s === 'YES' || s === 'TRUE' || s === 'CONTAINS') return 'contains'
  if (s.includes('TRACE') || s === 'MAY_CONTAIN') return 'traces'
  if (s === 'NO' || s === 'FALSE') return 'free'
  return 'unknown'
}

const RANK: Record<StructuredStatus, number> = { contains: 3, traces: 2, free: 1, unknown: 0 }

function mergeStructured(
  into: Partial<Record<AllergenKey, StructuredStatus>>,
  key: AllergenKey,
  status: StructuredStatus
) {
  const cur = into[key]
  if (!cur || RANK[status] > RANK[cur]) into[key] = status
}

export async function kassalapp(ean: string): Promise<ProductData | null> {
  const key = process.env.KASSALAPP_API_KEY
  if (!key) return null
  const json = await getJson(`https://kassal.app/api/v1/products/ean/${encodeURIComponent(ean)}`, {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json'
  })
  const data = json?.data
  if (!data) return null
  const products: any[] = Array.isArray(data.products) ? data.products : []
  if (!products.length) return null

  const first = products[0]
  const ingredients = products.map((p) => p?.ingredients).find((x) => typeof x === 'string' && x.trim()) ?? null

  const structured: Partial<Record<AllergenKey, StructuredStatus>> = {}
  const allergenLists: any[] = [data.allergens, ...products.map((p) => p?.allergens)].filter(Array.isArray)
  for (const list of allergenLists) {
    for (const a of list) {
      const k = keyFromName(String(a?.display_name ?? a?.name ?? a?.code ?? ''))
      if (k) mergeStructured(structured, k, mapContains(a?.contains))
    }
  }

  return {
    mode: 'barcode',
    name: first?.name ?? null,
    brand: first?.brand ?? first?.vendor ?? null,
    ean,
    ingredientsText: ingredients,
    structured,
    source: 'Kassalapp (norske dagligvarekjeder)',
    found: true
  }
}

const OFF_TAGS: Record<string, AllergenKey> = {
  'en:milk': 'milk',
  'en:eggs': 'egg',
  'en:peanuts': 'peanut',
  'en:nuts': 'nuts',
  'en:gluten': 'gluten',
  'en:soybeans': 'soy',
  'en:fish': 'fish',
  'en:crustaceans': 'crustaceans',
  'en:molluscs': 'molluscs',
  'en:sesame-seeds': 'sesame',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:lupin': 'lupin'
}

export async function openFoodFacts(ean: string): Promise<ProductData | null> {
  const fields = 'product_name,product_name_no,product_name_nb,brands,ingredients_text,ingredients_text_no,ingredients_text_nb,ingredients_text_en,allergens_tags,traces_tags'
  const json = await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${fields}`,
    { 'User-Agent': 'Okei/0.1 (lukket beta)', Accept: 'application/json' }
  )
  const p = json?.product
  if (!p || json?.status === 0) return null

  const structured: Partial<Record<AllergenKey, StructuredStatus>> = {}
  for (const tag of p.allergens_tags ?? []) if (OFF_TAGS[tag]) mergeStructured(structured, OFF_TAGS[tag], 'contains')
  for (const tag of p.traces_tags ?? []) if (OFF_TAGS[tag]) mergeStructured(structured, OFF_TAGS[tag], 'traces')

  const ingredients =
    [p.ingredients_text_no, p.ingredients_text_nb, p.ingredients_text, p.ingredients_text_en].find(
      (x: unknown) => typeof x === 'string' && x.trim()
    ) ?? null

  return {
    mode: 'barcode',
    name: p.product_name_no || p.product_name_nb || p.product_name || null,
    brand: p.brands || null,
    ean,
    ingredientsText: ingredients,
    structured,
    source: 'Open Food Facts (åpen, brukerbidratt database)',
    found: true
  }
}

export async function lookupBarcode(ean: string): Promise<ProductData> {
  const k = await kassalapp(ean)
  if (k && (k.ingredientsText || Object.keys(k.structured ?? {}).length)) return k
  const o = await openFoodFacts(ean)
  if (o && (o.ingredientsText || Object.keys(o.structured ?? {}).length)) {
    return { ...o, name: k?.name ?? o.name, brand: k?.brand ?? o.brand }
  }
  if (k) return k
  if (o) return o
  return { mode: 'barcode', ean, source: 'Ingen treff', found: false }
}
