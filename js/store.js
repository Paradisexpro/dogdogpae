// js/store.js - ตัวเก็บข้อมูลชั่วคราว (in-memory mirror) ของฐานข้อมูล Google Sheets
// โหลดจาก Apps Script ครั้งเดียวตอนเปิดเว็บ แล้ว manager ต่าง ๆ อ่านจากตรงนี้
// ทุกครั้งที่มีการแก้ไขจะส่งไปบันทึกที่ Google Sheets ผ่าน api

const store = {
  data: {
    users: [],
    posts: [],
    stories: [],
    chats: [],
    logs: []
  },

  async load() {
    const snap = await window.api.snapshot();
    this.data.users = snap.users || [];
    this.data.posts = snap.posts || [];
    this.data.stories = snap.stories || [];
    this.data.chats = snap.chats || [];
    this.data.logs = snap.logs || [];

    if (snap.me) {
      // token ยังใช้ได้ -> ใช้ข้อมูล user จากเซิร์ฟเวอร์
      window.authManager.currentUser = snap.me;
      window.authManager.saveSession();
    } else if (window.api.token()) {
      // token หมดอายุ/ไม่ถูกต้อง -> ล้าง session
      localStorage.removeItem('ig_token');
      localStorage.removeItem('ig_session');
      window.authManager.currentUser = null;
    }
    return snap;
  }
};

window.store = store;
