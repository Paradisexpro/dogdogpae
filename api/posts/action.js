// api/posts/action.js - Like / bookmark / comment / delete on a post
const { getSql, logActivity } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function (req, res) {
  try {
    const { user } = await requireAuth(req);
    const { postId, action, text } = req.body || {};
    const db = getSql();

    const rows = await db`SELECT * FROM posts WHERE id = ${postId}`;
    if (!rows.length) return res.status(404).json({ error: 'ไม่พบโพสต์' });
    const post = rows[0];

    if (action === 'like') {
      const likes = post.likes || [];
      const idx = likes.indexOf(user.id);
      if (idx === -1) likes.push(user.id);
      else likes.splice(idx, 1);
      await db`UPDATE posts SET likes = ${JSON.stringify(likes)}::jsonb WHERE id = ${postId}`;
      return res.status(200).json({ success: true, liked: idx === -1, likesCount: likes.length });
    }

    if (action === 'bookmark') {
      const bookmarks = post.bookmarks || [];
      const idx = bookmarks.indexOf(user.id);
      if (idx === -1) bookmarks.push(user.id);
      else bookmarks.splice(idx, 1);
      await db`UPDATE posts SET bookmarks = ${JSON.stringify(bookmarks)}::jsonb WHERE id = ${postId}`;
      return res.status(200).json({ success: true, bookmarked: idx === -1 });
    }

    if (action === 'comment') {
      if (!text || !String(text).trim()) return res.status(400).json({ error: 'โปรดใส่ข้อความคอมเมนต์' });
      const comments = post.comments || [];
      comments.push({
        id: 'c_' + Date.now(),
        userId: user.id,
        username: user.username,
        text: String(text).trim(),
        createdAt: new Date().toISOString()
      });
      await db`UPDATE posts SET comments = ${JSON.stringify(comments)}::jsonb WHERE id = ${postId}`;
      return res.status(200).json({ success: true, comments });
    }

    if (action === 'delete') {
      if (post.user_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบโพสต์นี้' });
      }
      await db`DELETE FROM posts WHERE id = ${postId}`;
      await logActivity('post', `ลบโพสต์ ID ${postId} โดย ${user.username}`);
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
