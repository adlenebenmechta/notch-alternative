import { NextRequest, NextResponse } from 'next/server';
import { getConversations, createConversation } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const conversations = await getConversations(30);
    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error('[API /schedule/conversations GET] Error:', err);
    return NextResponse.json({ error: err.message, conversations: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conv = await createConversation(body.title, body.userId);
    return NextResponse.json({ conversation: conv });
  } catch (err: any) {
    console.error('[API /schedule/conversations POST] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
