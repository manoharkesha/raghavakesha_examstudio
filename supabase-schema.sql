-- Run this in Supabase SQL Editor before enabling cloud persistence.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  course text not null check (course in ('C', 'C++', 'Java', 'Python')),
  study_year text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course text not null,
  publish_date date not null default current_date,
  status text not null default 'Draft' check (status in ('Draft', 'Published')),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  prompt text not null,
  position integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_text text not null,
  position integer not null,
  is_correct boolean not null default false
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  score integer not null,
  correct integer not null,
  total integer not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}'
);

alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Users can view their profile" on public.profiles;
drop policy if exists "Users can create their profile" on public.profiles;
drop policy if exists "Published papers are public" on public.papers;
drop policy if exists "Published paper questions are public" on public.questions;
drop policy if exists "Published paper options are public" on public.options;
drop policy if exists "Users can view their attempts" on public.attempts;
drop policy if exists "Users can create their attempts" on public.attempts;
drop policy if exists "Users can view their attempt answers" on public.attempt_answers;
drop policy if exists "Users can create their attempt answers" on public.attempt_answers;

create policy "Users can view their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can create their profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Published papers are public" on public.papers for select using (public.is_admin() or (status = 'Published' and publish_date <= current_date));
create policy "Published paper questions are public" on public.questions for select using (exists (select 1 from public.papers where papers.id = paper_id and (public.is_admin() or (papers.status = 'Published' and papers.publish_date <= current_date))));
create policy "Published paper options are public" on public.options for select using (exists (select 1 from public.questions join public.papers on papers.id = questions.paper_id where questions.id = question_id and (public.is_admin() or (papers.status = 'Published' and papers.publish_date <= current_date))));
create policy "Users can view their attempts" on public.attempts for select using (auth.uid() = user_id);
create policy "Users can create their attempts" on public.attempts for insert with check (auth.uid() = user_id);
create policy "Users can view their attempt answers" on public.attempt_answers for select using (exists (select 1 from public.attempts where attempts.id = attempt_id and attempts.user_id = auth.uid()));
create policy "Users can create their attempt answers" on public.attempt_answers for insert with check (exists (select 1 from public.attempts where attempts.id = attempt_id and attempts.user_id = auth.uid()));
