// PostPeer API Service - Social media auto-publishing
// Docs: https://www.postpeer.dev/docs
// REST API Base URL: https://api.postpeer.dev/v1
// Auth Header: x-access-key: YOUR_API_KEY
//
// Key Endpoints:
//   GET  /v1/health/auth              - Verify API key
//   GET  /v1/connect/integrations      - List connected social accounts
//   GET  /v1/connect/{platform}        - Get OAuth connect URL for a platform
//   POST /v1/posts                     - Create/publish a post
//   GET  /v1/posts/{id}                - Get post status
//   GET  /v1/posts/{id}/analytics      - Get post analytics
//   DELETE /v1/posts/{id}              - Delete a scheduled post
//
// POST /v1/posts body:
// {
//   "content": "Caption with #hashtags",
//   "platforms": [{ "platform": "tiktok", "accountId": "..." }],
//   "mediaItems": [{ "type": "video", "url": "https://..." }],
//   "publishNow": true,
//   "scheduledFor": "2026-01-01T09:00:00",  // optional
//   "timezone": "America/New_York"           // optional
// }

const POSTPEER_BASE_URL = 'https://api.postpeer.dev/v1';

export interface PostPeerIntegration {
  id: string;
  platform: string;
  platformUserId: string;
  username: string;
  displayName: string;
  profileUrl: string;
  imageUrl: string;
  profileId: string;
  createdAt: string;
}

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
  draft?: boolean;
  privacyLevel?: string;
}

export interface PublishImagePostOptions {
  accountId: string;
  imageUrls: string[];
  caption: string;
  hashtags?: string[];
  musicTitle?: string;
  scheduledAt?: Date;
  platforms?: string[];
  draft?: boolean;
  privacyLevel?: string;
  autoAddMusic?: boolean;
}

