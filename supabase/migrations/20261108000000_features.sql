-- Nye funksjoner: meny og produkter, nødinfo og ønsker per profil, delte allergikort med gjesteskanning,
-- trygge varer og en brukslogg som ikke kan slettes (tak på bildeskann).

-- Nye skannemodi.
alter table public.scans drop constraint if exists scans_mode_check;
alter table public.scans add constraint scans_mode_check check (mode in ('barcode', 'label', 'food', 'product', 'menu'));

-- Nødinfo og ønsker per profil.
alter table public.family_profiles add column if not exists emergency_note text check (char_length(emergency_note) <= 1000);
alter table public.family_profiles add column if not exists epipen_expiry date;
alter table public.family_profiles add column if not exists wishes jsonb not null default '{}'::jsonb;

-- Delte allergikort. Lenken gir lesetilgang til valgte profiler og et lite antall gjesteskann per døgn.
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  profile_ids uuid[] not null,
  label text check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days',
  revoked boolean not null default false,
  ai_day date,
  ai_uses int not null default 0
);
alter table public.share_links enable row level security;
drop policy if exists "egne delinger" on public.share_links;
create policy "egne delinger" on public.share_links
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
grant select, insert, update, delete on public.share_links to authenticated;

-- Les et delt kort. Bare navn, dyr, allergier, tilstander, egne ord og nødinfo deles.
create or replace function public.get_shared_card(p_token text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  link public.share_links;
begin
  select * into link from public.share_links
    where token = p_token and not revoked and expires_at > now();
  if not found then return null; end if;
  return json_build_object(
    'label', link.label,
    'created_at', link.created_at,
    'profiles', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'name', p.name, 'avatar', p.avatar, 'allergens', p.allergens,
        'conditions', p.conditions, 'custom_terms', p.custom_terms, 'emergency_note', p.emergency_note
      ) order by p.created_at)
      from public.family_profiles p
      where p.id = any(link.profile_ids) and p.owner_id = link.owner_id
    ), '[]'::json)
  );
end;
$$;
revoke all on function public.get_shared_card(text) from public;
grant execute on function public.get_shared_card(text) to anon, authenticated;

-- Tell et gjesteskann med bilde. Maks 10 per lenke per døgn.
create or replace function public.use_share_scan(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  link public.share_links;
begin
  select * into link from public.share_links
    where token = p_token and not revoked and expires_at > now() for update;
  if not found then return false; end if;
  if link.ai_day is distinct from current_date then
    update public.share_links set ai_day = current_date, ai_uses = 1 where id = link.id;
    return true;
  end if;
  if link.ai_uses >= 10 then return false; end if;
  update public.share_links set ai_uses = ai_uses + 1 where id = link.id;
  return true;
end;
$$;
revoke all on function public.use_share_scan(text) from public;
grant execute on function public.use_share_scan(text) to anon, authenticated;

-- Trygge varer.
create table if not exists public.safe_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ean text not null,
  name text,
  brand text,
  image text,
  ingredients_text text,
  ingredients_hash text,
  profile_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, ean)
);
alter table public.safe_products enable row level security;
drop policy if exists "egne trygge varer" on public.safe_products;
create policy "egne trygge varer" on public.safe_products
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
grant select, insert, update, delete on public.safe_products to authenticated;

-- Brukslogg for taket på bildeskann. Kan ikke slettes av brukeren.
create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_owner_idx on public.usage_log (owner_id, created_at desc);
alter table public.usage_log enable row level security;
drop policy if exists "egen bruk lese" on public.usage_log;
create policy "egen bruk lese" on public.usage_log for select to authenticated using (owner_id = auth.uid());
drop policy if exists "egen bruk skrive" on public.usage_log;
create policy "egen bruk skrive" on public.usage_log for insert to authenticated with check (owner_id = auth.uid());
grant select, insert on public.usage_log to authenticated;
