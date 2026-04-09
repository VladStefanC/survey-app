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

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  const invitations = db.prepare(`
    SELECT i.*, c.email, c.name
    FROM invitations i
    JOIN email_contacts c ON i.contact_id = c.id
    WHERE i.survey_id = ?
    ORDER BY i.sent_at DESC
  `).all(id);

  return NextResponse.json({ invitations });
}
