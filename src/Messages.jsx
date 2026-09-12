import React, { useMemo, useState } from 'react';
import { MessageCircle, Send, UserRound } from 'lucide-react';

function formatMessageDate(value) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function Messages({ session, store, onSendMessage }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const isAdmin = session.role === 'admin';
  const studentMessages = store.messages.filter(message => isAdmin ? message.studentId === selectedStudentId : message.studentId === session.id);
  const studentsWithMessages = useMemo(() => store.users.filter(user => store.messages.some(message => message.studentId === user.id)).sort((a, b) => a.name.localeCompare(b.name)), [store.users, store.messages]);
  const selectedStudent = store.users.find(user => user.id === selectedStudentId);
  const send = async event => {
    event.preventDefault();
    const message = text.trim();
    if (!message) return setError('Write a message first.');
    if (message.length > 2000) return setError('Messages must be 2,000 characters or fewer.');
    if (isAdmin && !selectedStudentId) return setError('Select a student first.');
    setSending(true); setError('');
    try {
      await onSendMessage(isAdmin ? selectedStudentId : session.id, message);
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
      {isAdmin && <aside className="message-students"><div className="section-title"><div><p className="eyebrow">Inbox</p><h2>Students</h2></div></div>{studentsWithMessages.length ? studentsWithMessages.map(student => <button key={student.id} className={selectedStudentId === student.id ? 'message-student active' : 'message-student'} onClick={() => { setSelectedStudentId(student.id); setError(''); }}><span className="avatar small-avatar">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>{store.messages.filter(message => message.studentId === student.id).length} messages</small></span></button>) : <p className="muted">No student messages yet.</p>}</aside>}
      <section className="message-thread"><div className="section-title"><div><p className="eyebrow">{isAdmin ? selectedStudent?.course || 'Conversation' : 'Conversation'}</p><h2>{isAdmin ? selectedStudent?.name || 'Select a student' : 'Teacher communication'}</h2></div></div>{studentMessages.length ? <div className="message-list">{studentMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(message => <article key={message.id} className={message.senderRole === 'admin' ? 'message-bubble admin' : 'message-bubble student'}><div className="message-meta"><strong>{message.senderRole === 'admin' ? 'Administrator' : (isAdmin ? selectedStudent?.name : session.name)}</strong><time>{formatMessageDate(message.createdAt)}</time></div><p>{message.text}</p></article>)}</div> : <div className="empty-state"><MessageCircle size={22} /><p>{isAdmin ? 'Select a student to view their messages.' : 'No messages yet. Start the conversation below.'}</p></div>}
        <form className="message-compose" onSubmit={send}><textarea value={text} onChange={event => setText(event.target.value)} placeholder={isAdmin ? (selectedStudent ? `Reply to ${selectedStudent.name}` : 'Select a student first') : 'Write your message here...'} disabled={isAdmin && !selectedStudentId} maxLength="2000" /><button className="primary-button" type="submit" disabled={sending || (isAdmin && !selectedStudentId)}><Send size={16} /> {sending ? 'Sending...' : 'Send message'}</button>{error && <small className="form-error">{error}</small>}</form>
      </section>
    </div>
  </div>;
}
