import { db, uuidv4 } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export function createUser(email: string, password: string): User {
  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  
  const stmt = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
  stmt.run(id, email, password_hash);
  
  return { id, email, password_hash, created_at: new Date().toISOString() };
}

export function getUserByEmail(email: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createSession(userId: string): string {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const stmt = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
  stmt.run(id, userId, expiresAt);
  
  return id;
}

export function getSession(id: string): { user_id: string } | undefined {
  const stmt = db.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?');
  return stmt.get(id, new Date().toISOString()) as { user_id: string } | undefined;
}

export function deleteSession(id: string): void {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(id);
}

export function generateToken(): string {
  const buffer = crypto.randomBytes(32);
  return buffer.toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
