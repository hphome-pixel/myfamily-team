-- Native app push tokens for Android FCM and future iOS APNs/FCM.
-- Safe to run more than once.

create table if not exists public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  member_name text not null,
  device_id text not null,
  platform text not null check (platform in ('android', 'ios')),
  token text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists native_push_tokens_family_idx
on public.native_push_tokens (family_id);

create index if not exists native_push_tokens_member_idx
on public.native_push_tokens (family_id, member_id);

create index if not exists native_push_tokens_device_idx
on public.native_push_tokens (family_id, device_id);

alter table public.native_push_tokens enable row level security;

drop policy if exists "native push same family select" on public.native_push_tokens;
drop policy if exists "native push same family insert" on public.native_push_tokens;
drop policy if exists "native push owner or admin update" on public.native_push_tokens;
drop policy if exists "native push owner or admin delete" on public.native_push_tokens;

create policy "native push same family select"
on public.native_push_tokens for select
using (public.request_same_family(family_id));

create policy "native push same family insert"
on public.native_push_tokens for insert
with check (public.request_same_family(family_id));

create policy "native push owner or admin update"
on public.native_push_tokens for update
using (
  public.request_same_family(family_id)
  and (
    member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
)
with check (public.request_same_family(family_id));

create policy "native push owner or admin delete"
on public.native_push_tokens for delete
using (
  public.request_same_family(family_id)
  and (
    member_id = public.request_member_id()
    or public.request_is_family_admin(family_id)
  )
);

grant select, insert, update, delete on public.native_push_tokens to anon, service_role;
