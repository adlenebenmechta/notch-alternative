import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishPost } from '@/lib/autoPublish';

/**
 * GET /api/autopublish/posts - List all posts
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const posts = await db.post.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        account: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/autopublish/posts - Actions on posts
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'publish' && body.postId) {
      const ok = await publishPost(body.postId);
      return NextResponse.json({ ok, postId: body.postId });
    }

    if (body.action === 'cancel' && body.postId) {
      const post = await db.post.update({
        where: { id: body.postId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ ok: true, post });
    }

    if (body.action === 'retry' && body.postId) {
      const post = await db.post.update({
        where: { id: body.postId },
        data: { status: 'PENDING', errorMessage: null },
      });
      publishPost(body.postId).catch(() => {});
      return NextResponse.json({ ok: true, post });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
