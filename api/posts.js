// api/posts.js - Feed posts: list (GET) & create (POST)
const { getSql, genId, logActivity } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { mapPost } = require('./_lib/mappers');

module.exports = async function (req, res) {
  try {
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT * FROM posts ORDER BY created_at DESC`;
      return res.status(200).json({ posts: rows.map(mapPost) });
    }

    if (req.method === 'POST') {
      const { user } = await requireAuth(req);
      const { imageUrl, caption, filter } = req.body || {};

      const defaultImg = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80';
      const newPost = {
        id: genId('post'),
        userId: user.id,
        username: user.username,
        userAvatar: user.avatar,
        imageUrl: imageUrl || defaultImg,
        caption: caption || '',
        filter: filter || 'none',
        likes: [],
        comments: [],
        bookmarks: [],
        createdAt: new Date().toISOString()
      };

      await db`
        INSERT INTO posts (id, user_id, username, user_avatar, image_url, caption, filter, likes, comments, bookmarks, created_at)
        VALUES (${newPost.id}, ${newPost.userId}, ${newPost.username}, ${newPost.userAvatar}, ${newPost.imageUrl},
                ${newPost.caption}, ${newPost.filter}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, ${newPost.createdAt})
      `;

      await logActivity('post', `ผู้ใช้ ${user.username} โพสต์รูปใหม่`);
      return res.status(200).json({ post: newPost });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
