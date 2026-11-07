import { NextResponse } from 'next/server'
import { anonClient, HttpError } from '@/lib/server/auth'
import { lookupBarcode } from '@/lib/server/products'
import { readLabel } from '@/lib/server/vision'
import { evaluateFamily, ProductData, ProfileAllergen } from '@/lib/rules'
import type { ConditionKey } from '@/lib/allergens'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 3_500_000
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Gjesteskann fra et delt allergikort. Lagrer ingenting. Bildeskann er begrenset per lenke. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string
      mode?: 'barcode' | 'label'
      ean?: string
      image?: string
      mediaType?: (typeof MEDIA)[number]
    }
    const token = String(body.token ?? '')
    if (!/^[0-9a-f]{32,64}$/.test(token)) throw new HttpError(400, 'Ugyldig lenke')
    const db = anonClient()
    const { data: card } = await db.rpc('get_shared_card', { p_token: token })
    if (!card) throw new HttpError(404, 'Lenken er utløpt eller trukket tilbake')

    let product: ProductData
    if (body.mode === 'barcode') {
      const ean = String(body.ean ?? '').replace(/\D/g, '')
      if (ean.length < 8 || ean.length > 14) throw new HttpError(400, 'Ugyldig strekkode')
      product = await lookupBarcode(ean)
    } else if (body.mode === 'label') {
      const { data: ok } = await db.rpc('use_share_scan', { p_token: token })
      if (!ok) throw new HttpError(429, 'Lenken har brukt opp bildeskannene for i dag. Strekkode virker fortsatt.')
      const image = String(body.image ?? '').replace(/^data:[^,]+,/, '')
      const media = MEDIA.includes(body.mediaType as any) ? body.mediaType! : 'image/jpeg'
      if (!image) throw new HttpError(400, 'Mangler bilde')
      if ((image.length * 3) / 4 > MAX_IMAGE_BYTES) throw new HttpError(413, 'Bildet er for stort')
      product = await readLabel(image, media)
    } else throw new HttpError(400, 'Ukjent modus')

    const profiles = (card.profiles as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      allergens: (p.allergens ?? []) as ProfileAllergen[],
      customTerms: p.custom_terms ?? [],
      conditions: (p.conditions ?? []) as ConditionKey[]
    }))
    if (!profiles.length) throw new HttpError(404, 'Kortet har ingen profiler')
    const family = evaluateFamily(product, profiles)
    return NextResponse.json({
      flag: family.flag,
      headline: family.headline,
      insights: family.insights,
      people: family.people.map((p) => ({ name: p.name, flag: p.evaluation.flag, headline: p.evaluation.headline })),
      product: { name: product.name ?? null, ingredientsText: product.ingredientsText ?? null, source: product.source }
    })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof HttpError ? e.message : 'Noe gikk galt. Prøv igjen.'
    if (!(e instanceof HttpError)) console.error('guest scan error', e)
    return NextResponse.json({ error: message }, { status })
  }
}
