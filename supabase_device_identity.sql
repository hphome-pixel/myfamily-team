alter table public.members
add column if not exists device_id text,
add column if not exists joined_at timestamptz not null default now();

create index if not exists members_family_device_idx
on public.members (family_id, device_id);

create index if not exists members_family_id_idx
on public.members (family_id, id);
