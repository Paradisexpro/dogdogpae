// api/_lib/db.js - Database connection, schema, seeding & shared helpers
const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

let sql = null;

function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set. Create a Postgres (Neon) database and add the connection string as the DATABASE_URL environment variable.');
    }
    sql = neon(url, { arrayMode: false });
  }
  return sql;
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw || '')).digest('hex');
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    full_name TEXT,
    avatar TEXT,
    bio TEXT,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    follows JSONB DEFAULT '[]'::jsonb,
    chat_reads JSONB DEFAULT '{}'::jsonb,
    is_banned BOOLEAN DEFAULT false,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT,
    user_avatar TEXT,
    image_url TEXT,
    caption TEXT,
    filter TEXT DEFAULT 'none',
    likes JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    bookmarks JSONB DEFAULT '[]'::jsonb,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT,
    user_avatar TEXT,
    media_url TEXT,
    caption TEXT,
    views INT DEFAULT 0,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    participants JSONB DEFAULT '[]'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    type TEXT,
    text TEXT,
    timestamp TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_stories_created ON stories (created_at DESC)`
];

async function ensureSchema() {
  const db = getSql();
  for (const stmt of SCHEMA_STATEMENTS) {
    await db(stmt);
  }
}

async function seedIfEmpty() {
  const db = getSql();
  const count = await db`SELECT COUNT(*)::int AS n FROM users`;
  if (count[0].n > 0) return false;

  const { SEED_USERS, SEED_STORIES, SEED_POSTS, SEED_CHATS } = require('./seed');

  for (const u of SEED_USERS) {
    await db`
      INSERT INTO users (id, username, email, password, role, full_name, avatar, bio, followers, following, follows, chat_reads, is_banned, created_at)
      VALUES (${u.id}, ${u.username}, ${u.email}, ${hashPassword(u.password)}, ${u.role}, ${u.fullName}, ${u.avatar}, ${u.bio},
              ${u.followers}, ${u.following}, ${JSON.stringify(u.follows || [])}::jsonb, ${JSON.stringify(u.chatReads || {})}::jsonb, ${u.isBanned || false}, ${u.createdAt})
    `;
  }

  for (const s of SEED_STORIES) {
    await db`
      INSERT INTO stories (id, user_id, username, user_avatar, media_url, caption, views, created_at)
      VALUES (${s.id}, ${s.userId}, ${s.username}, ${s.userAvatar}, ${s.mediaUrl}, ${s.caption}, ${s.views}, ${s.createdAt})
    `;
  }

  for (const p of SEED_POSTS) {
    await db`
      INSERT INTO posts (id, user_id, username, user_avatar, image_url, caption, filter, likes, comments, bookmarks, created_at)
      VALUES (${p.id}, ${p.userId}, ${p.username}, ${p.userAvatar}, ${p.imageUrl}, ${p.caption}, ${p.filter || 'none'},
              ${JSON.stringify(p.likes || [])}::jsonb, ${JSON.stringify(p.comments || [])}::jsonb, ${JSON.stringify(p.bookmarks || [])}::jsonb, ${p.createdAt})
    `;
  }

  for (const c of SEED_CHATS) {
    await db`
      INSERT INTO chats (id, participants, messages)
      VALUES (${c.id}, ${JSON.stringify(c.participants)}::jsonb, ${JSON.stringify(c.messages || [])}::jsonb)
    `;
  }

  await logActivity('system', 'InstaDog platform initialized successfully.');
  return true;
}

async function logActivity(type, text) {
  const db = getSql();
  await db`
    INSERT INTO logs (id, type, text, timestamp)
    VALUES (${genId('log')}, ${type}, ${text}, ${new Date().toISOString()})
  `;
}

module.exports = { getSql, ensureSchema, seedIfEmpty, logActivity, hashPassword, genId };
