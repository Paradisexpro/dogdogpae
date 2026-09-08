// api/admin/reset.js - Drop all tables and re-seed (admin only)
const { requireAdmin } = require('../_lib/auth');
const { getSql, ensureSchema, seedIfEmpty, logActivity } = require('../_lib/db');

module.exports = async function (req, res) {
  try {
    const { user } = await requireAdmin(req);
    const db = getSql();

    await db`DROP TABLE IF EXISTS logs, chats, stories, posts, sessions, users`;
    await ensureSchema();
    await seedIfEmpty();
    await logActivity('admin', `Admin ${user.username} รีเซ็ตระบบทั้งหมด`);

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
