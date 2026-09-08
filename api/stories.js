// api/stories.js - Stories: list (GET) & create (POST)
const { getSql, genId, logActivity } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { mapStory } = require('./_lib/mappers');

module.exports = async function (req, res) {
  try {
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT * FROM stories ORDER BY created_at DESC`;
      return res.status(200).json({ stories: rows.map(mapStory) });
    }

    if (req.method === 'POST') {
      const { user } = await requireAuth(req);
      const { mediaUrl, caption } = req.body || {};

      const defaultMedia = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
      const newStory = {
        id: genId('st'),
        userId: user.id,
        username: user.username,
        userAvatar: user.avatar,
        mediaUrl: mediaUrl || defaultMedia,
        caption: caption || '',
        views: 0,
        createdAt: new Date().toISOString()
      };

      await db`
        INSERT INTO stories (id, user_id, username, user_avatar, media_url, caption, views, created_at)
        VALUES (${newStory.id}, ${newStory.userId}, ${newStory.username}, ${newStory.userAvatar}, ${newStory.mediaUrl},
                ${newStory.caption}, 0, ${newStory.createdAt})
      `;

      await logActivity('story', `ผู้ใช้ ${user.username} เพิ่มสตอรี่ใหม่`);
      return res.status(200).json({ story: newStory });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
