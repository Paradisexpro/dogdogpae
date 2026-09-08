// api/auth/me.js - Get current logged-in user
const { requireAuth } = require('../_lib/auth');

module.exports = async function (req, res) {
  try {
    const { user } = await requireAuth(req);
    res.status(200).json({ user });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
