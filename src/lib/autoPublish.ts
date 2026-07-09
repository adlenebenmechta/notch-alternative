// Post Processor - manages post lifecycle (create, publish, sync analytics)

import { db } from '@/lib/db';
import { PostPeerService } from '@/lib/postpeer';

const postpeer = new PostPeerService();

/**
 * Synchronize TikTok accounts from PostPeer
 */
export async function syncAccounts(): Promise<number> {
  try {
    console.log('[AutoPublish] Syncing accounts from PostPeer...');
    const accounts = await postpeer.getTikTokAccounts();
    console.log(`[AutoPublish] Found ${accounts.length} TikTok account(s)`);

    let count = 0;
    for (const acc of accounts) {
      await db.tikTokAccount.upsert({
        where: { blotatoId: acc.id },
        create: {
          blotatoId: acc.id,
          username: acc.username,
          displayName: acc.displayName,
          platform: acc.platform,
          avatarUrl: acc.avatarUrl,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        update: {
          username: acc.username,
          displayName: acc.displayName,
          avatarUrl: acc.avatarUrl,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  } catch (err: any) {
    console.error('[AutoPublish] Failed to sync accounts:', err.message);
    throw err;
  }
}

/**
 * Create and publish a carousel post (multiple images)
 * Used by the AI Viral Carousel Machine - each slide has 2 images (problem + solution)
 */
export async function createCarouselPost(data: {
  accountId?: string;
  imageUrls: string[]; // 2+ images
  caption?: string;
  hashtags?: string[];
  musicTitle?: string;
  aiDescription?: string;
  externalId?: string; // slide number, etc.
  scheduledAt?: string;
  autoCaption?: boolean;
}): Promise<{ post: any; needsAccount: boolean; postpeerError?: string }> {
  let account;
  if (data.accountId) {
    account = await db.tikTokAccount.findFirst({
      where: { blotatoId: data.accountId, isActive: true },
    });
  }
  if (!account) {
    account = await db.tikTokAccount.findFirst({ where: { isActive: true } });
  }

  if (!account) {
    return { post: null, needsAccount: true };
  }

  let caption = data.caption || '';
  let hashtags = data.hashtags || [];

  if (data.autoCaption && !caption) {
    const generated = await generateAICaption(data.aiDescription || '');
    caption = generated.caption;
    hashtags = generated.hashtags;
  }

  // Create post in DB
  const post = await db.post.create({
    data: {
      accountId: account.id,
      source: 'carousel',
      externalId: data.externalId,
      // Use first image as videoUrl placeholder (for compatibility)
      videoUrl: data.imageUrls[0],
      thumbnailUrl: data.imageUrls[0],
      caption,
      hashtags: hashtags.length ? JSON.stringify(hashtags) : null,
      musicTitle: data.musicTitle,
      aiDescription: data.aiDescription,
      status: data.scheduledAt ? 'SCHEDULED' : 'PENDING',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  await logPost(post.id, 'INFO', `Carousel post created (${data.imageUrls.length} images)`);

  // If not scheduled, publish immediately
  if (!data.scheduledAt) {
    publishImageCarousel(post.id, data.imageUrls).catch((err) => {
      console.error(`[AutoPublish] Background carousel publish failed for ${post.id}:`, err);
    });
  }

  return { post, needsAccount: false };
}

/**
 * Publish an image carousel post to TikTok via PostPeer
 */
export async function publishImageCarousel(postId: string, imageUrls?: string[]): Promise<boolean> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { account: true },
  });

  if (!post || !post.account) {
    console.error(`[AutoPublish] Post ${postId} not found or no account`);
    return false;
  }

  if (post.status === 'PUBLISHED') {
    console.log(`[AutoPublish] Post ${postId} already published`);
    return true;
  }

  // Use provided imageUrls or fallback to post.videoUrl as single image
  const finalImageUrls = imageUrls && imageUrls.length > 0
    ? imageUrls
    : [post.videoUrl]; // fallback - the videoUrl field stores first image URL for carousel posts

  await db.post.update({
    where: { id: postId },
    data: { status: 'PUBLISHING' },
  });
  await logPost(postId, 'INFO', `Starting PostPeer carousel publish (${finalImageUrls.length} images)`);

  try {
    const hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];

    const result = await postpeer.publishImagePost({
      accountId: post.account.blotatoId,
      imageUrls: finalImageUrls,
      caption: post.caption || '',
      hashtags,
      musicTitle: post.musicTitle || undefined,
      scheduledAt: post.scheduledAt || undefined,
    });

    await db.post.update({
      where: { id: postId },
      data: {
        blotatoPostId: result.id,
        status: result.status === 'published' || result.status === 'success' ? 'PUBLISHED' : 'PENDING',
        publishedAt: result.status === 'published' ? new Date() : null,
        tiktokUrl: result.url || null,
      },
    });

    await logPost(postId, 'INFO', `PostPeer carousel post created: ${result.id} (status: ${result.status})`);

    if (result.status !== 'published' && result.status !== 'success') {
      pollPostStatus(postId, result.id).catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.error(`[AutoPublish] Carousel publish failed for ${postId}:`, err.message);
    await db.post.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        retryCount: { increment: 1 },
      },
    });
    await logPost(postId, 'ERROR', `Carousel publish failed: ${err.message}`);
    return false;
  }
}

/**
 * Create a new post
 */
export async function createPost(data: {
  accountId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  hashtags?: string[];
  musicTitle?: string;
  aiDescription?: string;
  externalId?: string;
  scheduledAt?: string;
  autoCaption?: boolean;
}): Promise<{ post: any; needsAccount: boolean }> {
  let account;
  if (data.accountId) {
    account = await db.tikTokAccount.findFirst({
      where: { blotatoId: data.accountId, isActive: true },
    });
  }
  if (!account) {
    account = await db.tikTokAccount.findFirst({ where: { isActive: true } });
  }

  if (!account) {
    return { post: null, needsAccount: true };
  }

  let caption = data.caption || '';
  let hashtags = data.hashtags || [];

  if (data.autoCaption && !caption) {
    const generated = await generateAICaption(data.aiDescription || '');
    caption = generated.caption;
    hashtags = generated.hashtags;
  }

  const post = await db.post.create({
    data: {
      accountId: account.id,
      source: 'manual',
      externalId: data.externalId,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      caption,
      hashtags: hashtags.length ? JSON.stringify(hashtags) : null,
      musicTitle: data.musicTitle,
      aiDescription: data.aiDescription,
      status: data.scheduledAt ? 'SCHEDULED' : 'PENDING',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  await logPost(post.id, 'INFO', `Post created`);

  if (!data.scheduledAt) {
    publishPost(post.id).catch((err) => {
      console.error(`[AutoPublish] Background publish failed for ${post.id}:`, err);
    });
  }

  return { post, needsAccount: false };
}

/**
 * Publish a post to TikTok via PostPeer
 */
export async function publishPost(postId: string): Promise<boolean> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: { account: true },
  });

  if (!post || !post.account) {
    console.error(`[AutoPublish] Post ${postId} not found or no account`);
    return false;
  }

  if (post.status === 'PUBLISHED') {
    console.log(`[AutoPublish] Post ${postId} already published`);
    return true;
  }

  await db.post.update({
    where: { id: postId },
    data: { status: 'PUBLISHING' },
  });
  await logPost(postId, 'INFO', 'Starting PostPeer publish');

  try {
    const hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];

    const result = await postpeer.publishPost({
      accountId: post.account.blotatoId,
      videoUrl: post.videoUrl,
      caption: post.caption || '',
      hashtags,
      musicTitle: post.musicTitle || undefined,
      scheduledAt: post.scheduledAt || undefined,
      thumbnailUrl: post.thumbnailUrl || undefined,
    });

    await db.post.update({
      where: { id: postId },
      data: {
        blotatoPostId: result.id,
        status: result.status === 'published' || result.status === 'success' ? 'PUBLISHED' : 'PENDING',
        publishedAt: result.status === 'published' ? new Date() : null,
        tiktokUrl: result.url || null,
      },
    });

    await logPost(postId, 'INFO', `PostPeer post created: ${result.id} (status: ${result.status})`);

    if (result.status !== 'published' && result.status !== 'success') {
      pollPostStatus(postId, result.id).catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.error(`[AutoPublish] Publish failed for ${postId}:`, err.message);
    await db.post.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        retryCount: { increment: 1 },
      },
    });
    await logPost(postId, 'ERROR', `Publish failed: ${err.message}`);
    return false;
  }
}

