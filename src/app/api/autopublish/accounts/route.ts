import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncAccounts } from '@/lib/autoPublish';

/**
 * GET /api/autopublish/accounts - List all TikTok accounts
 */
export async function GET() {
  try {
    const accounts = await db.tikTokAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/autopublish/accounts - Sync accounts from PostPeer
 */
export async function POST() {
  try {
    const count = await syncAccounts();
    const accounts = await db.tikTokAccount.findMany();
    return NextResponse.json({ ok: true, synced: count, accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
