import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { importFromGoogleDrive } from '@/lib/googleDriveService';

/**
 * POST /api/autopublish/gdrive-import
 * 
 * Import videos from a Google Drive folder into the library
 * and optionally auto-publish them to TikTok
 * 
 * Body: {
 *   folderUrl: "https://drive.google.com/drive/folders/...",
 *   autoPublish: true/false,
 *   publishMode: "now" | "schedule" | "bulk",
 *   accountId: "blotato_account_id" (optional)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { folderUrl, autoPublish, publishMode, accountId } = body;

    if (!folderUrl) {
      return NextResponse.json({ error: 'folderUrl is required' }, { status: 400 });
    }

    // Resolve user ID
    let dbUserId: string | null = null;
    try {
      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
      dbUserId = dbUser?.id || user.id;
    } catch {
      dbUserId = user.id;
    }

    // Import from Google Drive
    const result = await importFromGoogleDrive(folderUrl, dbUserId!, {
      autoPublish: autoPublish || false,
      publishMode: publishMode || 'now',
      accountId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[GDrive Import] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
