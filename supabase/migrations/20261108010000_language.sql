-- Valgt hovedspråk følger kontoen mellom enheter.
alter table public.user_settings add column if not exists language text;
alter table public.user_settings drop constraint if exists user_settings_language_check;
alter table public.user_settings add constraint user_settings_language_check
  check (language is null or language in ('no','en','sv','da','fi','de','es','fr','it'));
