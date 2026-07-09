// PostPeer API Service - Social media auto-publishing
// Docs: https://api.postpeer.dev/v1
// REST API: Base URL: https://api.postpeer.dev/v1
// Auth Header: Authorization: Bearer YOUR_API_KEY
//
// IMPORTANT: POST /posts body structure:
// {
//   "platforms": [{ "platform": "tiktok", "accountId": "..." (optional) }],
//   "content": "Caption text with #hashtags",
//   "mediaUrls": ["https://...", ...],
//   "scheduleDate": "..." (optional, ISO 8601)
// }

const POSTPEER_BASE_URL = 'https://api.postpeer.dev/v1';

export interface PostPeerAccount {
  id: string;
  username: string;
  displayName?: string;
  platform: string;
  avatarUrl?: string;
}

export interface PostPeerPostResponse {
  id: string;
  status: string;
  platformPostId?: string;
  url?: string;
  error?: string;
}

export interface PublishOptions {
  accountId: string;
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  musicTitle?: string;
  scheduledAt?: Date;
  thumbnailUrl?: string;
  platforms?: string[]; // e.g. ["tiktok", "instagram"]
}

export interface PublishImagePostOptions {
  accountId: string;
  imageUrls: string[];
  caption: string;
  hashtags?: string[];
  musicTitle?: string;
  scheduledAt?: Date;
  platforms?: string[];
}

/**
 * PostPeer API client for publishing to TikTok, Instagram, and other social platforms
 */
export class PostPeerService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.POSTPEER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[PostPeer] API key not set. Set POSTPEER_API_KEY in env vars.');
    }
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('POSTPEER_API_KEY is not configured');
    }

    const url = `${POSTPEER_BASE_URL}${endpoint}`;
    console.log(`[PostPeer] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const errMsg = data.message || data.error || data.raw || `HTTP ${response.status}`;
      console.error(`[PostPeer] Error ${response.status}:`, errMsg);
      throw new Error(`PostPeer API error: ${errMsg}`);
    }

    return data;
  }

  /**
   * Get all connected social media accounts
   */
  async getAccounts(): Promise<PostPeerAccount[]> {
    const data = await this.request('GET', '/accounts');
    const accounts = data.items || data.accounts || data.data || (Array.isArray(data) ? data : []);

    return accounts.map((a: any) => ({
      id: a.id,
      username: a.username || a.handle || '',
      displayName: a.displayName || a.name || '',
      platform: a.platform || 'tiktok',
      avatarUrl: a.avatarUrl || a.avatar || '',
    }));
  }

  /**
   * Get only TikTok accounts
   */
  async getTikTokAccounts(): Promise<PostPeerAccount[]> {
    const all = await this.getAccounts();
    return all.filter((a) => a.platform.toLowerCase() === 'tiktok');
  }

  /**
   * Build caption text with hashtags and music
   */
  private buildCaption(caption: string, hashtags?: string[], musicTitle?: string): string {
    let full = caption || '';
    if (musicTitle) full += `\n\n🎵 ${musicTitle}`;
    if (hashtags && hashtags.length > 0) {
      const tags = hashtags
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean)
        .map((tag) => `#${tag}`)
        .join(' ');
      full += `\n\n${tags}`;
    }
    return full.trim();
  }

  /**
   * Publish a video post to social media via PostPeer
   */
  async publishPost(options: PublishOptions): Promise<PostPeerPostResponse> {
    const { accountId, videoUrl, caption, hashtags, musicTitle, scheduledAt, platforms } = options;

    const fullText = this.buildCaption(caption, hashtags, musicTitle);
    const targetPlatforms = platforms || ['tiktok'];

    const postpeerBody: Record<string, unknown> = {
      platforms: targetPlatforms.map((p: string) => {
        const entry: Record<string, string> = { platform: p };
        if (accountId) entry.accountId = accountId;
        return entry;
      }),
      content: fullText,
      mediaUrls: [videoUrl],
    };

    if (scheduledAt) {
      postpeerBody.scheduleDate = scheduledAt.toISOString();
    }

    const data = await this.request('POST', '/posts', postpeerBody);

    return {
      id: data.id || data.postId || (data.post && data.post.id) || '',
      status: data.status || (data.post && data.post.status) || 'pending',
      platformPostId: data.platformPostId,
      url: data.url || (data.post && data.post.url),
      error: data.error,
    };
  }

  /**
   * Publish an image carousel post to social media via PostPeer
   */
  async publishImagePost(options: PublishImagePostOptions): Promise<PostPeerPostResponse> {
    const { accountId, imageUrls, caption, hashtags, musicTitle, scheduledAt, platforms } = options;

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const fullText = this.buildCaption(caption, hashtags, musicTitle);
    const targetPlatforms = platforms || ['tiktok'];

    const postpeerBody: Record<string, unknown> = {
      platforms: targetPlatforms.map((p: string) => {
        const entry: Record<string, string> = { platform: p };
        if (accountId) entry.accountId = accountId;
        return entry;
      }),
      content: fullText,
      mediaUrls: imageUrls.filter((url: string) => url && url.trim()),
    };

    if (scheduledAt) {
      postpeerBody.scheduleDate = scheduledAt.toISOString();
    }

    const data = await this.request('POST', '/posts', postpeerBody);

    return {
      id: data.id || data.postId || (data.post && data.post.id) || '',
      status: data.status || (data.post && data.post.status) || 'pending',
      platformPostId: data.platformPostId,
      url: data.url || (data.post && data.post.url),
      error: data.error,
    };
  }

  /**
   * Get post status (for polling)
   * Returns status: "in-progress", "published", "failed"
   * Returns publicUrl when published
   */
  async getPostStatus(postId: string): Promise<PostPeerPostResponse> {
    const data = await this.request('GET', `/posts/${postId}`);
    const url = data.publicUrl || data.url || (data.post && data.post.url);

    return {
      id: data.id || data.postId,
      status: data.status || 'unknown',
      platformPostId: data.platformPostId,
      url,
      error: data.error || (data.status === 'failed' ? 'Publishing failed' : undefined),
    };
  }

  /**
   * Get analytics for a published post
   */
  async getPostAnalytics(postId: string): Promise<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }> {
    try {
      const data = await this.request('GET', `/posts/${postId}/analytics`);
      return {
        views: data.views || data.viewCount || 0,
        likes: data.likes || data.likeCount || 0,
        comments: data.comments || data.commentCount || 0,
        shares: data.shares || data.shareCount || 0,
      };
    } catch (err: any) {
      console.warn(`[PostPeer] Failed to get analytics for ${postId}:`, err.message);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  /**
   * Delete a scheduled post (only works for scheduled, not published posts)
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.request('DELETE', `/posts/${postId}`);
      console.log(`[PostPeer] Deleted scheduled post: ${postId}`);
      return true;
    } catch (err: any) {
      console.warn(`[PostPeer] Failed to delete post ${postId}:`, err.message);
      // If it's a 404, the post might already be published (can't delete)
      // or already deleted - either way, return true so DB cleanup continues
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        console.log(`[PostPeer] Post ${postId} not found (maybe already published or deleted)`);
        return true;
      }
      return false;
    }
  }

  async verifyApiKey(): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      console.log(`[PostPeer] API key valid. Found ${accounts.length} account(s).`);
      return true;
    } catch (err: any) {
      console.error('[PostPeer] API key verification failed:', err.message);
      return false;
    }
  }
}
