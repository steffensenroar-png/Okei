import { NextResponse } from 'next/server'
import { errorResponse, HttpError, userClient } from '@/lib/server/auth'
import { serviceDb, stripe, stripeEnabled } from '@/lib/server/stripe'

export const runtime = 'nodejs'

// Sletter hele kontoen til innlogget bruker. Aktive abonnement i Stripe sies opp først,
// så ingen blir trukket etter at kontoen er borte.
export async function POST(req: Request) {
  try {
    const { db, user } = await userClient(req)

    const { data: subs } = await db
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'])
    const open = (subs ?? []).map((s) => s.stripe_subscription_id as string | null).filter((x): x is string => !!x)
    if (open.length) {
      if (!stripeEnabled()) throw new HttpError(503, 'Abonnementet kan ikke sies opp akkurat nå', 'generic')
      for (const id of open) {
        try {
          await stripe().subscriptions.cancel(id)
        } catch (e) {
          const code = (e as { code?: string }).code
          if (code !== 'resource_missing') throw e
        }
      }
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { error } = await serviceDb().auth.admin.deleteUser(user.id)
      if (error) throw error
    } else {
      const { error } = await db.rpc('delete_my_account')
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e, 'account delete')
  }
}
