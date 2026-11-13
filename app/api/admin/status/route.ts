import { NextResponse } from 'next/server'
import { errorResponse } from '@/lib/server/auth'
import { adminClient } from '@/lib/server/admin'

export const runtime = 'nodejs'

// Hvilke nøkler er lagt inn? Verdiene vises aldri.
export async function GET(req: Request) {
  try {
    await adminClient(req)
    return NextResponse.json({
      stripe: !!process.env.STRIPE_SECRET_KEY,
      stripeLive: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_'),
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
    })
  } catch (e) {
    return errorResponse(e, 'admin status')
  }
}
