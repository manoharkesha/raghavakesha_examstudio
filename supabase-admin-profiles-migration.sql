-- Run this once in Supabase SQL Editor so administrators can count and list registered students.
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

drop policy if exists "Admins can view student profiles" on public.profiles;
create policy "Admins can view student profiles" on public.profiles for select using (auth.uid() = id or public.is_admin());
