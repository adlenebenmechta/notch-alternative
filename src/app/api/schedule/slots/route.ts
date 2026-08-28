import { NextRequest, NextResponse } from 'next/server';
import { getSlots, createSlot, createAndPublishSlotNow } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/slots?startDate=...&endDate=...&accountId=...&status=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      status: searchParams.get('status') || undefined,
      planId: searchParams.get('planId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };
    const slots = await getSlots(filter);
    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error('[API /schedule/slots GET] Error:', err);
    return NextResponse.json({ error: err.message, slots: [] }, { status: 500 });
  }
}

// POST /api/schedule/slots — create a new slot
//
// Body params:
//   - standard CreateSlotInput fields (accountId, scheduledAt, videoUrl, etc.)
//   - publishNow?: boolean  ← when true, the slot is created AND immediately
//     published to TikTok via PostPeer (bypassing scheduledAt). Used by the
//     "Post Immediately" button in the Schedule Machine header.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── "Post Immediately" branch ─────────────────────────────────────────
    // If the caller sets publishNow: true, route to createAndPublishSlotNow
    // which creates the slot AND pushes it to PostPeer immediately (no
    // scheduledAt → PostPeer sets publishNow: true internally). The slot is
    // marked 'published' on success, 'failed' on error.
    if (body?.publishNow === true) {
      const result = await createAndPublishSlotNow({
        accountId: body.accountId,
        accountLabel: body.accountLabel,
        videoUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl,
        imageUrls: body.imageUrls,
        caption: body.caption,
        hashtags: body.hashtags,
        musicTitle: body.musicTitle,
        sourceVideoId: body.sourceVideoId,
        source: body.source,
        planId: body.planId,
      });

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error || 'Publish failed', slotId: result.slotId },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        slotId: result.slotId,
        tiktokUrl: result.tiktokUrl || null,
      });
    }

    // ── Standard scheduled-slot branch ────────────────────────────────────
    const slot = await createSlot(body);
    return NextResponse.json({ slot });
  } catch (err: any) {
    console.error('[API /schedule/slots POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
