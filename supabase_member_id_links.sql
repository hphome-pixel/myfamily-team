alter table public.tasks
add column if not exists owner_member_id uuid references public.members(id) on delete set null,
add column if not exists author_member_id uuid references public.members(id) on delete set null;

alter table public.messages
add column if not exists actor_member_id uuid references public.members(id) on delete set null;

alter table public.push_subscriptions
add column if not exists member_id uuid references public.members(id) on delete set null;

update public.tasks task
set owner_member_id = member.id
from public.members member
where task.owner_member_id is null
  and task.family_id = member.family_id
  and task.owner = member.name;

update public.tasks task
set author_member_id = member.id
from public.members member
where task.author_member_id is null
  and task.family_id = member.family_id
  and task.author = member.name;

update public.messages message
set actor_member_id = member.id
from public.members member
where message.actor_member_id is null
  and message.family_id = member.family_id
  and message.actor = member.name;

update public.push_subscriptions push
set member_id = member.id
from public.members member
where push.member_id is null
  and push.family_id = member.family_id
  and push.member_name = member.name;

create index if not exists tasks_owner_member_idx
on public.tasks (family_id, owner_member_id);

create index if not exists tasks_author_member_idx
on public.tasks (family_id, author_member_id);

create index if not exists messages_actor_member_idx
on public.messages (family_id, actor_member_id);

create index if not exists push_subscriptions_member_idx
on public.push_subscriptions (family_id, member_id);
