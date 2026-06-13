import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEFAULT_KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";

const MAX_UPLOAD_RETRIES = 3;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const avatarFile = formData.get("avatar") as File | null;
    const kieApiKey = (formData.get("kieApiKey") as string | null) || DEFAULT_KIE_KEY;

    if (!avatarFile) {
      return NextResponse.json({ success: false, error: "No avatar file provided" }, { status: 400 });
    }

    if (avatarFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Image must be under 10MB" }, { status: 400 });
    }

    // Convert file to base64 directly (no sharp dependency needed)
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = avatarFile.type || "image/jpeg";

    // Determine file extension from mime type
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const fileName = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    console.log(`[Upload Avatar] Uploading ${fileName}, size=${(avatarFile.size / 1024).toFixed(1)}KB, type=${mimeType}`);

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
        console.warn(`[Upload Avatar] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`[Upload Avatar] Attempt ${attempt} fetch error: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    if (!json?.success) {
      console.error(`[Upload Avatar] All ${MAX_UPLOAD_RETRIES} attempts failed: ${lastError}`);
      return NextResponse.json({ success: false, error: `Image upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${lastError || "unknown"}` }, { status: 500 });
    }

    const downloadUrl = json.data?.downloadUrl;
    if (!downloadUrl) {
      return NextResponse.json({ success: false, error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    console.log(`[Upload Avatar] Success! URL: ${downloadUrl.slice(0, 100)}...`);
    return NextResponse.json({
      success: true,
      avatarUrl: downloadUrl,
      sizeKB: Math.round(buffer.length / 1024),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload Avatar] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
