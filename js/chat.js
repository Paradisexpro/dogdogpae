// js/chat.js - Direct Messaging (backend: Google Sheets)

class ChatManager {
  constructor() {
    this.activeChatPartnerId = null;
  }

  getChats() {
    return window.store.data.chats || [];
  }

  saveChats(chats) {
    window.store.data.chats = chats;
  }

  mergeChat(chat) {
    if (!chat) return;
    const chats = this.getChats();
    const idx = chats.findIndex(c => c.id === chat.id);
    if (idx >= 0) chats[idx] = chat;
    else chats.push(chat);
    this.saveChats(chats);
  }

  // Get or Create chat thread with target user
  async getOrCreateChat(targetUserId) {
    const me = window.authManager.currentUser;
    if (!me) return null;
    try {
      const res = await window.api.post('/chats', { action: 'get-or-create', targetUserId });
      this.mergeChat(res.chat);
      return res.chat;
    } catch (e) {
      return null;
    }
  }

  // Send message
  async sendMessage(targetUserId, text, imageUrl = null) {
    const me = window.authManager.currentUser;
    if (!me) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
    const msg = String(text || '').trim();
    if (!msg && !imageUrl) return { success: false, error: 'กรุณาพิมพ์ข้อความ' };
    try {
      const res = await window.api.post('/chats', { action: 'message', targetUserId, text: msg, imageUrl });
      this.mergeChat(res.chat);
      return { success: true, chat: res.chat };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Mark a chat as read (อัปเดต chatReads บนเซิร์ฟเวอร์)
  async markRead(chatId) {
    try {
      await window.api.post('/chats', { action: 'read', chatId });
    } catch (e) {
      // ไม่แสดง error
    }
  }
}

window.chatManager = new ChatManager();
