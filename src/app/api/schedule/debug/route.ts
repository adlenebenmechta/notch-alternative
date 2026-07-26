import { NextResponse } from 'next/server';
import { getBlotatoService } from '@/lib/blotato';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/debug — diagnose Blotato connection live.
// Hits the REAL Blotato v2 API at backend.blotato.com and reports the raw response.
export async function GET() {
  const apiKey = process.env.BLOTATO_API_KEY || '';
  const keyPresent = !!apiKey;
  // Strip quotes if present (in case .env wasn't parsed correctly)
  const cleanKey = apiKey.replace(/^"(.*)"$/, '$1');
  const keyPrefix = cleanKey ? `${cleanKey.slice(0, 8)}...${cleanKey.slice(-4)}` : '(not set)';

  const baseInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    keyPresent,
    keyPrefix,
    keyLength: cleanKey.length,
    hasSlash: cleanKey.includes('/'),
    hasEquals: cleanKey.endsWith('='),
    startsWithBlt: cleanKey.startsWith('blt_'),
    baseUrl: 'https://backend.blotato.com/v2',
    authHeader: 'blotato-api-key',
  };

  if (!keyPresent) {
    return NextResponse.json({
      ...baseInfo,
      ok: false,
      step: 'env-check',
      error: 'BLOTATO_API_KEY is not set. The Dockerfile should source .env at startup. If you just pushed, wait ~2 min for the rebuild.',
    });
  }

  const attempts: any[] = [];

  // Attempt 1: GET /v2/users/me/accounts with blotato-api-key header (REAL endpoint)
  try {
    const res = await fetch('https://backend.blotato.com/v2/users/me/accounts', {
      method: 'GET',
      headers: {
        'blotato-api-key': cleanKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 1,
      label: 'GET /v2/users/me/accounts (CORRECT endpoint)',
      method: 'GET',
      url: 'https://backend.blotato.com/v2/users/me/accounts',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 1500),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 1,
      label: 'GET /v2/users/me/accounts (CORRECT endpoint)',
      method: 'GET',
      url: 'https://backend.blotato.com/v2/users/me/accounts',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Attempt 2: GET /v2/posts?limit=5
  try {
    const res = await fetch('https://backend.blotato.com/v2/posts?limit=5', {
      method: 'GET',
      headers: {
        'blotato-api-key': cleanKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 2,
      label: 'GET /v2/posts?limit=5',
      method: 'GET',
      url: 'https://backend.blotato.com/v2/posts?limit=5',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 1500),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 2,
      label: 'GET /v2/posts?limit=5',
      method: 'GET',
      url: 'https://backend.blotato.com/v2/posts?limit=5',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Attempt 3 (legacy, for comparison): the OLD wrong endpoint we used before
  try {
    const res = await fetch('https://api.blotato.com/v1/api/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        'x-access-key': cleanKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ pagination: { limit: 100, cursor: null } }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 3,
      label: 'OLD WRONG endpoint (api.blotato.com — should be unused now)',
      method: 'POST',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 800),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 3,
      label: 'OLD WRONG endpoint (api.blotato.com — should be unused now)',
      method: 'POST',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: 0,
      ok: false,
      error: err.message,
      note: 'NXDOMAIN is expected — api.blotato.com does not exist in DNS. This confirms the old endpoint was wrong.',
    });
  }

  // Try the BlotatoService too (uses the new correct endpoints)
  let serviceResult: any = null;
  try {
    const accounts = await getBlotatoService().getAccounts();
    serviceResult = {
      ok: true,
      count: accounts.length,
      sample: accounts.slice(0, 5).map((a) => ({
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
      oldEndpointFailed: attempts[2]?.ok === false,
      recommendation:
        attempts[0]?.ok && serviceResult?.ok
          ? `✅ Blotato API is working. ${serviceResult.count} account(s) loaded. Schedule Machine should now show your TikTok accounts.`
          : attempts[0]?.status === 401
          ? '❌ API key was rejected by Blotato. Check that the key is valid and not expired.'
          : '❌ Could not reach Blotato API. Check Railway logs for network errors.',
    },
  });
}
