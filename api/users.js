// api/users.js - List users (GET), update own profile (PATCH), follow (POST)
const { getSql, logActivity } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { mapUser } = require('./_lib/mappers');

module.exports = async function (req, res) {
  try {
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT * FROM users ORDER BY created_at ASC`;
      return res.status(200).json({ users: rows.map(mapUser) });
    }

    if (req.method === 'PATCH') {
      const { user } = await requireAuth(req);
      const { username, fullName, bio, avatar } = req.body || {};
      const db = getSql();

      if (username && String(username).trim()) {
        const dup = await db`SELECT 1 FROM users WHERE lower(username) = lower(${String(username).trim()}) AND id != ${user.id}`;
        if (dup.length) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
      }

      await db`
        UPDATE users SET
          username = COALESCE(${username ? String(username).trim() : null}, username),
          full_name = COALESCE(${fullName ? String(fullName).trim() : null}, full_name),
          bio = COALESCE(${bio !== undefined && bio !== null ? bio : null}, bio),
          avatar = COALESCE(${avatar || null}, avatar)
        WHERE id = ${user.id}
      `;

      const rows = await db`SELECT * FROM users WHERE id = ${user.id}`;
      return res.status(200).json({ user: mapUser(rows[0]) });
    }

    if (req.method === 'POST') {
      const { user } = await requireAuth(req);
      const { targetId } = req.body || {};
      if (targetId === user.id) return res.status(400).json({ error: 'ไม่สามารถติดตามตัวเองได้' });

      const target = await db`SELECT follows FROM users WHERE id = ${targetId}`;
      if (!target.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

      const me = await db`SELECT follows FROM users WHERE id = ${user.id}`;
      const myFollows = me[0].follows || [];
      const idx = myFollows.indexOf(targetId);

      if (idx === -1) {
        myFollows.push(targetId);
        await db`UPDATE users SET follows = ${JSON.stringify(myFollows)}::jsonb, following = following + 1 WHERE id = ${user.id}`;
        await db`UPDATE users SET followers = followers + 1 WHERE id = ${targetId}`;
      } else {
        myFollows.splice(idx, 1);
        await db`UPDATE users SET follows = ${JSON.stringify(myFollows)}::jsonb, following = GREATEST(following - 1, 0) WHERE id = ${user.id}`;
        await db`UPDATE users SET followers = GREATEST(followers - 1, 0) WHERE id = ${targetId}`;
      }

      return res.status(200).json({ success: true, following: idx === -1 });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
