import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { publishPost, updatePostAnalytics } from '@/lib/autoPublish';
import { PostPeerService } from '@/lib/postpeer';

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
    // Get the post first to check if it has a blotatoPostId (PostPeer submission ID)
    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If the post has a PostPeer ID and is NOT yet published, try to delete from PostPeer
    // (Published posts usually can't be deleted from TikTok via API)
    if (post.blotatoPostId && post.status !== 'PUBLISHED') {
      try {
        const postpeer = new PostPeerService();
        await postpeer.deletePost(post.blotatoPostId);
        console.log(`[DELETE] Deleted post ${id} from PostPeer`);
      } catch (err: any) {
        console.warn(`[DELETE] Failed to delete from PostPeer: ${err.message}`);
        // Continue to delete from DB anyway
      }
    }

    // Delete from database
    await db.post.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: 'Post deleted' });
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
