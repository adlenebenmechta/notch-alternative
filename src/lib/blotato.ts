// Blotato API Service - Modern Blotato API integration
// Docs: https://docs.blotato.com
// REST API Base URL: https://api.blotato.com/v1/api
// Auth: Authorization: Bearer blt_xxxxx
//
// The newer Blotato API uses Bearer token auth (different from PostPeer's x-access-key).
// Endpoints use POST for many reads (Blotato quirk) and include:
//   POST /v1/api/accounts            - List connected accounts (body: {pagination, filter})
//   POST /v1/api/posts               - Create/publish/schedule a post
//   POST /v1/api/posts/{id}/get      - Get post status
//   POST /v1/api/posts/{id}/analytics- Get post analytics
//   DELETE /v1/api/posts/{id}        - Delete a scheduled post
//   POST /v1/api/posts/list          - List posts (body: {pagination, filter})

const BLOTATO_BASE_URL = 'https://api.blotato.com/v1/api';

export interface BlotatoAccount {
  id: string;
  platform: string;
  platformUserId?: string;
  username?: string;
  displayName?: string;
  nickname?: string;
  profileUrl?: string;
  imageUrl?: string;
  avatarUrl?: string;
  profileId?: string;
  createdAt?: string;
}

export interface BlotatoPostResponse {
  id: string;
  status: string;
  platformPostId?: string;
  url?: string;
  platformPostUrl?: string;
  publicUrl?: string;
  error?: string;
}

export interface BlotatoPostOptions {
  accountId: string;
  videoUrl?: string;
  imageUrls?: string[];
  caption: string;
  hashtags?: string[];
  musicTitle?: string;
  scheduledAt?: Date;
  platforms?: string[];
  draft?: boolean;
  privacyLevel?: string;
  autoAddMusic?: boolean;
  recordId?: string; // for grouping related posts
}

export interface BlotatoPost {
  id: string;
  status: string;
  content?: string;
  platformPostUrl?: string;
  publicUrl?: string;
  url?: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  accountId?: string;
  platform?: string;
  error?: string;
}

/**
 * Blotato API client — newer Bearer-token API on api.blotato.com
 *
 * Differences from PostPeerService:
 *  - Uses `Authorization: Bearer blt_...` (not `x-access-key`)
 *  - Base URL is `https://api.blotato.com/v1/api` (not `api.postpeer.dev/v1`)
 *  - Account listing uses POST with pagination body (not GET)
 *  - Uses `scheduledAt` (ISO datetime) instead of `scheduledFor`
 *  - Uses `settings` block (per-platform) instead of `platformSpecificData`
 */
