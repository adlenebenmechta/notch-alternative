import { NextRequest, NextResponse } from 'next/server';
import { updateSlot, deleteSlot } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PATCH /api/schedule/slots/[id] — update a slot
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const slot = await updateSlot(id, body);
    return NextResponse.json({ slot });
  } catch (err: any) {
    console.error('[API /schedule/slots/[id] PATCH] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/schedule/slots/[id] — delete a slot
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteSlot(id);
    return NextResponse.json({ ok });
  } catch (err: any) {
    console.error('[API /schedule/slots/[id] DELETE] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
