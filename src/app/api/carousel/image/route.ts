import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import sharp from 'sharp';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── KIE.ai Configuration ──────────────────────────────────────────────────
const KIE_API_KEY = process.env.KIE_API_KEY || "17276b59024a2d9400d2354ea49020b8";
const KIE_API_URL = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_POLL_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Remove people/face references from prompts (they look fake) ───────────
function removePeopleFromPrompt(prompt: string): string {
  return prompt
    .replace(/\b(person|people|woman|man|girl|boy|child|hands|hand|face|faces|smile|smiling|looking|woman's|man's|her |his |she |he )\b/gi, "")
    .replace(/\b(holding|wearing|using by|used by|carrying)\s+(a\s+)?(person|woman|man|girl|boy|someone)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Upload base64 image to KIE.ai (same as bof-generate) ────────────────
async function uploadImageToKie(base64Data: string, fileName: string): Promise<string> {
  let rawBase64 = base64Data;
  if (rawBase64.includes(",")) {
    rawBase64 = rawBase64.split(",")[1];
  }

  console.log(`[Carousel/Image] Uploading reference image to KIE (${(rawBase64.length / 1024).toFixed(0)}KB)...`);

  const res = await fetch(KIE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data: rawBase64,
      fileName,
      uploadPath: "images",
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error("Image upload failed: " + (json.msg || JSON.stringify(json)));
  }
  const downloadUrl = json.data?.downloadUrl;
  if (!downloadUrl) {
    throw new Error("Upload succeeded but no downloadUrl returned");
  }

  console.log(`[Carousel/Image] Upload OK! URL: ${downloadUrl.slice(0, 80)}...`);
  return downloadUrl;
}

// ─── Poll for KIE.ai image result ──────────────────────────────────────────
async function pollKieImage(taskId: string): Promise<string> {
  const url = `${KIE_POLL_URL}?taskId=${taskId}`;

  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${KIE_API_KEY}` },
      });
      const pollJson = await res.json();

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

// ─── Generate SOLUTION image with product reference ────────────────────────
// Uses google/nano-banana-edit — EXACTLY the same model & format as bof-generate
// which is PROVEN to work for placing products into scenes.
async function generateSolutionWithProduct(
  productImageUrl: string,
  solutionPrompt: string
): Promise<string> {
  // Build a BOF-style product placement prompt
  const cleanPrompt = removePeopleFromPrompt(solutionPrompt);
  const productPlacementPrompt = `Place this product in the following scene: ${cleanPrompt}. CRITICAL RULES: (1) The product must remain the main focus, clearly visible with its original packaging, label, and branding exactly as shown in the reference image. Do not alter the product's appearance. (2) This image MUST NOT contain any people, faces, hands, or human body parts — product only with environment. (3) This image MUST NOT contain any text, writing, words, letters, typography, signs, labels, logos, or watermarks anywhere in the image. The image must be 100% text-free. No text overlays, no captions, no graphic design elements. Photorealistic, high quality product photography style.`;

  console.log(`[Carousel/Image] Using google/nano-banana-edit for solution with product ref`);

  const submitRes = await fetch(KIE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt: productPlacementPrompt,
        image_urls: [productImageUrl],
        image_size: "9:16",
        output_format: "png",
        strength: 0.45,
      },
    }),
  });

  const submitJson = await submitRes.json();
  console.log(`[Carousel/Image] nano-banana-edit response:`, JSON.stringify(submitJson).slice(0, 300));

  if (submitJson.code !== 200) {
    throw new Error("nano-banana-edit submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
  }

  const taskId = submitJson.data?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.ai");
  }

  console.log(`[Carousel/Image] nano-banana-edit task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId);
  console.log(`[Carousel/Image] nano-banana-edit image ready!`);
  return imageUrl;
}

// ─── Generate PROBLEM image (no reference) using GPT Image ─────────────────
async function generateProblemImage(prompt: string): Promise<string> {
  // Clean the prompt for text-to-image — remove people and text references
  const noPeople = removePeopleFromPrompt(prompt);
  const cleaned = noPeople
    .replace(/\b(text|typography|lettering|words|font|headline|title|caption|quote)\b/gi, "")
    .replace(/\b(infographic|illustration|graphic design|cartoon|vector|clip.?art)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const enhancedPrompt = "Photorealistic professional photograph, DSLR camera, natural lighting, realistic candid shot. CRITICAL: This image MUST NOT contain any people, faces, hands, or human body parts. CRITICAL: This image MUST NOT contain any text, writing, words, letters, typography, signs, labels, logos, or watermarks. The image must be 100% text-free and people-free. Only objects, environment, and atmosphere. No text overlays, no captions, no graphic design elements: " + cleaned;

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

  const submitJson = await submitRes.json();
  if (submitJson.code !== 200) {
    throw new Error("GPT Image submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
  }

  const taskId = submitJson.data?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.ai");
  }

  console.log(`[Carousel/Image] GPT Image task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId);
  console.log(`[Carousel/Image] GPT Image ready!`);
  return imageUrl;
}

