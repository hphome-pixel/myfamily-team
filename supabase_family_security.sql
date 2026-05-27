-- MVP family-scoped security.
-- Run this after publishing a frontend version that sends:
-- x-family-id, x-family-invite-code, x-member-id, x-device-id.

create or replace function public.request_header(header_name text)
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> lower(header_name), '');
$$;

create or replace function public.request_uuid_header(header_name text)
returns uuid
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := public.request_header(header_name);
  if raw_value is null then
    return null;
  end if;
  return raw_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

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

create or replace function public.request_member_id()
returns uuid
language sql
stable
as $$
  select public.request_uuid_header('x-member-id');
$$;

create or replace function public.request_is_family_admin(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.members
     where family_id = target_family_id
       and id = public.request_member_id()
       and role = 'admin'
  );
$$;

create or replace function public.request_same_family(target_family_id uuid)
returns boolean
language sql
stable
as $$
  select target_family_id is not null
     and target_family_id = public.request_family_id();
$$;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('families', 'members', 'tasks', 'messages', 'push_subscriptions')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "family select by invite"
on public.families for select
using (id = public.request_family_id());

create policy "family create"
on public.families for insert
with check (true);

create policy "family admin update"
on public.families for update
using (public.request_is_family_admin(id))
with check (public.request_is_family_admin(id));

create policy "family admin delete"
on public.families for delete
using (public.request_is_family_admin(id));

create policy "members same family select"
on public.members for select
using (public.request_same_family(family_id));

create policy "members same family insert"
on public.members for insert
with check (public.request_same_family(family_id));

create policy "members self or admin update"
on public.members for update
using (
  public.request_same_family(family_id)
  and (id = public.request_member_id() or public.request_is_family_admin(family_id))
)
with check (public.request_same_family(family_id));

create policy "members admin delete"
on public.members for delete
using (
  public.request_same_family(family_id)
  and public.request_is_family_admin(family_id)
);

create policy "tasks same family select"
on public.tasks for select
using (public.request_same_family(family_id));

create policy "tasks same family insert"
on public.tasks for insert
with check (public.request_same_family(family_id));

create policy "tasks assignee creator or admin update"
on public.tasks for update
using (
  public.request_same_family(family_id)
  and (
    owner_member_id = public.request_member_id()
    or author_member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
)
with check (public.request_same_family(family_id));

create policy "tasks creator or admin delete"
on public.tasks for delete
using (
  public.request_same_family(family_id)
  and (
    author_member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
);

create policy "messages same family select"
on public.messages for select
using (public.request_same_family(family_id));

create policy "messages same family insert"
on public.messages for insert
with check (public.request_same_family(family_id));

create policy "messages actor or admin update"
on public.messages for update
using (
  public.request_same_family(family_id)
  and (
    actor_member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
)
with check (public.request_same_family(family_id));

create policy "messages actor or admin delete"
on public.messages for delete
using (
  public.request_same_family(family_id)
  and (
    actor_member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
);

create policy "push same family select"
on public.push_subscriptions for select
using (public.request_same_family(family_id));

create policy "push same family insert"
on public.push_subscriptions for insert
with check (public.request_same_family(family_id));

create policy "push owner or admin update"
on public.push_subscriptions for update
using (
  public.request_same_family(family_id)
  and (
    member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
)
with check (public.request_same_family(family_id));

create policy "push owner or admin delete"
on public.push_subscriptions for delete
using (
  public.request_same_family(family_id)
  and (
    member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
);

grant usage on schema public to anon, service_role;
grant select, insert, update, delete on
  public.families,
  public.members,
  public.tasks,
  public.messages,
  public.push_subscriptions
to anon, service_role;

grant usage, select on all sequences in schema public to anon, service_role;
