import React, { useEffect, useState } from 'react';
import { EyeOff, Eye, Users } from 'lucide-react';
import { loadCloudPaperAccess, setCloudPaperStudentAccess } from './supabase';

export default function PaperAccessManager({ papers, students, cloudAdmin, setNotice }) {
  const [paperId, setPaperId] = useState(papers[0]?.id || '');
  const [disabled, setDisabled] = useState(new Set());

  useEffect(() => {
    if (papers.length && !papers.some(paper => paper.id === paperId)) setPaperId(papers[0].id);
  }, [papers, paperId]);

  useEffect(() => {
    if (!cloudAdmin) return;
    loadCloudPaperAccess().then(rows => setDisabled(new Set(rows.filter(row => row.paper_id === paperId).map(row => row.student_id)))).catch(error => setNotice(`Paper access could not load: ${error.message}`));
  }, [cloudAdmin, paperId, setNotice]);

  const toggleStudent = async (studentId) => {
    const isDisabled = disabled.has(studentId);
    try {
      if (cloudAdmin) await setCloudPaperStudentAccess(paperId, studentId, !isDisabled);
      setDisabled(current => {
        const next = new Set(current);
        if (isDisabled) next.delete(studentId); else next.add(studentId);
        return next;
      });
      setNotice(isDisabled ? 'Paper enabled for this student.' : 'Paper disabled for this student.');
    } catch (error) {
      setNotice(`Paper access could not be updated: ${error.message}`);
    }
  };

  const selectedPaper = papers.find(paper => paper.id === paperId);
  return <section className="section-block paper-access-manager">
    <div className="section-title"><div><p className="eyebrow">Selective access</p><h2>Student availability</h2></div><Users size={19} /></div>
    {!cloudAdmin && <p className="muted">Connect Supabase and sign in as an administrator to manage individual student access.</p>}
    {cloudAdmin && !papers.length && <p className="muted">Publish a paper first to manage its student availability.</p>}
    {cloudAdmin && papers.length > 0 && !students.length && <p className="muted">No student accounts are available yet.</p>}
    {cloudAdmin && papers.length > 0 && students.length > 0 && <><label>Question paper<select value={paperId} onChange={event => setPaperId(event.target.value)}>{papers.map(paper => <option key={paper.id} value={paper.id}>{paper.title}</option>)}</select></label><p className="muted">Published papers are available to everyone unless disabled below.</p><div className="admin-list">{students.map(student => { const isDisabled = disabled.has(student.id); return <div className="admin-paper" key={student.id}><div className="avatar small-avatar">{student.name.slice(0, 1).toUpperCase()}</div><div className="admin-paper-main"><strong>{student.name}</strong><span>{student.course} · {student.year}</span></div><span className={isDisabled ? 'status draft' : 'status published'}>{isDisabled ? 'Disabled' : 'Enabled'}</span><button className="icon-button" onClick={() => toggleStudent(student.id)} aria-label={`${isDisabled ? 'Enable' : 'Disable'} ${selectedPaper?.title} for ${student.name}`} title={isDisabled ? 'Enable for student' : 'Disable for student'}>{isDisabled ? <Eye size={17} /> : <EyeOff size={17} />}</button></div>; })}</div></>}
  </section>;
}
