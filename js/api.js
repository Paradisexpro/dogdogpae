// js/api.js - Data layer ที่เชื่อม Cloud Firestore โดยตรง (แทน backend REST เดิม)
//
// เก็บพรมแดนเดียวกับ api เดิมให้ manager ต่าง ๆ (auth/post/story/chat/admin)
// เรียกใช้ได้เหมือนเดิม แต่เบื้องหลังเขียน/อ่านจาก Firestore โดยตรง ไม่ต้องมีเซิร์ฟเวอร์
//
// คอลเลคชันใน Firestore:
//   users    : { id, username, email, password(hash), role, fullName, avatar,
//                bio, followers, following, follows[], chatReads{}, isBanned, createdAt }
//   sessions : { id=token, userId, createdAt }
//   posts    : { id, userId, username, userAvatar, imageUrl, caption, filter,
//                likes[], comments[], bookmarks[], createdAt }
//   stories  : { id, userId, username, userAvatar, mediaUrl, caption, views, createdAt }
//   chats    : { id, participants[], messages[], // messages: {id, senderId, text, imageUrl, timestamp} }
//   logs     : { id, type, text, timestamp }

/* ============ ระบบยศ (RANK) ============ */
// member (ฟรี) -> premium -> vip -> supervip
// admin จะเป็นผู้กำหนดยศให้ผู้ใช้ได้
// ทุกยศโพสต์ได้เท่ากันหมด ส่วนที่ต่างคือ กรอบโพสต์ เอฟเฟ็กต์ และกรอบรูปโปรไฟล์
window.RANK_CONFIG = {
  member: {
    label: 'สมาชิก',
    icon: '🐾',
    price: 0,
    avatarRes: 800,
    perks: [
      'โพสต์ได้เท่าทุกยศ ไม่จำกัดจำนวน',
      'กรอบโพสต์ธรรมดา',
      'กรอบโปรไฟล์สีฟ้า',
      'ใช้ฟีเจอร์พื้นฐานทั้งหมด (โพสต์ สตอรี่ แชท ไลก์ คอมเมนต์)'
    ]
  },
  premium: {
    label: 'Premium',
    icon: '💛',
    price: 500,
    avatarRes: 1080,
    perks: [
      'โพสต์ได้เท่าทุกยศ ไม่จำกัดจำนวน',
      'กรอบโพสต์สีทอง',
      'กรอบโปรไฟล์สีทอง บ่งบอกความเป็น Premium',
      'ป้ายยศทองที่ชื่อ'
    ]
  },
  vip: {
    label: 'VIP',
    icon: '💎',
    price: 1500,
    avatarRes: 1280,
    perks: [
      'โพสต์ได้เท่าทุกยศ ไม่จำกัดจำนวน',
      'กรอบโพสต์สีม่วงเรืองแสง',
      'กรอบโปรไฟล์สีม่วง-ฟ้าประกาย',
      'ป้ายยศ VIP แบบเรืองแสง'
    ]
  },
  supervip: {
    label: 'Super VIP',
    icon: '👑',
    price: 4000,
    avatarRes: 1600,
    perks: [
      'โพสต์ได้เท่าทุกยศ ไม่จำกัดจำนวน',
      'กรอบโพสต์ไล่เฉดสีสุดพิเศษ + แสงกะพริบ',
      'กรอบโปรไฟล์มงกุฎหลากสี',
      'สิทธิพิเศษสูงสุดทั้งหมด'
    ]
  }
};

window.rankConfig = (rank) => window.RANK_CONFIG[rank] || window.RANK_CONFIG.member;

