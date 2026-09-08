// js/seedData.js - Initial Seed Data for DogDog
// (ใช้ประกอบ firebase seeding — ข้อมูลชุดนี้จะถูกเขียนลง Cloud Firestore)

const INITIAL_SEED_DATA = {
  users: [
    {
      id: 'usr_admin',
      username: 'admin_boss',
      fullName: 'System Administrator',
      email: 'admin@dogdog.com',
      password: 'admin123', // In real app hashed; stored plain for mock demo
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      bio: '🛡️ Official InstaGram Admin | System Operator & Content Moderator',
      followers: 12500,
      following: 120,
      isBanned: false,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'usr_alex',
      username: 'alex_golden',
      fullName: 'Alex the Golden Retriever',
      email: 'alex@doggram.com',
      password: 'user123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
      bio: '🐾 Living my best life chasing tennis balls & eating treats! 🦴',
      followers: 3420,
      following: 280,
      isBanned: false,
      createdAt: '2026-02-10T10:00:00.000Z'
    },
    {
      id: 'usr_bella',
      username: 'bella_corgi',
      fullName: 'Bella Corgi Queens',
      email: 'bella@doggram.com',
      password: 'user123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80',
      bio: '👑 Queen of sploot | Short legs, big dreams ✨',
      followers: 8900,
      following: 450,
      isBanned: false,
      createdAt: '2026-02-15T14:30:00.000Z'
    },
    {
      id: 'usr_charlie',
      username: 'charlie_husky',
      fullName: 'Charlie Husky Vibe',
      email: 'charlie@doggram.com',
      password: 'user123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80',
      bio: '🐺 Professional drama singer & snow lover ❄️ Vocalist of the house!',
      followers: 14200,
      following: 310,
      isBanned: false,
      createdAt: '2026-03-01T09:15:00.000Z'
    },
    {
      id: 'usr_luna',
      username: 'luna_poodle',
      fullName: 'Luna Toy Poodle',
      email: 'luna@doggram.com',
      password: 'user123',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
      bio: '🐩 Fluffy fluff ball | Model & Fashionista 🌸',
      followers: 5100,
      following: 190,
      isBanned: false,
      createdAt: '2026-03-12T16:00:00.000Z'
    }
  ],

  stories: [
    {
      id: 'st_1',
      userId: 'usr_alex',
      username: 'alex_golden',
      userAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80',
      caption: 'Beach day with my favorite stick! 🏖️🐶',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      views: 142
    },
    {
      id: 'st_2',
      userId: 'usr_bella',
      username: 'bella_corgi',
      userAvatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
      caption: 'Sunday nap time with hooman 😴✨',
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      views: 289
    },
    {
      id: 'st_3',
      userId: 'usr_charlie',
      username: 'charlie_husky',
      userAvatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
      caption: 'Singing the song of my people at 3 AM 🎤⚡',
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      views: 512
    },
    {
      id: 'st_4',
      userId: 'usr_luna',
      username: 'luna_poodle',
      userAvatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
      caption: 'Fresh grooming session! How do I look? 🐩💅',
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      views: 98
    }
  ],

  posts: [
    {
      id: 'post_101',
      userId: 'usr_alex',
      username: 'alex_golden',
      userAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1000&q=80',
      caption: 'Golden hours with my best friend in the park 🌅🐕 Tag someone who loves sunshine!',
      filter: 'warm',
      likes: ['usr_bella', 'usr_charlie', 'usr_admin'],
      comments: [
        { id: 'c_1', userId: 'usr_bella', username: 'bella_corgi', text: 'Super cute model!! 💖', createdAt: '2026-08-09T10:00:00.000Z' },
        { id: 'c_2', userId: 'usr_charlie', username: 'charlie_husky', text: 'Looking majestic brother 🐾', createdAt: '2026-08-09T11:20:00.000Z' }
      ],
      bookmarks: ['usr_admin'],
      createdAt: '2026-08-09T09:30:00.000Z'
    },
    {
      id: 'post_102',
      userId: 'usr_bella',
      username: 'bella_corgi',
      userAvatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80',
      caption: 'Waiting for treats patiently... 🦴👀 Did someone say Bacon?!',
      filter: 'vintage',
      likes: ['usr_alex', 'usr_luna'],
      comments: [
        { id: 'c_3', userId: 'usr_alex', username: 'alex_golden', text: 'Give her all the bacon!! 🥓', createdAt: '2026-08-08T15:10:00.000Z' }
      ],
      bookmarks: [],
      createdAt: '2026-08-08T14:00:00.000Z'
    },
    {
      id: 'post_103',
      userId: 'usr_charlie',
      username: 'charlie_husky',
      userAvatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=1000&q=80',
      caption: 'Snow adventure time! ❄️ High energy all day long ⚡⚡',
      filter: 'cyber',
      likes: ['usr_alex', 'usr_bella', 'usr_luna', 'usr_admin'],
      comments: [
        { id: 'c_4', userId: 'usr_luna', username: 'luna_poodle', text: 'Stay warm out there! ❄️❤️', createdAt: '2026-08-07T12:00:00.000Z' }
      ],
      bookmarks: ['usr_alex'],
      createdAt: '2026-08-07T10:15:00.000Z'
    }
  ],

  chats: [
    {
      id: 'chat_alex_bella',
      participants: ['usr_alex', 'usr_bella'],
      messages: [
        { id: 'm1', senderId: 'usr_bella', text: 'Hey Alex! Want to go to the dog park today? 🌳', timestamp: '2026-08-10T09:00:00.000Z' },
        { id: 'm2', senderId: 'usr_alex', text: 'Woof yes!! I brought my yellow tennis ball 🎾', timestamp: '2026-08-10T09:02:00.000Z' },
        { id: 'm3', senderId: 'usr_bella', text: 'See you at 4 PM! 🐾', timestamp: '2026-08-10T09:05:00.000Z' }
      ]
    },
    {
      id: 'chat_alex_charlie',
      participants: ['usr_alex', 'usr_charlie'],
      messages: [
        { id: 'm4', senderId: 'usr_charlie', text: 'AWOOOOO! Did you see the new snow outside?', timestamp: '2026-08-09T18:00:00.000Z' },
        { id: 'm5', senderId: 'usr_alex', text: 'Yes brother! Your story was hilarious ⚡', timestamp: '2026-08-09T18:15:00.000Z' }
      ]
    }
  ]
};

// เก็บไว้บน window ให้ seedFirestore.js ใช้ได้
window.INITIAL_SEED_DATA = INITIAL_SEED_DATA;
