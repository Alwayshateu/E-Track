-- E-Track — multiple exams (migration 0004).
-- Prerequisite: schema.sql and migrations 0001 through 0003.
-- Run before deploying the application with PRACTICE_UNITS_SOURCE=supabase.
-- Existing units become IELTS; IDs, foreign keys, policies and legacy RPC stay intact.
-- Re-runnable on the repository schema. Constraint names below are PostgreSQL's
-- generated names for the inline checks in 0001_practice_sessions.sql.

begin;

alter table public.practice_units
  add column if not exists exam text not null default 'ielts';

-- Also complete a partially applied nullable-column upgrade without reclassifying
-- any row that already has an exam. Unknown non-null values fail the check.
update public.practice_units set exam = 'ielts' where exam is null;
alter table public.practice_units alter column exam set default 'ielts';
alter table public.practice_units alter column exam set not null;
alter table public.practice_units drop constraint if exists practice_units_exam_check;
alter table public.practice_units add constraint practice_units_exam_check
  check (exam in ('ielts', 'cet4', 'cet6'));

alter table public.practice_units drop constraint if exists practice_units_skill_check;
alter table public.practice_units add constraint practice_units_skill_check
  check (skill in ('foundation', 'reading', 'listening', 'writing', 'speaking', 'translation'));

alter table public.practice_units drop constraint if exists practice_units_material_type_check;
alter table public.practice_units add constraint practice_units_material_type_check
  check (material_type in (
    'none', 'passage', 'audio', 'writing_prompt', 'speaking_prompt',
    'foundation_note', 'translation_prompt'
  ));

-- CET subtypes live in metadata.cetTask. No question_type expansion is needed.
-- All other checks, collection foreign keys, RLS and grants remain unchanged.

commit;