const api = {
  normalizeUser(u) {
    if (!u) return u;
    if (!u.rank) u.rank = 'member';
    if (u.dogcoin == null) u.dogcoin = 0;
    return u;
  },

  async snapshot() {
    const db = window.firestoreDb;
    const [users, posts, stories, chats, logs] = await Promise.all([
      this.readAll(db, 'users'),
      this.readAll(db, 'posts'),
      this.readAll(db, 'stories'),
      this.readAll(db, 'chats'),
      this.readAll(db, 'logs')
    ]);

    let me = null;
    const token = this.token();
    if (token) {
      const session = await this.getDoc(db, 'sessions', token);
      if (session && session.userId) {
        const u = await this.getDoc(db, 'users', session.userId);
        if (u && !u.isBanned) {
          me = this.normalizeUser(u);
        } else if (u && u.isBanned) {
          // บัญชีถูกระงับ -> ล้าง session
          localStorage.removeItem('ig_token');
          localStorage.removeItem('ig_session');
        }
      } else {
        // token หมดอายุ/ไม่ถูกต้อง -> ล้าง session
        localStorage.removeItem('ig_token');
        localStorage.removeItem('ig_session');
      }
    }

    const snap = {
      users: users.map(u => this.normalizeUser(u)),
      posts, stories, chats, logs, me
    };
    window.lastSnapshot = snap;
    return snap;
  },

  token() {
    return localStorage.getItem('ig_token') || '';
  },

  async request(method, path, body) {
    const db = window.firestoreDb;
    const payload = body || {};

    try {
      // ===== AUTH =====
      if (path === '/auth/login') {
        return await this.login(payload);
      }
      if (path === '/auth/register') {
        return await this.register(payload);
      }
      if (path === '/auth/logout') {
        return await this.logout();
      }

      // ===== USERS =====
      if (path === '/users') {
        if (method === 'PATCH') return await this.updateProfile(payload);
        if (method === 'POST') return await this.follow(payload);
      }

      // ===== POSTS =====
      if (path === '/posts' && method === 'POST') {
        return await this.createPost(payload);
      }
      if (path === '/posts/action') {
        return await this.postAction(payload);
      }

      // ===== STORIES =====
      if (path === '/stories' && method === 'POST') {
        return await this.createStory(payload);
      }
      if (path === '/stories/action') {
        return await this.storyAction(payload);
      }

      // ===== SHOP / RANK =====
      if (path === '/shop/buy' && method === 'POST') {
        return await this.purchaseRank(payload);
      }

      // ===== CHATS =====
      if (path === '/chats') {
        return await this.chatAction(payload);
      }

      // ===== LOGS =====
      if (path === '/logs') {
        const logs = await this.readAll(db, 'logs');
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return { logs: logs.slice(0, 100) };
      }

      // ===== ADMIN =====
      if (path === '/admin/actions') {
        return await this.adminAction(payload);
      }
      if (path === '/admin/reset') {
        return await this.resetSystem();
      }

      throw Object.assign(new Error('Endpoint ไม่ถูกต้อง: ' + (path || '')), { status: 404 });
    } catch (e) {
      if (e && e.code === 'permission-denied') {
        throw Object.assign(new Error('ยังไม่ได้ตั้งค่า Firestore Rules ให้เปิดใช้งาน'), { status: 403 });
      }
      if (e && e.status) throw e;
      throw Object.assign(new Error(e && e.message ? e.message : 'เกิดข้อผิดพลาด'), { status: e && e.status || 500 });
    }
  },

  // Convenience
  get(path) { return this.request('GET', path, {}); },
  post(path, body) { return this.request('POST', path, body || {}); },
  patch(path, body) { return this.request('PATCH', path, body || {}); },
  del(path, body) { return this.request('DELETE', path, body || {}); },

  /* ===================== Firestore helpers ===================== */
  col(db, name) { return db.collection(name); },

  async readAll(db, name) {
    const snap = await db.collection(name).get();
    const out = [];
    snap.forEach(doc => out.push(doc.data()));
    return out;
  },

  async getDoc(db, name, id) {
    const ref = db.collection(name).doc(id);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  },

  async setDoc(db, name, id, data) {
    await db.collection(name).doc(id).set(data);
    return data;
  },

  async deleteDoc(db, name, id) {
    await db.collection(name).doc(id).delete();
  },

  async updateDoc(db, name, id, data) {
    await db.collection(name).doc(id).set(data, { merge: true });
  },

  /* ===================== Helpers ===================== */
  genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  async hashPassword(pw) {
    const data = new TextEncoder().encode(String(pw || ''));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async logActivity(type, text) {
    try {
      await this.setDoc(window.firestoreDb, 'logs', this.genId('log'), {
        id: this.genId('log'),
        type, text, timestamp: new Date().toISOString()
      });
    } catch (e) { /* ไม่แสดง error */ }
  },

  error(message, status) {
    throw Object.assign(new Error(message), { status: status || 400 });
  },

  /* ===================== AUTH ===================== */
  async login({ identifier, password }) {
    if (!identifier || !password) this.error('กรอกข้อมูลไม่ครบ');
    const ident = String(identifier).trim().toLowerCase();
    const users = await this.readAll(window.firestoreDb, 'users');
    const user = users.find(u =>
      (u.email || '').toLowerCase() === ident ||
      (u.username || '').toLowerCase() === ident
    );
    const pwHash = await this.hashPassword(password);
    if (!user || user.password !== pwHash) {
      this.error('อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง', 401);
    }
    if (user.isBanned) this.error('บัญชีนี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (Banned)', 403);

    const token = this.genId('tok') + Math.random().toString(36).slice(2, 10);
    await this.setDoc(window.firestoreDb, 'sessions', token, {
      userId: user.id, createdAt: new Date().toISOString()
    });
    await this.logActivity('auth', `ผู้ใช้ ${user.username} เข้าสู่ระบบแล้ว`);
    return { token, user: this.normalizeUser(user) };
  },

  async register({ username, fullName, email, password }) {
    if (!username || !email || !password) this.error('กรอกข้อมูลไม่ครบ');
    if (String(password).length < 6) this.error('รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร');

    const cleanUsername = String(username).trim();
    const cleanFullName = String(fullName || username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    const users = await this.readAll(window.firestoreDb, 'users');
    if (users.some(u => (u.username || '').toLowerCase() === cleanUsername.toLowerCase())) {
      this.error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }
    if (users.some(u => (u.email || '').toLowerCase() === cleanEmail.toLowerCase())) {
      this.error('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const id = this.genId('usr_');
    const now = new Date().toISOString();
    const defaultAvatar = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80';

    const user = {
      id,
      username: cleanUsername,
      email: cleanEmail,
      password: await this.hashPassword(password),
      role: 'user',
      rank: 'member',
      dogcoin: 500, // โบนัสต้อนรับ
      fullName: cleanFullName,
      avatar: defaultAvatar,
      bio: '✨ สวัสดี! ยินดีต้อนรับสู่ DogDog 🐾',
      followers: 0,
      following: 0,
      follows: [],
      chatReads: {},
      isBanned: false,
      createdAt: now
    };
    await this.setDoc(window.firestoreDb, 'users', id, user);

    const token = this.genId('tok') + Math.random().toString(36).slice(2, 10);
    await this.setDoc(window.firestoreDb, 'sessions', token, {
      userId: id, createdAt: now
    });
    await this.logActivity('auth', `ลงทะเบียนผู้ใช้ใหม่: ${cleanUsername}`);
    return { token, user };
  },

  async logout() {
    const token = this.token();
    if (token) {
      try { await this.deleteDoc(window.firestoreDb, 'sessions', token); } catch (e) {}
    }
    return { success: true };
  },

  /* ===================== USERS ===================== */
  async updateProfile({ username, fullName, bio, avatar }) {
    const me = await this.currentUser();
    const users = await this.readAll(window.firestoreDb, 'users');
    const cleanUsername = username && String(username).trim();

    if (cleanUsername) {
      if (users.some(u => u.id !== me.id && (u.username || '').toLowerCase() === cleanUsername.toLowerCase())) {
        this.error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
      }
    }

    const next = { ...me };
    if (cleanUsername) next.username = cleanUsername;
    if (fullName) next.fullName = String(fullName).trim();
    if (bio !== undefined && bio !== null) next.bio = bio;
    if (avatar) next.avatar = avatar;

    await this.setDoc(window.firestoreDb, 'users', me.id, next);
    return { user: next };
  },

  async follow({ targetId }) {
    const me = await this.currentUser();
    if (targetId === me.id) this.error('ไม่สามารถติดตามตัวเองได้');
    const target = await this.getDoc(window.firestoreDb, 'users', targetId);
    if (!target) this.error('ไม่พบผู้ใช้', 404);

    const myFollows = me.follows || [];
    const idx = myFollows.indexOf(targetId);

    if (idx === -1) {
      myFollows.push(targetId);
      me.following = (me.following || 0) + 1;
      target.followers = (target.followers || 0) + 1;
      me.follows = myFollows;
    } else {
      myFollows.splice(idx, 1);
      me.following = Math.max((me.following || 0) - 1, 0);
      target.followers = Math.max((target.followers || 0) - 1, 0);
      me.follows = myFollows;
    }

    await this.setDoc(window.firestoreDb, 'users', me.id, me);
    await this.setDoc(window.firestoreDb, 'users', targetId, target);

    return { success: true, following: idx === -1, me, target };
  },

  /* ===================== POSTS ===================== */
  async createPost({ imageUrl, caption, filter, link }) {
    const me = this.normalizeUser(await this.currentUser());

    const post = {
      id: this.genId('post_'),
      userId: me.id,
      username: me.username,
      userAvatar: me.avatar,
      imageUrl: imageUrl || null,
      caption: caption || '',
      filter: filter || 'none',
      link: link || null,
      likes: [],
      comments: [],
      bookmarks: [],
      createdAt: new Date().toISOString()
    };
    await this.setDoc(window.firestoreDb, 'posts', post.id, post);
    await this.logActivity('post', `ผู้ใช้ ${me.username} โพสต์ข้อความใหม่`);
    return { post };
  },

  async postAction({ postId, action, text }) {
    const me = await this.currentUser();
    const post = await this.getDoc(window.firestoreDb, 'posts', postId);
    if (!post) this.error('ไม่พบโพสต์', 404);

    if (action === 'like') {
      const likes = post.likes || [];
      const idx = likes.indexOf(me.id);
      if (idx === -1) likes.push(me.id); else likes.splice(idx, 1);
      post.likes = likes;
      await this.setDoc(window.firestoreDb, 'posts', postId, post);
      return { success: true, liked: idx === -1, likesCount: likes.length };
    }

    if (action === 'bookmark') {
      const bookmarks = post.bookmarks || [];
      const idx = bookmarks.indexOf(me.id);
      if (idx === -1) bookmarks.push(me.id); else bookmarks.splice(idx, 1);
      post.bookmarks = bookmarks;
      await this.setDoc(window.firestoreDb, 'posts', postId, post);
      return { success: true, bookmarked: idx === -1 };
    }

    if (action === 'comment') {
      if (!text || !String(text).trim()) this.error('โปรดใส่ข้อความคอมเมนต์');
      const comments = post.comments || [];
      comments.push({
        id: 'c_' + Date.now(),
        userId: me.id,
        username: me.username,
        text: String(text).trim(),
        createdAt: new Date().toISOString()
      });
      post.comments = comments;
      await this.setDoc(window.firestoreDb, 'posts', postId, post);
      return { success: true, comments };
    }

    if (action === 'delete') {
      if (post.userId !== me.id && me.role !== 'admin') this.error('ไม่มีสิทธิ์ลบโพสต์นี้', 403);
      await this.deleteDoc(window.firestoreDb, 'posts', postId);
      await this.logActivity('post', `ลบโพสต์ ID ${postId} โดย ${me.username}`);
      return { success: true };
    }

    this.error('action ไม่ถูกต้อง');
  },

  /* ===================== STORIES ===================== */
  async createStory({ mediaUrl, caption }) {
    const me = await this.currentUser();
    const defaultMedia = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
    const story = {
      id: this.genId('st_'),
      userId: me.id,
      username: me.username,
      userAvatar: me.avatar,
      mediaUrl: mediaUrl || defaultMedia,
      caption: caption || '',
      views: 0,
      createdAt: new Date().toISOString()
    };
    await this.setDoc(window.firestoreDb, 'stories', story.id, story);
    await this.logActivity('story', `ผู้ใช้ ${me.username} เพิ่มสตอรี่ใหม่`);
    return { story };
  },

  /* ===================== SHOP / BUY RANK ===================== */
  async purchaseRank({ rank }) {
    const me = this.normalizeUser(await this.currentUser());
    const cfg = window.RANK_CONFIG[rank];
    if (!cfg) this.error('ยศไม่ถูกต้อง');

    const rankOrder = ['member', 'premium', 'vip', 'supervip'];
    if (rankOrder.indexOf(rank) <= rankOrder.indexOf(me.rank || 'member')) {
      this.error('คุณมียศนี้หรือสูงกว่าอยู่แล้ว');
    }

    const balance = Number(me.dogcoin || 0);
    const price = Number(cfg.price);
    if (balance < price) {
      this.error(`เงินไม่พอ 🙁 ต้องใช้ 🦴 ${price.toLocaleString()} Dogcoin แต่คุณมี 🦴 ${balance.toLocaleString()}`);
    }

    me.dogcoin = balance - price;
    me.rank = rank;
    await this.setDoc(window.firestoreDb, 'users', me.id, me);
    await this.logActivity('shop', `ผู้ใช้ ${me.username} ซี่ยศ ${cfg.icon} ${cfg.label} ด้วย 🦴 ${price.toLocaleString()} Dogcoin`);
    return { success: true, rank, dogcoin: me.dogcoin, user: me };
  },

  async storyAction({ storyId, action }) {
    const db = window.firestoreDb;

    if (action === 'view') {
      if (!storyId) this.error('missing storyId');
      const story = await this.getDoc(db, 'stories', storyId);
      if (story) {
        story.views = (story.views || 0) + 1;
        await this.setDoc(db, 'stories', storyId, story);
      }
      return { success: true };
    }

    if (action === 'delete') {
      const me = await this.currentUser();
      const story = await this.getDoc(db, 'stories', storyId);
      if (!story) this.error('ไม่พบสตอรี่', 404);
      if (story.userId !== me.id && me.role !== 'admin') this.error('ไม่มีสิทธิ์ลบสตอรี่นี้', 403);
      await this.deleteDoc(db, 'stories', storyId);
      return { success: true };
    }

    this.error('action ไม่ถูกต้อง');
  },

  /* ===================== CHATS ===================== */
  async chatAction(payload) {
    const me = await this.currentUser();
    const db = window.firestoreDb;
    const { action } = payload;

    if (action === 'get-or-create') {
      const { targetUserId } = payload;
      if (!targetUserId) this.error('missing targetUserId');
      const chats = await this.readAll(db, 'chats');
      let chat = this.findChatByParticipants(chats, me.id, targetUserId);
      if (!chat) {
        chat = {
          id: this.genId('chat_'),
          participants: [me.id, targetUserId],
          messages: []
        };
        await this.setDoc(db, 'chats', chat.id, chat);
      }
      return { chat };
    }

    if (action === 'message') {
      const { targetUserId, text, imageUrl } = payload;
      if (!targetUserId) this.error('missing targetUserId');
      if ((!text || !String(text).trim()) && !imageUrl) this.error('ใส่ข้อความหรือรูปภาพ');

      const chats = await this.readAll(db, 'chats');
      let chat = this.findChatByParticipants(chats, me.id, targetUserId);
      if (!chat) {
        chat = {
          id: this.genId('chat_'),
          participants: [me.id, targetUserId],
          messages: []
        };
      }
      chat.messages = chat.messages || [];
      chat.messages.push({
        id: this.genId('m_'),
        senderId: me.id,
        text: text ? String(text).trim() : '',
        imageUrl: imageUrl || null,
        timestamp: new Date().toISOString()
      });
      await this.setDoc(db, 'chats', chat.id, chat);
      await this.logActivity('chat', `ข้อความใหม่จาก ${me.username}`);
      return { chat };
    }

    if (action === 'read') {
      const { chatId } = payload;
      if (!chatId) this.error('missing chatId');
      const chat = await this.getDoc(db, 'chats', chatId);
      const messages = (chat && chat.messages) || [];
      const lastId = messages.length ? messages[messages.length - 1].id : null;
      const reads = me.chatReads ? { ...me.chatReads } : {};
      reads[chatId] = lastId;
      me.chatReads = reads;
      await this.setDoc(db, 'users', me.id, me);
      window.lastSnapshot && window.lastSnapshot.users &&
        window.lastSnapshot.users.some(u => u.id === me.id) &&
        Object.assign(window.lastSnapshot.users.find(u => u.id === me.id), me);
      return { success: true };
    }

    this.error('action ไม่ถูกต้อง');
  },

  findChatByParticipants(chats, a, b) {
    return (chats || []).find(c =>
      c.participants && c.participants.includes(a) && c.participants.includes(b)
    ) || null;
  },

  /* ===================== ADMIN ===================== */
  async currentUser() {
    if (window.authManager && window.authManager.currentUser) {
      return window.authManager.currentUser;
    }
    this.error('ต้องเข้าสู่ระบบก่อน', 401);
  },

  async requireAdminUser() {
    const me = await this.currentUser();
    if (me.role !== 'admin') this.error('ต้องเป็น Admin เท่านั้น', 403);
    return me;
  },

  async adminAction({ action, userId, rank, amount }) {
    const admin = this.normalizeUser(await this.requireAdminUser());
    const db = window.firestoreDb;
    if (!action || !userId) this.error('กรอกข้อมูลไม่ครบ');

    if (action === 'toggle-ban') {
      if (userId === admin.id) this.error('ไม่สามารถระงับตัวเองได้');
      const target = this.normalizeUser(await this.getDoc(db, 'users', userId));
      if (!target) this.error('ไม่พบผู้ใช้', 404);
      target.isBanned = !target.isBanned;
      await this.setDoc(db, 'users', userId, target);
      // ลบ session ของผู้ถูกระงับ
      const sessions = await this.readAll(db, 'sessions');
      await Promise.all(sessions.filter(s => s.userId === userId).map(s => this.deleteDoc(db, 'sessions', s.id)));
      await this.logActivity('admin', `Admin ${admin.username} ${target.isBanned ? 'ระงับบัญชี' : 'ปลดระงับบัญชี'} ผู้ใช้ ${target.username}`);
      return { success: true, isBanned: target.isBanned, user: target };
    }

    if (action === 'toggle-role') {
      if (userId === admin.id) this.error('ไม่สามารถเปลี่ยนสิทธิ์ตัวเองได้');
      const target = this.normalizeUser(await this.getDoc(db, 'users', userId));
      if (!target) this.error('ไม่พบผู้ใช้', 404);
      target.role = target.role === 'admin' ? 'user' : 'admin';
      await this.setDoc(db, 'users', userId, target);
      await this.logActivity('admin', `Admin ${admin.username} เปลี่ยนสิทธิ์ ${target.username} เป็น ${target.role}`);
      return { success: true, newRole: target.role, user: target };
    }

    if (action === 'set-rank') {
      const validRanks = Object.keys(window.RANK_CONFIG);
      if (!validRanks.includes(rank)) this.error('ยศไม่ถูกต้อง');
      const target = this.normalizeUser(await this.getDoc(db, 'users', userId));
      if (!target) this.error('ไม่พบผู้ใช้', 404);
      target.rank = rank;
      await this.setDoc(db, 'users', userId, target);
      await this.logActivity('admin', `Admin ${admin.username} ตั้งยศ ${target.rank} ให้ ${target.username}`);
      return { success: true, rank, user: target };
    }

    if (action === 'set-dogcoin') {
      const target = this.normalizeUser(await this.getDoc(db, 'users', userId));
      if (!target) this.error('ไม่พบผู้ใช้', 404);
      amount = Number(amount);
      if (!isFinite(amount)) this.error('จำนวน Dogcoin ไม่ถูกต้อง');
      amount = Math.max(0, Math.round(amount));
      target.dogcoin = amount;
      await this.setDoc(db, 'users', userId, target);
      await this.logActivity('admin', `Admin ${admin.username} ตั้ง Dogcoin ของ ${target.username} เป็น 🦴 ${amount.toLocaleString()}`);
      return { success: true, dogcoin: amount, user: target };
    }

    if (action === 'delete-user') {
      if (userId === admin.id) this.error('ไม่สามารถลบบัญชีตัวเองได้');
      const target = await this.getDoc(db, 'users', userId);
      if (!target) this.error('ไม่พบผู้ใช้', 404);
      const sessions = await this.readAll(db, 'sessions');
      await Promise.all(sessions.filter(s => s.userId === userId).map(s => this.deleteDoc(db, 'sessions', s.id)));
      const posts = await this.readAll(db, 'posts');
      await Promise.all(posts.filter(p => p.userId === userId).map(p => this.deleteDoc(db, 'posts', p.id)));
      const stories = await this.readAll(db, 'stories');
      await Promise.all(stories.filter(s => s.userId === userId).map(s => this.deleteDoc(db, 'stories', s.id)));
      await this.deleteDoc(db, 'users', userId);
      await this.logActivity('admin', `Admin ${admin.username} ลบผู้ใช้ ${target.username} ออกจากระบบ`);
      return { success: true };
    }

    this.error('action ไม่ถูกต้อง');
  },

  async resetSystem() {
    await this.requireAdminUser();
    const db = window.firestoreDb;
    const collections = ['users', 'posts', 'stories', 'chats', 'sessions', 'logs'];
    for (const name of collections) {
      const all = await this.readAll(db, name);
      await Promise.all(all.map(doc => this.deleteDoc(db, name, doc.id)));
    }
    await window.seedFirestore();
    return { success: true };
  }
};

window.api = api;
