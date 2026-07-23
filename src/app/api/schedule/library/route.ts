import { NextRequest, NextResponse } from 'next/server';
import { loadVideosFromStorage } from '@/lib/video-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/library?userEmail=... — get user's video library
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required', videos: [] }, { status: 400 });
    }

    const videos = await loadVideosFromStorage(userEmail);
    return NextResponse.json({ videos });
  } catch (err: any) {
    console.error('[API /schedule/library] Error:', err);
    return NextResponse.json({ error: err.message, videos: [] }, { status: 500 });
  }
}
