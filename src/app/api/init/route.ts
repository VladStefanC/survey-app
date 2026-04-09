import { NextResponse } from 'next/server';
import { initDb, initializeDatabase } from '@/lib/db';

export async function GET() {
  await initDb();
  initializeDatabase();
  return NextResponse.json({ initialized: true });
}
