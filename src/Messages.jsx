import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, UserRound } from 'lucide-react';

function formatMessageDate(value) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function Messages({ session, store, onSendMessage, onSendBroadcast }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const isAdmin = session.role === 'admin';
  const studentMessages = store.messages.filter(message => isAdmin ? message.studentId === selectedStudentId : message.studentId === session.id);
  const students = useMemo(() => store.users.slice().sort((a, b) => a.name.localeCompare(b.name)), [store.users]);
  const selectedStudent = store.users.find(user => user.id === selectedStudentId);
  const unreadCount = studentId => {
    const readAt = Number(localStorage.getItem(`zunaira-message-student-read-${session.id}-${studentId}`) || 0);
    return store.messages.filter(message => message.studentId === studentId && message.senderRole === 'student' && new Date(message.createdAt).getTime() > readAt).length;
  };
  useEffect(() => {
    if (!isAdmin || !selectedStudentId || selectedStudentId === 'all') return;
    localStorage.setItem(`zunaira-message-student-read-${session.id}-${selectedStudentId}`, String(Date.now()));
    setReadVersion(current => current + 1);
  }, [isAdmin, selectedStudentId, session.id]);
  const send = async event => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return setError('Write a message first.');
    if (message.length > 2000) return setError('Messages must be 2,000 characters or fewer.');
    if (isAdmin && !selectedStudentId) return setError('Select a student or broadcast to all students.');
    setSending(true); setError('');
    try {
      if (isAdmin && selectedStudentId === 'all') await onSendBroadcast(students.map(student => student.id), message);
      else await onSendMessage(isAdmin ? selectedStudentId : session.id, message);
      setText('');
    } catch (sendError) {
      setError(sendError.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return <div className="page messages-page">
    <div className="page-heading"><div><p className="eyebrow">Direct communication</p><h1>{isAdmin ? 'Student messages' : 'Messages to your teacher'}</h1><p className="muted">{isAdmin ? 'Review the complete message history for every student.' : 'Send a question or update to your administrator.'}</p></div><div className="result-total"><MessageCircle size={18} /><strong>{store.messages.filter(message => isAdmin || message.studentId === session.id).length}</strong><span>messages</span></div></div>
    <div className={`messages-layout ${isAdmin ? 'admin-messages' : ''}`}>
      {isAdmin && <aside className="message-students"><div className="section-title"><div><p className="eyebrow">Inbox</p><h2>Students</h2></div></div>{students.length ? <><button className={selectedStudentId === 'all' ? 'message-student active' : 'message-student'} onClick={() => { setSelectedStudentId('all'); setError(''); }}><span className="avatar small-avatar"><UserRound size={16} /></span><span><strong>All students</strong><small>Broadcast a new message</small></span></button>{students.map(student => { const unread = unreadCount(student.id); return <button key={student.id} className={selectedStudentId === student.id ? 'message-student active' : 'message-student'} onClick={() => { setSelectedStudentId(student.id); setError(''); }}><span className="avatar small-avatar">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}{unread > 0 && <span className="message-unread-dot" title={`${unread} unread message${unread === 1 ? '' : 's'}`}>{unread > 99 ? '99+' : unread}</span>}</strong><small>{store.messages.filter(message => message.studentId === student.id).length} messages</small></span></button>; })}</> : <p className="muted">No student accounts yet.</p>}</aside>}
      <section className="message-thread"><div className="section-title"><div><p className="eyebrow">{isAdmin ? selectedStudentId === 'all' ? 'Broadcast' : selectedStudent?.course || 'Conversation' : 'Conversation'}</p><h2>{isAdmin ? selectedStudentId === 'all' ? 'All students' : selectedStudent?.name || 'Select a student' : 'Teacher communication'}</h2></div></div>{selectedStudentId !== 'all' && (studentMessages.length ? <div className="message-list">{studentMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(message => <article key={message.id} className={message.senderRole === 'admin' ? 'message-bubble admin' : 'message-bubble student'}><div className="message-meta"><strong>{message.senderRole === 'admin' ? 'Administrator' : (isAdmin ? selectedStudent?.name : session.name)}</strong><time>{formatMessageDate(message.createdAt)}</time></div><p>{message.text}</p></article>)}</div> : <div className="empty-state"><MessageCircle size={22} /><p>{isAdmin ? 'Select a student to view their messages.' : 'No messages yet. Start the conversation below.'}</p></div>)}
        <form className="message-compose" onSubmit={send}><textarea value={text} onChange={event => setText(event.target.value)} placeholder={isAdmin ? (selectedStudentId === 'all' ? 'Write a broadcast for every student...' : selectedStudent ? `Reply to ${selectedStudent.name}` : 'Select a student or all students') : 'Write your message here...'} disabled={isAdmin && !selectedStudentId} maxLength="2000" /><button className="primary-button" type="submit" disabled={sending || (isAdmin && !selectedStudentId)}><Send size={16} /> {sending ? 'Sending...' : selectedStudentId === 'all' ? 'Broadcast message' : 'Send message'}</button>{error && <small className="form-error">{error}</small>}</form>
      </section>
    </div>
  </div>;
}
