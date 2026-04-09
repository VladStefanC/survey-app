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

  return NextResponse.json({ contacts });
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

  const list = db.prepare('SELECT * FROM email_lists WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM email_contacts WHERE list_id = ? AND email = ?').get(id, email);
    if (existing) {
      return NextResponse.json({ error: 'Email already exists in this list' }, { status: 400 });
    }

    const contactId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_contacts (id, list_id, email, name)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(contactId, id, email, name || null);

    return NextResponse.json({ contact: { id: contactId, email, name } });
  } catch (error) {
    console.error('Add contact error:', error);
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
  const contactId = request.nextUrl.searchParams.get('contact_id');

  const list = db.prepare('SELECT * FROM email_lists WHERE id = ? AND owner_id = ?').get(id, userId);
  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (contactId) {
    db.prepare('DELETE FROM email_contacts WHERE id = ? AND list_id = ?').run(contactId, id);
  }

  return NextResponse.json({ success: true });
}
