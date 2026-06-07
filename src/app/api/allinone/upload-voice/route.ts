import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file must be under 10MB" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];
    if (!validTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav)$/i)) {
      return NextResponse.json({ error: "Only MP3 and WAV files are supported" }, { status: 400 });
    }

    // Convert to base64
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = audioFile.type || "audio/mpeg";

    console.log(`[Upload Voice] Uploading ${audioFile.name}, size=${(audioFile.size / 1024).toFixed(1)}KB`);

    // Upload to KIE.ai file storage
    const uploadRes = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KIE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: `data:${mimeType};base64,${base64}`,
        path: "voice-references",
      }),
    });

    const uploadData = await uploadRes.json();

    if (uploadData.downloadUrl || uploadData.url) {
      const url = uploadData.downloadUrl || uploadData.url;
      console.log(`[Upload Voice] Success! URL: ${url.slice(0, 100)}...`);
      return NextResponse.json({ url, name: audioFile.name, sizeKB: Math.round(audioFile.size / 1024) });
    }

    console.error("[Upload Voice] Upload failed:", JSON.stringify(uploadData).slice(0, 500));
    return NextResponse.json(
      { error: "Voice upload failed: " + (uploadData.message || JSON.stringify(uploadData).slice(0, 200)) },
      { status: 500 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload Voice] Error:", msg);
    return NextResponse.json({ error: "Voice upload failed: " + msg }, { status: 500 });
  }
}
