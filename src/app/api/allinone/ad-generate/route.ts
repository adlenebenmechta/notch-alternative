import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";
const DEFAULT_KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";
const DEFAULT_ATLAS_KEY = process.env.ATLAS_KEY || "apikey-6dd210593293428fa38064aa6d655b03";
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
      format = "blank",
      model = "seedance",
      duration = 8,
      aspectRatio = "9:16",
      resolution = "720p",
      productImageUrl,
      avatarImageUrl,
      selectedVoice,
      voiceAudioUrl,
      referenceImageUrls,
      kieApiKey,
      atlasApiKey,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const dur = typeof duration === "number" ? duration : 8;
    const aspect = typeof aspectRatio === "string" ? aspectRatio : "9:16";

    // Build enhanced prompt based on format
    let enhancedPrompt = prompt.trim();

    // If format is not blank, the format prefix is already in the prompt from the frontend
    // Add voice style to prompt if selected
    if (selectedVoice) {
      enhancedPrompt += `\n\nVoice style: ${selectedVoice}. Speak naturally with the specified voice character.`;
    }

    // Build the image URLs array for reference images
    const imageUrls: string[] = [];
    if (productImageUrl) {
      imageUrls.push(productImageUrl);
      enhancedPrompt += "\n\n[Product reference image is provided - incorporate the product shown in the image into the ad video.]";
    }
    if (avatarImageUrl) {
      imageUrls.push(avatarImageUrl);
      enhancedPrompt += "\n\n[Creator/Avatar reference image is provided - the person in the video should resemble this avatar.]";
    }
    if (Array.isArray(referenceImageUrls)) {
      for (const refUrl of referenceImageUrls) {
        if (typeof refUrl === "string" && refUrl.startsWith("http")) {
          imageUrls.push(refUrl);
          enhancedPrompt += "\n\n[Additional reference image provided for visual context.]";
        }
      }
    }

    // ─── Route to Atlas Cloud API for seedance_fast_atlas ─────────────
    const ATLAS_MODEL_MAP: Record<string, string> = {
      "seedance_fast_atlas": "bytedance/seedance-2.0-fast",
      "seedance_atlas": "bytedance/seedance-2.0",
    };
    const atlasModel = ATLAS_MODEL_MAP[model];
    if (atlasModel) {
      const effectiveAtlasKey = (typeof atlasApiKey === "string" && atlasApiKey.length > 10) ? atlasApiKey : DEFAULT_ATLAS_KEY;
      return await generateAdViaAtlas(enhancedPrompt, atlasModel, model, dur, aspect, resolution, imageUrls, voiceAudioUrl, effectiveAtlasKey);
    }

    // Use user-provided KIE API key if available, otherwise fall back to default
    const effectiveKieKey = (typeof kieApiKey === "string" && kieApiKey.length > 10) ? kieApiKey : DEFAULT_KIE_KEY;

    // Map frontend model names to correct KIE API model names
    const KIE_MODEL_MAP: Record<string, string> = {
      "seedance": "bytedance/seedance-2",
      "seedance_fast": "bytedance/seedance-2-fast",
      "veo3_lite": "veo3_lite",
      "veo3_fast": "veo3_fast",
      "grok_imagine": "bytedance/seedance-2",
    };
    const kieModel = KIE_MODEL_MAP[model];

    // Route to appropriate API based on model
    if (kieModel) {
      return await generateAdViaKIE(enhancedPrompt, kieModel, model, dur, aspect, imageUrls, voiceAudioUrl, effectiveKieKey);
    }

    // Default: kling3.0 via fal.ai
    return await generateAdViaFal(enhancedPrompt, dur, aspect, imageUrls);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Ad Generate] Error:", msg);
    return NextResponse.json({ error: "Ad generation failed: " + msg }, { status: 500 });
  }
}

// ─── Atlas Cloud API (Seedance 2.0 / Seedance 2.0 Fast) ──────────────

