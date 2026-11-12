-- Profilbilde per familiemedlem. Lagres som et lite JPEG-bilde (maks ca. 100 kB) i profilen,
-- beskyttet av de samme reglene som resten av profilen. Deles ikke på allergikortet.
alter table public.family_profiles add column if not exists photo text;
alter table public.family_profiles drop constraint if exists family_profiles_photo_check;
alter table public.family_profiles add constraint family_profiles_photo_check
  check (photo is null or (length(photo) < 140000 and photo like 'data:image/jpeg;base64,%'));
