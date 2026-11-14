-- Koblingskode kan ta med barnemodus: barnets telefon går rett i barnemodus når koden brukes.
-- Bare hash av PIN-koden lagres, og raden slettes når koden er brukt.
alter table public.family_invites add column if not exists kid_mode jsonb;
alter table public.family_invites drop constraint if exists family_invites_kid_mode_check;
alter table public.family_invites add constraint family_invites_kid_mode_check check (
  kid_mode is null or (
    jsonb_typeof(kid_mode) = 'object'
    and kid_mode ? 'pinHash'
    and length(kid_mode::text) < 600
  )
);

create or replace function public.accept_family_invite(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv public.family_invites;
  pname text;
  pemail text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into inv from public.family_invites
    where code = upper(trim(p_code)) and expires_at > now();
  if not found then raise exception 'invalid_code'; end if;
  if inv.parent_id = auth.uid() then raise exception 'own_code'; end if;
  select name into pname from public.family_profiles where id = inv.profile_id;
  select email into pemail from auth.users where id = inv.parent_id;
  insert into public.family_links (parent_id, child_id, profile_id, parent_email, child_email)
    values (inv.parent_id, auth.uid(), inv.profile_id, pemail, auth.jwt() ->> 'email')
    on conflict (child_id, profile_id) do nothing;
  delete from public.family_invites where code = inv.code;
  return json_build_object('profile', pname, 'parent', pemail, 'profile_id', inv.profile_id, 'kid_mode', inv.kid_mode);
end;
$$;
revoke all on function public.accept_family_invite(text) from public;
grant execute on function public.accept_family_invite(text) to authenticated;
