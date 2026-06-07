import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const voice = voiceId || "Alice";

    // Use Fal.ai TTS model
    const submitRes = await fetch("https://queue.fal.run/fal-ai/tts", {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim(),
        voice: voice,
        audio_format: "mp3",
      }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return NextResponse.json(
        { error: `TTS submit failed (${submitRes.status}): ${errText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const submitJson = await submitRes.json();

    // Check for direct result
    if (submitJson.audio?.url) {
      return NextResponse.json({ audioUrl: submitJson.audio.url, status: "completed" });
    }
    if (typeof submitJson.url === "string") {
      return NextResponse.json({ audioUrl: submitJson.url, status: "completed" });
    }

    // Poll for result
    const requestId = submitJson.request_id;
    if (!requestId) {
      return NextResponse.json(
        { error: "No request_id from TTS API", rawResponse: JSON.stringify(submitJson).slice(0, 500) },
        { status: 500 }
      );
    }

    const statusUrl = `https://queue.fal.run/fal-ai/tts/requests/${requestId}/status`;
    const resultUrl = `https://queue.fal.run/fal-ai/tts/requests/${requestId}`;

    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      try {
        const statusRes = await fetch(statusUrl, {
          headers: { Authorization: `Key ${FAL_KEY}` },
        });
        const statusJson = await statusRes.json();

        if (statusJson.status === "COMPLETED") {
          const resultRes = await fetch(resultUrl, {
            headers: { Authorization: `Key ${FAL_KEY}` },
          });
          const resultJson = await resultRes.json();

          const audioUrl =
            resultJson.audio?.url ||
            resultJson.url ||
            "";

          if (audioUrl) {
            return NextResponse.json({ audioUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "TTS completed but no audio URL found", rawResult: JSON.stringify(resultJson).slice(0, 500) },
            { status: 500 }
          );
        }

        if (statusJson.status === "FAILED") {
          return NextResponse.json(
            { error: "TTS generation failed: " + (statusJson.error || "unknown error") },
            { status: 500 }
          );
        }
      } catch (err) {
        console.warn(`[TTS poll ${i}]`, err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({ error: "TTS generation timed out" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Voiceover error:", msg);
    return NextResponse.json({ error: "Voiceover generation failed: " + msg }, { status: 500 });
  }
}
