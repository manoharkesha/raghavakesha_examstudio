-- Run after supabase-admin-papers-migration.sql.
-- Adds per-student paper exclusions. Published papers remain available to everyone
-- unless an admin adds a row here for that student.
create table if not exists public.paper_student_access (
  paper_id uuid not null references public.papers(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (paper_id, student_id)
);

alter table public.paper_student_access enable row level security;

drop policy if exists "Admins can view paper access" on public.paper_student_access;
drop policy if exists "Admins can manage paper access" on public.paper_student_access;
drop policy if exists "Students can view their paper access" on public.paper_student_access;
create policy "Admins can view paper access" on public.paper_student_access for select using (public.is_admin());
create policy "Admins can manage paper access" on public.paper_student_access for all using (public.is_admin()) with check (public.is_admin());
create policy "Students can view their paper access" on public.paper_student_access for select using (auth.uid() = student_id);

drop policy if exists "Published papers are public" on public.papers;
create policy "Published papers are public" on public.papers for select using (
  public.is_admin()
  or (
    status = 'Published'
    and publish_date <= current_date
    and not exists (
      select 1 from public.paper_student_access
      where paper_id = papers.id and student_id = auth.uid()
    )
  )
);

drop policy if exists "Published paper questions are public" on public.questions;
create policy "Published paper questions are public" on public.questions for select using (exists (
  select 1 from public.papers
  where papers.id = paper_id
    and (public.is_admin() or (
      papers.status = 'Published'
      and papers.publish_date <= current_date
      and not exists (
        select 1 from public.paper_student_access
        where paper_student_access.paper_id = papers.id and student_id = auth.uid()
      )
    ))
));

drop policy if exists "Published paper options are public" on public.options;
create policy "Published paper options are public" on public.options for select using (exists (
  select 1 from public.questions
  join public.papers on papers.id = questions.paper_id
  where questions.id = question_id
    and (public.is_admin() or (
      papers.status = 'Published'
      and papers.publish_date <= current_date
      and not exists (
        select 1 from public.paper_student_access
        where paper_student_access.paper_id = papers.id and student_id = auth.uid()
      )
    ))
));