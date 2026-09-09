-- Run this after supabase-schema.sql. The signed-in admin must have a profiles row with role = 'admin'.
drop policy if exists "Admins can create papers" on public.papers;
drop policy if exists "Admins can update papers" on public.papers;
drop policy if exists "Admins can delete papers" on public.papers;
drop policy if exists "Admins can create questions" on public.questions;
drop policy if exists "Admins can create options" on public.options;

create policy "Admins can create papers" on public.papers for insert with check (public.is_admin());
create policy "Admins can update papers" on public.papers for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete papers" on public.papers for delete using (public.is_admin());
create policy "Admins can create questions" on public.questions for insert with check (public.is_admin());
create policy "Admins can create options" on public.options for insert with check (public.is_admin());
