// api/admin/actions.js - Ban / promote / delete users (admin only)
const { getSql, logActivity } = require('../_lib/db');
const { requireAdmin } = require('../_lib/auth');

module.exports = async function (req, res) {
  try {
    const { user: admin } = await requireAdmin(req);
    const { action, userId } = req.body || {};
    const db = getSql();

    if (!action || !userId) return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });

    if (action === 'toggle-ban') {
      if (userId === admin.id) return res.status(400).json({ error: 'ไม่สามารถระงับตัวเองได้' });
      const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
      if (!rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      const newVal = !rows[0].is_banned;
      await db`UPDATE users SET is_banned = ${newVal} WHERE id = ${userId}`;
      await db`DELETE FROM sessions WHERE user_id = ${userId}`;
      await logActivity('admin', `Admin ${admin.username} ${newVal ? 'ระงับบัญชี' : 'ปลดระงับบัญชี'} ผู้ใช้ ${rows[0].username}`);
      return res.status(200).json({ success: true, isBanned: newVal });
    }

    if (action === 'toggle-role') {
      if (userId === admin.id) return res.status(400).json({ error: 'ไม่สามารถเปลี่ยนสิทธิ์ตัวเองได้' });
      const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
      if (!rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      const newRole = rows[0].role === 'admin' ? 'user' : 'admin';
      await db`UPDATE users SET role = ${newRole} WHERE id = ${userId}`;
      await logActivity('admin', `Admin ${admin.username} เปลี่ยนสิทธิ์ ${rows[0].username} เป็น ${newRole}`);
      return res.status(200).json({ success: true, newRole });
    }

    if (action === 'delete-user') {
      if (userId === admin.id) return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
      const rows = await db`SELECT * FROM users WHERE id = ${userId}`;
      if (!rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      const target = rows[0];
      await db`DELETE FROM sessions WHERE user_id = ${userId}`;
      await db`DELETE FROM posts WHERE user_id = ${userId}`;
      await db`DELETE FROM stories WHERE user_id = ${userId}`;
      await db`DELETE FROM users WHERE id = ${userId}`;
      await logActivity('admin', `Admin ${admin.username} ลบผู้ใช้ ${target.username} ออกจากระบบ`);
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
