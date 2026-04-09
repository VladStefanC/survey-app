import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  initializeDatabase();
  return NextResponse.json({ initialized: true });
}
