import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import { hashToken, generateToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await initDb();
  const { slug } = await params;
  const token = request.nextUrl.searchParams.get('t');

  if (!token) {
    return NextResponse.json({ error: 'MISSING', message: 'Link invalid' }, { status: 200 });
  }

  const tokenHash = hashToken(token);

  const invitation = db.prepare(`
    SELECT i.*, s.status as survey_status, s.title as survey_title, s.description as survey_description
    FROM invitations i
    JOIN surveys s ON i.survey_id = s.id
    WHERE s.slug = ? AND i.token_hash = ?
  `).get(slug, tokenHash) as any;

  if (!invitation) {
    return NextResponse.json({ error: 'INVALID', message: 'Link invalid' }, { status: 200 });
  }

  if (invitation.survey_status === 'closed') {
    return NextResponse.json({ error: 'CLOSED', message: 'Sondaj închis' }, { status: 200 });
  }

  if (invitation.submitted_at) {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED', message: 'Deja completat' }, { status: 200 });
  }

  if (invitation.survey_status !== 'published') {
    return NextResponse.json({ error: 'INVALID', message: 'Link invalid' }, { status: 200 });
  }

  if (!invitation.survey_opened_at) {
    db.prepare("UPDATE invitations SET survey_opened_at = datetime('now') WHERE id = ?").run(invitation.id);
  }

  const survey = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM responses WHERE survey_id = s.id) as response_count
    FROM surveys s 
    WHERE s.slug = ?
  `).get(slug) as any;

  const questions = db.prepare(`
    SELECT q.*, 
      (SELECT json_group_array(json_object('id', o.id, 'label', o.label, 'order_index', o.order_index))
       FROM options o WHERE o.question_id = q.id ORDER BY o.order_index) as options
    FROM questions q 
    WHERE q.survey_id = ?
    ORDER BY q.order_index
  `).all(survey.id);

  const questionsWithOptions = questions.map((q: any) => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : []
  }));

  return NextResponse.json({
    survey: { ...survey, status: invitation.survey_status },
    questions: questionsWithOptions,
    invitationId: invitation.id
  });
}
