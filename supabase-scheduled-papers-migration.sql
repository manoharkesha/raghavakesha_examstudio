-- Run this after supabase-schema.sql and supabase-paper-access-migration.sql.
-- Published papers become visible to students on publish_date.
drop policy if exists "Published papers are public" on public.papers;
drop policy if exists "Published paper questions are public" on public.questions;
drop policy if exists "Published paper options are public" on public.options;

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

create policy "Published paper questions are public" on public.questions for select using (
  exists (
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
  )
);

create policy "Published paper options are public" on public.options for select using (
  exists (
    select 1
    from public.questions
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
  )
);