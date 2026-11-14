-- Logg over hva administratorer ser og endrer (tiltak i DPIA).
-- Loggen kan bare leses av administratorer med tofaktor, og ingen kan endre eller slette rader.

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_email text,
  action text not null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
drop policy if exists "admin leser logg" on public.admin_audit_log;
create policy "admin leser logg" on public.admin_audit_log for select to authenticated using (public.is_admin());

-- Skriver en rad. Samme visning fra samme admin logges høyst én gang per 10 minutter.
create or replace function public.admin_audit(p_action text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  who text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if p_action like 'så %' and exists (
    select 1 from public.admin_audit_log
    where admin_email = who and action = p_action and detail = coalesce(p_detail, '{}'::jsonb)
      and at > now() - interval '10 minutes'
  ) then
    return;
  end if;
  insert into public.admin_audit_log (admin_email, action, detail)
  values (nullif(who, ''), p_action, coalesce(p_detail, '{}'::jsonb));
end;
$$;
revoke all on function public.admin_audit(text, jsonb) from public;

-- Kalles fra admin-siden: innlogging med tofaktor og visning av faner.
create or replace function public.admin_log(p_action text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_action not in ('innlogget med tofaktor', 'så salg', 'så kostnader', 'så oppsett', 'så logg', 'eksporterte brukere', 'eksporterte salg') then
    raise exception 'ukjent handling';
  end if;
  if p_action = 'innlogget med tofaktor' then
    if not public.is_admin_member() then raise exception 'not admin'; end if;
  elsif not public.is_admin() then
    raise exception 'not admin';
  end if;
  perform public.admin_audit(p_action, p_detail);
end;
$$;
revoke all on function public.admin_log(text, jsonb) from public;
grant execute on function public.admin_log(text, jsonb) to authenticated;

-- Endringer i admin-tabellene logges automatisk.
create or replace function public.admin_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  key text := coalesce(rec ->> 'email', rec ->> 'code', rec ->> 'name', rec ->> 'key', rec ->> 'id');
begin
  perform public.admin_audit(
    case tg_op when 'INSERT' then 'la til' when 'UPDATE' then 'endret' else 'slettet' end || ' i ' || tg_table_name,
    jsonb_build_object('rad', key)
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['beta_admins', 'promo_codes', 'influencers', 'commission_payouts', 'costs', 'app_settings'] loop
    execute format('drop trigger if exists admin_audit on public.%I', t);
    execute format('create trigger admin_audit after insert or update or delete on public.%I for each row execute function public.admin_audit_trigger()', t);
  end loop;
end;
$$;

create or replace function public.admin_users()
returns table (
  id uuid, email text, name text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
  profiles bigint, scans bigint, last_scan timestamptz, ai_scans bigint, subscription_status text, plan text,
  is_admin boolean
)
language plpgsql volatile security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  perform public.admin_audit('så alle brukere', '{}'::jsonb);
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

create or replace function public.admin_overview(p_days integer default 30)
returns json
language plpgsql volatile security definer set search_path = public, auth as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  result json;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  perform public.admin_audit('så oversikt', jsonb_build_object('dager', p_days));
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

create or replace function public.admin_influencer_stats()
returns table (
  influencer_id uuid, codes text, customers bigint, active_customers bigint, payments bigint,
  revenue_nok numeric, commission_earned numeric, commission_paid numeric
)
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  perform public.admin_audit('så influencere', '{}'::jsonb);
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
