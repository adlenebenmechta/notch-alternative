import { NextRequest, NextResponse } from 'next/server';

// Upload a video file to kie.ai hosting and return a public URL.
// Used by Schedule Machine to fill "open" slots with user-uploaded videos.
// Same hosting service as /api/upload-product-image — kieai.redpandaai.co.

export const maxDuration = 120; // videos can be larger; allow up to 2 min
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_KIE_KEY = process.env.KIE_KEY || process.env.KIE_API_KEY || '';
const MAX_UPLOAD_RETRIES = 3;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File | null;
    const kieApiKey = (formData.get('kieApiKey') as string | null) || DEFAULT_KIE_KEY;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video (MP4, MOV, etc.)' }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: `Video too large (max ${MAX_VIDEO_SIZE / 1024 / 1024}MB)` }, { status: 400 });
    }

    if (!kieApiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY not configured on server' }, { status: 500 });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Determine extension from mime type
    const mimeType = file.type || 'video/mp4';
    let ext = 'mp4';
    if (mimeType.includes('quicktime')) ext = 'mov';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('avi')) ext = 'avi';
    else if (mimeType.includes('x-matroska')) ext = 'mkv';

    const fileName = `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    console.log(`[Upload Video] Uploading ${fileName}, size=${(file.size / 1024 / 1024).toFixed(1)}MB, type=${mimeType}`);

    // Upload to kie.ai file hosting — retry up to 3 times
    let json: Record<string, unknown> | null = null;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        const uploadRes = await fetch('https://kieai.redpandaai.co/api/file-base64-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ base64Data: base64, fileName, uploadPath: 'videos' }),
        });

        json = await uploadRes.json() as Record<string, unknown>;
        const data = json.data as Record<string, unknown> | undefined;

        if (json.success && data?.downloadUrl) {
          break;
        }

        lastError = (json.msg as string) || (json.error as string) || `HTTP ${uploadRes.status}`;
        console.warn(`[Upload Video] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) await new Promise(r => setTimeout(r, attempt * 1500));
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`[Upload Video] Attempt ${attempt} fetch error: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) await new Promise(r => setTimeout(r, attempt * 1500));
      }
    }

    if (!json?.success) {
      console.error(`[Upload Video] All ${MAX_UPLOAD_RETRIES} attempts failed: ${lastError}`);
      return NextResponse.json(
        { error: `Video upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${lastError || 'unknown'}` },
        { status: 500 }
      );
    }

    const data = json.data as Record<string, unknown>;
    const downloadUrl = data?.downloadUrl as string;
    if (!downloadUrl) {
      return NextResponse.json({ error: 'Upload succeeded but no URL returned' }, { status: 500 });
    }

    console.log(`[Upload Video] Success! URL: ${downloadUrl.slice(0, 100)}...`);

    // Derive a friendly title from the original filename
    const originalName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const friendlyTitle = originalName || `Uploaded video ${new Date().toLocaleString()}`;

    return NextResponse.json({
      success: true,
      videoUrl: downloadUrl,
      title: friendlyTitle,
      fileName: file.name,
      sizeMB: Math.round(buffer.length / 1024 / 1024 * 10) / 10,
      mimeType,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload Video] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
