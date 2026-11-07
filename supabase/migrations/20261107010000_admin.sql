-- Selvbetjent invitasjonsliste: administratorer kan legge til og fjerne testere i appen.

create table if not exists public.beta_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.beta_admins enable row level security;
revoke all on public.beta_admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.beta_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Administratorer kan lese, legge til og fjerne e-poster på invitasjonslisten.
grant select, insert, delete on public.beta_allowlist to authenticated;
drop policy if exists "admin leser invitasjoner" on public.beta_allowlist;
create policy "admin leser invitasjoner" on public.beta_allowlist
  for select to authenticated using (public.is_admin());
drop policy if exists "admin inviterer" on public.beta_allowlist;
create policy "admin inviterer" on public.beta_allowlist
  for insert to authenticated with check (public.is_admin() and email = lower(trim(email)) and email like '%_@_%._%');
drop policy if exists "admin fjerner" on public.beta_allowlist;
create policy "admin fjerner" on public.beta_allowlist
  for delete to authenticated using (public.is_admin() and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', '')));

insert into public.beta_admins (email) values ('steffensenroar@gmail.com')
on conflict (email) do nothing;
