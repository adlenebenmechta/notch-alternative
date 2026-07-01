// Blotato API Service - TikTok auto-publishing
// Docs: https://help.blotato.com/api/start
// REST API: Base URL: https://backend.blotato.com/v2
// Auth Header: blotato-api-key: YOUR_API_KEY
//
// IMPORTANT: All POST /posts requests must wrap body in a "post" object:
// { "post": { "accountId": "...", "content": "...", "mediaUrls": [...] } }

const BLOTATO_BASE_URL = 'https://backend.blotato.com/v2';

export interface BlotatoAccount {
  id: string;
  username: string;
  displayName?: string;
  platform: string;
  avatarUrl?: string;
}

export interface BlotatoPostResponse {
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
}

export interface PublishImagePostOptions {
  accountId: string;
  imageUrls: string[];
  caption: string;
  hashtags?: string[];
  musicTitle?: string;
  scheduledAt?: Date;
}

/**
 * Blotato API client for publishing to TikTok and other social platforms
 */
export class BlotatoService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BLOTATO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Blotato] API key not set. Set BLOTATO_API_KEY in env vars.');
    }
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('BLOTATO_API_KEY is not configured');
    }

    const url = `${BLOTATO_BASE_URL}${endpoint}`;
    console.log(`[Blotato] ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'blotato-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
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
      console.error(`[Blotato] Error ${response.status}:`, errMsg);
      throw new Error(`Blotato API error: ${errMsg}`);
    }

    return data;
  }

  /**
   * Get all connected social media accounts
   */
  async getAccounts(): Promise<BlotatoAccount[]> {
    const data = await this.request('GET', '/users/me/accounts');
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
  async getTikTokAccounts(): Promise<BlotatoAccount[]> {
    const all = await this.getAccounts();
    return all.filter((a) => a.platform.toLowerCase() === 'tiktok');
  }

  /**
   * Publish a post to a social platform
   * Body must be wrapped in { post: { ... } }
   */
  async publishPost(options: PublishOptions): Promise<BlotatoPostResponse> {
    const { accountId, videoUrl, caption, hashtags, musicTitle, scheduledAt, thumbnailUrl } = options;

    const fullCaption = this.buildCaption(caption, hashtags, musicTitle);

    const postBody: any = {
      accountId,
      content: fullCaption,
      mediaUrls: [videoUrl],
      platform: 'tiktok',
    };

    if (thumbnailUrl) postBody.thumbnailUrl = thumbnailUrl;
    if (scheduledAt) postBody.scheduledAt = scheduledAt.toISOString();

    // Wrap in "post" object as required by Blotato API
    const data = await this.request('POST', '/posts', { post: postBody });

    return {
      id: data.id || data.postId || (data.post && data.post.id) || '',
      status: data.status || (data.post && data.post.status) || 'pending',
      platformPostId: data.platformPostId,
      url: data.url || (data.post && data.post.url),
      error: data.error,
    };
  }

  /**
   * Publish an image carousel post to TikTok (Photo Mode)
   */
  async publishImagePost(options: PublishImagePostOptions): Promise<BlotatoPostResponse> {
    const { accountId, imageUrls, caption, hashtags, musicTitle, scheduledAt } = options;

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const fullCaption = this.buildCaption(caption, hashtags, musicTitle);

    const postBody: any = {
      accountId,
      content: fullCaption,
      mediaUrls: imageUrls,
      platform: 'tiktok',
      postType: 'image',
    };

    if (scheduledAt) postBody.scheduledAt = scheduledAt.toISOString();

    // Wrap in "post" object as required by Blotato API
    const data = await this.request('POST', '/posts', { post: postBody });

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
   */
  async getPostStatus(postId: string): Promise<BlotatoPostResponse> {
    const data = await this.request('GET', `/posts/${postId}`);
    return {
      id: data.id,
      status: data.status,
      platformPostId: data.platformPostId,
      url: data.url,
      error: data.error,
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
      console.warn(`[Blotato] Failed to get analytics for ${postId}:`, err.message);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  /**
   * Delete a scheduled post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.request('DELETE', `/posts/${postId}`);
      return true;
    } catch (err: any) {
      console.error(`[Blotato] Failed to delete post ${postId}:`, err.message);
      return false;
    }
  }

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

  async verifyApiKey(): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      console.log(`[Blotato] API key valid. Found ${accounts.length} account(s).`);
      return true;
    } catch (err: any) {
      console.error('[Blotato] API key verification failed:', err.message);
      return false;
    }
  }
}
