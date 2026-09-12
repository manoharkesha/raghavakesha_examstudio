-- Run after supabase-schema.sql and the profile policy migrations.
-- Stores every student/admin message as a permanent conversation record.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('student', 'admin')),
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
drop policy if exists "Students can view their messages" on public.messages;
drop policy if exists "Admins can view all messages" on public.messages;
drop policy if exists "Students can send messages" on public.messages;
drop policy if exists "Admins can send messages" on public.messages;
create policy "Students can view their messages" on public.messages for select using (auth.uid() = student_id);
create policy "Admins can view all messages" on public.messages for select using (public.is_admin());
create policy "Students can send messages" on public.messages for insert with check (auth.uid() = student_id and auth.uid() = sender_id and sender_role = 'student');
create policy "Admins can send messages" on public.messages for insert with check (public.is_admin() and auth.uid() = sender_id and sender_role = 'admin');