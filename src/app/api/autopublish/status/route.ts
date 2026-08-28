import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PostPeerService } from '@/lib/postpeer';

/**
 * GET /api/autopublish/status?postId=xxx
 * 
 * Returns real-time publish status from PostPeer:
 * - "in-progress": PostPeer is publishing to TikTok
 * - "published": Successfully published, includes publicUrl
 * - "failed": Publishing failed
 * 
 * Also returns logs from the database for the full pipeline view
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // Get post from DB with logs
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        account: true,
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If we have a blotatoPostId (legacy field), fetch real-time status from PostPeer
    let postpeerStatus = null;
    if (post.blotatoPostId) {
      try {
        const postpeer = new PostPeerService();
        postpeerStatus = await postpeer.getPostStatus(post.blotatoPostId);

        // Update DB if status changed
        if (postpeerStatus.status === 'published' && post.status !== 'PUBLISHED') {
          await db.post.update({
            where: { id: postId },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              tiktokUrl: postpeerStatus.url || null,
            },
          });
          await db.postLog.create({
            data: {
              postId,
              level: 'INFO',
              message: `Published successfully: ${postpeerStatus.url}`,
            },
          });
        } else if (postpeerStatus.status === 'failed' && post.status !== 'FAILED') {
          await db.post.update({
            where: { id: postId },
            data: {
              status: 'FAILED',
              errorMessage: postpeerStatus.error || 'PostPeer reported failure',
            },
          });
          await db.postLog.create({
            data: {
              postId,
              level: 'ERROR',
              message: `PostPeer failed: ${postpeerStatus.error}`,
            },
          });
        }
      } catch (err: any) {
        console.warn(`[Status] Failed to fetch PostPeer status:`, err.message);
      }
    }

    // Return full pipeline view
    return NextResponse.json({
      post: {
        id: post.id,
        status: post.status,
        caption: post.caption,
        videoUrl: post.videoUrl,
        tiktokUrl: post.tiktokUrl,
        errorMessage: post.errorMessage,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt,
        scheduledAt: post.scheduledAt,
        postpeerPostId: post.blotatoPostId, // Map legacy DB field to new name for frontend
        account: {
          username: post.account.username,
          displayName: post.account.displayName,
        },
      },
      postpeerStatus: postpeerStatus ? {
        status: postpeerStatus.status,
        url: postpeerStatus.url,
        error: postpeerStatus.error,
      } : null,
      logs: post.logs.map((log) => ({
        level: log.level,
        message: log.message,
        timestamp: log.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[Status] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
