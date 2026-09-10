import { jsPDF } from 'jspdf';

function answerLabels(question, indexes = []) {
  return indexes.length ? indexes.map(index => `${String.fromCharCode(65 + index)}. ${question.options[index]}`).join(', ') : 'No answer selected';
}

export function downloadAnswerSheetPdf(paper, attempt, studentName) {
  const pdf = new jsPDF();
  const margin = 18;
  const width = 210 - margin * 2;
  let y = 20;
  const addText = (text, size = 10, gap = 6, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text), width);
    if (y + lines.length * gap > 280) { pdf.addPage(); y = 20; }
    pdf.text(lines, margin, y);
    y += lines.length * gap + 3;
  };

  addText('Exam Studio - Answer Sheet', 18, 8, true);
  addText(paper.title, 13, 7, true);
  addText(`Student: ${studentName} | Course: ${paper.course}`);
  addText(`Completed: ${new Date(attempt.completedAt).toLocaleDateString()} | Score: ${attempt.score}% (${attempt.correct}/${attempt.total})`, 11, 7, true);
  y += 3;

  paper.questions.forEach((question, index) => {
    const selected = attempt.answers?.[question.id] || [];
    const correct = question.answers || [question.answer];
    const isCorrect = JSON.stringify([...selected].sort()) === JSON.stringify([...correct].sort());
    addText(`${index + 1}. ${question.text}`, 11, 6, true);
    addText(`Your answer: ${answerLabels(question, selected)}`);
    addText(`Correct answer: ${answerLabels(question, correct)}`);
    addText(`Result: ${isCorrect ? 'Correct' : 'Needs review'}`, 10, 6, true);
    y += 2;
  });

  pdf.save(`${paper.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}-answer-sheet.pdf`);
}