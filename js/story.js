// js/story.js - Stories Manager & Viewer Controller (backend: Google Sheets)

class StoryManager {
  constructor() {
    this.viewerTimer = null;
    this.currentStoryIndex = 0;
    this.activeStories = [];
  }

  getStories() {
    return (window.store.data.stories || []).slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  saveStories(stories) {
    window.store.data.stories = stories;
  }

  mergeStory(story) {
    if (!story) return;
    const stories = this.getStories();
    const idx = stories.findIndex(s => s.id === story.id);
    if (idx >= 0) stories[idx] = story;
    else stories.unshift(story);
    this.saveStories(stories);
  }

  async createStory({ mediaUrl, caption }) {
    const me = window.authManager.currentUser;
    if (!me) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' };
    if (!mediaUrl) return { success: false, error: 'กรุณาเลือกรูปภาพ' };
    try {
      const res = await window.api.post('/stories', { mediaUrl, caption });
      this.mergeStory(res.story);
      return { success: true, story: res.story };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async deleteStory(storyId) {
    try {
      const res = await window.api.post('/stories/action', { storyId, action: 'delete' });
      const stories = this.getStories().filter(s => s.id !== storyId);
      this.saveStories(stories);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // เพิ่มยอดวิว (fire-and-forget ไปที่เซิร์ฟเวอร์)
  async trackView(storyId) {
    try {
      await window.api.post('/stories/action', { storyId, action: 'view' });
    } catch (e) {
      // ไม่แสดง error
    }
  }

  // Open fullscreen viewer
  openViewer(storyId) {
    const stories = this.getStories();
    if (!stories.length) return;

    this.activeStories = stories;
    const startIndex = stories.findIndex(s => s.id === storyId);
    this.currentStoryIndex = startIndex !== -1 ? startIndex : 0;

    const modal = document.getElementById('storyViewerModal');
    if (!modal) return;

    modal.classList.add('active');
    this.renderCurrentStory();
  }

  renderCurrentStory() {
    clearTimeout(this.viewerTimer);

    if (this.currentStoryIndex < 0 || this.currentStoryIndex >= this.activeStories.length) {
      this.closeViewer();
      return;
    }

    const story = this.activeStories[this.currentStoryIndex];

    // เพิ่มยอดวิว (อัปเดต cache + ส่งไปเซิร์ฟเวอร์)
    const stories = this.getStories();
    const stored = stories.find(s => s.id === story.id);
    if (stored) {
      stored.views = (stored.views || 0) + 1;
      this.saveStories(stories);
      story.views = stored.views;
      this.trackView(story.id);
    }

    const imgEl = document.getElementById('storyViewerImage');
    const avatarEl = document.getElementById('storyViewerAvatar');
    const userEl = document.getElementById('storyViewerUsername');
    const timeEl = document.getElementById('storyViewerTime');
    const captionEl = document.getElementById('storyViewerCaption');
    const viewsEl = document.getElementById('storyViewerViews');
    const progressBar = document.getElementById('storyProgressBar');

    if (imgEl) imgEl.src = story.mediaUrl;
    if (avatarEl) avatarEl.src = story.userAvatar;
    if (userEl) userEl.textContent = story.username;
    if (timeEl) timeEl.textContent = this.formatTimeAgo(story.createdAt);
    if (captionEl) captionEl.textContent = story.caption || '';
    if (viewsEl) viewsEl.textContent = `👁️ ${story.views} views`;

    if (progressBar) {
      progressBar.style.transition = 'none';
      progressBar.style.width = '0%';
      setTimeout(() => {
        progressBar.style.transition = 'width 5s linear';
        progressBar.style.width = '100%';
      }, 50);
    }

    this.viewerTimer = setTimeout(() => {
      this.nextStory();
    }, 5050);
  }

  nextStory() {
    this.currentStoryIndex++;
    if (this.currentStoryIndex >= this.activeStories.length) {
      this.closeViewer();
    } else {
      this.renderCurrentStory();
    }
  }

  prevStory() {
    this.currentStoryIndex--;
    if (this.currentStoryIndex < 0) {
      this.currentStoryIndex = 0;
    }
    this.renderCurrentStory();
  }

  closeViewer() {
    clearTimeout(this.viewerTimer);
    const modal = document.getElementById('storyViewerModal');
    if (modal) modal.classList.remove('active');
  }

  formatTimeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }
}

window.storyManager = new StoryManager();
