// js/auth.js - Authentication & User State (backend: Google Sheets ผ่าน Apps Script)

class AuthManager {
  constructor() {
    this.currentUser = this.loadSession();
  }

  loadSession() {
    try {
      return JSON.parse(localStorage.getItem('ig_session')) || null;
    } catch (e) {
      return null;
    }
  }

  saveSession() {
    if (this.currentUser) localStorage.setItem('ig_session', JSON.stringify(this.currentUser));
    else localStorage.removeItem('ig_session');
  }

  getUsers() {
    return window.store.data.users || [];
  }

  saveUsers(users) {
    window.store.data.users = users;
  }

  isAdmin() {
    return !!(this.currentUser && this.currentUser.role === 'admin');
  }

  async login(identifier, password) {
    try {
      const res = await window.api.post('/auth/login', { identifier, password });
      localStorage.setItem('ig_token', res.token);
      this.currentUser = res.user;
      this.saveSession();
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === res.user.id);
      if (idx >= 0) users[idx] = res.user;
      else users.push(res.user);
      return { success: true, user: res.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async register({ username, fullName, email, password }) {
    try {
      const res = await window.api.post('/auth/register', { username, fullName, email, password });
      localStorage.setItem('ig_token', res.token);
      this.currentUser = res.user;
      this.saveSession();
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === res.user.id);
      if (idx >= 0) users[idx] = res.user;
      else users.push(res.user);
      return { success: true, user: res.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async logout() {
    try {
      await window.api.post('/auth/logout');
    } catch (e) {
      // ไม่เป็นไร ยังต้องล้าง session ฝั่ง client
    }
    localStorage.removeItem('ig_token');
    this.currentUser = null;
    this.saveSession();
  }

  async updateProfile(updates) {
    try {
      const res = await window.api.patch('/users', updates);
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === res.user.id);
      if (idx >= 0) users[idx] = res.user;
      this.currentUser = res.user;
      this.saveSession();
      return { success: true, user: res.user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async followUser(targetId) {
    try {
      const res = await window.api.post('/users', { targetId });
      const users = this.getUsers();
      const mi = users.findIndex(u => u.id === this.currentUser.id);
      const ti = users.findIndex(u => u.id === targetId);
      if (res.me && mi >= 0) users[mi] = res.me;
      if (res.target && ti >= 0) users[ti] = res.target;
      this.currentUser = res.me || this.currentUser;
      this.saveSession();
      return { success: true, following: res.following };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

window.authManager = new AuthManager();
