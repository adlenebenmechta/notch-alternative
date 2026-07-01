import { NextRequest, NextResponse } from 'next/server';
import { createCarouselPost } from '@/lib/autoPublish';

/**
 * POST /api/autopublish/publish-carousel
 *
 * Publish a TikTok photo carousel post (multiple images = swipeable carousel)
 * Used by the AI Viral Carousel Machine to publish each slide (2 images: problem + solution)
 *
 * Body:
 * {
 *   "imageUrls": ["https://.../problem.jpg", "https://.../solution.jpg"],
 *   "caption": "Check this out! 🔥",         // optional
 *   "hashtags": ["fyp", "viral", "carousel"], // optional
 *   "musicTitle": "Trending Song",            // optional
 *   "aiDescription": "Description for AI",    // optional (used if autoCaption=true)
 *   "externalId": "carousel_123_slide_1",     // optional (for tracking)
 *   "accountId": "blotato_account_id",        // optional
 *   "scheduledAt": "2026-07-01T20:00:00Z",    // optional
 *   "autoCaption": false                       // optional (generate caption with AI)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.imageUrls || !Array.isArray(body.imageUrls) || body.imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'imageUrls is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate URLs
    for (const url of body.imageUrls) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          { error: `Invalid image URL: ${url}` },
          { status: 400 }
        );
      }
    }

    const { post, needsAccount } = await createCarouselPost({
      accountId: body.accountId,
      imageUrls: body.imageUrls,
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
      imageCount: body.imageUrls.length,
      message: post.status === 'SCHEDULED'
        ? `Carousel post scheduled for ${post.scheduledAt}`
        : `Carousel post with ${body.imageUrls.length} image(s) is being published...`,
    });
  } catch (err: any) {
    console.error('[AutoPublish Carousel] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
