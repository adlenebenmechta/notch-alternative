import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!process.env.POSTPEER_API_KEY) {
      return NextResponse.json({ error: 'POSTPEER_API_KEY not set' });
    }

    // Make raw request to see actual response
    const url = 'https://api.postpeer.dev/v1/accounts';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.POSTPEER_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      url,
      dataType: typeof data,
      isArray: Array.isArray(data),
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : null,
      rawResponse: data,
      possibleAccountsLocation: {
        'data.accounts': typeof data === 'object' && data?.accounts ? (Array.isArray(data.accounts) ? `array(${data.accounts.length})` : typeof data.accounts) : 'undefined',
        'data.data': typeof data === 'object' && data?.data ? (Array.isArray(data.data) ? `array(${data.data.length})` : typeof data.data) : 'undefined',
        'data.items': typeof data === 'object' && data?.items ? (Array.isArray(data.items) ? `array(${data.items.length})` : typeof data.items) : 'undefined',
        'data.results': typeof data === 'object' && data?.results ? (Array.isArray(data.results) ? `array(${data.results.length})` : typeof data.results) : 'undefined',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
