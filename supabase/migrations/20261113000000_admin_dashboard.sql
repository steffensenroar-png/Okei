-- Admin-dashboard: brukere, bruk, kostnader, salg og influencer-koder.
-- Alt her er bare for administratorer (is_admin). Stripe-webhooken skriver med service-rollen.

-- ---------- Administratorer ----------
grant select, insert, delete on public.beta_admins to authenticated;
drop policy if exists "admin ser admins" on public.beta_admins;
create policy "admin ser admins" on public.beta_admins for select to authenticated using (public.is_admin());
drop policy if exists "admin legger til admin" on public.beta_admins;
create policy "admin legger til admin" on public.beta_admins for insert to authenticated
  with check (public.is_admin() and email = lower(trim(email)) and email like '%_@_%._%');
drop policy if exists "admin fjerner admin" on public.beta_admins;
create policy "admin fjerner admin" on public.beta_admins for delete to authenticated
  using (public.is_admin() and lower(email) <> lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------- Innstillinger (priser for AI, mva) ----------
create table if not exists public.app_settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
grant select, insert, update on public.app_settings to authenticated;
drop policy if exists "admin innstillinger" on public.app_settings;
create policy "admin innstillinger" on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
insert into public.app_settings (key, value) values
  ('ai_usd_per_mtok_in', 3), ('ai_usd_per_mtok_out', 15), ('usd_nok', 10.5), ('vat_percent', 25)
on conflict (key) do nothing;

-- ---------- Tokenforbruk per AI-kall ----------
alter table public.usage_log add column if not exists input_tokens integer;
alter table public.usage_log add column if not exists output_tokens integer;
alter table public.usage_log add column if not exists model text;
create index if not exists usage_log_created_idx on public.usage_log (created_at desc);

-- ---------- Influencere og koder ----------
create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  channel text,
  commission_type text not null default 'percent' check (commission_type in ('percent', 'fixed')),
  commission_value numeric not null default 0 check (commission_value >= 0),
  -- Hvor mange betalinger per kunde som gir provisjon. null = alle.
  commission_payments integer check (commission_payments is null or commission_payments > 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.influencers enable row level security;
grant select, insert, update, delete on public.influencers to authenticated;
drop policy if exists "admin influencere" on public.influencers;
create policy "admin influencere" on public.influencers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,30}$'),
  influencer_id uuid references public.influencers (id) on delete set null,
  discount_type text not null default 'percent' check (discount_type in ('none', 'percent', 'amount', 'free')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  -- Hvor mange måneder rabatten varer. null = for alltid.
  discount_months integer check (discount_months is null or discount_months > 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  expires_at timestamptz,
  active boolean not null default true,
  stripe_coupon_id text,
  stripe_promotion_code_id text unique,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
grant select, insert, update, delete on public.promo_codes to authenticated;
drop policy if exists "admin koder" on public.promo_codes;
create policy "admin koder" on public.promo_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Er en kode gyldig? Brukes av betalingssiden uten å vise noe annet.
create or replace function public.check_promo_code(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('code', c.code, 'discount_type', c.discount_type, 'discount_value', c.discount_value,
    'discount_months', c.discount_months)
  from public.promo_codes c
  where c.code = upper(trim(p_code)) and c.active and (c.expires_at is null or c.expires_at > now())
$$;
revoke all on function public.check_promo_code(text) from public;
grant execute on function public.check_promo_code(text) to authenticated;

-- ---------- Abonnementer og betalinger (skrives av Stripe-webhooken) ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text,
  billing_interval text,
  amount_nok numeric,
  status text,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
grant select on public.subscriptions to authenticated;
drop policy if exists "eget abonnement" on public.subscriptions;
create policy "eget abonnement" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text unique,
  stripe_charge_id text,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  amount_nok numeric not null,
  amount_ex_vat_nok numeric not null,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  influencer_id uuid references public.influencers (id) on delete set null,
  commission_nok numeric not null default 0,
  refunded boolean not null default false,
  paid_at timestamptz not null default now()
);
create index if not exists payments_paid_idx on public.payments (paid_at desc);
alter table public.payments enable row level security;
grant select on public.payments to authenticated;
drop policy if exists "admin betalinger" on public.payments;
create policy "admin betalinger" on public.payments for select to authenticated using (public.is_admin());

create table if not exists public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers (id) on delete cascade,
  amount_nok numeric not null check (amount_nok > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.commission_payouts enable row level security;
grant select, insert, delete on public.commission_payouts to authenticated;
drop policy if exists "admin utbetalinger" on public.commission_payouts;
create policy "admin utbetalinger" on public.commission_payouts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Kostnader lagt inn for hånd ----------
create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  category text not null,
  description text,
  amount_nok numeric not null check (amount_nok >= 0),
  monthly boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.costs enable row level security;
grant select, insert, update, delete on public.costs to authenticated;
drop policy if exists "admin kostnader" on public.costs;
create policy "admin kostnader" on public.costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Alle brukere ----------
create or replace function public.admin_users()
returns table (
  id uuid, email text, name text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
  profiles bigint, scans bigint, last_scan timestamptz, ai_scans bigint, subscription_status text, plan text,
  is_admin boolean
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
  select u.id, u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')::text,
    coalesce(u.raw_app_meta_data ->> 'provider', '')::text,
    u.created_at, u.last_sign_in_at,
    (select count(*) from public.family_profiles p where p.owner_id = u.id),
    (select count(*) from public.scans s where s.owner_id = u.id),
    (select max(s.created_at) from public.scans s where s.owner_id = u.id),
    (select count(*) from public.usage_log l where l.owner_id = u.id and l.kind = 'ai'),
    (select sb.status from public.subscriptions sb where sb.user_id = u.id order by sb.created_at desc limit 1),
    (select sb.plan from public.subscriptions sb where sb.user_id = u.id order by sb.created_at desc limit 1),
    exists (select 1 from public.beta_admins a where lower(a.email) = lower(u.email))
  from auth.users u
  order by u.created_at desc;
end;
$$;
revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;

-- ---------- Nøkkeltall og daglige serier ----------
create or replace function public.admin_overview(p_days integer default 30)
returns json
language plpgsql stable security definer set search_path = public, auth as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  result json;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select json_build_object(
    'users_total', (select count(*) from auth.users),
    'users_new', (select count(*) from auth.users where created_at >= since),
    'users_active', (select count(distinct owner_id) from public.scans where created_at >= since),
    'profiles_total', (select count(*) from public.family_profiles),
    'scans_total', (select count(*) from public.scans),
    'scans_period', (select count(*) from public.scans where created_at >= since),
    'scans_by_mode', (select coalesce(json_object_agg(mode, n), '{}'::json) from (
        select mode, count(*) n from public.scans where created_at >= since group by mode) m),
    'flags', (select coalesce(json_object_agg(flag, n), '{}'::json) from (
        select flag, count(*) n from public.scans where created_at >= since group by flag) f),
    'ai_period', (select count(*) from public.usage_log where kind = 'ai' and created_at >= since),
    'ai_with_tokens', (select count(*) from public.usage_log where kind = 'ai_tokens' and created_at >= since),
    'tokens_in', (select coalesce(sum(input_tokens), 0) from public.usage_log where kind = 'ai_tokens' and created_at >= since),
    'tokens_out', (select coalesce(sum(output_tokens), 0) from public.usage_log where kind = 'ai_tokens' and created_at >= since),
    'share_links', (select count(*) from public.share_links where not revoked and expires_at > now()),
    'subs_active', (select count(*) from public.subscriptions where status in ('active', 'trialing')),
    'mrr', (select coalesce(sum(case when billing_interval = 'year' then amount_nok / 12 else amount_nok end), 0)
            from public.subscriptions where status in ('active', 'trialing')),
    'revenue_period', (select coalesce(sum(amount_nok), 0) from public.payments where not refunded and paid_at >= since),
    'revenue_total', (select coalesce(sum(amount_nok), 0) from public.payments where not refunded),
    'commission_earned', (select coalesce(sum(commission_nok), 0) from public.payments where not refunded),
    'commission_paid', (select coalesce(sum(amount_nok), 0) from public.commission_payouts),
    'costs_period', (select coalesce(sum(amount_nok), 0) from public.costs where month >= date_trunc('month', since)::date),
    'daily', (select json_agg(json_build_object(
        'day', d::date,
        'signups', (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'),
        'scans', (select count(*) from public.scans s where s.created_at >= d and s.created_at < d + interval '1 day'),
        'ai', (select count(*) from public.usage_log l where l.kind = 'ai' and l.created_at >= d and l.created_at < d + interval '1 day'),
        'revenue', (select coalesce(sum(p.amount_nok), 0) from public.payments p where not p.refunded and p.paid_at >= d and p.paid_at < d + interval '1 day')
      ) order by d)
      from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_overview(integer) from public;
grant execute on function public.admin_overview(integer) to authenticated;

-- ---------- Resultat per influencer ----------
create or replace function public.admin_influencer_stats()
returns table (
  influencer_id uuid, codes text, customers bigint, active_customers bigint, payments bigint,
  revenue_nok numeric, commission_earned numeric, commission_paid numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
  select i.id,
    (select string_agg(c.code, ', ' order by c.code) from public.promo_codes c where c.influencer_id = i.id),
    (select count(*) from public.subscriptions s join public.promo_codes c on c.id = s.promo_code_id where c.influencer_id = i.id),
    (select count(*) from public.subscriptions s join public.promo_codes c on c.id = s.promo_code_id
       where c.influencer_id = i.id and s.status in ('active', 'trialing')),
    (select count(*) from public.payments p where p.influencer_id = i.id and not p.refunded),
    (select coalesce(sum(p.amount_nok), 0) from public.payments p where p.influencer_id = i.id and not p.refunded),
    (select coalesce(sum(p.commission_nok), 0) from public.payments p where p.influencer_id = i.id and not p.refunded),
    (select coalesce(sum(o.amount_nok), 0) from public.commission_payouts o where o.influencer_id = i.id)
  from public.influencers i;
end;
$$;
revoke all on function public.admin_influencer_stats() from public;
grant execute on function public.admin_influencer_stats() to authenticated;
