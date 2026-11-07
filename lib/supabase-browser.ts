'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Mangler NEXT_PUBLIC_SUPABASE_URL eller NEXT_PUBLIC_SUPABASE_ANON_KEY')
  // Vern mot forveksling: bare Supabase sin offentlige nøkkel hører hjemme her.
  if (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY er ikke en Supabase-nøkkel (skal starte med sb_publishable_)')
  }
  client = createClient(url, key, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })
  return client
}
