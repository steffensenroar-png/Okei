-- Profilbildet vises på det delte allergikortet, så barnehage og verter kjenner igjen barnet.
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
        'id', p.id, 'name', p.name, 'avatar', p.avatar, 'photo', p.photo, 'allergens', p.allergens,
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
