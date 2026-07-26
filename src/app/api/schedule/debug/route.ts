import { NextResponse } from 'next/server';
import { getBlotatoService } from '@/lib/blotato';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/debug — diagnose Blotato connection live.
// Returns the env state, attempts to call Blotato, and reports the raw response.
export async function GET() {
  const apiKey = process.env.BLOTATO_API_KEY || '';
  const keyPresent = !!apiKey;
  const keyPrefix = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '(not set)';

  const baseInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    keyPresent,
    keyPrefix,
    keyLength: apiKey.length,
    hasSlash: apiKey.includes('/'),
    hasEquals: apiKey.endsWith('='),
  };

  if (!keyPresent) {
    return NextResponse.json({
      ...baseInfo,
      ok: false,
      step: 'env-check',
      error: 'BLOTATO_API_KEY is not set. If running on Railway, the Dockerfile should source .env at startup. If you just pushed, wait ~2 min for the rebuild.',
    });
  }

  // Try calling Blotato directly with raw fetch, so we can see the exact response
  const blotato = getBlotatoService();
  const attempts: any[] = [];

  // Attempt 1: POST /accounts (newer Blotato API)
  try {
    const res = await fetch('https://api.blotato.com/v1/api/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'x-access-key': apiKey,
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
      attempt: 1,
      method: 'POST',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 800),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 1,
      method: 'POST',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Attempt 2: GET /accounts (fallback)
  try {
    const res = await fetch('https://api.blotato.com/v1/api/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
      method: 'GET',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 800),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 2,
      method: 'GET',
      url: 'https://api.blotato.com/v1/api/accounts',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Attempt 3: Legacy PostPeer base URL
  try {
    const res = await fetch('https://api.postpeer.dev/v1/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'x-access-key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
    attempts.push({
      attempt: 3,
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/accounts',
      status: res.status,
      ok: res.ok,
      dataPreview: JSON.stringify(data).slice(0, 800),
    });
  } catch (err: any) {
    attempts.push({
      attempt: 3,
      method: 'GET',
      url: 'https://api.postpeer.dev/v1/accounts',
      status: 0,
      ok: false,
      error: err.message,
    });
  }

  // Try the BlotatoService too (which has its own logic)
  let serviceResult: any = null;
  try {
    const accounts = await blotato.getAccounts();
    serviceResult = { ok: true, count: accounts.length, sample: accounts.slice(0, 3) };
  } catch (err: any) {
    serviceResult = { ok: false, error: err.message };
  }

  return NextResponse.json({
    ...baseInfo,
    attempts,
    serviceResult,
    ok: attempts.some(a => a.ok) || serviceResult?.ok,
  });
}
