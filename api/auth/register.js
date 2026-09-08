// api/auth/register.js - Create a new account
const crypto = require('crypto');
const { getSql, hashPassword, genId, logActivity } = require('../_lib/db');
const { mapUser } = require('../_lib/mappers');

module.exports = async function (req, res) {
  try {
    const { username, fullName, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร' });
    }

    const db = getSql();
    const cleanUsername = String(username).trim();
    const cleanFullName = String(fullName || username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    const dupUser = await db`SELECT 1 FROM users WHERE lower(username) = lower(${cleanUsername})`;
    if (dupUser.length) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });

    const dupEmail = await db`SELECT 1 FROM users WHERE email = ${cleanEmail}`;
    if (dupEmail.length) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const id = genId('usr');
    const now = new Date().toISOString();
    const defaultAvatar = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80';

    await db`
      INSERT INTO users (id, username, email, password, role, full_name, avatar, bio, followers, following, follows, chat_reads, is_banned, created_at)
      VALUES (${id}, ${cleanUsername}, ${cleanEmail}, ${hashPassword(password)}, 'user', ${cleanFullName}, ${defaultAvatar},
              ${'✨ สวัสดี! ยินดีต้อนรับสู่ InstaDog 🐾'}, 0, 0, '[]'::jsonb, '{}'::jsonb, false, ${now})
    `;

    const token = crypto.randomBytes(32).toString('hex');
    await db`INSERT INTO sessions (token, user_id, created_at) VALUES (${token}, ${id}, ${now})`;
    await logActivity('auth', `ลงทะเบียนผู้ใช้ใหม่: ${cleanUsername}`);

    const rows = await db`SELECT * FROM users WHERE id = ${id}`;
    res.status(200).json({ token, user: mapUser(rows[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
