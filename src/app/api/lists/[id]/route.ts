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

  const list = db.prepare('SELECT * FROM email_lists WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const contacts = db.prepare('SELECT * FROM email_contacts WHERE list_id = ? ORDER BY created_at DESC').all(id);

  return NextResponse.json({ list, contacts });
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

  const list = db.prepare('SELECT * FROM email_lists WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM email_contacts WHERE list_id = ?').run(id);
  db.prepare('DELETE FROM email_lists WHERE id = ?').run(id);

  return NextResponse.json({ success: true });
}
