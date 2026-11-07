import { NextResponse } from 'next/server'
import { HttpError, userClient } from '@/lib/server/auth'
import { lookupBarcode } from '@/lib/server/products'
import { guessFood, readLabel } from '@/lib/server/vision'
import { evaluate, Mode, ProductData, ProfileAllergen } from '@/lib/rules'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 3_500_000
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'] as const

interface Body {
  mode: Mode
  profileId: string
  ean?: string
  image?: string
  mediaType?: (typeof MEDIA)[number]
}

export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)
    const body = (await req.json()) as Body

    if (!['barcode', 'label', 'food'].includes(body.mode)) throw new HttpError(400, 'Ukjent modus')
    if (!body.profileId) throw new HttpError(400, 'Velg en profil')

    const { data: profile, error: pErr } = await db
      .from('family_profiles')
      .select('id, name, allergens, custom_terms')
      .eq('id', body.profileId)
      .single()
    if (pErr || !profile) throw new HttpError(404, 'Fant ikke profilen')

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

    const evaluation = evaluate(product, {
      name: profile.name,
      allergens: (profile.allergens ?? []) as ProfileAllergen[],
      customTerms: profile.custom_terms ?? []
    })

    const { data: scan, error: sErr } = await db
      .from('scans')
      .insert({
        owner_id: user.id,
        profile_id: profile.id,
        profile_name: profile.name,
        mode: body.mode,
        ean: product.ean ?? null,
        product_name: product.name ?? null,
        source: product.source,
        flag: evaluation.flag,
        headline: evaluation.headline,
        result: {
          evaluation,
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

    return NextResponse.json({ id: scan.id, flag: evaluation.flag })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof HttpError ? e.message : 'Noe gikk galt. Prøv igjen.'
    if (!(e instanceof HttpError)) console.error('scan error', e)
    return NextResponse.json({ error: message }, { status })
  }
}
