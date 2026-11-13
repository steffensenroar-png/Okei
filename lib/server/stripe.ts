// Stripe og service-tilgang til databasen. Begge er av til nøklene er lagt inn i Vercel.
import Stripe from 'stripe'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './auth'

export function stripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, 'Betaling er ikke aktivert ennå', 'payments_off')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

/** Databasetilgang uten innlogget bruker, for Stripe-webhooken. */
export function serviceDb(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new HttpError(503, 'Mangler SUPABASE_SERVICE_ROLE_KEY', 'payments_off')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export interface PromoRow {
  id: string
  code: string
  discount_type: 'none' | 'percent' | 'amount' | 'free'
  discount_value: number
  discount_months: number | null
  max_redemptions: number | null
  expires_at: string | null
  active: boolean
  stripe_coupon_id: string | null
  stripe_promotion_code_id: string | null
}

/** Lager rabatten og koden i Stripe. Koder uten rabatt finnes bare hos oss (sporing). */
export async function syncPromoToStripe(row: PromoRow): Promise<{ coupon: string | null; promo: string | null }> {
  if (row.discount_type === 'none') return { coupon: null, promo: null }
  if (row.stripe_promotion_code_id) return { coupon: row.stripe_coupon_id, promo: row.stripe_promotion_code_id }
  const s = stripe()
  const duration: { duration: 'once' | 'repeating' | 'forever'; duration_in_months?: number } =
    row.discount_months == null ? { duration: 'forever' } : row.discount_months === 1 ? { duration: 'once' } : { duration: 'repeating', duration_in_months: row.discount_months }
  const coupon = await s.coupons.create({
    name: `Okei ${row.code}`,
    ...(row.discount_type === 'amount'
      ? { amount_off: Math.round(row.discount_value * 100), currency: 'nok' }
      : { percent_off: row.discount_type === 'free' ? 100 : row.discount_value }),
    ...duration,
    metadata: { okei_code_id: row.id }
  })
  const promo = await s.promotionCodes.create({
    promotion: { type: 'coupon', coupon: coupon.id },
    code: row.code,
    active: row.active,
    ...(row.max_redemptions ? { max_redemptions: row.max_redemptions } : {}),
    ...(row.expires_at ? { expires_at: Math.floor(new Date(row.expires_at).getTime() / 1000) } : {}),
    metadata: { okei_code_id: row.id }
  })
  return { coupon: coupon.id, promo: promo.id }
}
