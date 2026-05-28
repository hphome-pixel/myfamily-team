-- Add a family-level timezone.
-- Safe to run more than once.
--
-- The app treats due_date as a calendar date in this family timezone.

alter table public.families
add column if not exists timezone text not null default 'Asia/Taipei';

update public.families
   set timezone = 'Asia/Taipei'
 where timezone is null
    or trim(timezone) = '';
