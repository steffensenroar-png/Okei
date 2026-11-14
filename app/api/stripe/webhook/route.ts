import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'
import { serviceDb, stripe } from '@/lib/server/stripe'
import { isInterval, isPlan, PLANS } from '@/lib/plans'

export const runtime = 'nodejs'

// Stripe sender hendelser hit. Vi lagrer abonnementer og betalinger, og regner provisjon per influencer.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response('Betaling er ikke aktivert', { status: 503 })
  const s = stripe()
  let event: Stripe.Event
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', secret)
  } catch {
    return new Response('Ugyldig signatur', { status: 400 })
  }

  const db = serviceDb()
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (subId) await upsertSubscription(s, db, subId, session.metadata ?? {})
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(s, db, sub.id, sub.metadata ?? {})
        break
      }
      case 'invoice.paid': {
        await recordInvoice(s, db, event.data.object as Stripe.Invoice)
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (pi && charge.refunded) await db.from('payments').update({ refunded: true }).eq('stripe_charge_id', pi)
        break
      }
    }
  } catch (e) {
    console.error('stripe webhook', event.type, e)
    return new Response('Feil under lagring', { status: 500 })
  }
  return new Response('ok')
}

/** Finn vår kode: først rabattkoden brukt i Stripe, ellers koden i metadata. */
async function findPromoId(db: SupabaseClient, sub: Stripe.Subscription, meta: Record<string, string>): Promise<string | null> {
  for (const d of sub.discounts ?? []) {
    const disc = typeof d === 'string' ? null : d
    const pc = disc?.promotion_code
    const pcId = typeof pc === 'string' ? pc : pc?.id
    if (pcId) {
      const { data } = await db.from('promo_codes').select('id').eq('stripe_promotion_code_id', pcId).maybeSingle()
      if (data) return data.id as string
    }
  }
  const code = meta.code || sub.metadata?.code
  if (code) {
    const { data } = await db.from('promo_codes').select('id').eq('code', code.toUpperCase()).maybeSingle()
    if (data) return data.id as string
  }
  return null
}

async function upsertSubscription(s: Stripe, db: SupabaseClient, subId: string, meta: Record<string, string>) {
  const sub = await s.subscriptions.retrieve(subId, { expand: ['discounts'] })
  const m = { ...(sub.metadata ?? {}), ...meta }
  const { data: existing } = await db.from('subscriptions').select('id, promo_code_id, user_id').eq('stripe_subscription_id', sub.id).maybeSingle()
  const plan = isPlan(m.plan) ? m.plan : null
  const interval = isInterval(m.interval) ? m.interval : (sub.items.data[0]?.price?.recurring?.interval as string | undefined) ?? null
  const unit = sub.items.data[0]?.price?.unit_amount
  const amount = unit != null ? unit / 100 : plan && interval ? PLANS[plan][interval === 'year' ? 'year' : 'month'] : null
  const periodEnd = sub.items.data[0]?.current_period_end
  const row = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    user_id: existing?.user_id ?? (m.user_id || null),
    plan,
    billing_interval: interval,
    amount_nok: amount,
    status: sub.status,
    promo_code_id: existing?.promo_code_id ?? (await findPromoId(db, sub, m)),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await db.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' }).select('id, promo_code_id, user_id').single()
  if (error) throw error
  return data as { id: string; promo_code_id: string | null; user_id: string | null }
}

async function recordInvoice(s: Stripe, db: SupabaseClient, invoice: Stripe.Invoice) {
  const subRef = invoice.parent?.subscription_details?.subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!subId) return
  // Fakturaen ved start av prøveperioden er på 0 kr og er ikke et salg.
  if (!invoice.amount_paid) return
  let { data: sub } = await db.from('subscriptions').select('id, promo_code_id, user_id').eq('stripe_subscription_id', subId).maybeSingle()
  if (!sub) sub = await upsertSubscription(s, db, subId, {})

  const amount = (invoice.amount_paid ?? 0) / 100
  const { data: settings } = await db.from('app_settings').select('key, value').eq('key', 'vat_percent').maybeSingle()
  const vat = Number(settings?.value ?? 25)
  const exVat = Math.round((amount / (1 + vat / 100)) * 100) / 100

  // Provisjon: etter avtalen til influenceren som eier koden.
  let influencerId: string | null = null
  let commission = 0
  if (sub.promo_code_id && amount > 0) {
    const { data: code } = await db.from('promo_codes').select('influencer_id').eq('id', sub.promo_code_id).maybeSingle()
    if (code?.influencer_id) {
      const { data: inf } = await db.from('influencers').select('id, commission_type, commission_value, commission_payments').eq('id', code.influencer_id).maybeSingle()
      if (inf) {
        influencerId = inf.id as string
        const { count } = await db
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_id', sub.id)
          .gt('amount_nok', 0)
          .neq('stripe_invoice_id', invoice.id)
        const n = count ?? 0
        const limit = inf.commission_payments as number | null
        if (limit == null || n < limit) {
          commission =
            inf.commission_type === 'fixed'
              ? Number(inf.commission_value)
              : Math.round(exVat * Number(inf.commission_value)) / 100
        }
      }
    }
  }

  // PaymentIntent lagres, så refusjoner kan kobles til betalingen.
  let pi: string | null = null
  try {
    const list = await s.invoicePayments.list({ invoice: invoice.id, limit: 1 })
    const p = list.data[0]?.payment?.payment_intent
    pi = typeof p === 'string' ? p : p?.id ?? null
  } catch {
    /* ikke kritisk */
  }

  const { error } = await db.from('payments').upsert(
    {
      stripe_invoice_id: invoice.id,
      stripe_charge_id: pi,
      subscription_id: sub.id,
      user_id: sub.user_id,
      amount_nok: amount,
      amount_ex_vat_nok: exVat,
      promo_code_id: sub.promo_code_id,
      influencer_id: influencerId,
      commission_nok: commission,
      paid_at: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString()
    },
    { onConflict: 'stripe_invoice_id' }
  )
  if (error) throw error
}
