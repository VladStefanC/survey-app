import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, initDb, uuidv4 } from '@/lib/db';
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

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId);
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

  return NextResponse.json({ questions: uniqueQuestions });
}

export async function POST(
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
    return NextResponse.json({ error: 'Can only add questions to draft surveys' }, { status: 400 });
  }

  try {
    const { type, title, required, max_length, max_selections, options } = await request.json();

    if (!type || !title) {
      return NextResponse.json({ error: 'Type and title are required' }, { status: 400 });
    }

    if (type !== 'choice' && type !== 'text') {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM questions WHERE survey_id = ?').get(id) as any;
    const orderIndex = (maxOrder?.max || 0) + 1;

    const questionId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO questions (id, survey_id, type, title, required, order_index, max_length, max_selections)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      questionId,
      id,
      type,
      title,
      required ? 1 : 0,
      orderIndex,
      max_length || 1000,
      max_selections || 1
    );

    if (type === 'choice' && options && options.length >= 2) {
      const optionStmt = db.prepare('INSERT INTO options (id, question_id, label, order_index) VALUES (?, ?, ?, ?)');
      options.forEach((label: string, index: number) => {
        optionStmt.run(uuidv4(), questionId, label, index + 1);
      });
    }

    return NextResponse.json({ question: { id: questionId, type, title, required, order_index: orderIndex } });
  } catch (error) {
    console.error('Add question error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
