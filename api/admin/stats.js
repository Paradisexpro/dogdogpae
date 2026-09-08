// api/admin/stats.js - Overview stats for the admin dashboard
const { requireAdmin } = require('../_lib/auth');
const { getSql } = require('../_lib/db');

module.exports = async function (req, res) {
  try {
    await requireAdmin(req);
    const db = getSql();

    const [users, banned, admins, posts, stories] = await Promise.all([
      db`SELECT COUNT(*)::int AS n FROM users`,
      db`SELECT COUNT(*)::int AS n FROM users WHERE is_banned = true`,
      db`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`,
      db`SELECT COUNT(*)::int AS n FROM posts`,
      db`SELECT COUNT(*)::int AS n FROM stories`
    ]);

    const chatRows = await db`SELECT messages FROM chats`;
    let totalMessages = 0;
    chatRows.forEach(r => { totalMessages += (r.messages || []).length; });

    res.status(200).json({
      totalUsers: users[0].n,
      bannedUsers: banned[0].n,
      adminUsers: admins[0].n,
      totalPosts: posts[0].n,
      activeStories: stories[0].n,
      totalMessages
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
