-- Åpen beta: alle innloggede brukere slipper inn. Invitasjonslisten beholdes, men brukes ikke til tilgang.
create or replace function public.is_beta()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;
revoke all on function public.is_beta() from public;
grant execute on function public.is_beta() to authenticated;

-- Dyreavatar per profil.
alter table public.family_profiles add column if not exists avatar text;
