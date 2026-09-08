// api/auth/login.js - Login with email/username + password
const crypto = require('crypto');
const { getSql, hashPassword, logActivity } = require('../_lib/db');
const { mapUser } = require('../_lib/mappers');

module.exports = async function (req, res) {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });
    }

    const db = getSql();
    const ident = String(identifier).trim().toLowerCase();
    const rows = await db`SELECT * FROM users WHERE email = ${ident} OR lower(username) = ${ident}`;

    if (!rows.length || rows[0].password !== hashPassword(password)) {
      return res.status(401).json({ error: 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = rows[0];
    if (user.is_banned) {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (Banned)' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await db`INSERT INTO sessions (token, user_id, created_at) VALUES (${token}, ${user.id}, ${new Date().toISOString()})`;
    await logActivity('auth', `ผู้ใช้ ${user.username} เข้าสู่ระบบแล้ว`);

    res.status(200).json({ token, user: mapUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
