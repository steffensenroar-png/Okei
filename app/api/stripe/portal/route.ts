import { NextResponse } from 'next/server'
import { errorResponse, HttpError, userClient } from '@/lib/server/auth'
import { stripe } from '@/lib/server/stripe'

export const runtime = 'nodejs'

// Åpner Stripes kundeportal, der brukeren kan bytte kort, se kvitteringer og si opp.
export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)
    const { data } = await db
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const customer = data?.stripe_customer_id as string | undefined
    if (!customer) throw new HttpError(404, 'Fant ikke abonnementet', 'generic')
    const origin = new URL(req.url).origin
    const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${origin}/abonnement` })
    return NextResponse.json({ url: portal.url })
  } catch (e) {
    return errorResponse(e, 'portal')
  }
}
