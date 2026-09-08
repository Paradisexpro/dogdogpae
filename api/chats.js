// api/chats.js - List my chats (GET) & send/create/read messages (POST)
const { getSql, genId, logActivity } = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { mapChat } = require('./_lib/mappers');

module.exports = async function (req, res) {
  try {
    const { user } = await requireAuth(req);
    const db = getSql();

    if (req.method === 'GET') {
      const rows = await db`SELECT * FROM chats WHERE participants @> ${JSON.stringify([user.id])}::jsonb`;
      return res.status(200).json({ chats: rows.map(mapChat) });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'get-or-create') {
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'missing targetUserId' });
        const rows = await db`SELECT * FROM chats WHERE participants @> ${JSON.stringify([user.id, targetUserId])}::jsonb`;
        let chat = rows[0];
        if (!chat) {
          const id = genId('chat');
          const participants = [user.id, targetUserId];
          await db`INSERT INTO chats (id, participants, messages) VALUES (${id}, ${JSON.stringify(participants)}::jsonb, '[]'::jsonb)`;
          chat = { id, participants, messages: [] };
        }
        return res.status(200).json({ chat: mapChat(chat) });
      }

      if (action === 'message') {
        const { targetUserId, text, imageUrl } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'missing targetUserId' });
        if ((!text || !String(text).trim()) && !imageUrl) {
          return res.status(400).json({ error: 'ใส่ข้อความหรือรูปภาพ' });
        }

        const rows = await db`SELECT * FROM chats WHERE participants @> ${JSON.stringify([user.id, targetUserId])}::jsonb`;
        let chat = rows[0];
        if (!chat) {
          const id = genId('chat');
          const participants = [user.id, targetUserId];
          await db`INSERT INTO chats (id, participants, messages) VALUES (${id}, ${JSON.stringify(participants)}::jsonb, '[]'::jsonb)`;
          chat = { id, participants, messages: [] };
        }

        chat.messages = chat.messages || [];
        chat.messages.push({
          id: genId('m'),
          senderId: user.id,
          text: text ? String(text).trim() : '',
          imageUrl: imageUrl || null,
          timestamp: new Date().toISOString()
        });

        await db`UPDATE chats SET messages = ${JSON.stringify(chat.messages)}::jsonb WHERE id = ${chat.id}`;
        await logActivity('chat', `ข้อความใหม่จาก ${user.username}`);
        return res.status(200).json({ chat: mapChat(chat) });
      }

      if (action === 'read') {
        const { chatId } = req.body;
        if (!chatId) return res.status(400).json({ error: 'missing chatId' });
        const chatRow = (await db`SELECT messages FROM chats WHERE id = ${chatId}`)[0];
        const messages = (chatRow && chatRow.messages) || [];
        const lastId = messages.length ? messages[messages.length - 1].id : null;
        const meRow = (await db`SELECT chat_reads FROM users WHERE id = ${user.id}`)[0];
        const reads = meRow.chat_reads || {};
        reads[chatId] = lastId;
        await db`UPDATE users SET chat_reads = ${JSON.stringify(reads)}::jsonb WHERE id = ${user.id}`;
        return res.status(200).json({ success: true });
      }

      res.status(400).json({ error: 'action ไม่ถูกต้อง' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
};
