import { NextResponse } from 'next/server'
import { HttpError, userClient } from '@/lib/server/auth'
import { lookupBarcode } from '@/lib/server/products'
import { guessFood, readLabel, readMenu } from '@/lib/server/vision'
import { evaluateFamily, evaluateMenu, ProductData, ProfileAllergen } from '@/lib/rules'
import type { ConditionKey } from '@/lib/allergens'
import { evaluateWishes, Wishes } from '@/lib/wishes'
import { ingredientsHash } from '@/lib/hash'

type ScanMode = 'barcode' | 'label' | 'food' | 'product' | 'menu'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 3_500_000
const MAX_PROFILES = 8
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const

interface Body {
  mode: ScanMode
  profileIds?: string[]
  profileId?: string
  ean?: string
  image?: string
  mediaType?: (typeof MEDIA)[number]
}

const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 30)

export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)
    const body = (await req.json()) as Body

    if (!['barcode', 'label', 'food', 'product', 'menu'].includes(body.mode)) throw new HttpError(400, 'Ukjent modus')
    const ids = [...new Set((body.profileIds?.length ? body.profileIds : body.profileId ? [body.profileId] : []).map(String))]
    if (!ids.length) throw new HttpError(400, 'Velg minst én profil')
    if (ids.length > MAX_PROFILES) throw new HttpError(400, 'For mange profiler')

    // Åpen beta: tak på bildeskann (AI) per bruker per døgn. Telles i en logg som ikke kan slettes.
    if (body.mode !== 'barcode') {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count } = await db
        .from('usage_log')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('kind', 'ai')
        .gte('created_at', since)
      if ((count ?? 0) >= AI_DAILY_LIMIT)
        throw new HttpError(429, `Du har brukt ${AI_DAILY_LIMIT} bildeskann siste døgn. Strekkode virker fortsatt, og bildeskann åpner igjen i morgen.`)
      await db.from('usage_log').insert({ owner_id: user.id, kind: 'ai' })
    }

    const { data: rows, error: pErr } = await db
      .from('family_profiles')
      .select('id, name, allergens, custom_terms, conditions, wishes, created_at')
      .in('id', ids)
      .order('created_at')
    if (pErr || !rows?.length) throw new HttpError(404, 'Fant ikke profilene')

    const profiles = rows.map((r) => ({
      id: r.id,
      name: r.name,
      allergens: (r.allergens ?? []) as ProfileAllergen[],
      customTerms: r.custom_terms ?? [],
      conditions: (r.conditions ?? []) as ConditionKey[]
    }))
    const base = {
      owner_id: user.id,
      profile_id: rows[0].id,
      profile_ids: rows.map((r) => r.id),
      profile_name: rows.map((r) => r.name).join(', '),
      mode: body.mode
    }

    let image = ''
    let media: (typeof MEDIA)[number] = 'image/jpeg'
    if (body.mode !== 'barcode') {
      image = String(body.image ?? '').replace(/^data:[^,]+,/, '')
      media = MEDIA.includes(body.mediaType as any) ? body.mediaType! : 'image/jpeg'
      if (!image) throw new HttpError(400, 'Mangler bilde')
      if ((image.length * 3) / 4 > MAX_IMAGE_BYTES) throw new HttpError(413, 'Bildet er for stort')
    }

    // Meny: én vurdering per rett.
    if (body.mode === 'menu') {
      const menu = await readMenu(image, media)
      if (!menu || !menu.dishes.length) throw new HttpError(422, 'Fant ingen meny på bildet. Ta bilde av menyen eller allergenlisten, så tett at teksten er lesbar.')
      const ev = evaluateMenu(menu.dishes, profiles)
      const { data: scan, error } = await db
        .from('scans')
        .insert({
          ...base,
          product_name: menu.place ? `Meny: ${menu.place}` : 'Meny',
          source: 'Foto av meny (lest av AI)',
          flag: ev.flag,
          headline: ev.headline,
          result: { menu: true, dishes: ev.dishes, insights: ev.insights, people: [], place: menu.place }
        })
        .select('id')
        .single()
      if (error || !scan) throw new HttpError(500, 'Kunne ikke lagre resultatet')
      return NextResponse.json({ id: scan.id, flag: ev.flag })
    }

    let product: ProductData
    if (body.mode === 'barcode') {
      const ean = String(body.ean ?? '').replace(/\D/g, '')
      if (ean.length < 8 || ean.length > 14) throw new HttpError(400, 'Ugyldig strekkode')
      product = await lookupBarcode(ean)
    } else if (body.mode === 'food') {
      product = await guessFood(image, media)
    } else {
      product = await readLabel(image, media, body.mode === 'product' ? 'product' : 'food')
    }

    const family = evaluateFamily(product, profiles)
    const people = family.people.map((p) => {
      const r = rows.find((x) => x.id === p.profileId)
      const wishes = evaluateWishes(product, (r?.wishes ?? null) as Wishes | null)
      return wishes.length ? { ...p, wishes } : p
    })

    // Trygg vare med ny ingrediensliste?
    let changed: { savedAt: string; oldText: string | null } | null = null
    if (product.ean && product.ingredientsText) {
      const { data: safe } = await db
        .from('safe_products')
        .select('ingredients_hash, ingredients_text, created_at')
        .eq('ean', product.ean)
        .maybeSingle()
      const now = ingredientsHash(product.ingredientsText)
      if (safe?.ingredients_hash && now && safe.ingredients_hash !== now) {
        changed = { savedAt: safe.created_at, oldText: safe.ingredients_text }
      }
    }

    const { data: scan, error: sErr } = await db
      .from('scans')
      .insert({
        ...base,
        ean: product.ean ?? null,
        product_name: product.name ?? null,
        source: product.source,
        flag: family.flag,
        headline: family.headline,
        result: {
          family: people.length > 1,
          people,
          evaluation: people[0].evaluation,
          insights: family.insights,
          changed,
          fetchedAt: new Date().toISOString(),
          product: {
            name: product.name,
            brand: product.brand ?? null,
            ean: product.ean ?? null,
            image: product.image ?? null,
            ingredientsText: product.ingredientsText ?? null,
            tracesText: product.tracesText ?? null,
            legibility: product.legibility ?? null,
            confidence: product.confidence ?? null,
            likely: product.likely ?? null,
            nutrition: product.nutrition ?? null,
            grainInfo: product.grainInfo ?? null,
            keyhole: product.keyhole ?? false,
            labels: product.labels ?? [],
            glutenFreeClaim: product.glutenFreeClaim ?? false
          }
        }
      })
      .select('id')
      .single()
    if (sErr || !scan) throw new HttpError(500, 'Kunne ikke lagre resultatet')

    return NextResponse.json({ id: scan.id, flag: family.flag })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof HttpError ? e.message : 'Noe gikk galt. Prøv igjen.'
    if (!(e instanceof HttpError)) console.error('scan error', e)
    return NextResponse.json({ error: message }, { status })
  }
}
