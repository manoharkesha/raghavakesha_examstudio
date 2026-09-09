-- Run after supabase-progress-migration.sql and the admin profile policy migration.
-- Lets admins read student progress and permanently delete student Auth accounts.
drop policy if exists "Admins can view student progress" on public.student_progress;
create policy "Admins can view student progress" on public.student_progress for select using (public.is_admin() or auth.uid() = user_id);

create or replace function public.delete_student_account(student_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete student accounts';
  end if;
  if student_id = auth.uid() then
    raise exception 'Administrators cannot delete their own account';
  end if;
  delete from auth.users where id = student_id;
end;
$$;

revoke all on function public.delete_student_account(uuid) from public;
grant execute on function public.delete_student_account(uuid) to authenticated;
