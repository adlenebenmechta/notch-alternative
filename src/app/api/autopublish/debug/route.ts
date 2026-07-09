import { NextResponse } from 'next/server';
import { PostPeerService } from '@/lib/postpeer';

export async function GET() {
  try {
    if (!process.env.POSTPEER_API_KEY) {
      return NextResponse.json({ error: 'POSTPEER_API_KEY not set' });
    }

    const postpeer = new PostPeerService();

    // 1. Verify API key
    const authOk = await postpeer.verifyApiKey();

    // 2. Get integrations (connected accounts)
    const integrations = await postpeer.getIntegrations();

    // 3. Get accounts (mapped format)
    const accounts = await postpeer.getAccounts();

    return NextResponse.json({
      auth: { ok: authOk },
      integrations: {
        total: integrations.length,
        list: integrations,
      },
      accounts: {
        total: accounts.length,
        list: accounts,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
