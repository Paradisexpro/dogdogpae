// api/_lib/seed.js - Initial seed data for the online database

const now = Date.now();
const h = ms => new Date(now - ms).toISOString();

const SEED_USERS = [
  {
    id: 'usr_admin',
    username: 'admin_boss',
    fullName: 'System Administrator',
    email: 'admin@instadog.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: '🛡️ Official InstaDog Admin | System Operator & Content Moderator',
    followers: 12500,
    following: 120,
    follows: [],
    chatReads: {},
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
    follows: [],
    chatReads: {},
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
    follows: [],
    chatReads: {},
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
    follows: [],
    chatReads: {},
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
    follows: [],
    chatReads: {},
    isBanned: false,
    createdAt: '2026-03-12T16:00:00.000Z'
  }
];

const SEED_STORIES = [
  {
    id: 'st_1',
    userId: 'usr_alex',
    username: 'alex_golden',
    userAvatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=80',
    caption: 'Beach day with my favorite stick! 🏖️🐶',
    createdAt: h(2 * 3600 * 1000),
    views: 142
  },
  {
    id: 'st_2',
    userId: 'usr_bella',
    username: 'bella_corgi',
    userAvatar: 'https://images.unsplash.com/photo-1612536057832-2ff7ead7819c?auto=format&fit=crop&w=300&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    caption: 'Sunday nap time with hooman 😴✨',
    createdAt: h(4 * 3600 * 1000),
    views: 289
  },
  {
    id: 'st_3',
    userId: 'usr_charlie',
    username: 'charlie_husky',
    userAvatar: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=300&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
    caption: 'Singing the song of my people at 3 AM 🎤⚡',
    createdAt: h(6 * 3600 * 1000),
    views: 512
  },
  {
    id: 'st_4',
    userId: 'usr_luna',
    username: 'luna_poodle',
    userAvatar: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80',
    caption: 'Fresh grooming session! How do I look? 🐩💅',
    createdAt: h(1 * 3600 * 1000),
    views: 98
  }
];

const SEED_POSTS = [
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
      { id: 'c_1', userId: 'usr_bella', username: 'bella_corgi', text: 'Super cute model!! 💖', createdAt: h(26 * 3600 * 1000) },
      { id: 'c_2', userId: 'usr_charlie', username: 'charlie_husky', text: 'Looking majestic brother 🐾', createdAt: h(25 * 3600 * 1000) }
    ],
    bookmarks: ['usr_admin'],
    createdAt: h(26 * 3600 * 1000)
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
      { id: 'c_3', userId: 'usr_alex', username: 'alex_golden', text: 'Give her all the bacon!! 🥓', createdAt: h(50 * 3600 * 1000) }
    ],
    bookmarks: [],
    createdAt: h(50 * 3600 * 1000)
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
      { id: 'c_4', userId: 'usr_luna', username: 'luna_poodle', text: 'Stay warm out there! ❄️❤️', createdAt: h(72 * 3600 * 1000) }
    ],
    bookmarks: ['usr_alex'],
    createdAt: h(72 * 3600 * 1000)
  }
];

const SEED_CHATS = [
  {
    id: 'chat_alex_bella',
    participants: ['usr_alex', 'usr_bella'],
    messages: [
      { id: 'm1', senderId: 'usr_bella', text: 'Hey Alex! Want to go to the dog park today? 🌳', imageUrl: null, timestamp: h(2 * 3600 * 1000) },
      { id: 'm2', senderId: 'usr_alex', text: 'Woof yes!! I brought my yellow tennis ball 🎾', imageUrl: null, timestamp: h(2 * 3600 * 1000 - 120000) },
      { id: 'm3', senderId: 'usr_bella', text: 'See you at 4 PM! 🐾', imageUrl: null, timestamp: h(2 * 3600 * 1000 - 300000) }
    ]
  },
  {
    id: 'chat_alex_charlie',
    participants: ['usr_alex', 'usr_charlie'],
    messages: [
      { id: 'm4', senderId: 'usr_charlie', text: 'AWOOOOO! Did you see the new snow outside?', imageUrl: null, timestamp: h(20 * 3600 * 1000) },
      { id: 'm5', senderId: 'usr_alex', text: 'Yes brother! Your story was hilarious ⚡', imageUrl: null, timestamp: h(20 * 3600 * 1000 - 900000) }
    ]
  }
];

module.exports = { SEED_USERS, SEED_STORIES, SEED_POSTS, SEED_CHATS };
