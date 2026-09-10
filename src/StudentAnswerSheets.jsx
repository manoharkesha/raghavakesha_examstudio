import React, { useMemo, useState } from 'react';
import { Eye, RotateCcw, Search } from 'lucide-react';

function initials(name = '') {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST';
}

export default function StudentAnswerSheets({ store, setReviewAttempt }) {
  const [paperFilter, setPaperFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const rows = useMemo(() => store.users.flatMap(user => store.attempts.filter(attempt => attempt.userId === user.id).map(attempt => ({
    user,
    attempt,
    paper: store.papers.find(item => item.id === attempt.paperId)
  }))), [store.users, store.attempts, store.papers]);
  const students = [...new Map(rows.map(row => [row.user.id, row.user])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const papers = [...new Map(rows.map(row => [row.attempt.paperId, row.paper || { id: row.attempt.paperId, title: row.attempt.title }])).values()].sort((a, b) => a.title.localeCompare(b.title));
  const filteredRows = rows.filter(({ user, attempt }) => (
    (paperFilter === 'all' || attempt.paperId === paperFilter)
    && (studentFilter === 'all' || user.id === studentFilter)
    && (!dateFilter || new Date(attempt.completedAt).toISOString().slice(0, 10) === dateFilter)
  )).sort((a, b) => b.attempt.completedAt - a.attempt.completedAt);
  const clearFilters = () => { setPaperFilter('all'); setStudentFilter('all'); setDateFilter(''); };

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Classroom directory</p><h1>Student answer sheets</h1><p className="muted">Every paper attempt is listed separately so you can review all submitted answers.</p></div></div>
    <div className="filter-bar answer-sheet-filters"><label><Search size={15} /> Paper<select value={paperFilter} onChange={event => setPaperFilter(event.target.value)}><option value="all">All papers</option>{papers.map(paper => <option key={paper.id} value={paper.id}>{paper.title}</option>)}</select></label><label>Student<select value={studentFilter} onChange={event => setStudentFilter(event.target.value)}><option value="all">All students</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label>Date<input type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)} /></label><button className="secondary-button" onClick={clearFilters}><RotateCcw size={15} /> Reset</button></div>
    <div className="table-wrap"><table><thead><tr><th>Student</th><th>Paper</th><th>Date</th><th>Score</th><th>Actions</th></tr></thead><tbody>{filteredRows.length ? filteredRows.map(({ user, attempt, paper }) => <tr key={attempt.id}><td><div className="student-cell"><div className="avatar small-avatar">{initials(user.name)}</div><strong>{user.name}</strong></div><small>{user.course} · {user.year}</small></td><td><strong>{attempt.title}</strong><small>{paper ? `${paper.questions.length} questions` : 'Paper deleted'}</small></td><td>{new Date(attempt.completedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td><strong className={attempt.score >= 70 ? 'good-score' : 'low-score'}>{attempt.score}%</strong><small>{attempt.correct}/{attempt.total} correct</small></td><td><div className="result-actions">{paper ? <button className="review-button" onClick={() => setReviewAttempt({ paper, attempt })}>View sheet <Eye size={14} /></button> : <span className="muted">Unavailable</span>}</div></td></tr>) : <tr><td colSpan="5"><div className="empty-state"><p>No answer sheets match these filters.</p></div></td></tr>}</tbody></table></div></div>;
}
