import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import ZAI from "z-ai-web-dev-sdk";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── AI Configuration ──────────────────────────────────────────────────────
interface AIConfig {
  baseUrl: string;
  apiKey: string;
  token?: string;
  chatId?: string;
  userId?: string;
  provider: string;
}

function getAIConfig(): AIConfig | null {
  const zaiBaseUrl = process.env.ZAI_BASE_URL;
  const zaiApiKey = process.env.ZAI_API_KEY;
  if (zaiBaseUrl && zaiApiKey) {
    console.log("[Carousel] Using ZAI config from environment variables");
    return {
      baseUrl: zaiBaseUrl,
      apiKey: zaiApiKey,
      token: process.env.ZAI_TOKEN || undefined,
      chatId: process.env.ZAI_CHAT_ID || undefined,
      userId: process.env.ZAI_USER_ID || undefined,
      provider: "zai",
    };
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    console.log("[Carousel] Using OpenAI API");
    return {
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      apiKey: openaiApiKey,
      provider: "openai",
    };
  }

  return null;
}

// ─── Create ZAI instance from config file ──────────────────────────────
async function createZAIFromConfig() {
  try {
    const zai = await ZAI.create();
    console.log("[Carousel] Using ZAI from .z-ai-config file");
    return zai;
  } catch {
    return null;
  }
}

