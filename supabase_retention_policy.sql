-- 90-day retention policy for Family Workspace.
-- Safe to run more than once.
--
-- Rules:
-- - Chat messages: delete after 90 days.
-- - Completed tasks: delete after 90 days.
-- - Open tasks: keep.
-- - Family and member profiles: keep.

create or replace function public.cleanup_old_family_data(retention_days integer default 90)
returns table(deleted_messages bigint, deleted_done_tasks bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff_timestamp timestamptz := now() - make_interval(days => retention_days);
begin
  delete from public.messages
   where created_at < cutoff_timestamp;

  get diagnostics deleted_messages = row_count;

  delete from public.tasks
   where done = true
     and coalesce(last_completed_date::timestamptz, created_at) < cutoff_timestamp;

  get diagnostics deleted_done_tasks = row_count;

  return next;
end;
$$;

revoke all on function public.cleanup_old_family_data(integer) from anon;
grant execute on function public.cleanup_old_family_data(integer) to service_role;

do $$
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception
    when insufficient_privilege or undefined_file then
      raise notice 'pg_cron is not available. Function cleanup_old_family_data() was created; schedule it manually if needed.';
  end;

  if exists (
    select 1
      from pg_proc proc
      join pg_namespace namespace on namespace.oid = proc.pronamespace
     where namespace.nspname = 'cron'
       and proc.proname = 'schedule'
  ) then
    execute $schedule$
      select cron.unschedule(jobid)
        from cron.job
       where jobname = 'family_workspace_retention_90d'
    $schedule$;

    execute $schedule$
      select cron.schedule(
        'family_workspace_retention_90d',
        '17 19 * * *',
        'select * from public.cleanup_old_family_data(90);'
      )
    $schedule$;
  else
    raise notice 'pg_cron schedule was not created. Function cleanup_old_family_data() is ready for manual or external scheduling.';
  end if;
exception
  when others then
    raise notice 'Retention cleanup function was created, but automatic schedule was not created: %', sqlerrm;
end;
$$;
