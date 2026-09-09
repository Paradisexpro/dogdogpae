// js/app.js - Main Application Controller (Tabs, Rendering, Modals, Events)

class App {
  constructor() {
    this.currentTab = 'home';
    this.viewingProfileId = null;
    this.selectedFilter = 'none';
    this.editAvatarDataUrl = null;
    this.init();
  }

  /* ===================== INIT ===================== */
  async init() {
    // Apply saved theme
    const theme = localStorage.getItem('ig_theme');
    if (theme === 'dark') document.body.classList.add('dark-theme');

    // Bind nav clicks
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.setTab(el.dataset.tab);
      });
    });

    // Delegated clicks on mobile bottom nav
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) {
      mobileNav.addEventListener('click', e => {
        const item = e.target.closest('[data-tab]');
        if (item) {
          e.preventDefault();
          this.setTab(item.dataset.tab);
        }
      });
    }

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          if (overlay.id === 'storyViewerModal') {
            window.storyManager.closeViewer();
          } else {
            this.closeModal(overlay.id);
          }
        }
      });
    });

    // Esc closes modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const viewer = document.getElementById('storyViewerModal');
        if (viewer.classList.contains('active')) {
          window.storyManager.closeViewer();
        } else {
          document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
        }
      }
      if (e.key === 'ArrowLeft' && document.getElementById('storyViewerModal').classList.contains('active')) {
        window.storyManager.prevStory();
      }
      if (e.key === 'ArrowRight' && document.getElementById('storyViewerModal').classList.contains('active')) {
        window.storyManager.nextStory();
      }
    });

    // Bind file inputs
    this.bindUploads();

    // Bind search
    this.bindSearch();

    // โหลดข้อมูลจาก Google Sheets (ผ่าน Apps Script)
    const content = document.getElementById('content');
    if (content) content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><h3>กำลังโหลดข้อมูล...</h3></div>';
    try {
      await window.store.load();
    } catch (e) {
      this.showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + e.message);
    }

    this.renderSidebarFooter();
    this.checkLoginGate();
    this.setTab('home');
    this.updateChatBadge();
  }

  /* ===================== LOGIN GATE ===================== */
  showLoginGate() {
    const gate = document.getElementById('loginGate');
    if (gate) gate.classList.add('active');
    this.playLoginMusic();
  }

  hideLoginGate() {
    const gate = document.getElementById('loginGate');
    if (gate) gate.classList.remove('active');
    this.stopLoginMusic();
  }

  checkLoginGate() {
    if (window.authManager.currentUser) this.hideLoginGate();
    else this.showLoginGate();
  }

  /* ===================== LOGIN MUSIC ===================== */
  ensureLoginMusic() {
    let v = document.getElementById('loginMusic');
    if (v) return v;
    v = document.createElement('audio');
    v.id = 'loginMusic';
    v.loop = true;
    v.preload = 'auto';
    v.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    const src = document.createElement('source');
    src.src = 'https://www.image2url.com/r2/default/audio/1788881808740-c3dc8f42-a9a1-4aa5-9ace-9562c7601fd9.mp3';
    src.type = 'audio/mpeg';
    v.appendChild(src);
    document.body.appendChild(v);
    return v;
  }

  playLoginMusic() {
    const v = this.ensureLoginMusic();
    const p = v.play && v.play();
    if (p && p.then) {
      p.then(() => {}).catch(() => {
        // เบราว์เซอร์ห้าม autoplay → จะเริ่มเล่นอัตโนมัติเมื่อผู้ใช้คลิก/แตะหน้าล็อกอินครั้งแรก
        if (window.__musicListenerBound) return;
        window.__musicListenerBound = true;
        const start = () => {
          v.play().catch(() => {});
          const gate = document.getElementById('loginGate');
          if (gate) gate.removeEventListener('click', start);
          window.__musicListenerBound = false;
        };
        const gate = document.getElementById('loginGate');
        if (gate) gate.addEventListener('click', start);
      });
    }
  }

  stopLoginMusic() {
    const v = document.getElementById('loginMusic');
    if (v) { v.pause(); v.currentTime = 0; }
    window.__musicListenerBound = false;
  }

  /* ===================== SEARCH ===================== */
  bindSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    const hideResults = () => {
      setTimeout(() => results.classList.remove('show'), 150);
    };

    input.addEventListener('input', () => {
      this.renderSearchResults(input.value);
    });
    input.addEventListener('focus', () => {
      if (input.value.trim()) results.classList.add('show');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.blur();
        results.classList.remove('show');
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#sidebarSearch')) hideResults();
    });
  }

  renderSearchResults(query) {
    const results = document.getElementById('searchResults');
    if (!results) return;

    const q = String(query || '').trim().toLowerCase();
    if (!q) {
      results.classList.remove('show');
      return;
    }

    const me = window.authManager.currentUser;
    const users = window.authManager.getUsers().filter(u => {
      if (u.id === (me && me.id)) return false;
      if (u.isBanned) return false;
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q)
      );
    });

    results.innerHTML = users.length
      ? users.slice(0, 8).map(u => `
          <div class="search-result-item" onclick="window.app.viewUser('${u.id}')">
            <img class="search-result-avatar" src="${this.escapeHTML(u.avatar)}" alt="avatar">
            <div class="search-result-info">
              <span class="search-result-username">${this.escapeHTML(u.username)}</span>
              <span class="search-result-name">${this.escapeHTML(u.fullName || '')}</span>
            </div>
            ${u.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
          </div>
        `).join('')
      : '<div class="search-result-empty">ไม่พบผู้ใช้ที่ตรงกับคำค้นหา</div>';

    results.classList.add('show');
  }

  /* ===================== HELPERS ===================== */
  escapeHTML(str) {
    const s = String(str == null ? '' : str);
    return s
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  rankInfo(rank) {
    const cfg = window.RANK_CONFIG && window.RANK_CONFIG[rank];
    if (!cfg && rank !== 'member') return this.rankInfo('member');
    return cfg || { label: 'สมาชิก', icon: '🐾' };
  }

  rankKey(user) {
    const r = user && user.rank;
    return (r && window.RANK_CONFIG[r]) ? r : 'member';
  }

  rankBadgeHTML(user) {
    const rank = (user && user.rank) || 'member';
    const cfg = this.rankInfo(rank);
    return `<span class="rank-badge rank-${this.escapeHTML(rank)}" title="${cfg.label}: ${(cfg.perks || []).join(', ')}">${cfg.icon} ${this.escapeHTML(cfg.label)}</span>`;
  }

  timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ชั่วโมงที่แล้ว';
    return Math.floor(diff / 86400) + ' วันที่แล้ว';
  }

  formatCount(n) {
    n = n || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  compressImage(file, maxW = 1000, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  bindUploads() {
    document.addEventListener('change', e => {
      const id = e.target && e.target.id;

      if (id === 'postFileInput') {
        const file = e.target.files[0];
        if (!file) return;
        const me = window.authManager.currentUser;
        const maxRes = me ? this.rankInfo(me.rank).avatarRes : 800;
        this.compressImage(file, maxRes).then(dataUrl => {
          const img = document.getElementById('postImagePreview');
          img.src = dataUrl;
          img.classList.remove('hidden');
          document.getElementById('postUploadPlaceholder').classList.add('hidden');
          this.applyFilterToPreview();
        }).catch(() => this.showToast('ไม่สามารถอ่านรูปภาพได้'));
      }

      if (id === 'storyFileInput') {
        const file = e.target.files[0];
        if (!file) return;
        this.compressImage(file, 800).then(dataUrl => {
          const img = document.getElementById('storyImagePreview');
          img.src = dataUrl;
          img.classList.remove('hidden');
          document.getElementById('storyUploadPlaceholder').classList.add('hidden');
        }).catch(() => this.showToast('ไม่สามารถอ่านรูปภาพได้'));
      }

      if (id === 'editAvatarInput') {
        const file = e.target.files[0];
        if (!file) return;
        this.compressImage(file, 300, 0.8).then(dataUrl => {
          this.editAvatarDataUrl = dataUrl;
          document.getElementById('editAvatarPreview').src = dataUrl;
        }).catch(() => this.showToast('ไม่สามารถอ่านรูปภาพได้'));
      }

      if (id === 'chatImageInput') {
        this.pickChatImage();
        e.target.value = '';
      }
    });
  }

  /* ===================== SIDEBAR ===================== */
  renderSidebarFooter() {
    const footer = document.getElementById('sidebarFooter');
    const me = window.authManager.currentUser;
    const navAdmin = document.getElementById('navAdmin');

    if (navAdmin) {
      navAdmin.style.display = window.authManager.isAdmin() ? '' : 'none';
    }

    let html = '';
    if (me) {
      html = `
        <div class="user-profile-btn" onclick="window.app.viewUser('${me.id}')">
          <div class="avatar-rank-frame rank-${this.rankKey(me)}">
            <img class="user-avatar-sm" src="${this.escapeHTML(me.avatar)}" alt="avatar">
          </div>
          <div class="user-meta-info">
            <span class="user-meta-name">${this.escapeHTML(me.username)}</span>
            <span class="user-meta-role">
              ${me.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
              ${this.rankBadgeHTML(me)}
            </span>
          </div>
        </div>
        <div class="dogcoin-chip" onclick="window.app.setTab('shop')" title="ซื้อยศด้วย Dogcoin">
          <span class="dogcoin-icon">🦴</span>
          <span class="dogcoin-amount">${Number(me.dogcoin || 0).toLocaleString()}</span>
        </div>
        <button class="btn btn-secondary" onclick="window.app.toggleTheme()">${document.body.classList.contains('dark-theme') ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}</button>
        <button class="btn btn-danger" onclick="window.app.logout()">ออกจากระบบ</button>
      `;
    } else {
      html = `
        <button class="btn btn-gradient btn-block" onclick="window.app.openModal('authModal')">เข้าสู่ระบบ / สมัครสมาชิก</button>
        <button class="btn btn-secondary" onclick="window.app.toggleTheme()">${document.body.classList.contains('dark-theme') ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}</button>
      `;
    }
    footer.innerHTML = html;
    this.renderMobileNav();
  }

  renderMobileNav() {
    const nav = document.getElementById('mobileNav');
    if (!nav) return;
    const me = window.authManager.currentUser;
    const tabs = [
      { tab: 'home', icon: '🏠', label: 'หน้าแรก' },
      { tab: 'chat', icon: '💬', label: 'ข้อความ', badge: true },
      { tab: 'shop', icon: '🛍️', label: 'ซื้อยศ' },
      { tab: 'profile', icon: '👤', label: 'โปรไฟล์' }
    ];
    if (me && me.role === 'admin') tabs.push({ tab: 'admin', icon: '🛡️', label: 'Admin' });
    nav.innerHTML = tabs.map(t => `
      <a href="#" class="mobile-nav-item ${this.currentTab === t.tab ? 'active' : ''}" data-tab="${t.tab}">
        <span class="mobile-nav-icon">${t.icon}</span>
        <span class="mobile-nav-label">${t.label}</span>
        ${t.badge ? '<span class="badge-counter hidden" id="mobileChatBadge">0</span>' : ''}
      </a>
    `).join('');
  }

  toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('ig_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    this.renderSidebarFooter();
    if (this.currentTab === 'profile' || this.currentTab === 'home') this.renderContent();
  }

  /* ===================== NAVIGATION ===================== */
  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    this.renderMobileNav();
    this.renderContent();
  }

  renderContent() {
    const content = document.getElementById('content');
    const me = window.authManager.currentUser;

    if (this.currentTab === 'home') {
      this.renderHome(content);
    } else if (this.currentTab === 'chat') {
      if (!me) { content.innerHTML = this.loginPromptHTML(); return; }
      this.renderChat(content);
    } else if (this.currentTab === 'profile') {
      if (!me) { content.innerHTML = this.loginPromptHTML(); return; }
      this.renderProfile(content, this.viewingProfileId || me.id);
    } else if (this.currentTab === 'shop') {
      if (!me) { content.innerHTML = this.loginPromptHTML(); return; }
      this.renderShop(content);
    } else if (this.currentTab === 'admin') {
      this.renderAdmin(content);
    }
  }

  loginPromptHTML() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <h3>กรุณาเข้าสู่ระบบก่อน</h3>
        <p style="margin-bottom:16px;">ลงชื่อเข้าใช้เพื่อเข้าถึงฟีเจอร์นี้</p>
        <button class="btn btn-gradient" onclick="window.app.openModal('authModal')">เข้าสู่ระบบ</button>
      </div>
    `;
  }

  /* ===================== SHOP / ซื้อยศ ===================== */
  renderShop(content) {
    const me = window.authManager.currentUser;
    const cfg = window.RANK_CONFIG;
    const rankOrder = ['member', 'premium', 'vip', 'supervip'];
    const myIdx = rankOrder.indexOf(this.rankKey(me));
    const balance = Number(me.dogcoin || 0);

    function perksList(perks) {
      return perks.map(p => `<li>${p}</li>`).join('');
    }

    const rankCards = rankOrder
      .map(r => {
        const c = cfg[r];
        const owned = myIdx >= rankOrder.indexOf(r);
        let btn;
        if (r === 'member') {
          btn = `<button class="btn btn-sm shop-btn disabled" disabled>🐾 ยศเริ่มต้น (ฟรี)</button>`;
        } else if (owned) {
          btn = `<button class="btn btn-sm shop-btn disabled" disabled>✅ เป็นยศปัจจุบันแล้ว</button>`;
        } else if (balance < c.price) {
          btn = `<button class="btn btn-sm shop-btn disabled" disabled>🦴 เงินไม่พอ</button>`;
        } else {
          btn = `<button class="btn btn-sm btn-gradient shop-btn" onclick="window.app.buyRank('${r}')">ซื้อเลย 🦴 ${c.price.toLocaleString()}</button>`;
        }
        return `
          <div class="shop-rank-card post-frame-${r}">
            <div class="shop-rank-head">
              <div class="shop-rank-icon">${c.icon}</div>
              <h3 class="shop-rank-name">${c.label}</h3>
              <span class="rank-badge rank-${r}">${c.label}</span>
            </div>
            <div class="shop-rank-price">🦴 ${c.price.toLocaleString()} <span>Dogcoin</span></div>
            <ul class="shop-rank-perks">${perksList(c.perks)}</ul>
            ${btn}
          </div>
        `;
      })
      .join('');

    content.innerHTML = `
      <div class="shop-page">
        <div class="shop-header">
          <h2>ซื้อยศสมาชิก 🛍️</h2>
          <p>ใช้ Dogcoin (🦴) ซื้อของเพื่อสิทธิพิเศษสุดเจ๋ง!</p>
          <div class="dogcoin-balance">🦴 ${balance.toLocaleString()} <span>Dogcoin</span></div>
          <div class="shop-current-rank">ยศปัจจุบัน: ${cfg[this.rankKey(me)].icon} ${cfg[this.rankKey(me)].label}</div>
        </div>
        <div class="shop-rank-grid">
          ${rankCards}
        </div>
        <div class="shop-note">
          💡 <b>วิธีได้ Dogcoin:</b> สมัครใหม่รับโบนัสต้อนรับ 🦴 500 และ Admin สามารถเติมให้ได้
        </div>
      </div>
    `;
  }

  async buyRank(rank) {
    const cfg = window.RANK_CONFIG[rank];
    const me = window.authManager.currentUser;
    if (!cfg || !me) return;
    if (!confirm(`ยืนยันซื้อยศ ${cfg.icon} ${cfg.label} ด้วย 🦴 ${cfg.price.toLocaleString()} Dogcoin?\n\nยอดคงเหลือปัจจุบัน: 🦴 ${Number(me.dogcoin || 0).toLocaleString()}`)) return;

    const btns = document.querySelectorAll('.shop-page .shop-btn');
    btns.forEach(b => { b.disabled = true; });

    try {
      const res = await window.api.post('/shop/buy', { rank });
      window.authManager.currentUser = res.user;
      if (window.adminManager) window.adminManager.mergeUser(res.user);
      this.showToast(`ซื้อยศ ${cfg.icon} ${cfg.label} สำเร็จ! เหลือ 🦴 ${res.dogcoin.toLocaleString()}`);
      this.renderSidebarFooter();
      document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === 'shop'));
      this.renderContent();
    } catch (err) {
      this.showToast(err.message || 'ซื้อไม่สำเร็จ', true);
      btns.forEach(b => { b.disabled = false; });
    }
  }

  /* ===================== HOME / FEED ===================== */
  renderHome(content) {
    const me = window.authManager.currentUser;

    let welcome = '';
    if (!me) {
      welcome = `
        <div class="welcome-card">
          <div>
            <h2>ยินดีต้อนรับสู่ DogDog! 🐾</h2>
            <p>สมัครสมาชิกเพื่อโพสต์รูป ลงสตอรี่ และแชทกับเพื่อนๆ สี่ขา</p>
          </div>
          <button class="btn" onclick="window.app.openModal('authModal')">เริ่มเลย!</button>
        </div>
      `;
    }

    let composer = '';
    if (me) {
      composer = `
        <div class="composer-card">
          <div class="composer-top">
            <div class="avatar-rank-frame rank-${this.rankKey(me)}">
              <img class="user-avatar-sm composer-avatar" src="${this.escapeHTML(me.avatar)}" alt="avatar">
            </div>
            <textarea class="composer-input" id="composerInput" rows="2" placeholder="คุณคิดอะไรอยู่? แชร์เรื่องราวน้องหมา 🐾 หรือวางลิงก์ได้เลย!"></textarea>
          </div>
          <div class="composer-actions">
            <div class="composer-actions-left">
              <button class="composer-tool-btn" onclick="window.app.openPostModal()">📷 รูปภาพ</button>
              <button class="composer-tool-btn" onclick="window.app.composerFocusLink()">🔗 แชร์ลิงก์</button>
            </div>
            <button class="btn btn-gradient btn-sm" onclick="window.app.submitHomePost()">โพสต์</button>
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      ${welcome}
      ${composer}
      <div id="storiesBar"></div>
      <div class="feed-container" id="feed"></div>
    `;

    this.renderStoriesBar();
    this.renderFeed();
  }

  composerFocusLink() {
    const ta = document.getElementById('composerInput');
    if (ta) ta.focus();
  }

  async submitHomePost() {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อนโพสต์'); this.openModal('authModal'); return; }
    const ta = document.getElementById('composerInput');
    const text = (ta ? ta.value : '').trim();
    if (!text) { this.showToast('กรุณาพิมพ์ข้อความหรือวางลิงก์'); return; }
    const link = this.extractLink(text);
    const res = await window.postManager.createPost({ imageUrl: null, caption: text, filter: 'none', link });
    if (!res.success) { this.showToast(res.error); return; }
    if (ta) ta.value = '';
    this.showToast('โพสต์สำเร็จ! 🎉');
    this.renderFeed();
  }

  extractLink(text) {
    const re = /https?:\/\/[^\s]+/i;
    const m = String(text || '').match(re);
    return m ? m[0].replace(/[\)\]\.,;:!?"']+$/, '') : null;
  }

  renderStoriesBar() {
    const container = document.getElementById('storiesBar');
    if (!container) return;

    const me = window.authManager.currentUser;
    const stories = window.storyManager.getStories();

    // Group by user, keep latest story
    const grouped = new Map();
    stories.forEach(s => {
      if (!grouped.has(s.userId)) grouped.set(s.userId, s);
    });

    let html = '<div class="stories-bar">';

    // Add story button
    if (me) {
      html += `
        <div class="story-item my-add-story" onclick="window.app.openStoryModal()">
          <div class="story-avatar-wrapper rank-${this.rankKey(me)}">
            <img class="story-avatar-img" src="${this.escapeHTML(me.avatar)}" alt="my">
            <div class="add-story-plus">+</div>
          </div>
          <span class="story-username">สตอรี่ของคุณ</span>
        </div>
      `;
    } else {
      html += `
        <div class="story-item my-add-story" onclick="window.app.openModal('authModal')">
          <div class="story-avatar-wrapper rank-member">
            <img class="story-avatar-img" src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80" alt="login">
            <div class="add-story-plus">+</div>
          </div>
          <span class="story-username">ลงสตอรี่</span>
        </div>
      `;
    }

    // Story items
    const allUsers = window.authManager.getUsers();
    grouped.forEach(s => {
      const storyAuthor = allUsers.find(u => u.id === s.userId) || {};
      html += `
        <div class="story-item" onclick="window.storyManager.openViewer('${s.id}')">
          <div class="story-avatar-wrapper rank-${this.rankKey(storyAuthor)}">
            <img class="story-avatar-img" src="${this.escapeHTML(s.userAvatar)}" alt="${this.escapeHTML(s.username)}">
          </div>
          <span class="story-username">${this.escapeHTML(s.username)}</span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  renderFeed() {
    const container = document.getElementById('feed');
    if (!container) return;

    const posts = window.postManager.getPosts();
    if (!posts.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📸</div>
          <h3>ยังไม่มีโพสต์</h3>
          <p>มาเป็นคนแรกที่โพสต์ข้อความหรือรูปภาพ!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(p => this.postCardHTML(p)).join('');
  }

  postCardHTML(post) {
    const me = window.authManager.currentUser;
    const author = window.authManager.getUsers().find(u => u.id === post.userId) || {};
    const liked = me && post.likes.includes(me.id);
    const bookmarked = me && post.bookmarks.includes(me.id);
    const canDelete = me && (post.userId === me.id || window.authManager.isAdmin());
    const link = post.link || this.extractLink(post.caption);
    const rankKey = this.rankKey(author);

    const commentsHTML = (post.comments || []).map(c => {
      const commentAuthor = window.authManager.getUsers().find(u => u.id === c.userId);
      return `
      <div class="comment-item">
        <span class="comment-username">${this.escapeHTML(c.username)} ${commentAuthor ? this.rankBadgeHTML(commentAuthor) : ''}</span>
        <span class="comment-text">${this.escapeHTML(c.text)}</span>
      </div>
    `;
    }).join('');

    const mediaBlock = post.imageUrl ? `
      <div class="post-image-container" ondblclick="window.app.doubleTapLike(event,'${post.id}')">
        <img class="post-image filter-${post.filter || 'none'}" src="${this.escapeHTML(post.imageUrl)}" alt="post">
        <div class="heart-pop-animation" id="heartPop_${post.id}">❤️</div>
      </div>
    ` : `
      <div class="post-text-block">${this.escapeHTML(post.caption || '')}</div>
    `;

    const linkCard = link ? `
      <a class="post-link-card" href="${this.escapeHTML(link)}" target="_blank" rel="noopener">
        <span class="post-link-icon">🔗</span>
        <span class="post-link-url">${this.escapeHTML(link)}</span>
      </a>
    ` : '';

    return `
      <article class="post-card post-frame-${this.escapeHTML(rankKey)}" id="post_${post.id}">
        <div class="post-header">
          <a class="post-author" href="#" onclick="event.preventDefault();window.app.viewUser('${post.userId}')">
            <div class="avatar-rank-frame rank-${this.escapeHTML(rankKey)}">
              <img class="post-author-avatar" src="${this.escapeHTML(post.userAvatar)}" alt="avatar">
            </div>
            <div class="post-author-info">
              <span class="post-author-username">${this.escapeHTML(post.username)}</span>
              ${this.rankBadgeHTML(author)}
              <span class="post-time">${this.timeAgo(post.createdAt)}</span>
            </div>
          </a>
          ${canDelete ? `<button class="post-options-btn" title="ลบโพสต์" onclick="window.app.deletePost('${post.id}')">⋯</button>` : ''}
        </div>

        ${mediaBlock}

        <div class="post-actions">
          <div class="post-actions-left">
            <button class="action-btn ${liked ? 'liked' : ''}" id="likeBtn_${post.id}" onclick="window.app.toggleLike('${post.id}')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
            <button class="action-btn" onclick="document.getElementById('commentInput_${post.id}').focus()">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </button>
            <button class="action-btn ${bookmarked ? 'bookmarked' : ''}" id="bookmarkBtn_${post.id}" onclick="window.app.toggleBookmark('${post.id}')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
          <button class="action-btn" title="แชร์" onclick="window.app.sharePost('${post.id}')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        <div class="post-likes-count" id="likeCount_${post.id}">${(post.likes || []).length} ถูกใจ</div>
        ${post.imageUrl ? `
        <div class="post-caption-box">
          <span class="post-caption-username">${this.escapeHTML(post.username)}</span>
          <span>${this.escapeHTML(post.caption || '')}</span>
        </div>
        ` : linkCard}

        <div class="post-comments-list" id="comments_${post.id}">
          ${commentsHTML || '<div class="comment-item"><span class="comment-text" style="color:var(--text-muted);">ยังไม่มีคอมเมนต์</span></div>'}
        </div>

        <form class="post-add-comment" onsubmit="window.app.addComment(event,'${post.id}')">
          <input class="comment-input" id="commentInput_${post.id}" placeholder="เพิ่มคอมเมนต์..." autocomplete="off">
          <button class="comment-submit-btn" type="submit">โพสต์</button>
        </form>
      </article>
    `;
  }

  async toggleLike(postId) {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อนกดถูกใจ'); this.openModal('authModal'); return; }
    const res = await window.postManager.toggleLike(postId);
    if (!res.success) { this.showToast(res.error); return; }
    const btn = document.getElementById('likeBtn_' + postId);
    const count = document.getElementById('likeCount_' + postId);
    if (btn) {
      btn.classList.toggle('liked', res.liked);
      btn.querySelector('svg').setAttribute('fill', res.liked ? 'currentColor' : 'none');
    }
    if (count) count.textContent = res.likesCount + ' ถูกใจ';
  }

  doubleTapLike(e, postId) {
    const pop = document.getElementById('heartPop_' + postId);
    if (pop) {
      pop.classList.remove('pop');
      void pop.offsetWidth;
      pop.classList.add('pop');
      setTimeout(() => pop.classList.remove('pop'), 500);
    }
    this.toggleLike(postId);
  }

  async toggleBookmark(postId) {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    const res = await window.postManager.toggleBookmark(postId);
    if (!res.success) { this.showToast(res.error); return; }
    const btn = document.getElementById('bookmarkBtn_' + postId);
    if (btn) {
      btn.classList.toggle('bookmarked', res.bookmarked);
      btn.querySelector('svg').setAttribute('fill', res.bookmarked ? 'currentColor' : 'none');
    }
  }

  async addComment(e, postId) {
    e.preventDefault();
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    const input = document.getElementById('commentInput_' + postId);
    const res = await window.postManager.addComment(postId, input.value);
    if (!res.success) { this.showToast(res.error); return; }
    input.value = '';
    const list = document.getElementById('comments_' + postId);
    if (list) {
      list.innerHTML = res.comments.map(c => `
        <div class="comment-item">
          <span class="comment-username">${this.escapeHTML(c.username)}</span>
          <span class="comment-text">${this.escapeHTML(c.text)}</span>
        </div>
      `).join('');
    }
  }

  async deletePost(postId) {
    const res = await window.postManager.deletePost(postId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('ลบโพสต์แล้ว');
    if (this.currentTab === 'admin') {
      this.renderContent();
    } else {
      this.renderFeed();
    }
  }

  sharePost(postId) {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    const url = location.href + '#post_' + postId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => this.showToast('คัดลอกลิงก์โพสต์แล้ว 🔗'));
    } else {
      this.showToast('โพสต์: ' + url);
    }
  }

  /* ===================== POST MODAL ===================== */
  openPostModal() {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อนโพสต์'); this.openModal('authModal'); return; }
    // Reset modal
    this.selectedFilter = 'none';
    document.getElementById('postFileInput').value = '';
    document.getElementById('postCaption').value = '';
    document.getElementById('postImagePreview').classList.add('hidden');
    document.getElementById('postUploadPlaceholder').classList.remove('hidden');
    this.renderFilterOptions();
    this.openModal('postModal');
  }

  renderFilterOptions() {
    const filters = [
      { name: 'none', label: 'ธรรมดา' },
      { name: 'warm', label: 'อบอุ่น' },
      { name: 'vintage', label: 'วินเทจ' },
      { name: 'cyber', label: 'นีออน' },
      { name: 'grayscale', label: 'ขาวดำ' },
      { name: 'bright', label: 'สดใส' }
    ];
    const container = document.getElementById('postFilterOptions');
    if (!container) return;
    container.innerHTML = filters.map(f => `
      <button class="filter-chip ${f.name === this.selectedFilter ? 'active' : ''}" onclick="window.app.selectFilter('${f.name}')">${f.label}</button>
    `).join('');
  }

  selectFilter(name) {
    this.selectedFilter = name;
    this.renderFilterOptions();
    this.applyFilterToPreview();
  }

  applyFilterToPreview() {
    const img = document.getElementById('postImagePreview');
    if (!img) return;
    img.className = 'upload-preview filter-' + this.selectedFilter;
  }

  async submitPost() {
    const me = window.authManager.currentUser;
    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อนโพสต์'); return; }

    const img = document.getElementById('postImagePreview');
    const hasImage = img && !img.classList.contains('hidden') && img.src;

    let imageUrl = null;
    if (hasImage) {
      imageUrl = img.src;
    }

    const caption = (document.getElementById('postCaption').value || '').trim();
    if (!caption && !hasImage) { this.showToast('กรุณาใส่ข้อความหรือรูปภาพ'); return; }
    const link = this.extractLink(caption);
    const res = await window.postManager.createPost({ imageUrl, caption, filter: this.selectedFilter, link });
    if (!res.success) { this.showToast(res.error); return; }

    this.closeModal('postModal');
    this.showToast('โพสต์สำเร็จ! 🎉');
    this.setTab('home');
  }

  /* ===================== STORY MODAL ===================== */
  openStoryModal() {
    if (!window.authManager.currentUser) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    document.getElementById('storyFileInput').value = '';
    document.getElementById('storyCaption').value = '';
    document.getElementById('storyImagePreview').classList.add('hidden');
    document.getElementById('storyUploadPlaceholder').classList.remove('hidden');
    this.openModal('storyModal');
  }

  async submitStory() {
    const me = window.authManager.currentUser;
    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); return; }

    const img = document.getElementById('storyImagePreview');
    const hasImage = img && !img.classList.contains('hidden') && img.src;
    const mediaUrl = hasImage ? img.src : null;
    const caption = document.getElementById('storyCaption').value;

    const res = await window.storyManager.createStory({ mediaUrl, caption });
    if (!res.success) { this.showToast(res.error); return; }

    this.closeModal('storyModal');
    this.showToast('ลงสตอรี่แล้ว! ✨');
    this.setTab('home');
  }

  async deleteStory(storyId) {
    const res = await window.storyManager.deleteStory(storyId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('ลบสตอรี่แล้ว');
    if (this.currentTab === 'admin') this.renderContent();
    else this.renderStoriesBar();
  }

  /* ===================== CHAT ===================== */
  renderChat(content) {
    const me = window.authManager.currentUser;
    if (!me) { content.innerHTML = this.loginPromptHTML(); return; }

    const partner = window.chatManager.activeChatPartnerId
      ? window.authManager.getUsers().find(u => u.id === window.chatManager.activeChatPartnerId)
      : null;

    content.innerHTML = `
      <div class="chat-layout">
        <div class="chat-list-panel">
          <div class="chat-list-header"><h2>💬 ข้อความ</h2></div>
          <div class="chat-list" id="chatList"></div>
        </div>
        <div class="chat-conversation" id="chatConversation">
          ${partner ? this.chatConversationHTML(partner) : this.chatEmptyHTML()}
        </div>
      </div>
    `;

    this.renderChatList();
    if (partner) this.renderChatMessages();
  }

  chatEmptyHTML() {
    return `
      <div class="chat-empty">
        <div class="chat-empty-icon">🐾</div>
        <h3>เลือกเพื่อนเพื่อเริ่มแชท</h3>
        <p>กดที่รายชื่อด้านซ้ายเพื่อเริ่มบทสนทนา</p>
      </div>
    `;
  }

  renderChatList() {
    const container = document.getElementById('chatList');
    if (!container) return;

    const me = window.authManager.currentUser;
    if (!me) return;

    const users = window.authManager.getUsers().filter(u => u.id !== me.id);
    const chats = window.chatManager.getChats();

    const listItems = users.map(u => {
      const chat = chats.find(c => c.participants.includes(me.id) && c.participants.includes(u.id));
      const last = chat && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
      const preview = last ? (last.imageUrl ? '📷 รูปภาพ' : last.text) : 'เริ่มแชทเลย!';
      const time = last ? this.timeAgo(last.timestamp) : '';
      const active = window.chatManager.activeChatPartnerId === u.id;
      const lastSenderName = last && last.senderId === me.id ? 'คุณ: ' : (last && last.senderId === u.id ? u.username + ': ' : '');
      return `
        <div class="chat-list-item ${active ? 'active' : ''}" onclick="window.app.openChat('${u.id}')">
          <div class="avatar-rank-frame rank-${this.rankKey(u)}">
            <img class="chat-list-avatar" src="${this.escapeHTML(u.avatar)}" alt="avatar">
          </div>
          <div class="chat-list-info">
            <div class="chat-list-name">${this.escapeHTML(u.username)} ${this.rankBadgeHTML(u)}</div>
            <div class="chat-list-preview">${this.escapeHTML(lastSenderName)}${this.escapeHTML(preview)}</div>
          </div>
          <span class="chat-list-time">${time}</span>
        </div>
      `;
    });

    container.innerHTML = listItems.join('') || '<div class="empty-state" style="padding:24px;">ยังไม่มีผู้ใช้ให้แชท</div>';
  }

  async openChat(userId) {
    const me = window.authManager.currentUser;
    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }

    const chat = await window.chatManager.getOrCreateChat(userId);
    if (chat) {
      window.chatManager.activeChatPartnerId = userId;
      this.markChatRead(chat.id);
    }

    const partner = window.authManager.getUsers().find(u => u.id === userId);
    if (!partner) return;

    const conv = document.getElementById('chatConversation');
    if (conv) conv.innerHTML = this.chatConversationHTML(partner);
    this.renderChatList();
    this.renderChatMessages();
    this.updateChatBadge();
  }

  chatConversationHTML(partner) {
    return `
      <div class="chat-conv-header">
        <div class="avatar-rank-frame rank-${this.rankKey(partner)}">
          <img class="chat-conv-avatar" src="${this.escapeHTML(partner.avatar)}" alt="avatar">
        </div>
        <div>
          <div class="chat-conv-name">${this.escapeHTML(partner.username)} ${this.rankBadgeHTML(partner)}</div>
          ${partner.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-bar">
        <input type="file" accept="image/*" id="chatImageInput" class="hidden">
        <button class="chat-icon-btn" title="ส่งรูปภาพ" onclick="document.getElementById('chatImageInput').click()">📷</button>
        <input class="chat-input" id="chatTextInput" placeholder="พิมพ์ข้อความ..." autocomplete="off" onkeydown="if(event.key==='Enter')window.app.sendChatMessage()">
        <button class="chat-icon-btn chat-send-btn" title="ส่ง" onclick="window.app.sendChatMessage()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
  }

  renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const me = window.authManager.currentUser;
    const partnerId = window.chatManager.activeChatPartnerId;
    if (!me || !partnerId) return;

    const chat = window.chatManager.getChats().find(c =>
      c.participants.includes(me.id) && c.participants.includes(partnerId)
    );

    if (!chat || !chat.messages.length) {
      container.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">👋</div><p>ทักทายเพื่อนของคุณสิ!</p></div>';
      return;
    }

    const users = window.authManager.getUsers();
    const senderName = id => {
      if (id === me.id) return 'คุณ';
      const u = users.find(x => x.id === id);
      return u ? u.username : 'ไม่ทราบชื่อ';
    };

    container.innerHTML = chat.messages.map(m => {
      const mine = m.senderId === me.id;
      const time = new Date(m.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="chat-message-row ${mine ? 'mine' : 'theirs'}">
          <div>
            <div class="chat-message-bubble">
              ${m.imageUrl ? `<img class="chat-message-img" src="${this.escapeHTML(m.imageUrl)}" alt="photo">` : ''}
              ${this.escapeHTML(m.text)}
            </div>
            <div class="chat-message-meta">${senderName(m.senderId)} · ${time}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  async sendChatMessage() {
    const input = document.getElementById('chatTextInput');
    const text = input ? input.value : '';
    const partnerId = window.chatManager.activeChatPartnerId;
    const me = window.authManager.currentUser;

    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); return; }
    if (!partnerId) return;

    const res = await window.chatManager.sendMessage(partnerId, text);
    if (!res.success) { this.showToast(res.error); return; }

    if (input) input.value = '';
    this.renderChatMessages();
    this.renderChatList();
  }

  async pickChatImage() {
    const input = document.getElementById('chatImageInput');
    const partnerId = window.chatManager.activeChatPartnerId;
    const me = window.authManager.currentUser;
    if (!input.files || !input.files[0]) return;
    if (!me || !partnerId) return;

    try {
      const dataUrl = await this.compressImage(input.files[0], 800, 0.7);
      const res = await window.chatManager.sendMessage(partnerId, '', dataUrl);
      if (!res.success) { this.showToast(res.error); return; }
      this.renderChatMessages();
      this.renderChatList();
    } catch (err) {
      this.showToast('ไม่สามารถอัปโหลดรูปภาพได้');
    }
  }

  async markChatRead(chatId) {
    const me = window.authManager.currentUser;
    if (!me) return;
    const users = window.store.data.users;
    const idx = users.findIndex(u => u.id === me.id);
    if (idx === -1) return;
    if (!users[idx].chatReads) users[idx].chatReads = {};
    const chat = window.chatManager.getChats().find(c => c.id === chatId);
    const last = chat && chat.messages.length ? chat.messages[chat.messages.length - 1] : null;
    users[idx].chatReads[chatId] = last ? last.id : null;
    window.authManager.currentUser = users[idx];
    window.authManager.saveSession();
    await window.chatManager.markRead(chatId);
  }

  updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    const me = window.authManager.currentUser;
    if (!me) { badge.classList.add('hidden'); return; }
    const chats = window.chatManager.getChats().filter(c => c.participants.includes(me.id));
    const unread = chats.filter(c => {
      const last = c.messages[c.messages.length - 1];
      if (!last) return false;
      if (last.senderId === me.id) return false;
      return (me.chatReads || {})[c.id] !== last.id;
    }).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    const mobileBadge = document.getElementById('mobileChatBadge');
    if (mobileBadge) {
      if (unread > 0) {
        mobileBadge.textContent = unread > 9 ? '9+' : unread;
        mobileBadge.classList.remove('hidden');
      } else {
        mobileBadge.classList.add('hidden');
      }
    }
  }

  /* ===================== PROFILE ===================== */
  viewUser(userId) {
    const me = window.authManager.currentUser;
    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    this.viewingProfileId = userId;
    this.currentTab = 'profile';
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === 'profile');
    });
    this.renderContent();
  }

  renderProfile(content, userId) {
    const me = window.authManager.currentUser;
    if (!me) { content.innerHTML = this.loginPromptHTML(); return; }

    const users = window.authManager.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) { content.innerHTML = '<div class="empty-state">ไม่พบผู้ใช้</div>'; return; }

    const isMe = user.id === me.id;
    const posts = window.postManager.getPosts().filter(p => p.userId === user.id);
    const isFollowing = isMe ? false : ((me.follows || []).includes(user.id));

    let actions = '';
    if (isMe) {
      actions = `
        <button class="btn btn-secondary" onclick="window.app.openProfileEdit()">✏️ แก้ไขโปรไฟล์</button>
        <button class="btn btn-gradient" onclick="window.app.openPostModal()">📝 โพสต์ใหม่</button>
        <div class="profile-mobile-actions">
          <div class="dogcoin-chip" onclick="window.app.setTab('shop')" style="margin-bottom:0;">
            <span class="dogcoin-icon">🦴</span>
            <span class="dogcoin-amount">${Number(me.dogcoin || 0).toLocaleString()}</span>
          </div>
          <button class="btn btn-secondary" onclick="window.app.toggleTheme()">${document.body.classList.contains('dark-theme') ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}</button>
          <button class="btn btn-danger" onclick="window.app.logout()">ออกจากระบบ</button>
        </div>
      `;
    } else {
      actions = `
        <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}" onclick="window.app.toggleFollow('${user.id}')">
          ${isFollowing ? 'กำลังติดตาม ✓' : 'ติดตาม'}
        </button>
        <button class="btn btn-secondary" onclick="window.app.messageUser('${user.id}')">💬 ส่งข้อความ</button>
      `;
    }

    const gridHTML = posts.length ? posts.map(p => p.imageUrl ? `
      <div class="posts-grid-item" onclick="window.app.viewPost('${p.id}')">
        <img src="${this.escapeHTML(p.imageUrl)}" alt="post" class="filter-${p.filter || 'none'}">
        <div class="posts-grid-overlay">
          <span>❤️ ${(p.likes || []).length}</span>
          <span>💬 ${(p.comments || []).length}</span>
        </div>
      </div>
    ` : `
      <div class="posts-grid-item posts-grid-text" onclick="window.app.viewPost('${p.id}')">
        <div class="posts-grid-text-inner">💬 ${this.escapeHTML((p.caption || 'โพสต์ข้อความ').slice(0, 60))}</div>
        <div class="posts-grid-overlay">
          <span>❤️ ${(p.likes || []).length}</span>
          <span>💬 ${(p.comments || []).length}</span>
        </div>
      </div>
    `).join('') : '<div class="empty-state" style="grid-column:1/-1;">ยังไม่มีโพสต์</div>';

    content.innerHTML = `
      <div class="profile-page">
        <div class="profile-header">
          <div class="profile-avatar rank-${this.rankKey(user)}">
            <img src="${this.escapeHTML(user.avatar)}" alt="avatar">
          </div>
          <div class="profile-info">
            <div class="profile-top">
              <span class="profile-username">${this.escapeHTML(user.username)}</span>
              ${this.rankBadgeHTML(user)}
              ${user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
              ${user.isBanned ? '<span class="badge badge-banned">Banned</span>' : ''}
            </div>
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="profile-stat-value">${posts.length}</span>
                <span class="profile-stat-label">โพสต์</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-value">${this.formatCount(user.followers)}</span>
                <span class="profile-stat-label">ผู้ติดตาม</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-value">${this.formatCount(user.following)}</span>
                <span class="profile-stat-label">กำลังติดตาม</span>
              </div>
            </div>
            <div class="profile-actions">${actions}</div>
          </div>
        </div>

        <div class="profile-fullname">${this.escapeHTML(user.fullName)}</div>
        <div class="profile-bio">${this.escapeHTML(user.bio || '')}</div>

        <div class="rank-perks-card rank-${this.escapeHTML((user.rank || 'member'))}">
          <div class="rank-perks-title">${this.rankInfo(user.rank).icon} ยศ ${this.escapeHTML(this.rankInfo(user.rank).label)} — สิทธิพิเศษ</div>
          <div class="rank-perks-list">
            ${this.rankInfo(user.rank).perks.map(p => `<span class="rank-perk-item">✔ ${this.escapeHTML(p)}</span>`).join('')}
          </div>
          ${me && user.id === me.id ? '<button class="btn btn-sm btn-gradient" style="margin-top:10px;" onclick="window.app.setTab(\'shop\')">🛍️ ซื้อ / อัปเกรดยศ</button>' : ''}
        </div>

        <div class="profile-tabs">
          <button class="profile-tab-btn active">โพสต์</button>
        </div>
        <div class="posts-grid">${gridHTML}</div>
      </div>
    `;
  }

  viewPost(postId) {
    this.setTab('home');
    setTimeout(() => {
      const el = document.getElementById('post_' + postId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  async toggleFollow(userId) {
    const me = window.authManager.currentUser;
    if (!me) { this.showToast('กรุณาเข้าสู่ระบบก่อน'); this.openModal('authModal'); return; }
    if (me.id === userId) return;

    const res = await window.authManager.followUser(userId);
    if (!res.success) { this.showToast(res.error); return; }

    this.showToast(res.following ? 'ติดตามแล้ว 🐾' : 'เลิกติดตามแล้ว');
    this.renderProfile(document.getElementById('content'), userId);
  }

  messageUser(userId) {
    this.setTab('chat');
    this.openChat(userId);
  }

  openProfileEdit() {
    const me = window.authManager.currentUser;
    if (!me) return;
    this.editAvatarDataUrl = null;
    document.getElementById('editAvatarPreview').src = me.avatar;
    document.getElementById('editUsername').value = me.username;
    document.getElementById('editFullName').value = me.fullName || '';
    document.getElementById('editBio').value = me.bio || '';
    document.getElementById('editAvatarInput').value = '';
    this.openModal('profileModal');
  }

  async saveProfile() {
    const me = window.authManager.currentUser;
    if (!me) return;

    const username = document.getElementById('editUsername').value.trim();
    const fullName = document.getElementById('editFullName').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    if (!username) { this.showToast('ชื่อผู้ใช้ห้ามว่าง'); return; }

    // Check duplicate username
    const users = window.authManager.getUsers();
    const dup = users.some(u => u.id !== me.id && u.username.toLowerCase() === username.toLowerCase());
    if (dup) { this.showToast('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว'); return; }

    const updates = { username, fullName: fullName || username };
    if (bio !== '') updates.bio = bio;
    if (this.editAvatarDataUrl) updates.avatar = this.editAvatarDataUrl;

    const res = await window.authManager.updateProfile(updates);
    if (!res.success) { this.showToast(res.error); return; }

    this.closeModal('profileModal');
    this.showToast('บันทึกโปรไฟล์แล้ว ✅');
    this.renderSidebarFooter();
    this.renderContent();
  }

  /* ===================== ADMIN ===================== */
  renderAdmin(content) {
    if (!window.authManager.isAdmin()) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⛔</div>
          <h3>ไม่มีสิทธิ์เข้าถึง</h3>
          <p>เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </div>
      `;
      return;
    }

    const stats = window.adminManager.getOverviewStats();
    const users = window.authManager.getUsers();
    const posts = window.postManager.getPosts();
    const stories = window.storyManager.getStories();
    const logs = window.adminManager.getLogs();

    content.innerHTML = `
      <div class="admin-header">
        <h1>🛡️ ระบบหลังบ้าน Admin</h1>
        <button class="btn btn-danger" onclick="window.app.adminReset()">รีเซ็ตระบบทั้งหมด</button>
      </div>

      <div class="admin-stats-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(0,149,246,0.15);">👥</div>
          <div><div class="stat-card-value">${stats.totalUsers}</div><div class="stat-card-label">ผู้ใช้ทั้งหมด</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(245,158,11,0.15);">🛡️</div>
          <div><div class="stat-card-value">${stats.adminUsers}</div><div class="stat-card-label">Admin</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(239,68,68,0.15);">🚫</div>
          <div><div class="stat-card-value">${stats.bannedUsers}</div><div class="stat-card-label">บัญชีที่ระงับ</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(225,48,108,0.15);">📸</div>
          <div><div class="stat-card-value">${stats.totalPosts}</div><div class="stat-card-label">โพสต์ทั้งหมด</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(16,185,129,0.15);">✨</div>
          <div><div class="stat-card-value">${stats.activeStories}</div><div class="stat-card-label">สตอรี่ที่ใช้งาน</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(154,163,180,0.15);">💬</div>
          <div><div class="stat-card-value">${stats.totalMessages}</div><div class="stat-card-label">ข้อความทั้งหมด</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(217,119,6,0.15);">🦴</div>
          <div><div class="stat-card-value">${Number(stats.totalDogcoin || 0).toLocaleString()}</div><div class="stat-card-label">Dogcoin ทั้งหมด</div></div>
        </div>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">👥 จัดการผู้ใช้ (${users.length})</div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>ผู้ใช้</th><th>อีเมล</th><th>บทบาท</th><th>ยศ</th><th>Dogcoin 🦴</th><th>สถานะ</th><th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => this.adminUserRowHTML(u)).join('')}
          </tbody>
        </table>
      </div>

      <div class="admin-section">
        <div class="admin-section-title">📸 จัดการโพสต์ (${posts.length})</div>
        ${posts.length ? posts.map(p => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid var(--border-color);">
            <img src="${this.escapeHTML(p.imageUrl)}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" alt="post">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;">@${this.escapeHTML(p.username)}</div>
              <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHTML(p.caption || 'ไม่มีคำบรรยาย')}</div>
            </div>
            <span class="badge badge-user">❤️ ${(p.likes || []).length} · 💬 ${(p.comments || []).length}</span>
            <button class="admin-mini-btn ban" onclick="window.app.adminDeletePost('${p.id}')">ลบ</button>
          </div>
        `).join('') : '<div class="empty-state" style="padding:16px;">ยังไม่มีโพสต์</div>'}
      </div>

      <div class="admin-section">
        <div class="admin-section-title">✨ จัดการสตอรี่ (${stories.length})</div>
        ${stories.length ? stories.map(s => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid var(--border-color);">
            <img src="${this.escapeHTML(s.mediaUrl)}" style="width:52px;height:52px;object-fit:cover;border-radius:8px;" alt="story">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;">@${this.escapeHTML(s.username)}</div>
              <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHTML(s.caption || 'ไม่มีข้อความ')} · 👁️ ${s.views || 0} ครั้ง</div>
            </div>
            <button class="admin-mini-btn ban" onclick="window.app.adminDeleteStory('${s.id}')">ลบ</button>
          </div>
        `).join('') : '<div class="empty-state" style="padding:16px;">ยังไม่มีสตอรี่</div>'}
      </div>

      <div class="admin-section">
        <div class="admin-section-title">📋 บันทึกกิจกรรมระบบ</div>
        <div class="log-list">
          ${logs.length ? logs.map(l => `
            <div class="log-item">
              <span class="log-badge log-type-${l.type}">${l.type}</span>
              <div>
                <div>${this.escapeHTML(l.text)}</div>
                <div style="color:var(--text-muted);font-size:11px;">${new Date(l.timestamp).toLocaleString('th-TH')}</div>
              </div>
            </div>
          `).join('') : '<div class="empty-state">ยังไม่มีบันทึก</div>'}
        </div>
      </div>
    `;
  }

  adminUserRowHTML(u) {
    const isSelf = window.authManager.currentUser && u.id === window.authManager.currentUser.id;
    return `
      <tr>
        <td>
          <div class="admin-user-cell">
            <img class="admin-user-avatar" src="${this.escapeHTML(u.avatar)}" alt="avatar">
            <div>
              <div style="font-weight:600;">${this.escapeHTML(u.username)}</div>
              <div style="font-size:11px;color:var(--text-muted);">${this.escapeHTML(u.fullName || '')}</div>
            </div>
          </div>
        </td>
        <td>${this.escapeHTML(u.email)}</td>
        <td>${u.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : '<span class="badge badge-user">User</span>'}</td>
        <td>
          <div class="admin-rank-cell">
            ${this.rankBadgeHTML(u)}
          </div>
        </td>
        <td>
          <div class="admin-coin-set">
            <input class="coin-input" type="number" min="0" value="${Number(u.dogcoin || 0)}" id="coinInput_${this.escapeHTML(u.id)}">
            <button class="admin-mini-btn promo" onclick="window.app.adminSetDogcoin('${this.escapeHTML(u.id)}')">ตั้ง</button>
          </div>
        </td>
        <td>${u.isBanned ? '<span class="badge badge-banned">Banned</span>' : '<span class="badge badge-user">ปกติ</span>'}</td>
        <td>
          <div class="admin-actions">
            <div class="admin-rank-set">
              <select class="rank-select" id="rankSelect_${this.escapeHTML(u.id)}">
                ${Object.keys(window.RANK_CONFIG).map(r => `<option value="${r}" ${(u.rank || 'member') === r ? 'selected' : ''}>${window.RANK_CONFIG[r].icon} ${window.RANK_CONFIG[r].label}</option>`).join('')}
              </select>
              <button class="admin-mini-btn promo" onclick="window.app.adminSetRank('${this.escapeHTML(u.id)}')">ตั้งยศ</button>
            </div>
            ${isSelf ? '<span style="color:var(--text-muted);font-size:11px;">(คุณ)</span>' : `
              <button class="admin-mini-btn promo" onclick="window.app.adminToggleRole('${u.id}')">${u.role === 'admin' ? 'ถอดสิทธิ์' : 'แต่งตั้ง Admin'}</button>
              <button class="admin-mini-btn ban" onclick="window.app.adminToggleBan('${u.id}')">${u.isBanned ? 'ปลดระงับ' : 'ระงับ'}</button>
              <button class="admin-mini-btn ban" onclick="window.app.adminDeleteUser('${u.id}')">ลบ</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }

  async adminToggleBan(userId) {
    const res = await window.adminManager.toggleBanUser(userId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast(res.isBanned ? 'ระงับบัญชีแล้ว 🚫' : 'ปลดระงับแล้ว ✅');
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminToggleRole(userId) {
    const res = await window.adminManager.toggleUserRole(userId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast(res.newRole === 'admin' ? 'แต่งตั้งเป็น Admin แล้ว 🛡️' : 'ถอดสิทธิ์ Admin แล้ว');
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminSetRank(userId) {
    const sel = document.getElementById('rankSelect_' + userId);
    const rank = sel ? sel.value : 'member';
    const res = await window.adminManager.setUserRank(userId, rank);
    if (!res.success) { this.showToast(res.error); return; }
    const cfg = this.rankInfo(res.rank);
    this.showToast(`ตั้งยศ ${cfg.icon} ${cfg.label} ให้ผู้ใช้นี้แล้ว`);
    if (userId === window.authManager.currentUser.id) {
      window.authManager.currentUser.rank = res.rank;
      this.renderSidebarFooter();
    }
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminSetDogcoin(userId) {
    const input = document.getElementById('coinInput_' + userId);
    const amount = input ? parseInt(input.value, 10) : 0;
    const res = await window.adminManager.setUserDogcoin(userId, amount);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast(`ตั้ง Dogcoin ของผู้ใช้เป็น 🦴 ${amount.toLocaleString()} แล้ว`);
    if (userId === window.authManager.currentUser.id) {
      window.authManager.currentUser.dogcoin = amount;
      this.renderSidebarFooter();
    }
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminDeleteUser(userId) {
    if (!confirm('ยืนยันการลบผู้ใช้นี้?')) return;
    const res = await window.adminManager.deleteUser(userId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('ลบผู้ใช้แล้ว');
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminDeletePost(postId) {
    const res = await window.postManager.deletePost(postId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('ลบโพสต์แล้ว');
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminDeleteStory(storyId) {
    const res = await window.storyManager.deleteStory(storyId);
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('ลบสตอรี่แล้ว');
    await window.adminManager.refreshLogs();
    this.renderAdmin(document.getElementById('content'));
  }

  async adminReset() {
    if (!confirm('รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น?')) return;
    const res = await window.adminManager.resetSystemData();
    if (!res.success) { this.showToast(res.error); return; }
    this.showToast('รีเซ็ตระบบแล้ว 🔄');
    window.authManager.currentUser = null;
    this.renderSidebarFooter();
    this.setTab('home');
  }

  /* ===================== AUTH ===================== */
  openModal(id) {
    document.getElementById(id).classList.add('active');
  }

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  switchAuthTab(tab, ctx) {
    const p = ctx === 'gate' ? 'gate' : 'auth';
    const isLogin = tab === 'login';
    document.getElementById(p + 'TabLogin').classList.toggle('active', isLogin);
    document.getElementById(p + 'TabRegister').classList.toggle('active', !isLogin);
    document.getElementById(p + 'LoginForm').classList.toggle('hidden', !isLogin);
    document.getElementById(p + 'RegisterForm').classList.toggle('hidden', isLogin);
  }

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const res = await window.authManager.login(data.get('identifier'), data.get('password'));
    if (!res.success) { this.showToast(res.error); return; }

    this.hideLoginGate();
    this.closeModal('authModal');
    this.showToast(`ยินดีต้อนรับ ${res.user.username}! 🎉`);
    this.afterAuthChange();
  }

  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    const res = await window.authManager.register({
      username: data.get('username'),
      fullName: data.get('username'),
      email: data.get('email'),
      password: data.get('password')
    });

    if (!res.success) { this.showToast(res.error); return; }

    this.hideLoginGate();
    this.closeModal('authModal');
    this.showToast(`สมัครสมาชิกสำเร็จ ยินดีต้อนรับ ${res.user.username}! 🐾`);
    this.afterAuthChange();
  }

  async logout() {
    await window.authManager.logout();
    this.showToast('ออกจากระบบแล้ว 👋');
    this.viewingProfileId = null;
    this.showLoginGate();
    this.afterAuthChange();
    this.setTab('home');
  }

  afterAuthChange() {
    this.renderSidebarFooter();
    this.updateChatBadge();
    if (this.currentTab === 'admin') {
      this.renderAdmin(document.getElementById('content'));
    } else if (this.currentTab === 'profile') {
      const me = window.authManager.currentUser;
      if (!me) { this.setTab('home'); return; }
      this.viewingProfileId = me.id;
      this.renderContent();
    } else {
      this.renderContent();
    }
  }

  /* ===================== TOAST ===================== */
  showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

window.app = new App();
