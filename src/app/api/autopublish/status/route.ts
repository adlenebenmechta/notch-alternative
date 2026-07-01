import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BlotatoService } from '@/lib/blotato';

/**
 * GET /api/autopublish/status?postId=xxx
 * 
 * Returns real-time publish status from Blotato:
 * - "in-progress": Blotato is publishing to TikTok
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

    // If we have a blotatoPostId, fetch real-time status from Blotato
    let blotatoStatus = null;
    if (post.blotatoPostId) {
      try {
        const blotato = new BlotatoService();
        blotatoStatus = await blotato.getPostStatus(post.blotatoPostId);

        // Update DB if status changed
        if (blotatoStatus.status === 'published' && post.status !== 'PUBLISHED') {
          await db.post.update({
            where: { id: postId },
            data: {
              status: 'PUBLISHED',
              publishedAt: new Date(),
              tiktokUrl: blotatoStatus.url || null,
            },
          });
          await db.postLog.create({
            data: {
              postId,
              level: 'INFO',
              message: `Published successfully: ${blotatoStatus.url}`,
            },
          });
        } else if (blotatoStatus.status === 'failed' && post.status !== 'FAILED') {
          await db.post.update({
            where: { id: postId },
            data: {
              status: 'FAILED',
              errorMessage: blotatoStatus.error || 'Blotato reported failure',
            },
          });
          await db.postLog.create({
            data: {
              postId,
              level: 'ERROR',
              message: `Blotato failed: ${blotatoStatus.error}`,
            },
          });
        }
      } catch (err: any) {
        console.warn(`[Status] Failed to fetch Blotato status:`, err.message);
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
        blotatoPostId: post.blotatoPostId,
        account: {
          username: post.account.username,
          displayName: post.account.displayName,
        },
      },
      blotatoStatus: blotatoStatus ? {
        status: blotatoStatus.status,
        url: blotatoStatus.url,
        error: blotatoStatus.error,
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