// ─── Direct OpenAI-compatible chat completion ──────────────────────────
async function chatCompletionDirect(
  config: AIConfig,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
) {
  const url = `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };

  if (config.provider === "zai") {
    headers["X-Z-AI-From"] = "Z";
    if (config.chatId) headers["X-Chat-Id"] = config.chatId;
    if (config.userId) headers["X-User-Id"] = config.userId;
    if (config.token) headers["X-Token"] = config.token;
  }

  const body: Record<string, unknown> = {
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 4000,
  };

  if (config.provider === "zai") {
    body.thinking = { type: "disabled" };
  }

  console.log(`[Carousel] Calling chat completion at ${url}`);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chat completion API failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }

  return await response.json();
}

// ─── Chat completion with fallback chain ───────────────────────────────
async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<Record<string, unknown> | null> {
  const config = getAIConfig();
  if (config) {
    try {
      return await chatCompletionDirect(config, messages, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Carousel] Env var API failed:", msg);
    }
  }

  const zai = await createZAIFromConfig();
  if (zai) {
    try {
      const completion = await zai.chat.completions.create({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4000,
      });
      return completion as unknown as Record<string, unknown>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Carousel] ZAI SDK failed:", msg);
    }
  }

  console.log("[Carousel] All AI APIs failed, will use template-based content generation");
  return null;
}

// ─── Image prompt enforcement: photorealistic with NO TEXT ───────────────
const IMAGE_PROMPT_PREFIX = "Photorealistic professional photograph, DSLR camera, natural lighting, realistic candid shot, absolutely NO TEXT NO WORDS NO LETTERS NO TYPOGRAPHY IN IMAGE: ";

function enforcePhotorealisticPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/\b(text|typography|lettering|words|font|headline|title|caption|quote)\b/gi, "")
    .replace(/\b(infographic|illustration|graphic design|cartoon|vector|clip.?art)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.toLowerCase().includes("no text") && cleaned.toLowerCase().includes("photorealistic")) {
    return cleaned;
  }

  return IMAGE_PROMPT_PREFIX + cleaned;
}

// ─── Carousel Skill Prompt (Locked Settings) ────────────────────────────────
// Model: Nano Banana 2 (nano_banana_2), 3:4 aspect ratio, product as reference
// Text style: bold white rounded font with solid black outline, ~22% from top
// Sequence: hero shot + arrows → quote conversation → ❌/✅ comparison → product on pure white (last)

const CAROUSEL_SKILL_PROMPT = `You are an expert at designing viral marketing carousel content for social media (Instagram, TikTok).

## LOCKED SETTINGS (never change these)
- Image model: Nano Banana 2 (nano_banana_2), 3:4 aspect ratio (768x1344)
- The product is imported as reference so the tin/pack ALWAYS matches across all slides
- Text is baked into the images (bold white rounded font with solid black outline, positioned ~22% from the top, never at the top edge)
- Each carousel has exactly 4 slides in this fixed sequence:

## FIXED SLIDE SEQUENCE (every carousel must follow this exactly)

**Slide 1 — HERO SHOT + ARROWS**
- Image: Product hero shot on a dramatic background, with bold visual arrows or pointers drawing the eye to the product. Photorealistic, studio lighting, 3:4 ratio.
- image_prompt MUST include: "product hero shot, dramatic lighting, visual arrows pointing at product, studio photography, 3:4 ratio, NO TEXT NO WORDS NO LETTERS IN IMAGE"
- header_text: A punchy hook headline (max 6 words) that grabs attention — about the DESIRE not the problem
- body_text: null (let the visual do the talking)

**Slide 2 — QUOTE CONVERSATION**
- Image: A relatable scene of someone talking, whispering, or in a conversation setting. Natural candid moment. The product is subtly visible in the scene. Photorealistic, natural lighting.
- image_prompt MUST include: "candid conversation scene, person whispering or talking naturally, product subtly visible, lifestyle photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
- header_text: A powerful quote or statement in quotes (like something a customer would say, max 8 words)
- body_text: A supporting line that amplifies the quote (max 12 words)

**Slide 3 — ❌/✅ COMPARISON**
- Image: Split or side-by-side visual — the "wrong way" on one side and the "right way" (with product) on the other. Clean, minimal, photorealistic. Pure white or light background.
- image_prompt MUST include: "split comparison scene, wrong way vs right way, before and after visual, clean minimal background, product on the correct side, NO TEXT NO WORDS NO LETTERS IN IMAGE"
- header_text: "❌ [the wrong way]" on first line, then "✅ [the right way with product]" on second line
- body_text: null

**Slide 4 — PRODUCT ON PURE WHITE (ALWAYS LAST)**
- Image: The product (tin/pack) centered on a PURE WHITE background, clean, professional product photography, no shadows, no props. Like an Amazon listing photo.
- image_prompt MUST include: "product tin pack centered on pure white background, professional product photography, clean, no shadows, no props, Amazon listing style, NO TEXT NO WORDS NO LETTERS IN IMAGE"
- header_text: The product name or tagline (max 5 words)
- body_text: A single clear CTA command (max 6 words), like "Order now — link in bio"

## RULES
- Every carousel has exactly 4 slides — no more, no less
- Each carousel idea must be UNIQUE and DIFFERENT from the others
- image_prompt is ALWAYS in English even if content is in another language
- image_prompt must describe a photorealistic scene (NOT illustration, NOT graphic design, NOT infographic)
- ⛔ ABSOLUTELY NO TEXT/WORDS/LETTERS in image_prompt — text goes in header_text and body_text only
- The product tin/pack must appear consistently across all 4 slides of each carousel
- text_position is always "top" (text is ~22% from top, never at the edge)

## LANGUAGE
- If the user writes in Arabic → all header_text and body_text in Arabic
- If the user writes in English → all header_text and body_text in English
- If the user writes in French → all header_text and body_text in French

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code blocks):
{
  "carousels": [
    {
      "carousel_title": "Short unique title for this carousel",
      "slides": [
        {
          "slide_number": 1,
          "slide_type": "hero",
          "image_prompt": "...",
          "header_text": "...",
          "body_text": null,
          "text_position": "top"
        },
        {
          "slide_number": 2,
          "slide_type": "quote",
          "image_prompt": "...",
          "header_text": "...",
          "body_text": "...",
          "text_position": "top"
        },
        {
          "slide_number": 3,
          "slide_type": "comparison",
          "image_prompt": "...",
          "header_text": "❌ ...\\n✅ ...",
          "body_text": null,
          "text_position": "top"
        },
        {
          "slide_number": 4,
          "slide_type": "product",
          "image_prompt": "...",
          "header_text": "...",
          "body_text": "...",
          "text_position": "top"
        }
      ]
    }
  ]
}

