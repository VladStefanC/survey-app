import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getUserIdFromSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM invitations WHERE survey_id = ?) as invited,
      (SELECT COUNT(*) FROM invitations WHERE survey_id = ? AND sent_at IS NOT NULL) as sent,
      (SELECT COUNT(*) FROM invitations WHERE survey_id = ? AND email_opened_at IS NOT NULL) as email_opened,
      (SELECT COUNT(*) FROM invitations WHERE survey_id = ? AND survey_opened_at IS NOT NULL) as survey_opened,
      (SELECT COUNT(*) FROM responses WHERE survey_id = ?) as submitted,
      (SELECT COUNT(*) FROM invitations WHERE survey_id = ? AND bounced_at IS NOT NULL) as bounced
  `).get(id, id, id, id, id, id) as any;

  const questions = db.prepare(`
    SELECT q.id, q.type, q.title, q.required, q.order_index,
      (SELECT COUNT(*) FROM answers_choice ac JOIN responses r ON ac.response_id = r.id WHERE ac.question_id = q.id AND r.survey_id = ?) as choice_responses,
      (SELECT COUNT(*) FROM answers_text at JOIN responses r ON at.response_id = r.id WHERE at.question_id = q.id AND r.survey_id = ?) as text_responses
    FROM questions q
    WHERE q.survey_id = ?
    ORDER BY q.order_index
  `).all(id, id, id);

  const questionsWithOptions = questions.map((q: any) => {
    if (q.type === 'choice') {
      const options = db.prepare(`
        SELECT o.id, o.label,
          (SELECT COUNT(*) FROM answers_choice ac 
           JOIN responses r ON ac.response_id = r.id 
           WHERE ac.option_id = o.id AND r.survey_id = ?) as count
        FROM options o
        WHERE o.question_id = ?
        ORDER BY o.order_index
      `).all(id, q.id);
      return { ...q, options };
    }
    if (q.type === 'text') {
      const textAnswers = db.prepare(`
        SELECT at.text_value, at.response_id, r.submitted_at
        FROM answers_text at
        JOIN responses r ON at.response_id = r.id
        WHERE at.question_id = ?
        ORDER BY r.submitted_at DESC
      `).all(q.id);
      return { ...q, answers: textAnswers };
    }
    return q;
  });

  return NextResponse.json({ stats, questions: questionsWithOptions });
}
