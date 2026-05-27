-- Recovery patch for devices that have a saved family_id but no saved invite code.
-- Run this in Supabase SQL Editor if an updated device opens the setup screen
-- instead of the existing family.

create or replace function public.request_family_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  header_family_id uuid;
  header_invite_code text;
  matched_family_id uuid;
begin
  header_family_id := public.request_uuid_header('x-family-id');
  header_invite_code := public.request_header('x-family-invite-code');

  if header_family_id is not null and header_invite_code is null then
    select id
      into matched_family_id
      from public.families
     where id = header_family_id
     limit 1;

    return matched_family_id;
  end if;

  if header_family_id is not null and header_invite_code is not null then
    select id
      into matched_family_id
      from public.families
     where id = header_family_id
       and invite_code = upper(header_invite_code)
     limit 1;

    return matched_family_id;
  end if;

  if header_invite_code is null then
    return null;
  end if;

  select id
    into matched_family_id
    from public.families
   where invite_code = upper(header_invite_code)
   limit 1;

  return matched_family_id;
end;
$$;
