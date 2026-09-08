// api/init.js - Create schema & seed data if empty (idempotent)
const { ensureSchema, seedIfEmpty } = require('./_lib/db');

module.exports = async function (req, res) {
  try {
    await ensureSchema();
    const seeded = await seedIfEmpty();
    res.status(200).json({ ok: true, seeded });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
