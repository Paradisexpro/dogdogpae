// api/logs.js - Recent activity logs (admin only)
const { requireAdmin } = require('./_lib/auth');
const { getSql } = require('./_lib/db');

module.exports = async function (req, res) {
  try {
    await requireAdmin(req);
    const db = getSql();
    const rows = await db`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100`;
    res.status(200).json({ logs: rows });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
