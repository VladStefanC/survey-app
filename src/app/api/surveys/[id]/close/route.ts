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

  if (survey.status !== 'published') {
    return NextResponse.json({ error: 'Can only close published surveys' }, { status: 400 });
  }

  db.prepare(`
    UPDATE surveys SET status = 'closed', closed_at = datetime('now') WHERE id = ?
  `).run(id);

  return NextResponse.json({ success: true, status: 'closed' });
}