/**
 * Poll post status until published or failed (max 10 min)
 */
async function pollPostStatus(postId: string, postpeerPostId: string): Promise<void> {
  const maxAttempts = 60; // 10 minutes for carousels
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10000));

    try {
      const status = await postpeer.getPostStatus(postpeerPostId);
      console.log(`[AutoPublish] Poll ${i + 1}: post ${postId} status: ${status.status}`);

      if (status.status === 'published' || status.status === 'success') {
        await db.post.update({
          where: { id: postId },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            tiktokUrl: status.url || null,
          },
        });
        await logPost(postId, 'INFO', `Published successfully: ${status.url}`);
        return;
      }

      if (status.status === 'failed' || status.status === 'error') {
        await db.post.update({
          where: { id: postId },
          data: {
            status: 'FAILED',
            errorMessage: status.error || 'PostPeer reported failure',
          },
        });
        await logPost(postId, 'ERROR', `PostPeer failed: ${status.error}`);
        return;
      }
    } catch (err: any) {
      console.warn(`[AutoPublish] Poll error: ${err.message}`);
    }
  }

  await logPost(postId, 'WARN', 'Polling timeout - check PostPeer dashboard');
}

/**
 * Generate AI caption using ZAI SDK (or fallback to templates)
 */
async function generateAICaption(
  description: string
): Promise<{ caption: string; hashtags: string[] }> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a TikTok content strategist. Generate a catchy caption and 5-8 relevant hashtags. Return JSON: {"caption":"...","hashtags":["tag1","tag2"]}',
        },
        {
          role: 'user',
          content: `Description: ${description || 'AI-generated video'}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      caption: parsed.caption || '🔥 Check this out!',
      hashtags: parsed.hashtags || ['fyp', 'foryou', 'viral'],
    };
  } catch (err) {
    console.error('[AutoPublish] AI caption failed:', err);
    return {
      caption: '🔥 Check this out! #fyp',
      hashtags: ['fyp', 'foryou', 'viral', 'trending'],
    };
  }
}

/**
 * Update analytics for a post
 */
export async function updatePostAnalytics(postId: string): Promise<void> {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || !post.blotatoPostId) return;

  const analytics = await postpeer.getPostAnalytics(post.blotatoPostId);

  await db.post.update({
    where: { id: postId },
    data: {
      views: analytics.views,
      likes: analytics.likes,
      comments: analytics.comments,
      shares: analytics.shares,
    },
  });

  await db.analytics.create({
    data: {
      postId,
      views: analytics.views,
      likes: analytics.likes,
      comments: analytics.comments,
      shares: analytics.shares,
    },
  });
}

async function logPost(postId: string, level: string, message: string): Promise<void> {
  try {
    await db.postLog.create({
      data: { postId, level, message },
    });
  } catch (err) {
    console.error('Failed to log post:', err);
  }
}
