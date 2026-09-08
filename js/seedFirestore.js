// js/seedFirestore.js - เขียนข้อมูลเริ่มต้นลง Cloud Firestore ถ้ายังว่าง
// ใช้ข้อมูลชุดเดียวกับ seedData.js (INITIAL_SEED_DATA)

async function seedFirestore() {
  const db = window.firestoreDb;
  const data = window.INITIAL_SEED_DATA;
  const hash = window.api.hashPassword;

  if (!data) {
    throw new Error('INITIAL_SEED_DATA not defined');
  }

  // Users (hash password ก่อนเขียน)
  for (const u of data.users) {
    const doc = {
      id: u.id,
      username: u.username,
      email: u.email,
      password: await hash(u.password),
      role: u.role,
      fullName: u.fullName,
      avatar: u.avatar,
      bio: u.bio,
      followers: u.followers || 0,
      following: u.following || 0,
      follows: u.follows || [],
      chatReads: {},
      isBanned: !!u.isBanned,
      createdAt: u.createdAt
    };
    await db.collection('users').doc(u.id).set(doc);
  }

  // Stories
  for (const s of data.stories) {
    const doc = {
      id: s.id,
      userId: s.userId,
      username: s.username,
      userAvatar: s.userAvatar,
      mediaUrl: s.mediaUrl,
      caption: s.caption,
      views: s.views || 0,
      createdAt: s.createdAt
    };
    await db.collection('stories').doc(s.id).set(doc);
  }

  // Posts
  for (const p of data.posts) {
    const doc = {
      id: p.id,
      userId: p.userId,
      username: p.username,
      userAvatar: p.userAvatar,
      imageUrl: p.imageUrl,
      caption: p.caption,
      filter: p.filter || 'none',
      likes: p.likes || [],
      comments: p.comments || [],
      bookmarks: p.bookmarks || [],
      createdAt: p.createdAt
    };
    await db.collection('posts').doc(p.id).set(doc);
  }

  // Chats
  for (const c of data.chats) {
    const doc = {
      id: c.id,
      participants: c.participants || [],
      messages: c.messages || []
    };
    await db.collection('chats').doc(c.id).set(doc);
  }

  // Logs
  await db.collection('logs').doc('log_1').set({
    id: 'log_1',
    type: 'system',
    text: 'DogDog platform initialized successfully.',
    timestamp: new Date().toISOString()
  });
}

window.seedFirestore = seedFirestore;

// Seed ครั้งแรก (เฉพาะเมื่อไม่มีผู้ใช้เลย)
(async function autoSeedFirestore() {
  try {
    const snap = await window.firestoreDb.collection('users').limit(1).get();
    if (snap.empty) {
      await seedFirestore();
    }
  } catch (e) {
    console.warn('Auto-seed Firestore ล้มเหลว (ตรวจสอบ config/rules):', e && e.message);
  }
})();
