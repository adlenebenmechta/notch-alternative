import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";
const KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      model = "nano-banana-pro",
      aspectRatio = "1:1",
      referenceImageUrl,
      negativePrompt,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const aspect = typeof aspectRatio === "string" ? aspectRatio : "1:1";

    // Map aspect ratio to image size for KIE
    const sizeMap: Record<string, string> = {
      "9:16": "768x1344",
      "16:9": "1344x768",
      "1:1": "1024x1024",
    };
    const imageSize = sizeMap[aspect] || "1024x1024";

    // Use KIE API for nano-banana-pro (more reliable than direct fal.ai for this model)
    const imageUrls: string[] = [];
    if (referenceImageUrl) {
      imageUrls.push(referenceImageUrl);
    }

    const submitBody: Record<string, unknown> = {
      model: model === "nano-banana-pro" ? "nano-banana-pro" : model,
      input: {
        prompt: prompt.trim(),
        image_size: imageSize,
        output_format: "png",
        ...(imageUrls.length > 0 ? { image_urls: imageUrls, strength: 0.5 } : {}),
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
    };

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
      // Fallback: try fal.ai directly
      console.warn("KIE submit failed, trying fal.ai fallback...");
      return await falImageFallback(prompt, aspect, referenceImageUrl, negativePrompt);
    }

    const taskId = submitJson.data?.taskId;
    if (!taskId) {
      return await falImageFallback(prompt, aspect, referenceImageUrl, negativePrompt);
    }

    // Poll for result
    for (let i = 0; i < 120; i++) {
      await sleep(3000);
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
            const imageUrl = result?.resultUrls?.[0] || result?.result_url || result?.url;
            if (imageUrl) {
              return NextResponse.json({ imageUrl, status: "completed" });
            }
          }
          if (d?.state === "fail") {
            return NextResponse.json(
              { error: "Image generation failed: " + (d?.failMsg || "unknown error") },
              { status: 500 }
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Image poll ${i}] ${msg}`);
      }
    }

    return NextResponse.json({ error: "Image generation timed out" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Image generation error:", msg);
    return NextResponse.json({ error: "Image generation failed: " + msg }, { status: 500 });
  }
}

async function falImageFallback(
  prompt: string,
  aspectRatio: string,
  referenceImageUrl?: string,
  negativePrompt?: string
): Promise<NextResponse> {
  try {
    const submitBody: Record<string, unknown> = {
      prompt: prompt.trim(),
      image_size: aspectRatio,
      num_images: 1,
    };
    if (referenceImageUrl) submitBody.image_url = referenceImageUrl;
    if (negativePrompt) submitBody.negative_prompt = negativePrompt;

    const submitRes = await fetch("https://queue.fal.run/fal-ai/nano-banana-pro", {
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
        { error: `Image generation failed (${submitRes.status}): ${errText.slice(0, 300)}` },
        { status: 500 }
      );
    }

    const submitJson = await submitRes.json();
    const requestId = submitJson.request_id;

    if (!requestId) {
      const imageUrl = submitJson.images?.[0]?.url || submitJson.image?.url || submitJson.url;
      if (imageUrl) {
        return NextResponse.json({ imageUrl, status: "completed" });
      }
      return NextResponse.json(
        { error: "No request_id from fal.ai", rawResponse: JSON.stringify(submitJson).slice(0, 500) },
        { status: 500 }
      );
    }

    // Poll for result
    const statusUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}/status`;
    const resultUrl = `https://queue.fal.run/fal-ai/nano-banana-pro/requests/${requestId}`;

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

          const imageUrl =
            resultJson.images?.[0]?.url ||
            resultJson.image?.url ||
            resultJson.url ||
            "";

          if (imageUrl) {
            return NextResponse.json({ imageUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "Image completed but no URL found", rawResult: JSON.stringify(resultJson).slice(0, 500) },
            { status: 500 }
          );
        }

        if (statusJson.status === "FAILED") {
          return NextResponse.json(
            { error: "Image generation failed: " + (statusJson.error || "unknown error") },
            { status: 500 }
          );
        }
      } catch (err) {
        console.warn(`[Fal image poll ${i}]`, err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({ error: "Image generation timed out" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Fal.ai fallback failed: " + msg }, { status: 500 });
  }
}