async function generateAdViaAtlas(
  prompt: string,
  atlasModelName: string,
  originalModel: string,
  duration: number,
  aspectRatio: string,
  resolution: string,
  imageUrls: string[] = [],
  voiceAudioUrl?: string,
  atlasKey?: string,
): Promise<NextResponse> {
  const effectiveKey = atlasKey || DEFAULT_ATLAS_KEY;
  const isFast = atlasModelName.includes("fast");

  // Choose the appropriate Atlas sub-model based on whether we have images
  let subModel: string;
  if (imageUrls.length > 0 || voiceAudioUrl) {
    // If we have reference images or audio, use reference-to-video
    subModel = `${atlasModelName}/reference-to-video`;
  } else {
    // Text-only: use text-to-video
    subModel = `${atlasModelName}/text-to-video`;
  }

  // Build the request body
  const data: Record<string, unknown> = {
    model: subModel,
    prompt: prompt.trim(),
    duration: duration,
    resolution: resolution || "720p",
    ratio: aspectRatio,
    watermark: false,
    return_last_frame: false,
    generate_audio: false,
  };

  // Add reference images if available
  if (imageUrls.length > 0) {
    if (subModel.includes("reference-to-video")) {
      // reference-to-video uses reference_images array
      data.reference_images = imageUrls;
    } else if (subModel.includes("image-to-video")) {
      // image-to-video uses image (first frame)
      data.image = imageUrls[0];
      if (imageUrls.length > 1) {
        data.last_image = imageUrls[imageUrls.length - 1];
      }
    } else {
      // text-to-video with image fallback → switch to image-to-video
      data.model = `${atlasModelName}/image-to-video`;
      data.image = imageUrls[0];
    }
  }

  // Add reference audio if available
  if (voiceAudioUrl) {
    data.reference_audios = [voiceAudioUrl];
    data.generate_audio = true;
  }

  console.log(`[Ad Generate Atlas] Submitting ${subModel} job (frontend model: ${originalModel}), duration=${duration}s, images=${imageUrls.length}, voice=${!!voiceAudioUrl}`);

  // Step 1: Submit generation request
  const submitRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateVideo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${effectiveKey}`,
    },
    body: JSON.stringify(data),
  });

  const submitJson = await submitRes.json();

  if (!submitRes.ok || submitJson.code !== 200) {
    const errMsg = submitJson?.msg || submitJson?.error || submitJson?.message || JSON.stringify(submitJson).slice(0, 300);
    console.error("[Ad Generate Atlas] Submit failed:", errMsg);
    return NextResponse.json(
      { error: `Atlas submit failed: ${errMsg}` },
      { status: 500 }
    );
  }

  const predictionId = submitJson.data?.id;
  if (!predictionId) {
    return NextResponse.json(
      { error: "No prediction ID returned from Atlas API", rawResponse: JSON.stringify(submitJson).slice(0, 500) },
      { status: 500 }
    );
  }

  console.log(`[Ad Generate Atlas] Prediction ID: ${predictionId}, polling for result...`);

  // Step 2: Poll for result
  const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predictionId}`;

  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    try {
      const pollRes = await fetch(pollUrl, {
        headers: { "Authorization": `Bearer ${effectiveKey}` },
      });
      const pollJson = await pollRes.json();

      if (pollJson.code === 200 || pollJson.data) {
        const resultData = pollJson.data;
        const status = resultData?.status;

        if (status === "completed" || status === "succeeded") {
          // Atlas returns outputs array with video URLs
          const outputs = resultData?.outputs;
          let videoUrl = "";

          if (Array.isArray(outputs) && outputs.length > 0) {
            videoUrl = outputs[0];
          } else if (typeof outputs === "string") {
            videoUrl = outputs;
          } else if (resultData?.output) {
            videoUrl = resultData.output;
          } else if (resultData?.url) {
            videoUrl = resultData.url;
          } else if (resultData?.video_url) {
            videoUrl = resultData.video_url;
          }

          if (videoUrl) {
            console.log(`[Ad Generate Atlas] Success! URL: ${videoUrl.slice(0, 100)}...`);
            return NextResponse.json({ videoUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "Video completed but no URL found", rawResult: JSON.stringify(resultData).slice(0, 500) },
            { status: 500 }
          );
        }

        if (status === "failed" || status === "error") {
          const failMsg = resultData?.error || resultData?.message || "unknown error";
          console.error("[Ad Generate Atlas] Task failed:", failMsg);
          return NextResponse.json(
            { error: "Ad generation failed: " + failMsg },
            { status: 500 }
          );
        }

        // Still processing — continue polling
        if (i % 6 === 0) {
          console.log(`[Ad Generate Atlas] Still processing... (attempt ${i + 1}, status: ${status})`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Ad Generate Atlas poll ${i}] ${msg}`);
    }
  }

  return NextResponse.json({ error: "Ad generation timed out after 10 minutes" }, { status: 500 });
}

// ─── KIE.ai API (Veo3, Seedance, etc.) ─────────────────────────

async function generateAdViaKIE(
  prompt: string,
  kieModelName: string,
  originalModel: string,
  duration: number,
  aspectRatio: string,
  imageUrls: string[] = [],
  voiceAudioUrl?: string,
  kieKey?: string,
): Promise<NextResponse> {
  const effectiveKey = kieKey || DEFAULT_KIE_KEY;
  const isSeedance = kieModelName.startsWith("bytedance/seedance");

  // Build input body with correct parameter names per model type
  const inputBody: Record<string, unknown> = {
    prompt: prompt.trim(),
  };

  if (isSeedance) {
    // Seedance 2.0 uses aspect_ratio, duration (integer), and reference images
    inputBody.aspect_ratio = aspectRatio;
    inputBody.duration = duration;
    inputBody.resolution = "720p";

    // Seedance 2.0 uses first_frame_url and reference_image_urls
    if (imageUrls.length > 0) {
      inputBody.first_frame_url = imageUrls[0];
    }
    if (imageUrls.length > 1) {
      inputBody.reference_image_urls = imageUrls.slice(1);
    }

    // Voice audio for Seedance models
    if (voiceAudioUrl) {
      inputBody.reference_audio_urls = [voiceAudioUrl];
    }
  } else {
    // Veo models use image_size and duration string
    const imageSize = ASPECT_SIZE_MAP[aspectRatio] || "768x1344";
    inputBody.image_size = imageSize;
    inputBody.duration = `${duration}s`;

    if (imageUrls.length > 0) {
      inputBody.image_url = imageUrls[0];
    }
    if (imageUrls.length > 1) {
      inputBody.ref_image_url = imageUrls[1];
    }
  }

  const submitBody = {
    model: kieModelName,
    input: inputBody,
  };

  console.log(`[Ad Generate KIE] Submitting ${kieModelName} job (frontend model: ${originalModel}), duration=${duration}s, images=${imageUrls.length}, voice=${!!voiceAudioUrl}`);

  const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${effectiveKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submitBody),
  });

  const submitJson = await submitRes.json();

  if (submitJson.code !== 200) {
    console.error("[Ad Generate KIE] Submit failed:", JSON.stringify(submitJson).slice(0, 500));
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

  console.log(`[Ad Generate KIE] Task ID: ${taskId}, polling for result...`);

  // Poll for result
  for (let i = 0; i < 120; i++) {
    await sleep(5000);
    try {
      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${effectiveKey}` },
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
            console.log(`[Ad Generate KIE] Success! URL: ${videoUrl.slice(0, 100)}...`);
            return NextResponse.json({ videoUrl, status: "completed" });
          }
          return NextResponse.json(
            { error: "Video completed but no URL found", rawResult: JSON.stringify(result).slice(0, 500) },
            { status: 500 }
          );
        }
        if (d?.state === "fail") {
          console.error("[Ad Generate KIE] Task failed:", d?.failMsg);
          return NextResponse.json(
            { error: "Ad generation failed: " + (d?.failMsg || "unknown error") },
            { status: 500 }
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Ad Generate KIE poll ${i}] ${msg}`);
    }
  }

  return NextResponse.json({ error: "Ad generation timed out after 10 minutes" }, { status: 500 });
}

// ─── fal.ai API (Kling 3.0) ───────────────────────────────────

async function generateAdViaFal(
  prompt: string,
  duration: number,
  aspectRatio: string,
  imageUrls: string[] = [],
): Promise<NextResponse> {
  // Choose endpoint based on whether we have a reference image
  const endpoint = imageUrls.length > 0
    ? "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video"
    : "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";

  const submitBody: Record<string, unknown> = {
    prompt: prompt.trim(),
    duration: `${duration}s`,
    aspect_ratio: aspectRatio,
  };

  if (imageUrls.length > 0) {
    submitBody.image_url = imageUrls[0];
  }

  console.log(`[Ad Generate Fal] Submitting Kling job, duration=${duration}s, images=${imageUrls.length}`);

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
          { error: "Ad generation failed: " + (statusJson.error || "unknown error") },
          { status: 500 }
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Ad Generate Fal poll ${i}] ${msg}`);
    }
  }

  return NextResponse.json({ error: "Ad generation timed out after 10 minutes" }, { status: 500 });
}
