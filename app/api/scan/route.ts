import { NextResponse } from 'next/server'
import { HttpError, userClient } from '@/lib/server/auth'
import { lookupBarcode } from '@/lib/server/products'
import { guessFood, readLabel } from '@/lib/server/vision'
import { evaluateFamily, Mode, ProductData, ProfileAllergen } from '@/lib/rules'
import type { ConditionKey } from '@/lib/allergens'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 3_500_000
const MAX_PROFILES = 8
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const

interface Body {
  mode: Mode
  profileIds?: string[]
  profileId?: string
  ean?: string
  image?: string
  mediaType?: (typeof MEDIA)[number]
}

export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)
    const body = (await req.json()) as Body

    if (!['barcode', 'label', 'food'].includes(body.mode)) throw new HttpError(400, 'Ukjent modus')
    const ids = [...new Set((body.profileIds?.length ? body.profileIds : body.profileId ? [body.profileId] : []).map(String))]
    if (!ids.length) throw new HttpError(400, 'Velg minst én profil')
    if (ids.length > MAX_PROFILES) throw new HttpError(400, 'For mange profiler')

    const { data: rows, error: pErr } = await db
      .from('family_profiles')
      .select('id, name, allergens, custom_terms, conditions, created_at')
      .in('id', ids)
      .order('created_at')
    if (pErr || !rows?.length) throw new HttpError(404, 'Fant ikke profilene')

    let product: ProductData
    if (body.mode === 'barcode') {
      const ean = String(body.ean ?? '').replace(/\D/g, '')
      if (ean.length < 8 || ean.length > 14) throw new HttpError(400, 'Ugyldig strekkode')
      product = await lookupBarcode(ean)
    } else {
      const image = String(body.image ?? '').replace(/^data:[^,]+,/, '')
      const media = MEDIA.includes(body.mediaType as any) ? body.mediaType! : 'image/jpeg'
      if (!image) throw new HttpError(400, 'Mangler bilde')
      if ((image.length * 3) / 4 > MAX_IMAGE_BYTES) throw new HttpError(413, 'Bildet er for stort')
      product = body.mode === 'label' ? await readLabel(image, media) : await guessFood(image, media)
    }

    const family = evaluateFamily(
      product,
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        allergens: (r.allergens ?? []) as ProfileAllergen[],
        customTerms: r.custom_terms ?? [],
        conditions: (r.conditions ?? []) as ConditionKey[]
      }))
    )

    const { data: scan, error: sErr } = await db
      .from('scans')
      .insert({
        owner_id: user.id,
        profile_id: rows[0].id,
        profile_ids: rows.map((r) => r.id),
        profile_name: rows.map((r) => r.name).join(', '),
        mode: body.mode,
        ean: product.ean ?? null,
        product_name: product.name ?? null,
        source: product.source,
        flag: family.flag,
        headline: family.headline,
        result: {
          family: family.people.length > 1,
          people: family.people,
          evaluation: family.people[0].evaluation,
          product: {
            name: product.name,
            brand: product.brand ?? null,
            ingredientsText: product.ingredientsText ?? null,
            tracesText: product.tracesText ?? null,
            legibility: product.legibility ?? null,
            confidence: product.confidence ?? null,
            likely: product.likely ?? null
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
