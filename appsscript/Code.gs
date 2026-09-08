/**
 * Code.gs - InstaDog backend บน Google Sheets (ใช้ Google Apps Script เป็น API)
 *
 * วิธีติดตั้ง:
 *  1. สร้าง Google Sheet ใหม่ -> เมนู ส่วนขยาย (Extensions) -> Apps Script
 *  2. ลบโค้ดเดิมใน Code.gs แล้ววางโค้ดไฟล์นี้ทั้งไฟล์
 *  3. กด Save จากนั้น Deploy -> New deployment -> Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  4. คัดลอก URL Web App (ลงท้าย /exec) ไปวางใน js/api.js (ตัวแปร base)
 *
 * การทดสอบ: เปิด URL Web App ในเบราว์เซอร์ จะได้ JSON snapshot ของระบบ
 */

var SPREADSHEET_NAME = 'InstaDog Database';

// ⭐ วิธีที่แนะนำสุด: สร้าง Google Sheet ขึ้นมาเอง แล้วก็อป ID จาก URL มาใส่ข้างล่าง
//    URL: https://docs.google.com/spreadsheets/d/<ID ตรงนี้>/edit
//    วิธีนี้จะไม่เรียก create() เลย ปลอด quota 100%
var MANUAL_SPREADSHEET_ID = '17DcioNdF8y3fQyREgKTGxp--Euqqx1fE4aGjzeCCa6I'; // เช่น '1AbCdEfGhIjKlMnOpQrStUvWxYz'

// คอลัมน์ของแต่ละชีต (ต้องตรงกับคอลัมน์ใน Google Sheets)
var COLUMNS = {
  Users:    ['id', 'username', 'email', 'password', 'role', 'full_name', 'avatar', 'bio', 'followers', 'following', 'follows', 'chat_reads', 'is_banned', 'created_at'],
  Sessions: ['token', 'user_id', 'created_at'],
  Posts:    ['id', 'user_id', 'username', 'user_avatar', 'image_url', 'caption', 'filter', 'likes', 'comments', 'bookmarks', 'created_at'],
  Stories:  ['id', 'user_id', 'username', 'user_avatar', 'media_url', 'caption', 'views', 'created_at'],
  Chats:    ['id', 'participants', 'messages'],
  Logs:     ['id', 'type', 'text', 'timestamp']
};

/* =====================================================================
 * สเปรดชีต
 * ===================================================================== */

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();

  // 1) ใช้ชีตที่กำหนดเองในโค้ด (MANUAL_SPREADSHEET_ID) — ไม่ต้องสร้างใหม่เลย
  if (MANUAL_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(MANUAL_SPREADSHEET_ID);
    } catch (e) {
      // ID ไม่ถูกต้อง -> ข้ามไปวิธีถัดไป
    }
  }

  // 2) ใช้ ID ที่จำไว้ใน Script Properties เพื่อไม่ต้องสร้างสเปรดชีตซ้ำ
  var cached = props.getProperty('INSTADOG_SPREADSHEET_ID');
  if (cached) {
    try {
      var existing = SpreadsheetApp.openById(cached);
      if (existing) return existing;
    } catch (e) {
      // ID เก่าใช้งานไม่ได้ -> ล้างแล้วหาอันใหม่
      props.deleteProperty('INSTADOG_SPREADSHEET_ID');
    }
  }

  // 3) ถ้าสคริปต์ผูกกับ Sheet อยู่ (สร้างผ่าน Extensions -> Apps Script) ให้ใช้ Sheet นั้น
  var active;
  try {
    active = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    active = null;
  }
  if (active) {
    props.setProperty('INSTADOG_SPREADSHEET_ID', active.getId());
    return active;
  }

  // 4) สุดท้ายจริง ๆ เท่านั้น — สร้างใหม่ (จะชน quota ถ้าวันนี้ใช้ create ไปหมดแล้ว)
  var created = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('INSTADOG_SPREADSHEET_ID', created.getId());
  return created;
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(COLUMNS[name]);
  }
  return sheet;
}

function ensureSheets_() {
  var names = Object.keys(COLUMNS);
  for (var i = 0; i < names.length; i++) getSheet_(names[i]);
}

/* อ่านทุกแถวของชีต -> array ของ object (key = หัวตาราง) */
function getRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 1) return [];
  var width = sheet.getLastColumn();
  if (width < 1) return [];
  var values = sheet.getRange(1, 1, last, width).getValues();
  var headers = [];
  for (var c = 0; c < width; c++) headers.push(String(values[0][c]));
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    for (var c2 = 0; c2 < width; c2++) obj[headers[c2]] = values[r][c2];
    out.push(obj);
  }
  return out;
}

function toValues_(rowObj, name) {
  var cols = COLUMNS[name];
  var vals = [];
  for (var i = 0; i < cols.length; i++) {
    var v = rowObj[cols[i]];
    vals.push(v === undefined ? '' : v);
  }
  return vals;
}

