import { NextRequest, NextResponse } from 'next/server';
import { createPost } from '@/lib/autoPublish';

/**
 * POST /api/autopublish/publish - Create and publish a post
 *
 * Body:
 * {
 *   "videoUrl": "https://cdn.example.com/video.mp4",
 *   "thumbnailUrl": "https://...",         // optional
 *   "caption": "Custom caption",            // optional
 *   "hashtags": ["ai", "viral"],            // optional
 *   "musicTitle": "Trending Song",          // optional
 *   "aiDescription": "Description for AI",  // optional
 *   "externalId": "your-id",                // optional
 *   "accountId": "postpeer-id",              // optional
 *   "scheduledAt": "2026-07-01T20:00:00Z",  // optional
 *   "autoCaption": false                    // optional
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    const { post, needsAccount } = await createPost({
      accountId: body.accountId,
      videoUrl: body.videoUrl,
      thumbnailUrl: body.thumbnailUrl,
      caption: body.caption,
      hashtags: body.hashtags,
      musicTitle: body.musicTitle,
      aiDescription: body.aiDescription,
      externalId: body.externalId,
      scheduledAt: body.scheduledAt,
      autoCaption: body.autoCaption,
    });

    if (needsAccount) {
      return NextResponse.json(
        {
          error: 'No TikTok account connected. Go to Auto-Publish → Accounts → Sync.',
          code: 'NO_ACCOUNT',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      postId: post.id,
      status: post.status,
      message: post.status === 'SCHEDULED'
        ? `Post scheduled for ${post.scheduledAt}`
        : 'Post is being published...',
    });
  } catch (err: any) {
    console.error('[AutoPublish Publish] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
