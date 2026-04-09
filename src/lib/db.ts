import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || 'surveyapp.db';
let db: Database.Database;

function getDb(): Database.Database {
  if (db) return db;
  
  if (dbPath !== 'surveyapp.db' && !dbPath.startsWith('.')) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

export function initializeDatabase() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'closed')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      published_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('choice', 'text')),
      title TEXT NOT NULL,
      required INTEGER DEFAULT 0,
      order_index INTEGER NOT NULL,
      max_length INTEGER DEFAULT 1000,
      max_selections INTEGER DEFAULT 1,
      FOREIGN KEY (survey_id) REFERENCES surveys(id)
    );

    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS email_lists (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_contacts (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES email_lists(id)
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      sent_at TEXT,
      email_opened_at TEXT,
      survey_opened_at TEXT,
      submitted_at TEXT,
      bounced_at TEXT,
      FOREIGN KEY (survey_id) REFERENCES surveys(id),
      FOREIGN KEY (contact_id) REFERENCES email_contacts(id),
      UNIQUE(survey_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      invitation_id TEXT UNIQUE NOT NULL,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys(id),
      FOREIGN KEY (invitation_id) REFERENCES invitations(id)
    );

    CREATE TABLE IF NOT EXISTS answers_choice (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES responses(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (option_id) REFERENCES options(id)
    );

    CREATE TABLE IF NOT EXISTS answers_text (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      text_value TEXT,
      FOREIGN KEY (response_id) REFERENCES responses(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_owner ON surveys(owner_id);
    CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_survey ON invitations(survey_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
  `);
}

export { getDb as db, uuidv4, crypto };
