// js/admin.js - Backoffice Dashboard & Admin Data Management (backend: Google Sheets)

class AdminManager {
  getOverviewStats() {
    const users = window.authManager.getUsers();
    const posts = window.postManager.getPosts();
    const stories = window.storyManager.getStories();
    const chats = window.chatManager.getChats();
    const totalMessages = chats.reduce((n, c) => n + (c.messages || []).length, 0);
    return {
      totalUsers: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      bannedUsers: users.filter(u => u.isBanned).length,
      totalPosts: posts.length,
      activeStories: stories.length,
      totalMessages
    };
  }

  canAdmin() {
    return !!(window.authManager.currentUser && window.authManager.isAdmin());
  }

  mergeUser(user) {
    if (!user) return;
    const users = window.authManager.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    window.authManager.saveUsers(users);
  }

  removeUser(userId) {
    window.authManager.saveUsers(window.authManager.getUsers().filter(u => u.id !== userId));
    window.postManager.savePosts(window.postManager.getPosts().filter(p => p.userId !== userId));
    window.storyManager.saveStories(window.storyManager.getStories().filter(s => s.userId !== userId));
    window.chatManager.saveChats(window.chatManager.getChats().filter(c => !c.participants.includes(userId)));
  }

  async refreshLogs() {
    try {
      const res = await window.api.get('/logs');
      window.store.data.logs = res.logs || [];
    } catch (e) {
      // ไม่แสดง error
    }
  }

  // Toggle user ban status
  async toggleBanUser(userId) {
    if (!this.canAdmin()) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };
    if (window.authManager.currentUser.id === userId) return { success: false, error: 'ไม่สามารถระงับบัญชีตัวเองได้' };
    try {
      const res = await window.api.post('/admin/actions', { action: 'toggle-ban', userId });
      this.mergeUser(res.user);
      return { success: true, isBanned: res.isBanned };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Toggle Role (User <-> Admin)
  async toggleUserRole(userId) {
    if (!this.canAdmin()) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };
    if (window.authManager.currentUser.id === userId) return { success: false, error: 'ไม่สามารถเปลี่ยนบทบาทตัวเองได้' };
    try {
      const res = await window.api.post('/admin/actions', { action: 'toggle-role', userId });
      this.mergeUser(res.user);
      return { success: true, newRole: res.newRole };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Delete User + their posts/stories/chats
  async deleteUser(userId) {
    if (!this.canAdmin()) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };
    if (window.authManager.currentUser.id === userId) return { success: false, error: 'ไม่สามารถลบบัญชีตัวเองได้' };
    try {
      const res = await window.api.post('/admin/actions', { action: 'delete-user', userId });
      this.removeUser(userId);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Reset System Data กลับเป็น seed (บันทึกที่ Google Sheets ด้วย)
  async resetSystemData() {
    if (!this.canAdmin()) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };
    try {
      const res = await window.api.post('/admin/reset', {});
      localStorage.removeItem('ig_token');
      localStorage.removeItem('ig_session');
      await window.store.load();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getLogs() {
    return window.store.data.logs || [];
  }
}

window.adminManager = new AdminManager();
