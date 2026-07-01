// Blotato API Service - TikTok auto-publishing
// Docs: https://help.blotato.com/api/publish-post
// REST API: Base URL: https://backend.blotato.com/v2
// Auth Header: blotato-api-key: YOUR_API_KEY
//
// IMPORTANT: POST /posts body structure:
// {
//   "post": {
//     "accountId": "...",
//     "content": { "text": "...", "mediaUrls": [...], "platform": "tiktok" },
//     "target": { "targetType": "tiktok", "privacyLevel": "PUBLIC", ... }
//   },
//   "scheduledTime": "..." (optional, root-level)
// }

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
  postSubmissionId?: string;
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
   * Build the TikTok target object with required fields
   * privacyLevel values: "SELF_ONLY", "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR"
   */
  private buildTikTokTarget(): any {
    return {
      targetType: 'tiktok',
      privacyLevel: 'PUBLIC_TO_EVERYONE',
      disabledComments: false,
      disabledDuet: false,
      disabledStitch: false,
      isBrandedContent: false,
      isYourBrand: false,
      isAiGenerated: true,
    };
  }

  /**
   * Publish a video post to TikTok
   */
  async publishPost(options: PublishOptions): Promise<BlotatoPostResponse> {
    const { accountId, videoUrl, caption, hashtags, musicTitle, scheduledAt } = options;

    const fullText = this.buildCaption(caption, hashtags, musicTitle);

    const postBody = {
      accountId,
      content: {
        text: fullText,
        mediaUrls: [videoUrl],
        platform: 'tiktok',
      },
      target: this.buildTikTokTarget(),
    };

    const requestBody: any = { post: postBody };
    // scheduledTime must be root-level (not inside post)
    if (scheduledAt) {
      requestBody.scheduledTime = scheduledAt.toISOString();
    }

    const data = await this.request('POST', '/posts', requestBody);

    return {
      id: data.id || data.postId || data.postSubmissionId || (data.post && data.post.id) || '',
      status: data.status || (data.post && data.post.status) || 'pending',
      platformPostId: data.platformPostId,
      url: data.url || (data.post && data.post.url),
      error: data.error,
      postSubmissionId: data.postSubmissionId,
    };
  }

  /**
   * Publish an image carousel post to TikTok (Photo Mode)
   * TikTok supports 1+ images as a swipeable carousel
   */
  async publishImagePost(options: PublishImagePostOptions): Promise<BlotatoPostResponse> {
    const { accountId, imageUrls, caption, hashtags, musicTitle, scheduledAt } = options;

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const fullText = this.buildCaption(caption, hashtags, musicTitle);

    const postBody = {
      accountId,
      content: {
        text: fullText,
        mediaUrls: imageUrls,
        platform: 'tiktok',
      },
      target: {
        ...this.buildTikTokTarget(),
        autoAddMusic: true, // Auto-add trending music for photo posts
        imageCoverIndex: 0, // First image as cover
      },
    };

    const requestBody: any = { post: postBody };
    if (scheduledAt) {
      requestBody.scheduledTime = scheduledAt.toISOString();
    }

    const data = await this.request('POST', '/posts', requestBody);

    return {
      id: data.id || data.postId || data.postSubmissionId || (data.post && data.post.id) || '',
      status: data.status || (data.post && data.post.status) || 'pending',
      platformPostId: data.platformPostId,
      url: data.url || (data.post && data.post.url),
      error: data.error,
      postSubmissionId: data.postSubmissionId,
    };
  }

  /**
   * Get post status (for polling)
   * Returns status: "in-progress", "published", "failed"
   * Returns publicUrl when published
   *
   * Note: For carousel posts, Blotato sometimes returns only the profile URL
   * instead of the specific post URL. We try to fetch the actual postUrl
   * from the posts list as a fallback.
   */
  async getPostStatus(postSubmissionId: string): Promise<BlotatoPostResponse> {
    const data = await this.request('GET', `/posts/${postSubmissionId}`);
    let url = data.publicUrl || data.url;

    // If the URL is just the profile URL (no /photo/ or /video/ in it),
    // try to fetch the actual post URL from the posts list
    if (url && url.includes('@') && !url.includes('/photo/') && !url.includes('/video/') && !url.includes('/reel/')) {
      try {
        const listData = await this.request('GET', '/posts?limit=20');
        const items = listData.items || listData || [];
        // Find the post that matches our submission ID
        for (const item of items) {
          const itemState = item.state || {};
          if (itemState.postUrl && itemState.postUrl.includes('/photo/') || itemState.postUrl && itemState.postUrl.includes('/video/')) {
            // Found a post with a specific URL - use it
            // Note: We can't perfectly match by submission ID from the list,
            // but we use the most recent published post with a specific URL
            url = itemState.postUrl;
            break;
          }
        }
      } catch (err) {
        console.warn('[Blotato] Failed to fetch post URL from list:', err);
      }
    }

    return {
      id: data.postSubmissionId || data.id,
      status: data.status || 'unknown',
      platformPostId: data.platformPostId,
      url,
      error: data.error || (data.status === 'failed' ? 'Publishing failed' : undefined),
      postSubmissionId: data.postSubmissionId,
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
   * Delete a scheduled post (only works for scheduled, not published posts)
   * Uses /schedules/{id} endpoint (not /posts/{id})
   * Published posts cannot be deleted via API - must be deleted manually on TikTok
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      // Try the schedules endpoint first (correct endpoint for deletion)
      await this.request('DELETE', `/schedules/${postId}`);
      console.log(`[Blotato] Deleted scheduled post: ${postId}`);
      return true;
    } catch (err: any) {
      console.warn(`[Blotato] Failed to delete post ${postId}: ${err.message}`);
      // If it's a 404, the post might already be published (can't delete)
      // or already deleted - either way, return true so DB cleanup continues
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        console.log(`[Blotato] Post ${postId} not found (maybe already published or deleted)`);
        return true;
      }
      return false;
    }
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
