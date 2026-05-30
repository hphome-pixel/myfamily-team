-- Create a new family without requiring an existing family request header.
-- Safe to run more than once.

create or replace function public.create_family(family_name text, family_timezone text default 'Asia/Taipei')
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  next_code text;
  created_family public.families;
  attempt integer := 0;
begin
  loop
    attempt := attempt + 1;
    next_code := 'FAM-'
      || substr(chars, floor(random() * length(chars) + 1)::integer, 1)
      || substr(chars, floor(random() * length(chars) + 1)::integer, 1)
      || substr(chars, floor(random() * length(chars) + 1)::integer, 1)
      || substr(chars, floor(random() * length(chars) + 1)::integer, 1)
      || substr(chars, floor(random() * length(chars) + 1)::integer, 1);

    begin
      insert into public.families (name, invite_code, timezone)
      values (
        coalesce(nullif(trim(family_name), ''), '我的家'),
        next_code,
        coalesce(nullif(trim(family_timezone), ''), 'Asia/Taipei')
      )
      returning * into created_family;

      return created_family;
    exception
      when unique_violation then
        if attempt >= 10 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

grant execute on function public.create_family(text, text) to anon, service_role;
