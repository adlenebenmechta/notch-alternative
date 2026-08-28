import { NextRequest, NextResponse } from 'next/server';
import { publishSlotNow } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90; // PostPeer publish may take a while

// POST /api/schedule/slots/[id]/publish
// Immediately publishes the slot's video/images to TikTok via PostPeer
// (bypasses the scheduled time). Used by the "Publish Now" button.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await publishSlotNow(id);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Publish failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tiktokUrl: result.tiktokUrl || null,
    });
  } catch (err: any) {
    console.error('[API /schedule/slots/[id]/publish POST] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
