import { NextResponse } from 'next/server'
import { errorResponse, HttpError } from '@/lib/server/auth'
import { adminClient } from '@/lib/server/admin'
import { PromoRow, stripe, stripeEnabled, syncPromoToStripe } from '@/lib/server/stripe'

export const runtime = 'nodejs'

const COLS = 'id, code, discount_type, discount_value, discount_months, max_redemptions, expires_at, active, stripe_coupon_id, stripe_promotion_code_id'

// Lag en kode (og rabatten i Stripe hvis Stripe er koblet til), synk en eksisterende, eller slå av/på.
export async function POST(req: Request) {
  try {
    const { db } = await adminClient(req)
    const body = (await req.json()) as {
      action: 'create' | 'sync' | 'toggle'
      id?: string
      code?: string
      influencer_id?: string | null
      discount_type?: PromoRow['discount_type']
      discount_value?: number
      discount_months?: number | null
      max_redemptions?: number | null
      expires_at?: string | null
    }

    let row: PromoRow
    if (body.action === 'create') {
      const code = String(body.code ?? '').trim().toUpperCase()
      if (!/^[A-Z0-9-]{3,30}$/.test(code)) throw new HttpError(400, 'Koden kan ha 3–30 tegn: bokstaver A–Z, tall og bindestrek.', 'generic')
      const type = body.discount_type ?? 'none'
      const value = Number(body.discount_value ?? 0)
      if (type === 'percent' && !(value > 0 && value <= 100)) throw new HttpError(400, 'Prosent må være mellom 1 og 100.', 'generic')
      if (type === 'amount' && !(value > 0)) throw new HttpError(400, 'Beløpet må være over 0.', 'generic')
      const { data, error } = await db
        .from('promo_codes')
        .insert({
          code,
          influencer_id: body.influencer_id || null,
          discount_type: type,
          discount_value: type === 'free' || type === 'none' ? 0 : value,
          discount_months: type === 'none' ? null : body.discount_months ?? 1,
          max_redemptions: body.max_redemptions || null,
          expires_at: body.expires_at || null
        })
        .select(COLS)
        .single()
      if (error) throw new HttpError(400, error.code === '23505' ? 'Koden finnes allerede.' : 'Kunne ikke lagre koden.', 'generic')
      row = data as PromoRow
    } else {
      const { data } = await db.from('promo_codes').select(COLS).eq('id', body.id ?? '').single()
      if (!data) throw new HttpError(404, 'Fant ikke koden', 'generic')
      row = data as PromoRow
      if (body.action === 'toggle') {
        const active = !row.active
        await db.from('promo_codes').update({ active }).eq('id', row.id)
        if (row.stripe_promotion_code_id && stripeEnabled()) await stripe().promotionCodes.update(row.stripe_promotion_code_id, { active })
        return NextResponse.json({ ok: true, active })
      }
    }

    // Rabatten opprettes i Stripe når Stripe er koblet til. Ellers synkes den senere.
    if (stripeEnabled() && row.discount_type !== 'none' && !row.stripe_promotion_code_id) {
      const ids = await syncPromoToStripe(row)
      await db.from('promo_codes').update({ stripe_coupon_id: ids.coupon, stripe_promotion_code_id: ids.promo }).eq('id', row.id)
      return NextResponse.json({ ok: true, synced: true })
    }
    return NextResponse.json({ ok: true, synced: false })
  } catch (e) {
    return errorResponse(e, 'admin codes')
  }
}
