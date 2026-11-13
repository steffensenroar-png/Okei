import { NextResponse } from 'next/server'
import { errorResponse, HttpError, userClient } from '@/lib/server/auth'
import { stripe } from '@/lib/server/stripe'
import { isInterval, isPlan, PLANS } from '@/lib/plans'

export const runtime = 'nodejs'

// Starter Stripe Checkout for et abonnement. En influencer-kode kan sendes med (fra lenke eller felt).
export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)
    const body = (await req.json()) as { plan?: string; interval?: string; code?: string }
    if (!isPlan(body.plan) || !isInterval(body.interval)) throw new HttpError(400, 'Ukjent abonnement', 'generic')
    const plan = PLANS[body.plan]
    const amount = body.interval === 'year' ? plan.year : plan.month
    const s = stripe()

    // Koden sjekkes hos oss. Rabattkoder brukes direkte i Stripe, rene sporingskoder går som metadata.
    let promoId: string | null = null
    let codeName = ''
    if (body.code) {
      const { data } = await db.rpc('check_promo_code', { p_code: body.code })
      if (!data) throw new HttpError(400, 'Koden finnes ikke eller er utløpt', 'bad_code')
      codeName = data.code as string
      const { data: row } = await db.from('promo_codes').select('stripe_promotion_code_id').eq('code', codeName).maybeSingle()
      promoId = (row?.stripe_promotion_code_id as string | null) ?? null
    }

    const origin = new URL(req.url).origin
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'nok',
            unit_amount: amount * 100,
            recurring: { interval: body.interval },
            product_data: { name: plan.name }
          }
        }
      ],
      ...(promoId ? { discounts: [{ promotion_code: promoId }] } : { allow_promotion_codes: true }),
      metadata: { user_id: user.id, plan: body.plan, interval: body.interval, code: codeName },
      subscription_data: { metadata: { user_id: user.id, plan: body.plan, interval: body.interval, code: codeName } },
      success_url: `${origin}/abonnement?ok=1`,
      cancel_url: `${origin}/abonnement`
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return errorResponse(e, 'checkout')
  }
}
