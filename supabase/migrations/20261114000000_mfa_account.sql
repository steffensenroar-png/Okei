-- Tofaktor for administratorer og sletting av egen konto.

-- Står e-posten på admin-listen? Brukes for å vise Admin-lenken og be om tofaktor.
create or replace function public.is_admin_member()
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
revoke all on function public.is_admin_member() from public;
grant execute on function public.is_admin_member() to authenticated;

-- Admin-rettigheter krever nå at innloggingen er bekreftet med tofaktor (aal2).
-- Alle regler og funksjoner som bruker is_admin() får dermed tofaktor-kravet automatisk.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_member() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- Reserve når service-nøkkelen ikke er lagt inn: brukeren sletter sin egen konto.
-- Alle tabeller med brukerdata slettes med (on delete cascade). Betalinger beholdes uten kobling (bokføring).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not logged in';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
