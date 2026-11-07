-- Familiekobling: et barn med egen innlogging kobles til en profil i forelderens familie.
-- Barnet skanner mot den profilen; forelderen ser barnets skann.

-- Engangskoder som forelderen lager for én profil. Gyldig i 7 dager.
create table if not exists public.family_invites (
  code text primary key default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid not null references public.family_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.family_invites enable row level security;
drop policy if exists "egne koder" on public.family_invites;
create policy "egne koder" on public.family_invites
  for all to authenticated
  using (parent_id = auth.uid())
  with check (
    parent_id = auth.uid()
    and exists (select 1 from public.family_profiles p where p.id = profile_id and p.owner_id = auth.uid())
  );

-- Koblinger. Opprettes bare via accept_family_invite(); begge parter kan se og fjerne dem.
create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.family_profiles (id) on delete cascade,
  parent_email text,
  child_email text,
  created_at timestamptz not null default now(),
  unique (child_id, profile_id),
  check (parent_id <> child_id)
);
create index if not exists family_links_parent_idx on public.family_links (parent_id);
alter table public.family_links enable row level security;
drop policy if exists "se egne koblinger" on public.family_links;
create policy "se egne koblinger" on public.family_links
  for select to authenticated
  using (parent_id = auth.uid() or child_id = auth.uid());
drop policy if exists "fjerne egne koblinger" on public.family_links;
create policy "fjerne egne koblinger" on public.family_links
  for delete to authenticated
  using (parent_id = auth.uid() or child_id = auth.uid());

-- Hjelpefunksjoner (security definer for å unngå RLS-rekursjon mellom tabellene).
create or replace function public.my_linked_profile_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select profile_id from public.family_links where child_id = auth.uid();
$$;
create or replace function public.my_child_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select child_id from public.family_links where parent_id = auth.uid();
$$;
revoke all on function public.my_linked_profile_ids() from public;
revoke all on function public.my_child_ids() from public;
grant execute on function public.my_linked_profile_ids() to authenticated;
grant execute on function public.my_child_ids() to authenticated;

-- Barnet kan lese (ikke endre) profilen det er koblet til.
drop policy if exists "koblede profiler" on public.family_profiles;
create policy "koblede profiler" on public.family_profiles
  for select to authenticated
  using (id in (select public.my_linked_profile_ids()));

-- Forelderen kan lese (ikke endre) barnas skann.
drop policy if exists "barnas skann" on public.scans;
create policy "barnas skann" on public.scans
  for select to authenticated
  using (owner_id in (select public.my_child_ids()));

-- Bruk en kode. Koden slettes når den er brukt.
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
  return json_build_object('profile', pname, 'parent', pemail);
end;
$$;
revoke all on function public.accept_family_invite(text) from public;
grant execute on function public.accept_family_invite(text) to authenticated;

grant select, insert, delete on public.family_invites to authenticated;
grant select, delete on public.family_links to authenticated;
