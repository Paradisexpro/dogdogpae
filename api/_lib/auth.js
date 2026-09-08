// api/_lib/auth.js - Session helpers & auth guards
const { getSql } = require('./db');
const { mapUser } = require('./mappers');

function extractToken(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

async function requireAuth(req) {
  const token = extractToken(req);
  if (!token) {
    throw Object.assign(new Error('ต้องเข้าสู่ระบบก่อน'), { status: 401 });
  }
  const db = getSql();
  const rows = await db`
    SELECT s.token AS session_token, u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `;
  if (!rows.length) {
    throw Object.assign(new Error('Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'), { status: 401 });
  }
  const row = rows[0];
  if (row.is_banned) {
    throw Object.assign(new Error('บัญชีนี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (Banned)'), { status: 403 });
  }
  return { user: mapUser(row), token };
}

async function requireAdmin(req) {
  const { user } = await requireAuth(req);
  if (user.role !== 'admin') {
    throw Object.assign(new Error('ต้องเป็น Admin เท่านั้น'), { status: 403 });
  }
  return { user };
}

module.exports = { requireAuth, requireAdmin, extractToken };
