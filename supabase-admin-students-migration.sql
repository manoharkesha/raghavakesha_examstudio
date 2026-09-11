-- Run after supabase-progress-migration.sql and the admin profile policy migration.
-- Lets admins read student progress and permanently delete student Auth accounts.
drop policy if exists "Admins can view student progress" on public.student_progress;
create policy "Admins can view student progress" on public.student_progress for select using (public.is_admin() or auth.uid() = user_id);

create or replace function public.delete_student_attempt(student_id uuid, attempt_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete student answer sheets';
  end if;
  update public.student_progress
  set attempts = coalesce((
    select jsonb_agg(attempt)
    from jsonb_array_elements(attempts) as attempt
    where attempt->>'id' <> attempt_id
  ), '[]'::jsonb), updated_at = now()
  where user_id = student_id;
end;
$$;

revoke all on function public.delete_student_attempt(uuid, text) from public;
grant execute on function public.delete_student_attempt(uuid, text) to authenticated;

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

create or replace function public.change_student_password(student_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change student passwords';
  end if;
  if student_id = auth.uid() then
    raise exception 'Administrators cannot change their own password here';
  end if;
  if length(new_password) < 4 then
    raise exception 'Password must contain at least 4 characters';
  end if;
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
  where id = student_id;
  if not found then
    raise exception 'Student account was not found';
  end if;
end;
$$;

revoke all on function public.change_student_password(uuid, text) from public;
grant execute on function public.change_student_password(uuid, text) to authenticated;
