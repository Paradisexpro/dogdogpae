// js/post.js - Feed, Post Creation, Likes, Bookmarks & Comments (backend: Google Sheets)

class PostManager {
  getPosts() {
    return (window.store.data.posts || []).slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  savePosts(posts) {
    window.store.data.posts = posts;
  }

  mergePost(post) {
    if (!post) return;
    const posts = this.getPosts();
    const idx = posts.findIndex(p => p.id === post.id);
    if (idx >= 0) posts[idx] = post;
    else posts.unshift(post);
    this.savePosts(posts);
  }

  async createPost({ imageUrl, caption, filter, link }) {
    const me = window.authManager.currentUser;
    if (!me) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนโพสต์' };
    const text = String(caption || '').trim();
    if (!text && !imageUrl && !link) return { success: false, error: 'กรุณาใส่ข้อความ รูปภาพ หรือลิงก์' };
    try {
      const res = await window.api.post('/posts', { imageUrl, caption: text, filter, link });
      this.mergePost(res.post);
      return { success: true, post: res.post };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async toggleLike(postId) {
    if (!window.authManager.currentUser) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
    try {
      const res = await window.api.post('/posts/action', { postId, action: 'like' });
      this.mergePost(res.post);
      return { success: true, liked: res.liked, likesCount: res.likesCount };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async toggleBookmark(postId) {
    if (!window.authManager.currentUser) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
    try {
      const res = await window.api.post('/posts/action', { postId, action: 'bookmark' });
      this.mergePost(res.post);
      return { success: true, bookmarked: res.bookmarked };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async addComment(postId, text) {
    if (!window.authManager.currentUser) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
    const msg = String(text || '').trim();
    if (!msg) return { success: false, error: 'กรุณาพิมพ์คอมเมนต์' };
    try {
      const res = await window.api.post('/posts/action', { postId, action: 'comment', text: msg });
      this.mergePost(res.post);
      return { success: true, comments: res.comments };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async deletePost(postId) {
    try {
      const res = await window.api.post('/posts/action', { postId, action: 'delete' });
      const posts = this.getPosts().filter(p => p.id !== postId);
      this.savePosts(posts);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

window.postManager = new PostManager();