function appendRow_(name, rowObj) {
  getSheet_(name).appendRow(toValues_(rowObj, name));
  return rowObj;
}

function updateRow_(name, rowObj, rowNum) {
  getSheet_(name).getRange(rowNum, 1, 1, COLUMNS[name].length).setValues([toValues_(rowObj, name)]);
}

function deleteRow_(name, rowNum) {
  getSheet_(name).deleteRow(rowNum);
}

/* หา index (0-based ใน array ที่ได้จาก getRows_) ของแถวที่ key == value */
function findRow_(rows, key, value) {
  var v = String(value);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][key]) === v) return i;
  }
  return -1;
}

/* =====================================================================
 * เครื่องมือช่วย
 * ===================================================================== */

function str(v) { return v === undefined || v === null ? '' : String(v); }
function num(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}
function bool(v) { return v === true || String(v).toLowerCase() === 'true'; }

function j(v, fallback) { // แปลง JSON string กลับเป็น object
  if (v === undefined || v === null || v === '') return fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
}

function sha256Hex(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text));
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function createdTime_(o) {
  return String(o && (o.created_at || o.createdAt || ''));
}
function byCreatedDesc(a, b) {
  var x = createdTime_(a);
  var y = createdTime_(b);
  return x < y ? 1 : (x > y ? -1 : 0);
}
function byCreatedAsc(a, b) {
  var x = createdTime_(a);
  var y = createdTime_(b);
  return x < y ? -1 : (x > y ? 1 : 0);
}

/* =====================================================================
 * Errors & Auth
 * ===================================================================== */

function HttpError(status, message) {
  this.status = status;
  this.error = message;
}

function requireUser_(token) {
  if (!token) throw new HttpError(401, 'ต้องเข้าสู่ระบบก่อน');
  var sessions = getRows_(getSheet_('Sessions'));
  var sidx = findRow_(sessions, 'token', token);
  if (sidx === -1) throw new HttpError(401, 'Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
  var users = getRows_(getSheet_('Users'));
  var uidx = findRow_(users, 'id', sessions[sidx].user_id);
  if (uidx === -1) throw new HttpError(401, 'Session ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
  var user = mapUser(users[uidx]);
  if (user.isBanned) throw new HttpError(403, 'บัญชีนี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (Banned)');
  return { user: user, row: users[uidx], rowNum: uidx + 2 };
}

function requireAdmin_(token) {
  var ctx = requireUser_(token);
  if (ctx.user.role !== 'admin') throw new HttpError(403, 'ต้องเป็น Admin เท่านั้น');
  return ctx;
}

function createSession_(userId) {
  var token = Utilities.getUuid().replace(/-/g, '');
  appendRow_('Sessions', { token: token, user_id: userId, created_at: new Date().toISOString() });
  return token;
}

function logActivity_(type, text) {
  appendRow_('Logs', { id: genId('log'), type: type, text: text, timestamp: new Date().toISOString() });
}

/* =====================================================================
 * Mappers (snake_case ในชีต -> camelCase ให้ frontend)
 * ===================================================================== */

function mapUser(r) {
  return {
    id: str(r.id),
    username: str(r.username),
    fullName: str(r.full_name),
    email: str(r.email),
    role: str(r.role) || 'user',
    avatar: str(r.avatar),
    bio: str(r.bio),
    followers: num(r.followers),
    following: num(r.following),
    follows: j(r.follows, []),
    chatReads: j(r.chat_reads, {}),
    isBanned: bool(r.is_banned),
    createdAt: str(r.created_at)
  };
}

function mapPost(r) {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    username: str(r.username),
    userAvatar: str(r.user_avatar),
    imageUrl: str(r.image_url),
    caption: str(r.caption),
    filter: str(r.filter) || 'none',
    likes: j(r.likes, []),
    comments: j(r.comments, []),
    bookmarks: j(r.bookmarks, []),
    createdAt: str(r.created_at)
  };
}

function mapStory(r) {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    username: str(r.username),
    userAvatar: str(r.user_avatar),
    mediaUrl: str(r.media_url),
    caption: str(r.caption),
    views: num(r.views),
    createdAt: str(r.created_at)
  };
}

function mapChat(r) {
  return {
    id: str(r.id),
    participants: j(r.participants, []),
    messages: j(r.messages, [])
  };
}

/* =====================================================================
 * Seed ข้อมูลเริ่มต้น
 * ===================================================================== */

function h(ms) { return new Date(Date.now() - ms).toISOString(); }

