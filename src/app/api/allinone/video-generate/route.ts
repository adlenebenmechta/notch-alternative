import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      model = "kling3.0",
      duration = 5,
      aspectRatio = "16:9",
      imageUrl,
      muteAudio = false,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const dur = typeof duration === "number" ? duration : 5;
    const aspect = typeof aspectRatio === "string" ? aspectRatio : "16:9";

    // Choose endpoint based on whether we have a reference image
    const endpoint = imageUrl
      ? "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video"
      : "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";

    // Submit job
    const submitBody: Record<string, unknown> = {
      prompt: prompt.trim(),
      duration: `${dur}s`,
      aspect_ratio: aspect,
    };

    if (imageUrl) {
      submitBody.image_url = imageUrl;
    }

    const submitRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submitBody),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return NextResponse.json(
        { error: `Video submit failed (${submitRes.status}): ${errText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const submitJson = await submitRes.json();
    const requestId = submitJson.request_id;

    if (!requestId) {
      // Maybe it returned a direct result
      const videoUrl = submitJson.video?.url || submitJson.url;
      if (videoUrl) {
        return NextResponse.json({ videoUrl, status: "completed" });
      }
      return NextResponse.json(
        { error: "No request_id returned from Fal.ai", rawResponse: JSON.stringify(submitJson).slice(0, 500) },
        { status: 500 }
      );
    }

    // Poll for result
    const statusUrl = `https://queue.fal.run/fal-ai/kling-video/v1/standard/requests/${requestId}/status`;
    const resultUrl = `https://queue.fal.run/fal-ai/kling-video/v1/standard/requests/${requestId}`;

    for (let i = 0; i < 120; i++) {
      await sleep(5000);

      try {
        const statusRes = await fetch(statusUrl, {
          headers: { Authorization: `Key ${FAL_KEY}` },
        });
        const statusJson = await statusRes.json();

        if (statusJson.status === "COMPLETED") {
          // Fetch the result
          const resultRes = await fetch(resultUrl, {
            headers: { Authorization: `Key ${FAL_KEY}` },
          });
          const resultJson = await resultRes.json();

          const videoUrl =
            resultJson.video?.url ||
            resultJson.url ||
            (Array.isArray(resultJson.videos) && resultJson.videos[0]?.url) ||
            "";

          if (videoUrl) {
            return NextResponse.json({ videoUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "Video completed but no URL found", rawResult: JSON.stringify(resultJson).slice(0, 500) },
            { status: 500 }
          );
        }

        if (statusJson.status === "FAILED") {
          return NextResponse.json(
            { error: "Video generation failed: " + (statusJson.error || "unknown error") },
            { status: 500 }
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Video poll ${i}] ${msg}`);
      }
    }

    return NextResponse.json({ error: "Video generation timed out after 10 minutes" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Video generation error:", msg);
    return NextResponse.json({ error: "Video generation failed: " + msg }, { status: 500 });
  }
}
