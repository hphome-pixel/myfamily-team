-- Member invite codes for stable per-person identity links.
-- Safe to run more than once.

create extension if not exists pgcrypto;

alter table public.members
add column if not exists member_code text;

update public.members
   set member_code = 'mem_' || replace(gen_random_uuid()::text, '-', '')
 where member_code is null
    or trim(member_code) = '';

create unique index if not exists members_family_member_code_unique_idx
on public.members (family_id, member_code)
where member_code is not null;
