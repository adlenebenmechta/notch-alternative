import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── KIE.ai Configuration ──────────────────────────────────────────────────
const KIE_API_KEY = process.env.KIE_API_KEY || "17276b59024a2d9400d2354ea49020b8";
const KIE_API_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Force photorealistic prompt with NO TEXT ──────────────────────────────
const IMAGE_PROMPT_PREFIX = "Photorealistic professional photograph, DSLR camera, natural lighting, realistic candid shot, absolutely NO TEXT NO WORDS NO LETTERS NO TYPOGRAPHY IN IMAGE: ";

function enforcePhotorealisticPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/\b(text|typography|lettering|words|font|headline|title|caption|quote)\b/gi, "")
    .replace(/\b(infographic|illustration|graphic design|cartoon|vector|clip.?art)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return IMAGE_PROMPT_PREFIX + cleaned;
}

// ─── Upload base64 image to KIE.ai and get a download URL ─────────────────
async function uploadBase64ToKie(base64DataUri: string): Promise<string> {
  // Strip the data URI prefix (e.g., "data:image/png;base64,")
  const rawBase64 = base64DataUri.includes(",") ? base64DataUri.split(",").slice(1).join(",") : base64DataUri;
  
  console.log(`[Carousel/Image] Uploading reference image to KIE.ai (${(rawBase64.length / 1024).toFixed(0)}KB)...`);
  
  const res = await fetch(KIE_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data: rawBase64,
      fileName: `product-ref-${Date.now()}.png`,
      uploadPath: "images",
    }),
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("KIE.ai upload returned non-JSON: " + text.slice(0, 200));
  }

  const downloadUrl = (json.data as Record<string, unknown>)?.downloadUrl as string;
  if (!downloadUrl) {
    throw new Error("KIE.ai upload succeeded but no downloadUrl returned: " + text.slice(0, 200));
  }

  console.log(`[Carousel/Image] Reference image uploaded! URL: ${downloadUrl.slice(0, 80)}...`);
  return downloadUrl;
}

// ─── Poll for KIE.ai image result ──────────────────────────────────────────
async function pollKieImage(taskId: string, apiKey: string): Promise<string> {
  const url = `${KIE_POLL_URL}?taskId=${taskId}`;

  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollText = await res.text();
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(pollText);
      } catch {
        await sleep(3000);
        continue;
      }

      if (json.code === 200) {
        const d = json.data as Record<string, unknown> | undefined;
        if (d?.state === "success") {
          let result;
          if (typeof d.resultJson === "string") {
            try {
              result = JSON.parse(d.resultJson);
            } catch {
              result = d.resultJson;
            }
          } else {
            result = d.resultJson;
          }
          const imageUrl = result?.resultUrls?.[0] || result?.result_url || result?.url;
          if (imageUrl) return imageUrl;
          throw new Error("Image ready but no URL found");
        }
        if (d?.state === "fail") {
          throw new Error("Image generation failed: " + (d?.failMsg || "unknown error"));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Image generation failed") || msg.includes("no URL")) throw err;
    }
    await sleep(3000);
  }
  throw new Error("Image generation timed out after 6 minutes");
}

// ─── Generate image WITH reference using google/nano-banana-edit ──────────
// This model is PROVEN to work with reference images via KIE.ai
async function generateWithReference(prompt: string, referenceImageUrl: string): Promise<string> {
  const enhancedPrompt = enforcePhotorealisticPrompt(prompt);

  const inputPayload = {
    prompt: enhancedPrompt,
    image_urls: [referenceImageUrl],   // URL array — proven format
    image_size: "9:16",                // Ratio format for nano-banana-edit
    output_format: "png",
    strength: 0.45,                    // 0.45 = product clearly visible, AI adds context
  };

  console.log(`[Carousel/Image] Using google/nano-banana-edit with reference image (strength: 0.45)`);

  const submitRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: inputPayload,
    }),
  });

  const submitText = await submitRes.text();
  let submitJson: Record<string, unknown>;
  try {
    submitJson = JSON.parse(submitText);
  } catch {
    throw new Error("KIE.ai API returned non-JSON: " + submitText.slice(0, 200));
  }

  if (submitJson.code !== 200) {
    throw new Error(
      "KIE.ai submit failed: " + (submitJson.msg || submitText.slice(0, 200))
    );
  }

  const taskId = (submitJson.data as Record<string, unknown>)?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.ai");
  }

  console.log(`[Carousel/Image] nano-banana-edit task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId as string, KIE_API_KEY);
  console.log(`[Carousel/Image] nano-banana-edit image ready!`);
  return imageUrl;
}

// ─── Generate image WITHOUT reference using GPT Image ─────────────────────
async function generateWithoutReference(prompt: string): Promise<string> {
  const enhancedPrompt = enforcePhotorealisticPrompt(prompt);

  const submitRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2-text-to-image",
      input: {
        prompt: enhancedPrompt,
        size: "1024x1792",
      },
    }),
  });

  const submitText = await submitRes.text();
  let submitJson: Record<string, unknown>;
  try {
    submitJson = JSON.parse(submitText);
  } catch {
    throw new Error("KIE.ai API returned non-JSON: " + submitText.slice(0, 200));
  }

  if (submitJson.code !== 200) {
    throw new Error(
      "KIE.ai submit failed: " + (submitJson.msg || submitText.slice(0, 200))
    );
  }

  const taskId = (submitJson.data as Record<string, unknown>)?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.ai");
  }

  console.log(`[Carousel/Image] GPT Image task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId as string, KIE_API_KEY);
  console.log(`[Carousel/Image] GPT Image ready!`);
  return imageUrl;
}

