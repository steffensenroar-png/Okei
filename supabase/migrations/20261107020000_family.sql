-- Tilstander (cøliaki, laktoseintoleranse) på profiler, og skann mot flere profiler.
alter table public.family_profiles
  add column if not exists conditions text[] not null default '{}';

alter table public.scans
  add column if not exists profile_ids uuid[] not null default '{}';
