import { NextRequest, NextResponse } from 'next/server';
import { db, initDb, uuidv4 } from '@/lib/db';
import { hashToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await initDb();
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get('t');

  if (!token) {
    return NextResponse.json({ error: 'MISSING', message: 'Link invalid' }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  const invitation = db.prepare(`
    SELECT i.*, s.status as survey_status
    FROM invitations i
    JOIN surveys s ON i.survey_id = s.id
    WHERE s.slug = ? AND i.token_hash = ?
  `).get(slug, tokenHash) as any;

  if (!invitation) {
    return NextResponse.json({ error: 'INVALID', message: 'Link invalid' }, { status: 400 });
  }

  if (invitation.survey_status === 'closed') {
    return NextResponse.json({ error: 'CLOSED', message: 'Sondaj închis' }, { status: 410 });
  }

  if (invitation.submitted_at) {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED', message: 'Deja completat' }, { status: 400 });
  }

  try {
    const { answers } = await request.json();

    const responseId = uuidv4();
    db.prepare(`
      INSERT INTO responses (id, survey_id, invitation_id, submitted_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(responseId, invitation.survey_id, invitation.id);

    db.prepare("UPDATE invitations SET submitted_at = datetime('now') WHERE id = ?").run(invitation.id);

    const errors: any[] = [];

    for (const answer of answers || []) {
      const questionId = answer.question_id;

      if (answer.option_ids && answer.option_ids.length > 0) {
        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
        
        if (question) {
          if (question.required && answer.option_ids.length === 0) {
            errors.push({ question_id: questionId, code: 'REQUIRED', message: 'Această întrebare este obligatorie.' });
          }
          
          if (answer.option_ids.length > question.max_selections) {
            errors.push({ question_id: questionId, code: 'MAX_SELECTIONS_EXCEEDED', message: `Poți selecta maxim ${question.max_selections} opțiuni.` });
          }

          if (errors.length === 0) {
            const insertOption = db.prepare('INSERT INTO answers_choice (id, response_id, question_id, option_id) VALUES (?, ?, ?, ?)');
            answer.option_ids.forEach((optionId: string) => {
              insertOption.run(uuidv4(), responseId, questionId, optionId);
            });
          }
        }
      }

      if (answer.text_value !== undefined) {
        const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId) as any;
        
        if (question) {
          if (question.required && (!answer.text_value || answer.text_value.trim() === '')) {
            errors.push({ question_id: questionId, code: 'REQUIRED', message: 'Această întrebare este obligatorie.' });
          }
          
          if (answer.text_value && answer.text_value.length > question.max_length) {
            errors.push({ question_id: questionId, code: 'MAX_LENGTH_EXCEEDED', message: `Maximum ${question.max_length} caractere permise.` });
          }

          if (errors.length === 0) {
            db.prepare('INSERT INTO answers_text (id, response_id, question_id, text_value) VALUES (?, ?, ?, ?)').run(uuidv4(), responseId, questionId, answer.text_value || '');
          }
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'VALIDATION_FAILED', errors }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
