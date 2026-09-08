// api/auth/logout.js - Invalidate current session
const { getSql } = require('../_lib/db');
const { extractToken } = require('../_lib/auth');

module.exports = async function (req, res) {
  try {
    const token = extractToken(req);
    if (token) {
      const db = getSql();
      await db`DELETE FROM sessions WHERE token = ${token}`;
    }
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