function seedIfEmpty_() {
  var users = getRows_(getSheet_('Users'));
  if (users.length > 0) return false;

  var SEED_USERS = [
    { id: 'usr_admin', username: 'admin_boss', fullName: 'System Administrator', email: 'admin@instadog.com', password: 'admin123', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', bio: '🛡️ Official InstaDog Admin | System Operator & Content Moderator', followers: 12500, following: 120, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'usr_alex', username: 'alex_golden', fullName: 'Alex the Golden Retriever', email: 'alex@doggram.com', password: 'user123', role: 'user', avatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80', bio: '🐾 Living my best life chasing tennis balls & eating treats! 🦴', followers: 3420, following: 280, createdAt: '2026-02-10T10:00:00.000Z' },
    { id: 'usr_bella', username: 'bella_corgi', fullName: 'Bella Corgi Queens', email: 'bella@doggram.com', password: 'user123', role: 'user', avatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80', bio: '👑 Queen of sploot | Short legs, big dreams ✨', followers: 8900, following: 450, createdAt: '2026-02-15T14:30:00.000Z' },
    { id: 'usr_charlie', username: 'charlie_husky', fullName: 'Charlie Husky Vibe', email: 'charlie@doggram.com', password: 'user123', role: 'user', avatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80', bio: '🐺 Professional drama singer & snow lover ❄️ Vocalist of the house!', followers: 14200, following: 310, createdAt: '2026-03-01T09:15:00.000Z' },
    { id: 'usr_luna', username: 'luna_poodle', fullName: 'Luna Toy Poodle', email: 'luna@doggram.com', password: 'user123', role: 'user', avatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80', bio: '🐩 Fluffy fluff ball | Model & Fashionista 🌸', followers: 5100, following: 190, createdAt: '2026-03-12T16:00:00.000Z' }
  ];

  var SEED_STORIES = [
    { id: 'st_1', userId: 'usr_alex', username: 'alex_golden', userAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80', mediaUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80', caption: 'Beach day with my favorite stick! 🏖️🐶', createdAt: h(2 * 3600 * 1000), views: 142 },
    { id: 'st_2', userId: 'usr_bella', username: 'bella_corgi', userAvatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80', mediaUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80', caption: 'Sunday nap time with hooman 😴✨', createdAt: h(4 * 3600 * 1000), views: 289 },
    { id: 'st_3', userId: 'usr_charlie', username: 'charlie_husky', userAvatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80', mediaUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80', caption: 'Singing the song of my people at 3 AM 🎤⚡', createdAt: h(6 * 3600 * 1000), views: 512 },
    { id: 'st_4', userId: 'usr_luna', username: 'luna_poodle', userAvatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80', mediaUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80', caption: 'Fresh grooming session! How do I look? 🐩💅', createdAt: h(1 * 3600 * 1000), views: 98 }
  ];

  var SEED_POSTS = [
    { id: 'post_101', userId: 'usr_alex', username: 'alex_golden', userAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80', imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1000&q=80', caption: 'Golden hours with my best friend in the park 🌅🐕 Tag someone who loves sunshine!', filter: 'warm', likes: ['usr_bella', 'usr_charlie', 'usr_admin'], comments: [
      { id: 'c_1', userId: 'usr_bella', username: 'bella_corgi', text: 'Super cute model!! 💖', createdAt: h(26 * 3600 * 1000) },
      { id: 'c_2', userId: 'usr_charlie', username: 'charlie_husky', text: 'Looking majestic brother 🐾', createdAt: h(25 * 3600 * 1000) }
    ], bookmarks: ['usr_admin'], createdAt: h(26 * 3600 * 1000) },
    { id: 'post_102', userId: 'usr_bella', username: 'bella_corgi', userAvatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80', caption: 'Waiting for treats patiently... 🦴👀 Did someone say Bacon?!', filter: 'vintage', likes: ['usr_alex', 'usr_luna'], comments: [
      { id: 'c_3', userId: 'usr_alex', username: 'alex_golden', text: 'Give her all the bacon!! 🥓', createdAt: h(50 * 3600 * 1000) }
    ], bookmarks: [], createdAt: h(50 * 3600 * 1000) },
    { id: 'post_103', userId: 'usr_charlie', username: 'charlie_husky', userAvatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80', imageUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=1000&q=80', caption: 'Snow adventure time! ❄️ High energy all day long ⚡⚡', filter: 'cyber', likes: ['usr_alex', 'usr_bella', 'usr_luna', 'usr_admin'], comments: [
      { id: 'c_4', userId: 'usr_luna', username: 'luna_poodle', text: 'Stay warm out there! ❄️❤️', createdAt: h(72 * 3600 * 1000) }
    ], bookmarks: ['usr_alex'], createdAt: h(72 * 3600 * 1000) }
  ];

  var SEED_CHATS = [
    { id: 'chat_alex_bella', participants: ['usr_alex', 'usr_bella'], messages: [
      { id: 'm1', senderId: 'usr_bella', text: 'Hey Alex! Want to go to the dog park today? 🌳', imageUrl: null, timestamp: h(2 * 3600 * 1000) },
      { id: 'm2', senderId: 'usr_alex', text: 'Woof yes!! I brought my yellow tennis ball 🎾', imageUrl: null, timestamp: h(2 * 3600 * 1000 - 120000) },
      { id: 'm3', senderId: 'usr_bella', text: 'See you at 4 PM! 🐾', imageUrl: null, timestamp: h(2 * 3600 * 1000 - 300000) }
    ] },
    { id: 'chat_alex_charlie', participants: ['usr_alex', 'usr_charlie'], messages: [
      { id: 'm4', senderId: 'usr_charlie', text: 'AWOOOOO! Did you see the new snow outside?', imageUrl: null, timestamp: h(20 * 3600 * 1000) },
      { id: 'm5', senderId: 'usr_alex', text: 'Yes brother! Your story was hilarious ⚡', imageUrl: null, timestamp: h(20 * 3600 * 1000 - 900000) }
    ] }
  ];

  for (var i = 0; i < SEED_USERS.length; i++) {
    var u = SEED_USERS[i];
    appendRow_('Users', { id: u.id, username: u.username, email: u.email, password: sha256Hex(u.password), role: u.role, full_name: u.fullName, avatar: u.avatar, bio: u.bio, followers: u.followers, following: u.following, follows: '[]', chat_reads: '{}', is_banned: false, created_at: u.createdAt });
  }
  for (var j = 0; j < SEED_STORIES.length; j++) {
    var s = SEED_STORIES[j];
    appendRow_('Stories', { id: s.id, user_id: s.userId, username: s.username, user_avatar: s.userAvatar, media_url: s.mediaUrl, caption: s.caption, views: s.views, created_at: s.createdAt });
  }
  for (var k = 0; k < SEED_POSTS.length; k++) {
    var p = SEED_POSTS[k];
    appendRow_('Posts', { id: p.id, user_id: p.userId, username: p.username, user_avatar: p.userAvatar, image_url: p.imageUrl, caption: p.caption, filter: p.filter || 'none', likes: JSON.stringify(p.likes || []), comments: JSON.stringify(p.comments || []), bookmarks: JSON.stringify(p.bookmarks || []), created_at: p.createdAt });
  }
  for (var m = 0; m < SEED_CHATS.length; m++) {
    var c = SEED_CHATS[m];
    appendRow_('Chats', { id: c.id, participants: JSON.stringify(c.participants), messages: JSON.stringify(c.messages || []) });
  }

  logActivity_('system', 'InstaDog platform initialized successfully.');
  return true;
}

function ensureInitialized_() {
  ensureSheets_();
  seedIfEmpty_();
}

/* =====================================================================
 * Auth handlers
 * ===================================================================== */

function authLogin_(body) {
  var identifier = str(body.identifier).trim().toLowerCase();
  var password = str(body.password);
  if (!identifier || !password) throw new HttpError(400, 'กรอกข้อมูลไม่ครบ');

  var users = getRows_(getSheet_('Users'));
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (str(u.email).toLowerCase() === identifier || str(u.username).toLowerCase() === identifier) {
      if (u.password !== sha256Hex(password)) throw new HttpError(401, 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
      var mu = mapUser(u);
      if (mu.isBanned) throw new HttpError(403, 'บัญชีนี้ถูกระงับการใช้งานโดยผู้ดูแลระบบ (Banned)');
      var token = createSession_(mu.id);
      logActivity_('auth', 'ผู้ใช้ ' + mu.username + ' เข้าสู่ระบบแล้ว');
      return { token: token, user: mu };
    }
  }
  throw new HttpError(401, 'อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
}

function authRegister_(body) {
  var username = str(body.username).trim();
  var email = str(body.email).trim().toLowerCase();
  var password = str(body.password);
  if (!username || !email || !password) throw new HttpError(400, 'กรอกข้อมูลไม่ครบ');
  if (password.length < 6) throw new HttpError(400, 'รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร');

  var users = getRows_(getSheet_('Users'));
  for (var i = 0; i < users.length; i++) {
    if (str(users[i].username).toLowerCase() === username.toLowerCase()) throw new HttpError(400, 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    if (str(users[i].email).toLowerCase() === email) throw new HttpError(400, 'อีเมลนี้ถูกใช้งานแล้ว');
  }

  var id = genId('usr');
  var now = new Date().toISOString();
  var fullName = str(body.fullName).trim() || username;
  var defaultAvatar = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80';
  appendRow_('Users', { id: id, username: username, email: email, password: sha256Hex(password), role: 'user', full_name: fullName, avatar: defaultAvatar, bio: '✨ สวัสดี! ยินดีต้อนรับสู่ InstaDog 🐾', followers: 0, following: 0, follows: '[]', chat_reads: '{}', is_banned: false, created_at: now });

  var token = createSession_(id);
  logActivity_('auth', 'ลงทะเบียนผู้ใช้ใหม่: ' + username);

  var users2 = getRows_(getSheet_('Users'));
  var idx = findRow_(users2, 'id', id);
  return { token: token, user: mapUser(users2[idx]) };
}

function authLogout_(token) {
  if (token) {
    var sessions = getRows_(getSheet_('Sessions'));
    var idx = findRow_(sessions, 'token', token);
    if (idx !== -1) deleteRow_('Sessions', idx + 2);
  }
  return { success: true };
}

/* =====================================================================
 * Posts
 * ===================================================================== */

function allPosts_() {
  return getRows_(getSheet_('Posts')).map(mapPost).sort(byCreatedDesc);
}

function createPost_(token, body) {
  var ctx = requireUser_(token);
  var defaultImg = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80';
  var post = {
    id: genId('post'),
    user_id: ctx.user.id,
    username: ctx.user.username,
    user_avatar: ctx.user.avatar,
    image_url: str(body.imageUrl) || defaultImg,
    caption: str(body.caption),
    filter: str(body.filter) || 'none',
    likes: '[]',
    comments: '[]',
    bookmarks: '[]',
    created_at: new Date().toISOString()
  };
  appendRow_('Posts', post);
  logActivity_('post', 'ผู้ใช้ ' + ctx.user.username + ' โพสต์รูปใหม่');
  return mapPost(post);
}

function postAction_(token, body) {
  var ctx = requireUser_(token);
  var postId = str(body.postId);
  var rows = getRows_(getSheet_('Posts'));
  var idx = findRow_(rows, 'id', postId);
  if (idx === -1) throw new HttpError(404, 'ไม่พบโพสต์');
  var row = rows[idx];
  var action = body.action;

  if (action === 'like') {
    var likes = j(row.likes, []);
    var i = likes.indexOf(ctx.user.id);
    if (i === -1) likes.push(ctx.user.id); else likes.splice(i, 1);
    row.likes = JSON.stringify(likes);
    updateRow_('Posts', row, idx + 2);
    return { success: true, liked: i === -1, likesCount: likes.length, post: mapPost(row) };
  }

  if (action === 'bookmark') {
    var bookmarks = j(row.bookmarks, []);
    var bi = bookmarks.indexOf(ctx.user.id);
    if (bi === -1) bookmarks.push(ctx.user.id); else bookmarks.splice(bi, 1);
    row.bookmarks = JSON.stringify(bookmarks);
    updateRow_('Posts', row, idx + 2);
    return { success: true, bookmarked: bi === -1, post: mapPost(row) };
  }

  if (action === 'comment') {
    var text = str(body.text).trim();
    if (!text) throw new HttpError(400, 'โปรดใส่ข้อความคอมเมนต์');
    var comments = j(row.comments, []);
    comments.push({ id: 'c_' + Date.now(), userId: ctx.user.id, username: ctx.user.username, text: text, createdAt: new Date().toISOString() });
    row.comments = JSON.stringify(comments);
    updateRow_('Posts', row, idx + 2);
    return { success: true, comments: comments, post: mapPost(row) };
  }

  if (action === 'delete') {
    if (row.user_id !== ctx.user.id && ctx.user.role !== 'admin') throw new HttpError(403, 'ไม่มีสิทธิ์ลบโพสต์นี้');
    deleteRow_('Posts', idx + 2);
    logActivity_('post', 'ลบโพสต์ ID ' + postId + ' โดย ' + ctx.user.username);
    return { success: true, postId: postId };
  }

  throw new HttpError(400, 'action ไม่ถูกต้อง');
}

/* =====================================================================
 * Stories
 * ===================================================================== */

function allStories_() {
  return getRows_(getSheet_('Stories')).map(mapStory).sort(byCreatedDesc);
}

function createStory_(token, body) {
  var ctx = requireUser_(token);
  var defaultMedia = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
  var story = {
    id: genId('st'),
    user_id: ctx.user.id,
    username: ctx.user.username,
    user_avatar: ctx.user.avatar,
    media_url: str(body.mediaUrl) || defaultMedia,
    caption: str(body.caption),
    views: 0,
    created_at: new Date().toISOString()
  };
  appendRow_('Stories', story);
  logActivity_('story', 'ผู้ใช้ ' + ctx.user.username + ' เพิ่มสตอรี่ใหม่');
  return mapStory(story);
}

function storyAction_(token, body) {
  var storyId = str(body.storyId);
  var action = body.action;
  var rows = getRows_(getSheet_('Stories'));
  var idx = findRow_(rows, 'id', storyId);
  if (idx === -1) throw new HttpError(404, 'ไม่พบสตอรี่');

  if (action === 'view') {
    rows[idx].views = num(rows[idx].views) + 1;
    updateRow_('Stories', rows[idx], idx + 2);
    return { success: true };
  }

  if (action === 'delete') {
    var ctx = requireUser_(token);
    if (rows[idx].user_id !== ctx.user.id && ctx.user.role !== 'admin') throw new HttpError(403, 'ไม่มีสิทธิ์ลบสตอรี่นี้');
    deleteRow_('Stories', idx + 2);
    return { success: true };
  }

  throw new HttpError(400, 'action ไม่ถูกต้อง');
}

/* =====================================================================
 * Chats
 * ===================================================================== */

function myChats_(userId) {
  var rows = getRows_(getSheet_('Chats'));
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (j(rows[i].participants, []).indexOf(userId) !== -1) out.push(mapChat(rows[i]));
  }
  return out;
}

function findChatRow_(userId, targetUserId) {
  var rows = getRows_(getSheet_('Chats'));
  for (var i = 0; i < rows.length; i++) {
    var parts = j(rows[i].participants, []);
    if (parts.indexOf(userId) !== -1 && parts.indexOf(targetUserId) !== -1) return i;
  }
  return -1;
}

function chatAction_(token, body) {
  var ctx = requireUser_(token);
  var action = body.action;

  if (action === 'get-or-create') {
    var targetUserId = str(body.targetUserId);
    if (!targetUserId) throw new HttpError(400, 'missing targetUserId');
    var ci = findChatRow_(ctx.user.id, targetUserId);
    if (ci !== -1) {
      var allRows = getRows_(getSheet_('Chats'));
      return { chat: mapChat(allRows[ci]) };
    }
    var id = genId('chat');
    appendRow_('Chats', { id: id, participants: JSON.stringify([ctx.user.id, targetUserId]), messages: '[]' });
    return { chat: { id: id, participants: [ctx.user.id, targetUserId], messages: [] } };
  }

  if (action === 'message') {
    var targetUserId2 = str(body.targetUserId);
    if (!targetUserId2) throw new HttpError(400, 'missing targetUserId');
    var text = str(body.text).trim();
    var imageUrl = body.imageUrl ? str(body.imageUrl) : null;
    if (!text && !imageUrl) throw new HttpError(400, 'ใส่ข้อความหรือรูปภาพ');

    var ci2 = findChatRow_(ctx.user.id, targetUserId2);
    var chatId;
    var allRows2 = getRows_(getSheet_('Chats'));
    if (ci2 === -1) {
      chatId = genId('chat');
      appendRow_('Chats', { id: chatId, participants: JSON.stringify([ctx.user.id, targetUserId2]), messages: '[]' });
      allRows2 = getRows_(getSheet_('Chats'));
      ci2 = findRow_(allRows2, 'id', chatId);
    } else {
      chatId = allRows2[ci2].id;
    }
    var chat = allRows2[ci2];
    var messages = j(chat.messages, []);
    messages.push({ id: genId('m'), senderId: ctx.user.id, text: text, imageUrl: imageUrl, timestamp: new Date().toISOString() });
    chat.messages = JSON.stringify(messages);
    updateRow_('Chats', chat, ci2 + 2);
    logActivity_('chat', 'ข้อความใหม่จาก ' + ctx.user.username);
    return { chat: mapChat(chat) };
  }

  if (action === 'read') {
    var chatId2 = str(body.chatId);
    if (!chatId2) throw new HttpError(400, 'missing chatId');
    var allRows3 = getRows_(getSheet_('Chats'));
    var ci3 = findRow_(allRows3, 'id', chatId2);
    var msgs = ci3 === -1 ? [] : j(allRows3[ci3].messages, []);
    var lastId = msgs.length ? msgs[msgs.length - 1].id : null;
    var users = getRows_(getSheet_('Users'));
    var ui = findRow_(users, 'id', ctx.user.id);
    if (ui !== -1) {
      var reads = j(users[ui].chat_reads, {});
      reads[chatId2] = lastId;
      users[ui].chat_reads = JSON.stringify(reads);
      updateRow_('Users', users[ui], ui + 2);
    }
    return { success: true };
  }

  throw new HttpError(400, 'action ไม่ถูกต้อง');
}

/* =====================================================================
 * Users
 * ===================================================================== */

function allUsers_() {
  return getRows_(getSheet_('Users')).map(mapUser).sort(byCreatedAsc);
}

function updateProfile_(token, body) {
  var ctx = requireUser_(token);
  var username = body.username ? str(body.username).trim() : null;
  var fullName = body.fullName ? str(body.fullName).trim() : null;
  var bio = body.bio !== undefined && body.bio !== null ? str(body.bio) : null;
  var avatar = body.avatar ? str(body.avatar) : null;

  if (username) {
    var users = getRows_(getSheet_('Users'));
    for (var i = 0; i < users.length; i++) {
      if (users[i].id !== ctx.user.id && str(users[i].username).toLowerCase() === username.toLowerCase()) {
        throw new HttpError(400, 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
      }
    }
  }

  var users2 = getRows_(getSheet_('Users'));
  var idx = findRow_(users2, 'id', ctx.user.id);
  if (idx === -1) throw new HttpError(404, 'ไม่พบผู้ใช้');
  var row = users2[idx];
  if (username) row.username = username;
  if (fullName) row.full_name = fullName;
  if (bio !== null) row.bio = bio;
  if (avatar) row.avatar = avatar;
  updateRow_('Users', row, idx + 2);
  return mapUser(row);
}

function followUser_(token, body) {
  var ctx = requireUser_(token);
  var targetId = str(body.targetId);
  if (!targetId) throw new HttpError(400, 'missing targetId');
  if (targetId === ctx.user.id) throw new HttpError(400, 'ไม่สามารถติดตามตัวเองได้');

  var users = getRows_(getSheet_('Users'));
  var ti = findRow_(users, 'id', targetId);
  if (ti === -1) throw new HttpError(404, 'ไม่พบผู้ใช้');
  var mi = findRow_(users, 'id', ctx.user.id);
  var meRow = users[mi];
  var targetRow = users[ti];
  var myFollows = j(meRow.follows, []);
  var i = myFollows.indexOf(targetId);

  if (i === -1) {
    myFollows.push(targetId);
    meRow.follows = JSON.stringify(myFollows);
    meRow.following = num(meRow.following) + 1;
    targetRow.followers = num(targetRow.followers) + 1;
  } else {
    myFollows.splice(i, 1);
    meRow.follows = JSON.stringify(myFollows);
    meRow.following = Math.max(0, num(meRow.following) - 1);
    targetRow.followers = Math.max(0, num(targetRow.followers) - 1);
  }
  updateRow_('Users', meRow, mi + 2);
  updateRow_('Users', targetRow, ti + 2);
  return { success: true, following: i === -1, me: mapUser(meRow), target: mapUser(targetRow) };
}

/* =====================================================================
 * Admin
 * ===================================================================== */

function adminAction_(token, body) {
  var ctx = requireAdmin_(token);
  var action = body.action;
  var userId = str(body.userId);
  if (!action || !userId) throw new HttpError(400, 'กรอกข้อมูลไม่ครบ');

  if (action === 'toggle-ban') {
    if (userId === ctx.user.id) throw new HttpError(400, 'ไม่สามารถระงับตัวเองได้');
    var users = getRows_(getSheet_('Users'));
    var idx = findRow_(users, 'id', userId);
    if (idx === -1) throw new HttpError(404, 'ไม่พบผู้ใช้');
    var newVal = !bool(users[idx].is_banned);
    users[idx].is_banned = newVal;
    updateRow_('Users', users[idx], idx + 2);
    var sessions = getRows_(getSheet_('Sessions'));
    for (var s = sessions.length - 1; s >= 0; s--) {
      if (str(sessions[s].user_id) === userId) deleteRow_('Sessions', s + 2);
    }
    logActivity_('admin', 'Admin ' + ctx.user.username + ' ' + (newVal ? 'ระงับบัญชี' : 'ปลดระงับบัญชี') + ' ผู้ใช้ ' + users[idx].username);
    return { success: true, isBanned: newVal, user: mapUser(users[idx]) };
  }

  if (action === 'toggle-role') {
    if (userId === ctx.user.id) throw new HttpError(400, 'ไม่สามารถเปลี่ยนสิทธิ์ตัวเองได้');
    var users2 = getRows_(getSheet_('Users'));
    var idx2 = findRow_(users2, 'id', userId);
    if (idx2 === -1) throw new HttpError(404, 'ไม่พบผู้ใช้');
    var newRole = str(users2[idx2].role) === 'admin' ? 'user' : 'admin';
    users2[idx2].role = newRole;
    updateRow_('Users', users2[idx2], idx2 + 2);
    logActivity_('admin', 'Admin ' + ctx.user.username + ' เปลี่ยนสิทธิ์ ' + users2[idx2].username + ' เป็น ' + newRole);
    return { success: true, newRole: newRole, user: mapUser(users2[idx2]) };
  }

  if (action === 'delete-user') {
    if (userId === ctx.user.id) throw new HttpError(400, 'ไม่สามารถลบบัญชีตัวเองได้');
    var users3 = getRows_(getSheet_('Users'));
    var idx3 = findRow_(users3, 'id', userId);
    if (idx3 === -1) throw new HttpError(404, 'ไม่พบผู้ใช้');
    var target = users3[idx3];
    deleteRow_('Users', idx3 + 2);

    var sessions2 = getRows_(getSheet_('Sessions'));
    for (var s2 = sessions2.length - 1; s2 >= 0; s2--) {
      if (str(sessions2[s2].user_id) === userId) deleteRow_('Sessions', s2 + 2);
    }
    var posts = getRows_(getSheet_('Posts'));
    for (var p = posts.length - 1; p >= 0; p--) {
      if (str(posts[p].user_id) === userId) deleteRow_('Posts', p + 2);
    }
    var stories = getRows_(getSheet_('Stories'));
    for (var t = stories.length - 1; t >= 0; t--) {
      if (str(stories[t].user_id) === userId) deleteRow_('Stories', t + 2);
    }
    var chats = getRows_(getSheet_('Chats'));
    for (var c = chats.length - 1; c >= 0; c--) {
      if (j(chats[c].participants, []).indexOf(userId) !== -1) deleteRow_('Chats', c + 2);
    }
    logActivity_('admin', 'Admin ' + ctx.user.username + ' ลบผู้ใช้ ' + target.username + ' ออกจากระบบ');
    return { success: true, userId: userId };
  }

  throw new HttpError(400, 'action ไม่ถูกต้อง');
}

function adminReset_(token) {
  requireAdmin_(token);
  var names = Object.keys(COLUMNS);
  for (var i = 0; i < names.length; i++) {
    var sheet = getSheet_(names[i]);
    var last = sheet.getLastRow();
    if (last > 1) sheet.deleteRows(2, last - 1);
  }
  seedIfEmpty_();
  logActivity_('admin', 'Admin รีเซ็ตระบบทั้งหมด');
  return { success: true };
}

function adminStats_(token) {
  requireAdmin_(token);
  var users = getRows_(getSheet_('Users'));
  var posts = getRows_(getSheet_('Posts'));
  var stories = getRows_(getSheet_('Stories'));
  var chats = getRows_(getSheet_('Chats'));
  var totalMessages = 0;
  for (var i = 0; i < chats.length; i++) totalMessages += j(chats[i].messages, []).length;
  return {
    totalUsers: users.length,
    bannedUsers: users.filter(function (u) { return bool(u.is_banned); }).length,
    adminUsers: users.filter(function (u) { return str(u.role) === 'admin'; }).length,
    totalPosts: posts.length,
    activeStories: stories.length,
    totalMessages: totalMessages
  };
}

function logs_(token) {
  requireAdmin_(token);
  var rows = getRows_(getSheet_('Logs'));
  rows.sort(function (a, b) {
    var x = String(a.timestamp || '');
    var y = String(b.timestamp || '');
    return x < y ? 1 : (x > y ? -1 : 0);
  });
  return rows.slice(0, 100).map(function (r) {
    return { id: str(r.id), type: str(r.type), text: str(r.text), timestamp: str(r.timestamp) };
  });
}

/* =====================================================================
 * Snapshot (โหลดข้อมูลทั้งหมดที่จำเป็นสำหรับหน้าแรก + ข้อมูลของ user ถ้ามี token)
 * ===================================================================== */

function snapshot_(token) {
  ensureInitialized_();
  var me = null;
  var chats = [];
  var logs = [];
  if (token) {
    try {
      var ctx = requireUser_(token);
      me = ctx.user;
      chats = myChats_(me.id);
      try { logs = logs_(token); } catch (e) { logs = []; }
    } catch (e) {
      me = null;
      chats = [];
      logs = [];
    }
  }
  return { ok: true, seeded: true, users: allUsers_(), posts: allPosts_(), stories: allStories_(), chats: chats, logs: logs, me: me };
}

/* =====================================================================
 * Router
 * ===================================================================== */

function route_(path, method, token, body) {
  var p = String(path || '').toLowerCase();
  ensureInitialized_();
  switch (p) {
    case '/auth/login': return authLogin_(body);
    case '/auth/register': return authRegister_(body);
    case '/auth/logout': return authLogout_(token);
    case '/auth/me': return { user: requireUser_(token).user };
    case '/posts':
      if (method === 'POST') return { post: createPost_(token, body) };
      return { posts: allPosts_() };
    case '/posts/action': return postAction_(token, body);
    case '/stories':
      if (method === 'POST') return { story: createStory_(token, body) };
      return { stories: allStories_() };
    case '/stories/action': return storyAction_(token, body);
    case '/chats':
      if (method === 'POST') return chatAction_(token, body);
      return { chats: myChats_(requireUser_(token).user.id) };
    case '/users':
      if (method === 'PATCH') return { user: updateProfile_(token, body) };
      if (method === 'POST') return followUser_(token, body);
      return { users: allUsers_() };
    case '/admin/actions': return adminAction_(token, body);
    case '/admin/reset': return adminReset_(token);
    case '/admin/stats': return adminStats_(token);
    case '/logs': return { logs: logs_(token) };
    case '/snapshot': return snapshot_(token);
    case '/init': ensureInitialized_(); return { ok: true, seeded: true };
    default: throw new HttpError(404, 'ไม่พบ endpoint: ' + p);
  }
}

function handleRequest_(path, method, token, body) {
  try {
    var out;
    if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) throw new HttpError(503, 'ระบบไม่ว่าง โปรดลองอีกครั้ง');
      try {
        out = route_(path, method, token, body);
      } finally {
        lock.releaseLock();
      }
    } else {
      out = route_(path, method, token, body);
    }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    var err = { error: 'เกิดข้อผิดพลาดภายในระบบ', status: 500 };
    if (e instanceof HttpError || (e && e.status && e.error)) {
      err = { error: e.error, status: e.status };
    } else {
      err.error = String(e && e.message ? e.message : e);
    }
    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }
}

/* =====================================================================
 * Entry points (doGet / doPost)
 * ===================================================================== */

function doGet(e) {
  var token = (e && e.parameter && e.parameter.token) ? String(e.parameter.token) : '';
  return handleRequest_('/snapshot', 'GET', token, {});
}

function doPost(e) {
  var payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    payload = {};
  }
  var method = String(payload.method || 'GET').toUpperCase();
  var path = String(payload.path || '');
  var token = String(payload.token || '');
  var body = payload.body || {};
  return handleRequest_(path, method, token, body);
}
