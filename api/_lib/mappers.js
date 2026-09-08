// api/_lib/mappers.js - Convert DB rows (snake_case) to API objects (camelCase)

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    bio: row.bio,
    followers: row.followers || 0,
    following: row.following || 0,
    follows: row.follows || [],
    chatReads: row.chat_reads || {},
    isBanned: !!row.is_banned,
    createdAt: row.created_at
  };
}

function mapPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userAvatar: row.user_avatar,
    imageUrl: row.image_url,
    caption: row.caption,
    filter: row.filter,
    likes: row.likes || [],
    comments: row.comments || [],
    bookmarks: row.bookmarks || [],
    createdAt: row.created_at
  };
}

function mapStory(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userAvatar: row.user_avatar,
    mediaUrl: row.media_url,
    caption: row.caption,
    views: row.views || 0,
    createdAt: row.created_at
  };
}

function mapChat(row) {
  if (!row) return null;
  return {
    id: row.id,
    participants: row.participants || [],
    messages: row.messages || []
  };
}

module.exports = { mapUser, mapPost, mapStory, mapChat };
