import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db, initDb } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
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

  const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?').get(id, userId) as any;
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }

  const contacts = db.prepare(`
    SELECT c.*, i.id as invitation_id, i.token_hash, i.sent_at, i.submitted_at
    FROM email_contacts c
    LEFT JOIN invitations i ON c.id = i.contact_id AND i.survey_id = ?
    WHERE c.list_id IN (SELECT id FROM email_lists WHERE owner_id = ?)
  `).all(id, userId);

  return NextResponse.json({ contacts, survey });
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
    return NextResponse.json({ error: 'Survey must be published to generate links' }, { status: 400 });
  }

  try {
    const { contact_id } = await request.json();

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
    }

    // Always generate a new token (even if contact already has an invitation)
    const token = generateToken();
    const tokenHash = hashToken(token);
    const invitationId = uuidv4();

    // Delete any existing invitation for this contact/survey and create new one
    db.prepare('DELETE FROM invitations WHERE survey_id = ? AND contact_id = ?').run(id, contact_id);

    db.prepare(`
      INSERT INTO invitations (id, survey_id, contact_id, token_hash, sent_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(invitationId, id, contact_id, tokenHash);

    const invitation = db.prepare('SELECT * FROM invitations WHERE id = ?').get(invitationId);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://survey-app-v2-ln0j.onrender.com';
    
    return NextResponse.json({ 
      invitation,
      token,
      link: `${baseUrl}/s/${survey.slug}?t=${token}`
    });
  } catch (error) {
    console.error('Generate link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
