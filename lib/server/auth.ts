import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public params?: Record<string, string | number>
  ) {
    super(message)
  }
}

/** Standard feilsvar med kode, så appen kan vise meldingen på brukerens språk. */
export function errorResponse(e: unknown, label: string) {
  const status = e instanceof HttpError ? e.status : 500
  const message = e instanceof HttpError ? e.message : 'Noe gikk galt. Prøv igjen.'
  if (!(e instanceof HttpError)) console.error(label, e)
  return Response.json(
    { error: message, code: e instanceof HttpError ? e.code ?? 'generic' : 'generic', params: e instanceof HttpError ? e.params : undefined },
    { status }
  )
}

/**
 * Lager en Supabase-klient som opptrer som innlogget bruker (via access token),
 * slik at radnivåtilgang (RLS) gjelder for alle spørringer.
 */
export async function userClient(req: Request): Promise<{ db: SupabaseClient; user: User }> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new HttpError(401, 'Ikke innlogget', 'not_logged_in')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Ugyldig innlogging', 'not_logged_in')

  const { data: beta, error: betaErr } = await db.rpc('is_beta')
  if (betaErr) throw new HttpError(500, 'Kunne ikke sjekke tilgang')
  if (!beta) throw new HttpError(403, 'Du er ikke invitert til betaen ennå')

  return { db, user: data.user }
}

/** Klient uten innlogging (for delte allergikort). Bare security definer-funksjoner gir tilgang. */
export function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
