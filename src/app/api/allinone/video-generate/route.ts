import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";
const KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Aspect ratio to image_size mapping for KIE API
const ASPECT_SIZE_MAP: Record<string, string> = {
  "16:9": "1344x768",
  "9:16": "768x1344",
  "1:1": "1024x1024",
};

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
      seed,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const dur = typeof duration === "number" ? duration : 5;
    const aspect = typeof aspectRatio === "string" ? aspectRatio : "16:9";

    // Route to appropriate API based on model
    if (model === "veo3_lite" || model === "veo3_fast" || model === "seedance") {
      return await generateViaKIE(prompt, model, dur, aspect, imageUrl, seed);
    }

    // Default: kling3.0 via fal.ai
    return await generateViaFal(prompt, dur, aspect, imageUrl, muteAudio);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Video generation error:", msg);
    return NextResponse.json({ error: "Video generation failed: " + msg }, { status: 500 });
  }
}

// ─── KIE.ai API (Veo3 Lite, Veo3 Fast, Seedance) ─────────────────────────

async function generateViaKIE(
  prompt: string,
  model: string,
  duration: number,
  aspectRatio: string,
  imageUrl?: string,
  seed?: number,
): Promise<NextResponse> {
  const imageSize = ASPECT_SIZE_MAP[aspectRatio] || "1344x768";

  const inputBody: Record<string, unknown> = {
    prompt: prompt.trim(),
    image_size: imageSize,
    duration: `${duration}s`,
  };

  if (imageUrl) {
    inputBody.image_url = imageUrl;
  }

  if (seed) {
    inputBody.seed = seed;
  }

  const submitBody = {
    model,
    input: inputBody,
  };

  console.log(`[KIE Video] Submitting ${model} job...`);

  const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submitBody),
  });

  const submitJson = await submitRes.json();

  if (submitJson.code !== 200) {
    console.error("[KIE Video] Submit failed:", JSON.stringify(submitJson).slice(0, 500));
    return NextResponse.json(
      { error: `KIE submit failed: ${submitJson.msg || JSON.stringify(submitJson).slice(0, 200)}` },
      { status: 500 }
    );
  }

  const taskId = submitJson.data?.taskId;
  if (!taskId) {
    return NextResponse.json(
      { error: "No taskId returned from KIE API", rawResponse: JSON.stringify(submitJson).slice(0, 500) },
      { status: 500 }
    );
  }

  console.log(`[KIE Video] Task ID: ${taskId}, polling for result...`);

  // Poll for result
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    try {
      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${KIE_KEY}` },
      });
      const pollJson = await pollRes.json();

      if (pollJson.code === 200) {
        const d = pollJson.data;
        if (d?.state === "success") {
          let result;
          if (typeof d.resultJson === "string") {
            try { result = JSON.parse(d.resultJson); } catch { result = d.resultJson; }
          } else {
            result = d.resultJson;
          }
          const videoUrl =
            result?.resultUrls?.[0] ||
            result?.result_url ||
            result?.url ||
            result?.video?.url ||
            "";
          if (videoUrl) {
            console.log(`[KIE Video] Success! URL: ${videoUrl.slice(0, 100)}...`);
            return NextResponse.json({ videoUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "Video completed but no URL found", rawResult: JSON.stringify(result).slice(0, 500) },
            { status: 500 }
          );
        }
        if (d?.state === "fail") {
          console.error("[KIE Video] Task failed:", d?.failMsg);
          return NextResponse.json(
            { error: "Video generation failed: " + (d?.failMsg || "unknown error") },
            { status: 500 }
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[KIE Video poll ${i}] ${msg}`);
    }
  }

  return NextResponse.json({ error: "Video generation timed out after 10 minutes" }, { status: 500 });
}

// ─── fal.ai API (Kling 3.0) ───────────────────────────────────────────────

async function generateViaFal(
  prompt: string,
  duration: number,
  aspectRatio: string,
  imageUrl?: string,
  muteAudio?: boolean,
): Promise<NextResponse> {
  // Choose endpoint based on whether we have a reference image
  const endpoint = imageUrl
    ? "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video"
    : "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";

  // Submit job
  const submitBody: Record<string, unknown> = {
    prompt: prompt.trim(),
    duration: `${duration}s`,
    aspect_ratio: aspectRatio,
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
      console.warn(`[Fal Video poll ${i}] ${msg}`);
    }
  }

  return NextResponse.json({ error: "Video generation timed out after 10 minutes" }, { status: 500 });
}
