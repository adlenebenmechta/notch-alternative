import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── KIE.ai Configuration ──────────────────────────────────────────────────
const KIE_API_KEY = process.env.KIE_API_KEY || "17276b59024a2d9400d2354ea49020b8";
const KIE_API_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";

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

// ─── Generate image via KIE.ai (GPT Image model) ────────────────────────────
async function generateWithKie(prompt: string): Promise<string> {
  const enhancedPrompt = enforcePhotorealisticPrompt(prompt);

  // Submit task to KIE.ai
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

  console.log(`[Carousel/Image] KIE.ai task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId as string, KIE_API_KEY);
  console.log(`[Carousel/Image] KIE.ai image ready!`);
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
    // Auth check
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_prompt } = body;

    if (!image_prompt || typeof image_prompt !== 'string' || image_prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'image_prompt is required' },
        { status: 400 }
      );
    }

    console.log(`[Carousel/Image] Generating image for prompt: "${image_prompt.slice(0, 100)}..."`);

    let imageUrl: string | null = null;

    // Step 1: Try KIE.ai GPT Image
    try {
      imageUrl = await generateWithKie(image_prompt.trim());
    } catch (kieErr) {
      const msg = kieErr instanceof Error ? kieErr.message : String(kieErr);
      console.warn(`[Carousel/Image] KIE.ai GPT Image failed: ${msg}`);
    }

    // Step 2: Fallback to ZAI SDK
    if (!imageUrl) {
      console.log('[Carousel/Image] KIE.ai failed, falling back to ZAI SDK...');
      imageUrl = await generateWithZAI(image_prompt.trim());
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image generation failed — both KIE.ai and fallback API failed' },
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
