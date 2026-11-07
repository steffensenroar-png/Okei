-- Okei beta 0.1: profiler, skann og invitasjonsliste.
-- All tilgang går via radnivåtilgang (RLS): hver bruker ser bare sine egne data,
-- og bare inviterte e-postadresser (beta_allowlist) slipper til.

create extension if not exists pgcrypto;

-- Invitasjonsliste. Ingen policies: bare tilgjengelig via is_beta() og SQL-editoren.
create table if not exists public.beta_allowlist (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.beta_allowlist enable row level security;

create or replace function public.is_beta()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.beta_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_beta() from public;
grant execute on function public.is_beta() to authenticated;

-- Godkjenning av vilkår.
create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "egne innstillinger" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid() and public.is_beta())
  with check (user_id = auth.uid() and public.is_beta());

-- Familieprofiler. allergens = [{ "key": "milk", "severity": "severe" }, ...]
create table if not exists public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  birth_year int check (birth_year between 1900 and 2100),
  allergens jsonb not null default '[]'::jsonb check (jsonb_typeof(allergens) = 'array'),
  custom_terms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists family_profiles_owner_idx on public.family_profiles (owner_id);
alter table public.family_profiles enable row level security;
create policy "egne profiler" on public.family_profiles
  for all to authenticated
  using (owner_id = auth.uid() and public.is_beta())
  with check (owner_id = auth.uid() and public.is_beta());

-- Skann. Bilder lagres aldri; bare resultatet.
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_id uuid references public.family_profiles (id) on delete set null,
  profile_name text,
  mode text not null check (mode in ('barcode', 'label', 'food')),
  ean text,
  product_name text,
  source text,
  flag text not null check (flag in ('red', 'yellow', 'green')),
  headline text not null,
  result jsonb not null default '{}'::jsonb,
  feedback text check (char_length(feedback) <= 2000),
  feedback_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists scans_owner_created_idx on public.scans (owner_id, created_at desc);
alter table public.scans enable row level security;
create policy "egne skann" on public.scans
  for all to authenticated
  using (owner_id = auth.uid() and public.is_beta())
  with check (owner_id = auth.uid() and public.is_beta());

-- Hold updated_at oppdatert.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists family_profiles_touch on public.family_profiles;
create trigger family_profiles_touch before update on public.family_profiles
  for each row execute function public.touch_updated_at();

-- Eksplisitte tilganger (prosjektet eksponerer ikke nye tabeller automatisk).
-- Innloggede brukere får tabelltilgang; RLS-policyene over avgjør hvilke rader.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.family_profiles, public.scans, public.user_settings to authenticated;
revoke all on public.beta_allowlist from anon, authenticated;
revoke all on public.family_profiles, public.scans, public.user_settings from anon;

-- Betatesterne. Legg til flere med: insert into public.beta_allowlist (email) values ('navn@eksempel.no');
insert into public.beta_allowlist (email) values ('steffensenroar@gmail.com')
on conflict (email) do nothing;
