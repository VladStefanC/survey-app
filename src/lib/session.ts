import { cookies } from 'next/headers';
import { getSession } from './auth';

export async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (!sessionId) {
    return null;
  }

  const session = await getSession(sessionId);
  return session?.user_id || null;
}
