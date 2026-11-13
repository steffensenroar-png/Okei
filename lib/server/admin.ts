import { HttpError, userClient } from './auth'

/** Innlogget bruker som også er administrator. */
export async function adminClient(req: Request) {
  const ctx = await userClient(req)
  const { data } = await ctx.db.rpc('is_admin')
  if (!data) throw new HttpError(403, 'Bare for administratorer', 'generic')
  return ctx
}
