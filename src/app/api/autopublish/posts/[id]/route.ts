import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishPost, updatePostAnalytics } from '@/lib/autoPublish';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const post = await db.post.findUnique({
      where: { id },
      include: {
        account: true,
        logs: { orderBy: { createdAt: 'desc' } },
        analytics: { orderBy: { recordedAt: 'desc' } },
      },
    });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    if (body.action === 'publish') {
      const ok = await publishPost(id);
      return NextResponse.json({ ok });
    }

    if (body.action === 'refreshAnalytics') {
      await updatePostAnalytics(id);
      const post = await db.post.findUnique({ where: { id } });
      return NextResponse.json({ ok: true, post });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
