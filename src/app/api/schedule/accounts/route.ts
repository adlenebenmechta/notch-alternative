import { NextResponse } from 'next/server';
import { getScheduleAccounts } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/accounts — list TikTok accounts connected to Blotato
export async function GET() {
  try {
    const accounts = await getScheduleAccounts();
    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error('[API /schedule/accounts] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch accounts', accounts: [] },
      { status: 200 } // return 200 with empty list so UI can render
    );
  }
}
