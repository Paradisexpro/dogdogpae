// api/stories/action.js - Story view count (view) & delete
const { getSql } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function (req, res) {
  try {
    const { action, storyId } = req.body || {};
    const db = getSql();

    if (action === 'view') {
      if (!storyId) return res.status(400).json({ error: 'missing storyId' });
      await db`UPDATE stories SET views = views + 1 WHERE id = ${storyId}`;
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { user } = await requireAuth(req);
      const rows = await db`SELECT * FROM stories WHERE id = ${storyId}`;
      if (!rows.length) return res.status(404).json({ error: 'ไม่พบสตอรี่' });
      const story = rows[0];
      if (story.user_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบสตอรี่นี้' });
      }
      await db`DELETE FROM stories WHERE id = ${storyId}`;
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
