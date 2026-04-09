import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, initDb, uuidv4 } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth';
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
  const listId = request.nextUrl.searchParams.get('list_id');

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId) as any;
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  if (survey.status !== 'published') {
    return NextResponse.json({ error: 'Survey must be published to send invitations' }, { status: 400 });
  }

  if (!listId) {
    return NextResponse.json({ error: 'list_id is required' }, { status: 400 });
  }

  const contacts = db.prepare('SELECT * FROM email_contacts WHERE list_id = ?').all(listId) as any[];
  
  const existingInvitations = db.prepare(`
    SELECT contact_id FROM invitations WHERE survey_id = ?
  `).all(id) as any[];
  const existingContactIds = new Set(existingInvitations.map((i: any) => i.contact_id));

  const newContacts = contacts.filter((c: any) => !existingContactIds.has(c.id));

  return NextResponse.json({
    newCount: newContacts.length,
    skippedCount: contacts.length - newContacts.length,
  });
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

  if (survey.status !== 'published') {
    return NextResponse.json({ error: 'Survey must be published to send invitations' }, { status: 400 });
  }

  try {
    const { list_id } = await request.json();

    if (!list_id) {
      return NextResponse.json({ error: 'list_id is required' }, { status: 400 });
    }

    const contacts = db.prepare('SELECT * FROM email_contacts WHERE list_id = ?').all(list_id) as any[];
    
    const existingInvitations = db.prepare(`
      SELECT contact_id FROM invitations WHERE survey_id = ?
    `).all(id) as any[];
    const existingContactIds = new Set(existingInvitations.map((i: any) => i.contact_id));

    let sentCount = 0;
    let skippedCount = 0;

    for (const contact of contacts) {
      if (existingContactIds.has(contact.id)) {
        skippedCount++;
        continue;
      }

      const token = generateToken();
      const tokenHash = hashToken(token);
      const invitationId = uuidv4();

      db.prepare(`
        INSERT INTO invitations (id, survey_id, contact_id, token_hash, sent_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(invitationId, id, contact.id, tokenHash);

      sentCount++;
    }

    return NextResponse.json({
      sentCount,
      skippedCount,
      invitations: survey.status === 'published' ? 'link generated' : 'not generated'
    });
  } catch (error) {
    console.error('Send invitations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
