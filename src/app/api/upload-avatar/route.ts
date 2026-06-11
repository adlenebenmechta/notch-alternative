import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 60;

const DEFAULT_KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";

async function compressAvatar(buffer: Buffer): Promise<Buffer> {
  const img = sharp(buffer);
  const metadata = await img.metadata();
  const maxDim = 1024; // Higher resolution for better quality
  const ratio = Math.min(maxDim / (metadata.width || 1), maxDim / (metadata.height || 1), 1);

  if (ratio < 1) {
    return img
      .resize(Math.round((metadata.width || 1) * ratio), Math.round((metadata.height || 1) * ratio))
      .jpeg({ quality: 92 }) // High quality
      .toBuffer();
  }
  return img.jpeg({ quality: 92 }).toBuffer();
}

const MAX_UPLOAD_RETRIES = 3;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const avatarFile = formData.get("avatar") as File | null;
    const kieApiKey = (formData.get("kieApiKey") as string | null) || DEFAULT_KIE_KEY;

    if (!avatarFile) {
      return NextResponse.json({ success: false, error: "No avatar file provided" }, { status: 400 });
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Avatar must be under 5MB" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await avatarFile.arrayBuffer());
    const compressed = await compressAvatar(rawBuffer);
    const base64 = compressed.toString("base64");

    const fileName = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

    // Retry upload to KIE AI — their API sometimes returns 500 under load
    let json: any = null;
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        const uploadRes = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${kieApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64Data: base64, fileName, uploadPath: "images" }),
        });

        json = await uploadRes.json();
        if (json.success && json.data?.downloadUrl) {
          break; // Success — exit retry loop
        }

        lastError = json.msg || json.error || `HTTP ${uploadRes.status}`;
        if (attempt < MAX_UPLOAD_RETRIES) {
          // Wait before retry: 1s, 2s, ...
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        if (attempt < MAX_UPLOAD_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    if (!json?.success) {
      return NextResponse.json({ success: false, error: `Image upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${lastError || "unknown"}` }, { status: 500 });
    }

    const downloadUrl = json.data?.downloadUrl;
    if (!downloadUrl) {
      return NextResponse.json({ success: false, error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatarUrl: downloadUrl,
      sizeKB: Math.round(compressed.length / 1024),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
