create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_name text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "public read push_subscriptions" on public.push_subscriptions;
drop policy if exists "public insert push_subscriptions" on public.push_subscriptions;
drop policy if exists "public update push_subscriptions" on public.push_subscriptions;
drop policy if exists "public delete push_subscriptions" on public.push_subscriptions;

create policy "public read push_subscriptions"
on public.push_subscriptions for select
using (true);

create policy "public insert push_subscriptions"
on public.push_subscriptions for insert
with check (true);

create policy "public update push_subscriptions"
on public.push_subscriptions for update
using (true)
with check (true);

create policy "public delete push_subscriptions"
on public.push_subscriptions for delete
using (true);

grant select, insert, update, delete on public.push_subscriptions to anon;
