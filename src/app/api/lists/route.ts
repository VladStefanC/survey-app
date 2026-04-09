import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, uuidv4 } from '@/lib/db';
import { getUserIdFromSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lists = db.prepare(`
    SELECT el.*, 
      (SELECT COUNT(*) FROM email_contacts WHERE list_id = el.id) as contact_count
    FROM email_lists el 
    WHERE el.owner_id = ? 
    ORDER BY el.created_at DESC
  `).all(userId);

  return NextResponse.json({ lists });
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_lists (id, owner_id, name)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, userId, name);

    return NextResponse.json({ list: { id, name, contact_count: 0 } });
  } catch (error) {
    console.error('Create list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