export class BlotatoService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BLOTATO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Blotato] API key not set. Set BLOTATO_API_KEY in env vars.');
    }
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: any,
    opts: { retryOn401?: boolean } = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('BLOTATO_API_KEY is not configured');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BLOTATO_BASE_URL}${endpoint}`;
    console.log(`[Blotato] ${method} ${url}`);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
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
      console.error(`[Blotato] Error ${response.status}:`, errMsg);
      throw new Error(`Blotato API error: ${errMsg}`);
    }

    return data as T;
  }

  // ─── Accounts ──────────────────────────────────────────────────────────────

  /**
   * List all connected social accounts.
   * Blotato uses POST /accounts with a pagination body.
   */
  async getAccounts(): Promise<BlotatoAccount[]> {
    try {
      const data = await this.request<any>('POST', '/accounts', {
        pagination: { limit: 100, cursor: null },
      });
      // Handle multiple possible response shapes
      const list =
        data?.data ||
        data?.accounts ||
        data?.items ||
        data?.results ||
        (Array.isArray(data) ? data : []);
      return list.map((a: any) => this.normalizeAccount(a));
    } catch (err: any) {
      console.error('[Blotato] getAccounts failed:', err.message);
      // Try fallback GET (some Blotato API versions support GET /accounts)
      try {
        const data = await this.request<any>('GET', '/accounts');
        const list =
          data?.data || data?.accounts || data?.items || (Array.isArray(data) ? data : []);
        return list.map((a: any) => this.normalizeAccount(a));
      } catch (fallbackErr: any) {
        console.error('[Blotato] getAccounts fallback also failed:', fallbackErr.message);
        throw err;
      }
    }
  }

  /**
   * Get only TikTok accounts
   */
  async getTikTokAccounts(): Promise<BlotatoAccount[]> {
    const all = await this.getAccounts();
    return all.filter((a) => (a.platform || '').toLowerCase() === 'tiktok');
  }

  private normalizeAccount(raw: any): BlotatoAccount {
    return {
      id: raw.id || raw.accountId || raw._id,
      platform: raw.platform || 'tiktok',
      platformUserId: raw.platformUserId,
      username: raw.username || raw.nickname || raw.handle,
      displayName: raw.displayName || raw.name || raw.fullName,
      nickname: raw.nickname,
      profileUrl: raw.profileUrl || raw.url || raw.publicUrl,
      imageUrl: raw.imageUrl || raw.avatarUrl || raw.avatar || raw.profileImageUrl,
      avatarUrl: raw.avatarUrl || raw.imageUrl || raw.avatar,
      profileId: raw.profileId,
      createdAt: raw.createdAt,
    };
  }

  // ─── Posts ─────────────────────────────────────────────────────────────────

  /**
   * Create / publish / schedule a post
   */
  async createPost(options: BlotatoPostOptions): Promise<BlotatoPostResponse> {
    const {
      accountId,
      videoUrl,
      imageUrls,
      caption,
      hashtags,
      musicTitle,
      scheduledAt,
      platforms,
      draft,
      privacyLevel,
      autoAddMusic,
      recordId,
    } = options;

    // Build media items — supports both video and image carousel
    let mediaItems: { type: string; url: string; thumbnailUrl?: string }[] = [];
    if (imageUrls && imageUrls.length > 0) {
      mediaItems = imageUrls
        .filter((u) => u && u.trim())
        .map((url) => ({ type: 'image', url }));
    } else if (videoUrl) {
      mediaItems = [{ type: 'video', url: videoUrl }];
    } else {
      throw new Error('Either videoUrl or imageUrls is required');
    }

    // Build caption with hashtags + music
    let fullText = caption || '';
    if (musicTitle) fullText += `\n\n🎵 ${musicTitle}`;
    if (hashtags && hashtags.length > 0) {
      const tags = hashtags
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .map((t) => `#${t}`)
        .join(' ');
      if (tags) fullText += `\n\n${tags}`;
    }

    const targetPlatforms = platforms || ['tiktok'];

    // Blotato uses settings[platform] for platform-specific config
    const settings: Record<string, any> = {};
    for (const p of targetPlatforms) {
      if (p === 'tiktok') {
        settings.tiktok = {
          accountId,
          privacyLevel: privacyLevel || 'PUBLIC_TO_EVERYONE',
          draft: draft !== undefined ? draft : false,
          disableComments: false,
          disableDuet: false,
          disableStitch: false,
          autoAddMusic: autoAddMusic !== undefined ? autoAddMusic : true,
          photoCoverIndex: 0,
        };
      } else {
        settings[p] = { accountId };
      }
    }

    const body: Record<string, any> = {
      accountId,
      content: fullText,
      mediaItems,
      platforms: targetPlatforms,
      settings,
    };

    if (recordId) body.recordId = recordId;

    if (scheduledAt) {
      body.scheduledAt = scheduledAt.toISOString();
      body.publishNow = false;
    } else {
      body.publishNow = true;
    }

    const data = await this.request<any>('POST', '/posts', body);

    // Normalize response
    return {
      id: data.id || data.postId || data._id || '',
      status: data.status || (data.data && data.data.status) || 'pending',
      platformPostId: data.platformPostId || (data.platforms && data.platforms[0]?.platformPostId),
      url: data.url || data.platformPostUrl || data.publicUrl || (data.platforms && data.platforms[0]?.platformPostUrl) || '',
      error: data.error,
    };
  }

  /**
   * Get a single post's status
   */
  async getPost(postId: string): Promise<BlotatoPostResponse> {
    // Blotato uses POST /posts/{id}/get
    try {
      const data = await this.request<any>('POST', `/posts/${postId}/get`);
      return this.normalizePostResponse(data);
    } catch (err) {
      // Fallback: GET /posts/{id}
      const data = await this.request<any>('GET', `/posts/${postId}`);
      return this.normalizePostResponse(data);
    }
  }

  /**
   * List posts (with optional filter)
   */
  async listPosts(filter?: {
    status?: string;
    accountId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ posts: BlotatoPost[]; nextCursor?: string }> {
    const body = {
      pagination: { limit: filter?.limit || 50, cursor: filter?.cursor || null },
      filter: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.accountId ? { accountId: filter.accountId } : {}),
      },
    };

    try {
      const data = await this.request<any>('POST', '/posts/list', body);
      const list =
        data?.data || data?.posts || data?.items || data?.results || (Array.isArray(data) ? data : []);
      const posts = list.map((p: any) => this.normalizePost(p));
      const nextCursor = data?.nextCursor || data?.pagination?.nextCursor;
      return { posts, nextCursor };
    } catch {
      // Fallback: GET /posts with query string
      const query = new URLSearchParams();
      if (filter?.status) query.set('status', filter.status);
      if (filter?.accountId) query.set('accountId', filter.accountId);
      if (filter?.limit) query.set('limit', String(filter.limit));
      const data = await this.request<any>('GET', `/posts?${query.toString()}`);
      const list =
        data?.data || data?.posts || data?.items || (Array.isArray(data) ? data : []);
      const posts = list.map((p: any) => this.normalizePost(p));
      return { posts };
    }
  }

  /**
   * Delete a scheduled post (only works for scheduled, not published)
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.request('DELETE', `/posts/${postId}`);
      console.log(`[Blotato] Deleted scheduled post: ${postId}`);
      return true;
    } catch (err: any) {
      console.warn(`[Blotato] Failed to delete post ${postId}:`, err.message);
      // If 404, the post is already gone — treat as success
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        return true;
      }
      return false;
    }
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
      const data = await this.request<any>('POST', `/posts/${postId}/analytics`);
      return {
        views: data.views || data.viewCount || data.data?.views || 0,
        likes: data.likes || data.likeCount || data.data?.likes || 0,
        comments: data.comments || data.commentCount || data.data?.comments || 0,
        shares: data.shares || data.shareCount || data.data?.shares || 0,
      };
    } catch (err: any) {
      console.warn(`[Blotato] Failed to get analytics for ${postId}:`, err.message);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private normalizePostResponse(data: any): BlotatoPostResponse {
    let status = (data.status || 'unknown').toLowerCase();
    if (status === 'scheduled') status = 'pending';
    if (status === 'in-progress' || status === 'processing') status = 'in-progress';
    if (status === 'published' || status === 'success') status = 'published';
    if (status === 'failed' || status === 'error') status = 'failed';

    return {
      id: data.id || data.postId || data._id,
      status,
      platformPostId: data.platformPostId,
      url:
        data.platformPostUrl ||
        data.publicUrl ||
        data.url ||
        (data.platforms && data.platforms[0]?.platformPostUrl) ||
        '',
      error: data.error,
    };
  }

  private normalizePost(raw: any): BlotatoPost {
    return {
      id: raw.id || raw.postId || raw._id,
      status: raw.status || 'unknown',
      content: raw.content,
      platformPostUrl: raw.platformPostUrl || raw.publicUrl || raw.url,
      publicUrl: raw.publicUrl,
      url: raw.url,
      scheduledAt: raw.scheduledAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      accountId: raw.accountId,
      platform: raw.platform,
      error: raw.error,
    };
  }

  /**
   * Verify API key by trying to list accounts
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (err: any) {
      console.error('[Blotato] API key verification failed:', err.message);
      return false;
    }
  }
}

// Singleton instance
let _instance: BlotatoService | null = null;
export function getBlotatoService(): BlotatoService {
  if (!_instance) {
    _instance = new BlotatoService();
  }
  return _instance;
}
