import { NextRequest, NextResponse } from 'next/server';
import { db, uuidv4, initDb } from '@/lib/db';
import { getUserIdFromSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  await initDb();
  const userId = await getUserIdFromSession();
  console.log('GET /api/surveys - userId from session:', userId);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', debug: 'no userId' }, { status: 401 });
  }

  const stmt = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM invitations WHERE survey_id = s.id) as invitation_count,
      (SELECT COUNT(*) FROM responses WHERE survey_id = s.id) as response_count
    FROM surveys s 
    WHERE s.owner_id = ? 
    ORDER BY s.created_at DESC
  `);
  
  const surveys = stmt.all(userId);
  return NextResponse.json({ surveys });
}

export async function POST(request: NextRequest) {
  await initDb();
  const userId = await getUserIdFromSession();
  console.log('POST /api/surveys - userId from session:', userId);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized', debug: 'no userId' }, { status: 401 });
  }

  try {
    const { title, description, slug } = await request.json();
    console.log('POST /api/surveys - title:', title);

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const finalSlug = slug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100);

    const existingSlug = db.prepare('SELECT id FROM surveys WHERE slug = ?').get(finalSlug);
    if (existingSlug) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO surveys (id, owner_id, slug, title, description, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `);
    stmt.run(id, userId, finalSlug, title, description || null);
    console.log('POST /api/surveys - created survey:', id);

    return NextResponse.json({ survey: { id, slug: finalSlug, title, description, status: 'draft' } });
  } catch (error) {
    console.error('Create survey error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
