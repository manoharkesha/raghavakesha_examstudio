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

export async function loadCloudStudents() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('id, full_name, course, study_year, role').eq('role', 'student').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(profile => ({ id: profile.id, name: profile.full_name, course: profile.course, year: profile.study_year, role: profile.role }));
}

export async function loadCloudPaperAccess() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('paper_student_access').select('paper_id, student_id');
  if (error) throw error;
  return data || [];
}

export async function setCloudPaperStudentAccess(paperId, studentId, disabled) {
  if (!supabase) return;
  if (disabled) {
    const { error } = await supabase.from('paper_student_access').upsert({ paper_id: paperId, student_id: studentId });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('paper_student_access').delete().eq('paper_id', paperId).eq('student_id', studentId);
  if (error) throw error;
}

export async function loadCloudStudentAttempts() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('student_progress').select('user_id, attempts');
  if (error) throw error;
  return (data || []).flatMap(row => (row.attempts || []).map(attempt => ({ ...attempt, userId: row.user_id })));
}

export async function deleteCloudStudent(userId) {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_student_account', { student_id: userId });
  if (error) throw error;
}

export async function deleteCloudStudentAttempt(userId, attemptId) {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_student_attempt', { student_id: userId, attempt_id: attemptId });
  if (error) throw error;
}

export async function updateCloudStudentAttemptComment(userId, attemptId, comment) {
  if (!supabase) return;
  const { error } = await supabase.rpc('update_student_attempt_comment', { student_id: userId, attempt_id: attemptId, comment_text: comment });
  if (error) throw error;
}

export async function changeCloudStudentPassword(userId, newPassword) {
  if (!supabase) return;
  const { error } = await supabase.rpc('change_student_password', { student_id: userId, new_password: newPassword });
  if (error) throw error;
}

export async function loadCloudPapers(includeDrafts = false) {
  if (!supabase) return [];
  let query = supabase.from('papers').select('id, title, course, publish_date, status, questions(id, prompt, position, options(id, option_text, position, is_correct))').order('publish_date', { ascending: false });
  if (!includeDrafts) query = query.eq('status', 'Published');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(paper => ({
    id: paper.id,
    title: paper.title,
    course: paper.course,
    date: paper.publish_date,
    status: paper.status,
    questions: (paper.questions || []).sort((a, b) => a.position - b.position).map(question => ({
      id: question.id,
      text: question.prompt,
      options: (question.options || []).sort((a, b) => a.position - b.position).map(option => option.option_text),
      answers: (question.options || []).filter(option => option.is_correct).sort((a, b) => a.position - b.position).map(option => option.position)
    }))
  }));
}

export async function saveCloudPaper(paper) {
  if (!supabase) return;
  const { data: savedPaper, error: paperError } = await supabase.from('papers').insert({ title: paper.title, course: paper.course, publish_date: paper.date, status: paper.status }).select('id').single();
  if (paperError) throw paperError;
  for (const [questionIndex, question] of paper.questions.entries()) {
    const { data: savedQuestion, error: questionError } = await supabase.from('questions').insert({ paper_id: savedPaper.id, prompt: question.text, position: questionIndex }).select('id').single();
    if (questionError) throw questionError;
    const { error: optionsError } = await supabase.from('options').insert(question.options.map((option, optionIndex) => ({ question_id: savedQuestion.id, option_text: option, position: optionIndex, is_correct: (question.answers || []).includes(optionIndex) })));
    if (optionsError) throw optionsError;
  }
  return savedPaper.id;
}

export async function updateCloudPaperStatus(paperId, status, paper) {
  if (!supabase) return;
  let query = supabase.from('papers').update({ status }).eq('id', paperId);
  if (paperId.startsWith('paper-') && paper) query = supabase.from('papers').update({ status }).eq('title', paper.title).eq('publish_date', paper.date);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteCloudPaper(paperId, paper) {
  if (!supabase) return;
  let query = supabase.from('papers').delete().eq('id', paperId);
  if (paperId.startsWith('paper-') && paper) query = supabase.from('papers').delete().eq('title', paper.title).eq('publish_date', paper.date);
  const { error } = await query;
  if (error) throw error;
}
