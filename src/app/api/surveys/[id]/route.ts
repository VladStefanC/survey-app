import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, initDb } from '@/lib/db';
import { getUserIdFromSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM invitations WHERE survey_id = s.id) as invitation_count,
      (SELECT COUNT(*) FROM responses WHERE survey_id = s.id) as response_count
    FROM surveys s 
    WHERE s.id = ? AND s.owner_id = ?
  `).get(id, userId);

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  const questions = db.prepare(`
    SELECT q.*, 
      (SELECT json_group_array(json_object('id', o.id, 'label', o.label, 'order_index', o.order_index))
       FROM options o WHERE o.question_id = q.id ORDER BY o.order_index) as options
    FROM questions q 
    WHERE q.survey_id = ?
    ORDER BY q.order_index
  `).all(id);

  const questionsWithOptions = questions.map((q: any) => {
    let parsedOptions: any[] = [];
    try {
      if (q.options) {
        const parsed = JSON.parse(q.options);
        // Handle both array and single object cases
        parsedOptions = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      console.error('Failed to parse options:', e);
      parsedOptions = [];
    }
    return {
      ...q,
      options: parsedOptions
    };
  });

  // Deduplicate questions by ID
  const uniqueQuestions = questionsWithOptions.filter((q: any, index: number, self: any[]) => 
    index === self.findIndex((qq: any) => qq.id === q.id)
  );

  return NextResponse.json({ survey, questions: uniqueQuestions });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId) as any;
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  if (survey.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit draft surveys' }, { status: 400 });
  }

  try {
    const { title, description, slug } = await request.json();

    if (slug && slug !== survey.slug) {
      const existingSlug = db.prepare('SELECT id FROM surveys WHERE slug = ? AND id != ?').get(slug, id);
      if (existingSlug) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
    }

    const stmt = db.prepare(`
      UPDATE surveys SET title = ?, description = ?, slug = ? WHERE id = ?
    `);
    stmt.run(title || survey.title, description ?? survey.description, slug || survey.slug, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update survey error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM answers_choice WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)').run(id);
  db.prepare('DELETE FROM answers_text WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)').run(id);
  db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);
  db.prepare('DELETE FROM invitations WHERE survey_id = ?').run(id);
  db.prepare('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)').run(id);
  db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);
  db.prepare('DELETE FROM surveys WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}
