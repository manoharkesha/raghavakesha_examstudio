import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon-key')
  ? createClient(url, anonKey)
  : null;

export function usernameEmail(username) {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.')}@students.zunaira.local`;
}

export async function cloudRegister({ name, password, course, year }) {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signUp({
    email: usernameEmail(name),
    password,
    options: { data: { full_name: name, course, study_year: year } }
  });
  if (error) throw error;
  if (!data.user) throw new Error('Registration did not create a user.');
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id, full_name: name, course, study_year: year, role: 'student'
  });
  if (profileError) throw profileError;
  return { id: data.user.id, name, password, course, year, role: 'student' };
}

export async function cloudLogin(name, password) {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email: usernameEmail(name), password });
  if (error) throw error;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  if (profileError) throw profileError;
  return { id: data.user.id, name: profile.full_name, course: profile.course, year: profile.study_year, role: profile.role };
}

export async function cloudSignOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function loadCloudAttempts(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('student_progress').select('attempts').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.attempts || [];
}

export async function saveCloudAttempts(userId, attempts) {
  if (!supabase) return;
  const { error } = await supabase.from('student_progress').upsert({ user_id: userId, attempts });
  if (error) throw error;
}