Generate EXACTLY the number of carousels requested by the user. Each must have a completely different creative angle, hook, and comparison point.`;

// ─── Template-based fallback (single carousel, 4 slides) ──────────────
function generateTemplateCarousels(
  idea: string,
  numCarousels: number,
  language: string
): Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> {
  const isAr = language === "ar";
  const isFr = language === "fr";

  const angles = isAr
    ? ["السر المخفي", "الحل الذي تبحث عنه", "الطريقة الصحيحة", "النتيجة المضمونة", "التغيير الحقيقي"]
    : isFr
    ? ["Le secret caché", "La solution que vous cherchez", "La bonne méthode", "Le résultat garanti", "Le vrai changement"]
    : ["The hidden secret", "The solution you need", "The right way", "The guaranteed result", "The real change"];

  const carousels: Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> = [];

  for (let c = 0; c < numCarousels; c++) {
    const angle = angles[c % angles.length];
    const carouselTitle = `${angle} — ${idea.slice(0, 30)}`;

    const heroHook = isAr ? `${angle} أخيراً!` : isFr ? `${angle} enfin !` : `${angle} — finally!`;
    const quoteText = isAr ? `"لم أصدق النتيجة"` : isFr ? `"Je n'ai pas cru au résultat"` : `"I couldn't believe the results"`;
    const quoteSub = isAr ? "كل من جربها وافق" : isFr ? "Tous ceux qui ont essayé sont d'accord" : "Everyone who tried agrees";
    const wrongWay = isAr ? "الطريقة القديمة" : isFr ? "L'ancienne méthode" : "The old way";
    const rightWay = isAr ? "مع منتجنا" : isFr ? "Avec notre produit" : "With our product";
    const ctaText = isAr ? "اطلب الآن!" : isFr ? "Commandez maintenant!" : "Order now!";

    const slides = [
      {
        slideNumber: 1,
        slideType: "hero",
        title: heroHook,
        body: "",
        imagePrompt: enforcePhotorealisticPrompt(`Product hero shot on dramatic background, visual arrows pointing at product, studio lighting, professional photography, 3:4 ratio, related to ${idea}`),
        headerText: heroHook,
        bodyText: null,
        textPosition: "top",
      },
      {
        slideNumber: 2,
        slideType: "quote",
        title: quoteText,
        body: quoteSub,
        imagePrompt: enforcePhotorealisticPrompt(`Candid conversation scene, person whispering naturally, product subtly visible, lifestyle photography, related to ${idea}`),
        headerText: quoteText,
        bodyText: quoteSub,
        textPosition: "top",
      },
      {
        slideNumber: 3,
        slideType: "comparison",
        title: `❌ ${wrongWay} / ✅ ${rightWay}`,
        body: "",
        imagePrompt: enforcePhotorealisticPrompt(`Split comparison scene, wrong way vs right way, before and after visual, clean minimal background, product on correct side, related to ${idea}`),
        headerText: `❌ ${wrongWay}\n✅ ${rightWay}`,
        bodyText: null,
        textPosition: "top",
      },
      {
        slideNumber: 4,
        slideType: "product",
        title: idea.slice(0, 20),
        body: ctaText,
        imagePrompt: enforcePhotorealisticPrompt(`Product tin pack centered on pure white background, professional product photography, clean, no shadows, no props, Amazon listing style, related to ${idea}`),
        headerText: idea.slice(0, 20),
        bodyText: ctaText,
        textPosition: "top",
      },
    ];

    carousels.push({ carouselTitle, slides });
  }

  return carousels;
}

// ─── Generate carousel content with AI ──────────────────────────────────
async function generateCarouselContent(
  idea: string,
  numCarousels: number,
  language: string
): Promise<Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }>> {
  const completion = await chatCompletion([
    {
      role: "system",
      content: CAROUSEL_SKILL_PROMPT,
    },
    {
      role: "user",
      content: `Generate ${numCarousels} carousel(s) about: ${idea.trim()}. Language: ${language}. Each carousel must have a different creative angle.`,
    },
  ], {
    temperature: 0.85,
    max_tokens: 6000,
  });

  if (completion) {
    const content = (completion as Record<string, unknown>)?.choices?.[0]?.message?.content || "";
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[1]); } catch { /* continue */ }
      }
      if (!parsed) {
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          try { parsed = JSON.parse(objectMatch[0]); } catch { /* continue */ }
        }
      }
    }

    if (parsed) {
      const rawCarousels = parsed.carousels;
      if (Array.isArray(rawCarousels) && rawCarousels.length > 0) {
        return rawCarousels.map((carousel: Record<string, unknown>, _cIdx: number) => {
          const carouselTitle = (carousel.carousel_title as string) || idea.slice(0, 50);
          const rawSlides = carousel.slides;
          if (!Array.isArray(rawSlides)) {
            return {
              carouselTitle,
              slides: generateTemplateCarousels(idea, 1, language)[0].slides,
            };
          }
          const slides = rawSlides.map((slide: Record<string, unknown>, i: number) => ({
            slideNumber: (slide.slide_number as number) || i + 1,
            slideType: (slide.slide_type as string) || ["hero", "quote", "comparison", "product"][i] || "hero",
            title: (slide.header_text as string) || (slide.title as string) || `Slide ${i + 1}`,
            body: (slide.body_text as string) || (slide.body as string) || "",
            imagePrompt: enforcePhotorealisticPrompt((slide.image_prompt as string) || `Professional photograph related to ${idea}, realistic, natural lighting`),
            headerText: (slide.header_text as string | null) ?? null,
            bodyText: (slide.body_text as string | null) ?? null,
            textPosition: (slide.text_position as string) || "top",
          }));
          return { carouselTitle, slides };
        });
      }
    }
  }

  // Fallback: Template-based content generation
  console.log("[Carousel] Using template-based content generation for idea:", idea.slice(0, 50));
  return generateTemplateCarousels(idea, numCarousels, language);
}

// ─── Poll for kie.ai image result ──────────────────────────────────────
async function pollKieImage(taskId: string, apiKey: string): Promise<string> {
  const url = `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;

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
        const d = json.data;
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

