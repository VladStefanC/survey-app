import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, initDb } from '@/lib/db';
import { getUserIdFromSession } from '@/lib/session';

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
    return NextResponse.json({ error: 'Can only publish draft surveys' }, { status: 400 });
  }

  const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE survey_id = ?').get(id) as any;
  if (questionCount.count === 0) {
    return NextResponse.json({ error: 'Survey must have at least 1 question' }, { status: 400 });
  }

  db.prepare(`
    UPDATE surveys SET status = 'published', published_at = datetime('now') WHERE id = ?
  `).run(id);

  return NextResponse.json({ success: true, status: 'published' });
}
