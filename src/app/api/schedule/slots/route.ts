import { NextRequest, NextResponse } from 'next/server';
import { getSlots, createSlot } from '@/lib/scheduleService';

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slot = await createSlot(body);
    return NextResponse.json({ slot });
  } catch (err: any) {
    console.error('[API /schedule/slots POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