// ─── Generate a single slide image via kie.ai (nano_banana_2) ──────────
async function generateSlideImageKie(
  imagePrompt: string,
  apiKey: string,
  slideIndex: number,
  totalSlides: number,
  carouselIndex: number,
  totalCarousels: number
): Promise<string> {
  const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt: imagePrompt,
        image_size: "768x1344",
      },
    }),
  });

  const submitText = await submitRes.text();
  let submitJson: Record<string, unknown>;
  try {
    submitJson = JSON.parse(submitText);
  } catch {
    throw new Error("kie.ai API returned non-JSON: " + submitText.slice(0, 200));
  }

  if (submitJson.code !== 200) {
    throw new Error(
      "Failed to submit image for carousel " + (carouselIndex + 1) + " slide " + (slideIndex + 1) + ": " + (submitJson.msg || submitText.slice(0, 200))
    );
  }

  const taskId = submitJson.data?.taskId;
  if (!taskId) {
    throw new Error("No taskId returned for carousel " + (carouselIndex + 1) + " slide " + (slideIndex + 1));
  }

  console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: kie.ai task ${taskId} submitted, polling...`);
  const imageUrl = await pollKieImage(taskId, apiKey);
  console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: image ready!`);
  return imageUrl;
}

// ─── Generate slide image using built-in AI API ──────────────────────
async function generateSlideImageBuiltIn(prompt: string): Promise<string> {
  const response = await imageGeneration(prompt, "768x1344");

  if (response) {
    const data = (response as Record<string, unknown>)?.data;
    if (Array.isArray(data) && data.length > 0) {
      const base64 = data[0]?.base64;
      if (base64) return `data:image/png;base64,${base64}`;
      const imageUrl = data[0]?.url;
      if (imageUrl) return imageUrl as string;
    }
  }

  throw new Error("Image generation failed - no AI image API available. Set KIE_API_KEY, ZAI_BASE_URL+ZAI_API_KEY, or OPENAI_API_KEY for image generation.");
}

