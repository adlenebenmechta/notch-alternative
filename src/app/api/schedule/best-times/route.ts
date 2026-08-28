import { NextRequest, NextResponse } from 'next/server';
import { getBestTimeRecommendations } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/best-times?days=7&timezone=UTC
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');
    const timezone = searchParams.get('timezone') || 'UTC';

    const recommendations = getBestTimeRecommendations(days, timezone);
    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error('[API /schedule/best-times] Error:', err);
    return NextResponse.json({ error: err.message, recommendations: [] }, { status: 500 });
  }
}
