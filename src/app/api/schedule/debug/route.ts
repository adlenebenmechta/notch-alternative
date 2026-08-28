import { NextResponse } from 'next/server';
import { PostPeerService } from '@/lib/postpeer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/debug — diagnose PostPeer connection live.
// Hits the REAL PostPeer v1 API at api.postpeer.dev and reports the raw response.
export async function GET() {
  const rawKey = process.env.POSTPEER_API_KEY || '';
  // Strip surrounding quotes if present
  const apiKey = rawKey.replace(/^"(.*)"$/, '$1');
  const keyPresent = !!apiKey;
  const keyPrefix = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-2)}` : '(not set)';

  const baseInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    provider: 'postpeer',
    keyPresent,
    keyPrefix,
    keyLength: apiKey.length,
    baseUrl: 'https://api.postpeer.dev/v1',
    authHeader: 'x-access-key',
  };

  if (!keyPresent) {
    return NextResponse.json({
      ...baseInfo,
      ok: false,
      step: 'env-check',
      error: 'POSTPEER_API_KEY is not set. The Dockerfile should source .env at startup. If you just pushed, wait ~2 min for the rebuild.',
    });
  }

  const attempts: any[] = [];

  // Attempt 1: GET /v1/health/auth (verify key)
  try {
    const res = await fetch('https://api.postpeer.dev/v1/health/auth', {
      method: 'GET',
      headers: {
        'x-access-key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 1,
      label: 'GET /v1/health/auth (verify key)',
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/health/auth',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 800),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 1,
      label: 'GET /v1/health/auth (verify key)',
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/health/auth',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Attempt 2: GET /v1/connect/integrations (list accounts)
  try {
    const res = await fetch('https://api.postpeer.dev/v1/connect/integrations', {
      method: 'GET',
      headers: {
        'x-access-key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 2,
      label: 'GET /v1/connect/integrations (list accounts)',
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/connect/integrations',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 2000),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 2,
      label: 'GET /v1/connect/integrations (list accounts)',
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/connect/integrations',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Try the PostPeerService too (uses the proper client)
  let serviceResult: any = null;
  try {
    const postpeer = new PostPeerService();
    const accounts = await postpeer.getTikTokAccounts();
    serviceResult = {
      ok: true,
      count: accounts.length,
      sample: accounts.slice(0, 10).map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        displayName: a.displayName,
      })),
    };
  } catch (err: any) {
    serviceResult = { ok: false, error: err.message };
  }

  return NextResponse.json({
    ...baseInfo,
    attempts,
    serviceResult,
    ok: attempts.some((a) => a.ok) || serviceResult?.ok,
    summary: {
      realApiWorks: attempts[0]?.ok === true,
      accountsLoaded: serviceResult?.ok === true ? serviceResult.count : null,
      recommendation:
        attempts[0]?.ok && serviceResult?.ok
          ? `✅ PostPeer API is working. ${serviceResult.count} TikTok account(s) loaded. Schedule Machine should now show your accounts.`
          : attempts[0]?.status === 403
          ? '❌ API key was rejected by PostPeer. Check that the key is valid.'
          : '❌ Could not reach PostPeer API. Check Railway logs for network errors.',
    },
  });
}