// ─── Image generation with fallback to z-ai-web-dev-sdk ────────────────
async function imageGeneration(prompt: string, size: string = "768x1344"): Promise<Record<string, unknown> | null> {
  const config = getAIConfig();
  if (config) {
    try {
      return await imageGenerationDirect(config, prompt, size);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Carousel] Env var image API failed:", msg);
    }
  }

  const zai = await createZAIFromConfig();
  if (zai) {
    try {
      return await zai.images.generations.create({ prompt, size }) as unknown as Record<string, unknown>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Carousel] ZAI SDK image generation failed:", msg);
    }
  }

  return null;
}

// ─── Direct image generation API call ────────────────────────────────
async function imageGenerationDirect(config: AIConfig, prompt: string, size: string = "768x1344") {
  const url = `${config.baseUrl}/images/generations`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };

  if (config.provider === "zai") {
    headers["X-Z-AI-From"] = "Z";
    if (config.chatId) headers["X-Chat-Id"] = config.chatId;
    if (config.userId) headers["X-User-Id"] = config.userId;
    if (config.token) headers["X-Token"] = config.token;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, size }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Image generation API failed (${response.status}): ${errorBody.slice(0, 500)}`);
  }

  return await response.json();
}

// ─── POST /api/generate-carousel ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { idea, kieApiKey, numCarousels = 1, language = "en" } = body;

    if (!idea || idea.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a carousel idea (at least 5 characters)" },
        { status: 400 }
      );
    }

    // Use admin-provided key from client, or fall back to server env variable
    const finalKieApiKey = (kieApiKey && kieApiKey.length >= 10) ? kieApiKey : process.env.KIE_API_KEY;

    // Always use kie.ai for nano_banana_2
    const useKieAi = !!(finalKieApiKey && finalKieApiKey.length >= 10);
    console.log(`[Carousel] Image generation method: ${useKieAi ? 'kie.ai (nano-banana-2)' : 'built-in AI API'}`);

    const carouselCount = Math.max(1, Math.min(10, parseInt(numCarousels) || 1));

    // Step 1: Generate carousel content with AI (multiple distinct carousels)
    console.log(`[Carousel] Generating ${carouselCount} distinct carousels for idea: "${idea.slice(0, 50)}..."`);

    const carouselsContent = await generateCarouselContent(idea.trim(), carouselCount, language || "en");

    // Step 2: Generate images for each carousel
    const carouselsWithImages = [];

    for (let c = 0; c < carouselsContent.length; c++) {
      const { carouselTitle, slides } = carouselsContent[c];
      const slidesWithImages = [];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        try {
          let imageUrl: string;
          if (useKieAi) {
            imageUrl = await generateSlideImageKie(
              slide.imagePrompt,
              finalKieApiKey!,
              i,
              slides.length,
              c,
              carouselsContent.length
            );
          } else {
            console.log(`[Carousel] Carousel ${c + 1} Slide ${i + 1}/${slides.length}: generating with built-in AI API...`);
            imageUrl = await generateSlideImageBuiltIn(slide.imagePrompt);
            console.log(`[Carousel] Carousel ${c + 1} Slide ${i + 1}/${slides.length}: image ready!`);
          }
          slidesWithImages.push({
            ...slide,
            imageUrl,
            status: "done" as const,
          });
        } catch (imgErr) {
          const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
          console.error(`[Carousel] Carousel ${c + 1} Slide ${i + 1} image failed:`, msg);
          slidesWithImages.push({
            ...slide,
            imageUrl: null,
            status: "image_failed" as const,
            error: msg,
          });
        }
      }

      carouselsWithImages.push({
        carouselTitle,
        slides: slidesWithImages.map(s => ({
          ...s,
          slideType: s.slideType || "hero",
          headerText: s.headerText ?? null,
          bodyText: s.bodyText ?? null,
          textPosition: s.textPosition || "top",
        })),
      });
    }

    return NextResponse.json({
      success: true,
      carousels: carouselsWithImages,
      idea: idea.trim(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/generate-carousel error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
