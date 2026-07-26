import { NextResponse } from 'next/server';
import { getScheduleAccounts } from '@/lib/scheduleService';
import { PostPeerService } from '@/lib/postpeer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/accounts — list TikTok accounts connected to PostPeer
// Always returns 200 with a structured body so the UI can render diagnostics.
export async function GET() {
  const rawKey = process.env.POSTPEER_API_KEY || '';
  // Strip surrounding quotes if present (in case .env sourcing didn't strip them)
  const apiKey = rawKey.replace(/^"(.*)"$/, '$1');
  const keyPresent = !!apiKey;
  const keyPrefix = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-2)}` : '(not set)';

  // 1) If the key isn't set at all, surface that clearly
  if (!keyPresent) {
    return NextResponse.json({
      accounts: [],
      ok: false,
      error: 'POSTPEER_API_KEY environment variable is not set on the server. The .env file should be loaded at container startup. If you just deployed, wait ~2 min for the rebuild to finish.',
      diagnostics: {
        keyPresent: false,
        keyPrefix,
        nodeEnv: process.env.NODE_ENV,
        provider: 'postpeer',
      },
    });
  }

  // 2) Try to fetch accounts; surface the real error
  try {
    const accounts = await getScheduleAccounts();
    return NextResponse.json({
      accounts,
      ok: true,
      count: accounts.length,
      diagnostics: {
        keyPresent: true,
        keyPrefix,
        nodeEnv: process.env.NODE_ENV,
        provider: 'postpeer',
        baseUrl: 'https://api.postpeer.dev/v1',
      },
    });
  } catch (err: any) {
    console.error('[API /schedule/accounts] Error:', err);
    return NextResponse.json({
      accounts: [],
      ok: false,
      error: err.message || 'Failed to fetch accounts from PostPeer',
      diagnostics: {
        keyPresent: true,
        keyPrefix,
        nodeEnv: process.env.NODE_ENV,
        provider: 'postpeer',
        errorMessage: err.message,
      },
    });
  }
}
