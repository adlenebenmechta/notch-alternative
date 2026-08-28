import { NextRequest, NextResponse } from 'next/server';
import { listFolderFiles, extractFolderId } from '@/lib/googleDriveService';

/**
 * POST /api/autopublish/gdrive-list
 * 
 * Preview files in a Google Drive folder before importing
 * Body: { folderUrl: "https://drive.google.com/drive/folders/..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderUrl } = body;

    if (!folderUrl) {
      return NextResponse.json({ error: 'folderUrl is required' }, { status: 400 });
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json({
        error: 'Could not extract folder ID from URL. Make sure it looks like: https://drive.google.com/drive/folders/XXXXX',
      }, { status: 400 });
    }

    const files = await listFolderFiles(folderUrl);

    return NextResponse.json({
      ok: true,
      folderId,
      fileCount: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
      })),
    });
  } catch (err: any) {
    console.error('[GDrive List] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
