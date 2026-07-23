import { NextResponse } from 'next/server';
import { syncSlotStatuses } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/schedule/sync — sync scheduled slot statuses from Blotato
export async function POST() {
  try {
    const result = await syncSlotStatuses();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /schedule/sync] Error:', err);
    return NextResponse.json({ error: err.message, checked: 0, published: 0 }, { status: 500 });
  }
}