// ─── Generate SCENE background (no product, no people, no text) ───────────
async function generateSceneBackground(scenePrompt: string): Promise<string> {
  const noPeople = removePeopleFromPrompt(scenePrompt);
  const cleaned = noPeople
    .replace(/\b(text|typography|lettering|words|font|headline|title|caption|quote)\b/gi, "")
    .replace(/\b(infographic|illustration|graphic design|cartoon|vector|clip.?art)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const enhancedPrompt = "Photorealistic professional product photography scene, clean background, DSLR camera, studio lighting. CRITICAL: This image MUST NOT contain any people, faces, hands, or human body parts. CRITICAL: This image MUST NOT contain any text, writing, words, letters, typography, signs, labels, logos, or watermarks. Leave center space for a product to be placed. The image must be 100% text-free and people-free. Only environment and atmosphere: " + cleaned;

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

  const submitJson = await submitRes.json();
  if (submitJson.code !== 200) {
    throw new Error("Scene background submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
  }

  const taskId = submitJson.data?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned from KIE.ai");
  }

  console.log(`[Carousel/Image] Scene background task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId);
  console.log(`[Carousel/Image] Scene background ready!`);
  return imageUrl;
}

// ─── Composite product onto scene using Sharp ──────────────────────────────
// This is the FALLBACK that guarantees the product appears in the solution image.
// It downloads the scene image, overlays the product image with proper sizing
// and a subtle shadow, and returns the result as a base64 data URL.
async function compositeProductOntoScene(
  sceneImageUrl: string,
  productImageBase64: string
): Promise<string> {
  console.log(`[Carousel/Image] Compositing product onto scene using Sharp...`);

  // Fetch the scene image
  const sceneRes = await fetch(sceneImageUrl);
  if (!sceneRes.ok) throw new Error("Failed to download scene image");
  const sceneBuffer = Buffer.from(await sceneRes.arrayBuffer());

  // Decode the product base64
  let productRaw = productImageBase64;
  if (productRaw.includes(",")) {
    productRaw = productRaw.split(",")[1];
  }
  const productBuffer = Buffer.from(productRaw, "base64");

  // Get scene dimensions
  const sceneMeta = await sharp(sceneBuffer).metadata();
  const sceneW = sceneMeta.width || 1024;
  const sceneH = sceneMeta.height || 1792;

  // Resize product to fit nicely — about 60% of scene width, maintaining aspect ratio
  const targetProductWidth = Math.round(sceneW * 0.6);
  const resizedProductBuffer = await sharp(productBuffer)
    .resize(targetProductWidth, null, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  const productMeta = await sharp(resizedProductBuffer).metadata();
  const productW = productMeta.width || targetProductWidth;
  const productH = productMeta.height || 400;

  // Create a subtle drop shadow for the product
  const shadowPadding = 15;
  const shadowBlur = 12;
  const shadowOffsetX = 5;
  const shadowOffsetY = 8;

  // Create shadow buffer (dark ellipse)
  const shadowW = productW + shadowPadding * 2;
  const shadowH = productH + shadowPadding * 2;
  const shadowSvg = `<svg width="${shadowW}" height="${shadowH}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur}" result="blur"/>
        <feOffset dx="${shadowOffsetX}" dy="${shadowOffsetY}" result="offsetBlur"/>
        <feFlood flood-color="rgba(0,0,0,0.4)" result="color"/>
        <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="${shadowW}" height="${shadowH}" fill="rgba(0,0,0,0.5)" filter="url(#shadow)" rx="20" ry="20"/>
  </svg>`;

  const shadowBuffer = await sharp(Buffer.from(shadowSvg))
    .resize(shadowW, shadowH)
    .png()
    .toBuffer();

  // Position: center horizontally, in the lower portion of the image (around 55% from top)
  const posX = Math.round((sceneW - productW) / 2);
  const posY = Math.round(sceneH * 0.45);

  // Shadow position (slightly offset)
  const shadowPosX = posX - shadowPadding;
  const shadowPosY = posY - shadowPadding;

  // Composite: scene + shadow + product
  const resultBuffer = await sharp(sceneBuffer)
    .composite([
      { input: shadowBuffer, left: shadowPosX, top: shadowPosY, blend: "over" },
      { input: resizedProductBuffer, left: posX, top: posY, blend: "over" },
    ])
    .png()
    .toBuffer();

  console.log(`[Carousel/Image] Composite done! Product ${productW}x${productH} placed at (${posX},${posY}) on scene ${sceneW}x${sceneH}`);

  // Return as data URL
  return `data:image/png;base64,${resultBuffer.toString("base64")}`;
}

// ─── Fallback: ZAI SDK ──────────────────────────────────────────────────────
async function generateWithZAI(prompt: string): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: "Photorealistic professional photograph, DSLR camera, natural lighting, NO TEXT: " + prompt,
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
    const authHeader = request.headers.get("Authorization");
    console.log(`[Carousel/Image] Auth header: ${!!authHeader}`);

    const user = await getAuthUser(request);
    if (!user) {
      console.warn(`[Carousel/Image] getAuthUser returned null`);
      return NextResponse.json({ error: "Unauthorized — please refresh the page and try again" }, { status: 401 });
    }

    console.log(`[Carousel/Image] User: ${user.email}`);

    const body = await request.json();
    const { image_prompt, reference_image_base64 } = body;

    if (!image_prompt || typeof image_prompt !== 'string' || image_prompt.trim().length === 0) {
      return NextResponse.json({ error: 'image_prompt is required' }, { status: 400 });
    }

    const hasRef = !!reference_image_base64 && typeof reference_image_base64 === 'string' && reference_image_base64.length > 0;
    console.log(`[Carousel/Image] Prompt: "${image_prompt.slice(0, 80)}..." | Has reference: ${hasRef} (base64 length: ${hasRef ? reference_image_base64.length : 0})`);

    let imageUrl: string | null = null;

    // ─── WITH REFERENCE: Upload + nano-banana-edit (BOF-style) ──────────
    if (hasRef) {
      console.log(`[Carousel/Image] === SOLUTION MODE: Using product reference ===`);

      // Step 1: Upload product image to KIE
      let productImageUrl: string | null = null;
      try {
        productImageUrl = await uploadImageToKie(
          reference_image_base64,
          `carousel_product_${Date.now()}.png`
        );
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        console.error(`[Carousel/Image] Upload FAILED: ${msg}`);
      }

      // Step 2: Generate with nano-banana-edit using the uploaded URL
      if (productImageUrl) {
        try {
          imageUrl = await generateSolutionWithProduct(productImageUrl, image_prompt.trim());
        } catch (genErr) {
          const msg = genErr instanceof Error ? genErr.message : String(genErr);
          console.warn(`[Carousel/Image] nano-banana-edit FAILED: ${msg}`);

          // Retry with higher strength (more faithful to reference)
          try {
            console.log(`[Carousel/Image] Retrying with strength 0.55...`);
            const cleanRetryPrompt = removePeopleFromPrompt(image_prompt.trim());
            const retryPrompt = `Place this product in the following scene: ${cleanRetryPrompt}. CRITICAL RULES: (1) The product must remain the main focus, clearly visible with its original packaging, label, and branding exactly as shown in the reference image. Do not alter the product's appearance. (2) ABSOLUTELY NO people, NO faces, NO hands, NO human body parts in the image. (3) ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS anywhere in the image. The image must be completely text-free. Photorealistic, high quality product photography style.`;

            const retryRes = await fetch(KIE_API_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${KIE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/nano-banana-edit",
                input: {
                  prompt: retryPrompt,
                  image_urls: [productImageUrl],
                  image_size: "9:16",
                  output_format: "png",
                  strength: 0.55,
                },
              }),
            });

            const retryJson = await retryRes.json();
            if (retryJson.code === 200 && retryJson.data?.taskId) {
              imageUrl = await pollKieImage(retryJson.data.taskId);
            }
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            console.warn(`[Carousel/Image] Retry FAILED: ${retryMsg}`);
          }
        }
      }

      // Step 3: GUARANTEED FALLBACK — Generate scene + composite product onto it
      // This ensures the product ALWAYS appears in the solution image.
      if (!imageUrl) {
        console.log(`[Carousel/Image] nano-banana-edit failed — using Sharp composite fallback (scene + product overlay)...`);
        try {
          // Generate a clean scene background
          const sceneUrl = await generateSceneBackground(image_prompt.trim());
          console.log(`[Carousel/Image] Scene background ready, compositing product...`);

          // Composite the product image onto the scene
          imageUrl = await compositeProductOntoScene(sceneUrl, reference_image_base64);
          console.log(`[Carousel/Image] Sharp composite fallback succeeded!`);
        } catch (compositeErr) {
          const msg = compositeErr instanceof Error ? compositeErr.message : String(compositeErr);
          console.warn(`[Carousel/Image] Sharp composite fallback failed: ${msg}`);
        }
      }

      // Step 4: Last resort — GPT Image without product (this won't have the product but at least gives an image)
      if (!imageUrl) {
        console.log(`[Carousel/Image] All reference methods failed, trying GPT Image as last resort...`);
        try {
          imageUrl = await generateProblemImage(image_prompt.trim());
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[Carousel/Image] GPT Image fallback failed: ${msg}`);
        }
      }
    } else {
      // ─── WITHOUT REFERENCE: GPT Image text-to-image ────────────────────
      console.log(`[Carousel/Image] === PROBLEM MODE: No reference, using GPT Image ===`);
      try {
        imageUrl = await generateProblemImage(image_prompt.trim());
      } catch (kieErr) {
        const msg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.warn(`[Carousel/Image] GPT Image failed: ${msg}`);
      }
    }

    // ─── FINAL FALLBACK: ZAI SDK ──────────────────────────────────────────
    if (!imageUrl) {
      console.log('[Carousel/Image] All methods failed, trying ZAI SDK...');
      imageUrl = await generateWithZAI(image_prompt.trim());
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed — all methods failed' }, { status: 500 });
    }

    return NextResponse.json({ image: imageUrl });
  } catch (error: unknown) {
    console.error('[Carousel/Image] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate image', details: message }, { status: 500 });
  }
}