// ─── Fallback: Generate image via ZAI SDK ───────────────────────────────────
async function generateWithZAI(prompt: string): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: enforcePhotorealisticPrompt(prompt),
      size: '768x1344',
    });

    const imageBase64 = response.data?.[0]?.base64;
    if (imageBase64) {
      return `data:image/png;base64,${imageBase64}`;
    }

    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Carousel/Image] ZAI fallback failed:', msg);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check with detailed logging
    const authHeader = request.headers.get("Authorization");
    console.log(`[Carousel/Image] Auth header present: ${!!authHeader}`);

    const user = await getAuthUser(request);
    if (!user) {
      console.warn(`[Carousel/Image] getAuthUser returned null`);
      return NextResponse.json({ error: "Unauthorized — please refresh the page and try again" }, { status: 401 });
    }

    console.log(`[Carousel/Image] Authenticated: ${user.email}`);

    const body = await request.json();
    const { image_prompt, reference_image_base64 } = body;

    if (!image_prompt || typeof image_prompt !== 'string' || image_prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'image_prompt is required' },
        { status: 400 }
      );
    }

    const hasRef = !!reference_image_base64 && typeof reference_image_base64 === 'string' && reference_image_base64.length > 0;
    console.log(`[Carousel/Image] Generating image for prompt: "${image_prompt.slice(0, 100)}..."${hasRef ? ` with reference image (${(reference_image_base64.length / 1024).toFixed(0)}KB)` : ""}`);

    let imageUrl: string | null = null;

    // ─── PATH 1: With reference image → use google/nano-banana-edit ──────
    if (hasRef) {
      try {
        // Step 1: Upload the base64 image to KIE.ai to get a URL
        const refImageUrl = await uploadBase64ToKie(reference_image_base64);
        
        // Step 2: Use nano-banana-edit with the reference URL
        imageUrl = await generateWithReference(image_prompt.trim(), refImageUrl);
      } catch (refErr) {
        const msg = refErr instanceof Error ? refErr.message : String(refErr);
        console.warn(`[Carousel/Image] nano-banana-edit with reference failed: ${msg}`);
        
        // Try nano-banana-edit with lower strength as fallback
        try {
          console.log(`[Carousel/Image] Retrying nano-banana-edit with lower strength...`);
          const refImageUrl = await uploadBase64ToKie(reference_image_base64);
          
          const enhancedPrompt = enforcePhotorealisticPrompt(image_prompt.trim());
          const submitRes = await fetch(KIE_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${KIE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/nano-banana-edit",
              input: {
                prompt: enhancedPrompt,
                image_urls: [refImageUrl],
                image_size: "9:16",
                output_format: "png",
                strength: 0.55,  // Higher strength = more faithful to reference
              },
            }),
          });

          const submitText = await submitRes.text();
          let submitJson: Record<string, unknown>;
          try { submitJson = JSON.parse(submitText); } catch {
            throw new Error("KIE.ai API returned non-JSON: " + submitText.slice(0, 200));
          }
          if (submitJson.code !== 200) {
            throw new Error("KIE.ai submit failed: " + (submitJson.msg || submitText.slice(0, 200)));
          }
          const taskId = (submitJson.data as Record<string, unknown>)?.taskId;
          if (!taskId) throw new Error("No taskId returned from KIE.ai");
          imageUrl = await pollKieImage(taskId as string, KIE_API_KEY);
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.warn(`[Carousel/Image] nano-banana-edit retry also failed: ${retryMsg}`);
        }
      }
    }

    // ─── PATH 2: Without reference → use GPT Image text-to-image ────────
    if (!imageUrl) {
      try {
        imageUrl = await generateWithoutReference(image_prompt.trim());
      } catch (kieErr) {
        const msg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.warn(`[Carousel/Image] GPT Image failed: ${msg}`);
      }
    }

    // ─── PATH 3: Fallback to ZAI SDK ─────────────────────────────────────
    if (!imageUrl) {
      console.log('[Carousel/Image] KIE.ai failed, falling back to ZAI SDK...');
      imageUrl = await generateWithZAI(image_prompt.trim());
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image generation failed — all methods failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: imageUrl });
  } catch (error: unknown) {
    console.error('[Carousel/Image] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate image', details: message },
      { status: 500 }
    );
  }
}