/**
 * PostPeer API client for publishing to TikTok, Instagram, and other social platforms
 *
 * Uses x-access-key header for authentication (not Bearer token).
 * Accounts are fetched via /v1/connect/integrations (not /v1/accounts).
 * Posts use mediaItems array with type field (not mediaUrls).
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
        'x-access-key': this.apiKey,
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
   * Get all connected social media integrations
   * Uses /v1/connect/integrations endpoint
   */
  async getIntegrations(profileId?: string): Promise<PostPeerIntegration[]> {
    const query = profileId ? `?profileId=${profileId}` : '';
    const data = await this.request('GET', `/connect/integrations${query}`);
    return data.integrations || [];
  }

  /**
   * Get all connected social media accounts (mapped from integrations)
   * Backwards-compatible: returns PostPeerAccount[] format
   */
  async getAccounts(): Promise<PostPeerAccount[]> {
    const integrations = await this.getIntegrations();

    return integrations.map((int: PostPeerIntegration) => ({
      id: int.id,
      username: int.username || '',
      displayName: int.displayName || '',
      platform: int.platform || 'tiktok',
      avatarUrl: int.imageUrl || '',
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
   * Uses mediaItems format: [{ type: "video", url: "..." }]
   */
  async publishPost(options: PublishOptions): Promise<PostPeerPostResponse> {
    const { accountId, videoUrl, caption, hashtags, musicTitle, scheduledAt, platforms, draft, privacyLevel } = options;

    const fullText = this.buildCaption(caption, hashtags, musicTitle);
    const targetPlatforms = platforms || ['tiktok'];

    const postpeerBody: Record<string, unknown> = {
      content: fullText,
      platforms: targetPlatforms.map((p: string) => {
        const entry: Record<string, unknown> = { platform: p };
        if (accountId) entry.accountId = accountId;

        // Add platform-specific data for TikTok
        if (p === 'tiktok') {
          entry.platformSpecificData = {
            privacyLevel: privacyLevel || 'PUBLIC_TO_EVERYONE',
            draft: draft !== undefined ? draft : false,
            disableComment: false,
            disableDuet: false,
            disableStitch: false,
          };
        }

        return entry;
      }),
      mediaItems: [
        { type: 'video', url: videoUrl },
      ],
    };

    if (scheduledAt) {
      postpeerBody.scheduledFor = scheduledAt.toISOString();
      postpeerBody.timezone = 'UTC';
    } else {
      postpeerBody.publishNow = true;
    }

    const data = await this.request('POST', '/posts', postpeerBody);

    // PostPeer returns { success, status, postId, platforms: [...] }
    const platformResult = data.platforms?.[0] || {};

    return {
      id: data.postId || data.id || '',
      status: data.status || platformResult.status || 'pending',
      platformPostId: platformResult.platformPostId,
      url: platformResult.platformPostUrl || data.url || '',
      error: data.error || platformResult.error,
    };
  }

  /**
   * Publish an image carousel post to social media via PostPeer
   * Uses mediaItems format: [{ type: "image", url: "..." }, ...]
   */
  async publishImagePost(options: PublishImagePostOptions): Promise<PostPeerPostResponse> {
    const { accountId, imageUrls, caption, hashtags, musicTitle, scheduledAt, platforms, draft, privacyLevel, autoAddMusic } = options;

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('At least one image URL is required');
    }

    const fullText = this.buildCaption(caption, hashtags, musicTitle);
    const targetPlatforms = platforms || ['tiktok'];

    const postpeerBody: Record<string, unknown> = {
      content: fullText,
      platforms: targetPlatforms.map((p: string) => {
        const entry: Record<string, unknown> = { platform: p };
        if (accountId) entry.accountId = accountId;

        // Add platform-specific data for TikTok photo carousel
        if (p === 'tiktok') {
          entry.platformSpecificData = {
            privacyLevel: privacyLevel || 'PUBLIC_TO_EVERYONE',
            draft: draft !== undefined ? draft : false,
            autoAddMusic: autoAddMusic !== undefined ? autoAddMusic : true,
            photoCoverIndex: 0,
            disableComment: false,
            disableDuet: false,
            disableStitch: false,
          };
        }

        return entry;
      }),
      mediaItems: imageUrls
        .filter((url: string) => url && url.trim())
        .map((url: string) => ({ type: 'image', url })),
    };

    if (scheduledAt) {
      postpeerBody.scheduledFor = scheduledAt.toISOString();
      postpeerBody.timezone = 'UTC';
    } else {
      postpeerBody.publishNow = true;
    }

    const data = await this.request('POST', '/posts', postpeerBody);

    // PostPeer returns { success, status, postId, platforms: [...] }
    const platformResult = data.platforms?.[0] || {};

    return {
      id: data.postId || data.id || '',
      status: data.status || platformResult.status || 'pending',
      platformPostId: platformResult.platformPostId,
      url: platformResult.platformPostUrl || data.url || '',
      error: data.error || platformResult.error,
    };
  }

  /**
   * Get post status (for polling)
   * Returns status: "in-progress", "published", "failed"
   */
  async getPostStatus(postId: string): Promise<PostPeerPostResponse> {
    const data = await this.request('GET', `/posts/${postId}`);

    // Map PostPeer status to our expected format
    let mappedStatus = data.status || 'unknown';
    if (mappedStatus === 'scheduled') mappedStatus = 'pending';
    if (mappedStatus === 'in-progress' || mappedStatus === 'processing') mappedStatus = 'in-progress';
    if (mappedStatus === 'published' || mappedStatus === 'success') mappedStatus = 'published';
    if (mappedStatus === 'failed' || mappedStatus === 'error') mappedStatus = 'failed';

    const url = data.platformPostUrl || data.publicUrl || data.url ||
      (data.platforms && data.platforms[0]?.platformPostUrl) || '';

    return {
      id: data.postId || data.id,
      status: mappedStatus,
      platformPostId: data.platformPostId,
      url,
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

  /**
   * Verify API key by calling the health/auth endpoint
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      const data = await this.request('GET', '/health/auth');
      console.log(`[PostPeer] API key valid: ${data.ok === true}`);
      return data.ok === true;
    } catch (err: any) {
      console.error('[PostPeer] API key verification failed:', err.message);
      return false;
    }
  }

  /**
   * Get OAuth connect URL for a platform
   * Returns the URL to redirect the user to for authorization
   */
  async getConnectUrl(platform: string, profileId?: string): Promise<string> {
    const query = profileId ? `?profileId=${profileId}` : '';
    const data = await this.request('GET', `/connect/${platform}${query}`);
    return data.url || '';
  }
}
