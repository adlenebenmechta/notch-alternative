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

// ─── UGC Image prompt enforcement: iPhone-style photo WITH baked-in text ──
// UGC methodology: hyperrealistic phone photo, text baked into the image
const UGC_PROMPT_PREFIX = "Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: ";
const UGC_PROMPT_SUFFIX = " Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.";

function enforceUGCPrompt(prompt: string): string {
  // Don't strip text-related words — text is BAKED INTO the image in UGC mode
  // Just ensure the UGC prefix and suffix are present
  const lower = prompt.toLowerCase();
  const hasPrefix = lower.startsWith("hyper realistic photorealistic photo shot on an iphone 15 pro max");
  const hasSuffix = lower.includes("authentic unfiltered phone snapshot");

  let result = prompt.trim();

  // Remove any old "NO TEXT" restrictions if they slipped in
  result = result
    .replace(/absolutely NO TEXT NO WORDS NO LETTERS NO TYPOGRAPHY IN IMAGE\.?\s*/gi, "")
    .replace(/\bNO TEXT NO WORDS NO LETTERS IN IMAGE\b,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!hasPrefix) {
    result = UGC_PROMPT_PREFIX + result;
  }
  if (!hasSuffix) {
    result = result + UGC_PROMPT_SUFFIX;
  }

  return result;
}

// ─── Carousel Skill Prompt (UGC Methodology) ───────────────────────────────
// Model: Nano Banana Pro (edit mode), 3:4 aspect ratio (768x1344)
// Text is BAKED INTO the image (bold white rounded sans-serif + solid black outline)
// Text position: ~22% down from the top, never touching the top edge
// Slide count: 3-6 per carousel (hook + 1-3 middle + product), last slide always "product"

const CAROUSEL_SKILL_PROMPT = `You are an expert at creating viral-style UGC (User-Generated Content) product carousels for TikTok and Instagram.

## YOUR TASK
Given a product idea/description (and optionally real product info from a product link), generate carousel plans. Each carousel is a set of hyperrealistic "shot on iPhone" images with caption text BAKED INTO each image, ending on a clean product-on-white slide.

## CORE RULES (NEVER BREAK THESE)

1. EVERY slide is a hyperrealistic phone photo, not a polished ad.
   - Every image_prompt MUST start with: "Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max"
   - Every image_prompt MUST end with: "Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic"

2. TEXT IS BAKED INTO THE IMAGE — you never add it afterward.
   - The image_prompt must DESCRIBE the caption text inside it, using this exact phrasing:
     "Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: \\"[CAPTION]\\"", positioned about 22% down from the top of the frame (not at the very top edge)"
   - Caption style: bold white rounded sans-serif font with solid black outline (TikTok caption look)
   - Caption position: about 22% down from the top — never touching the top edge

3. PRODUCT REFERENCE: On every slide that shows the product, the image_prompt MUST include:
   "exactly matching the reference product's design, logo, colors and typography"
   (The product image is passed as a reference input to the image model separately — you just need to mention it in the prompt.)

4. LAST SLIDE: Always the product on a PURE WHITE seamless background with a soft realistic shadow, plus a short caption + a smaller line under it.

## PLANNING EACH CAROUSEL

- Give each carousel ONE marketing angle tied to a REAL product benefit.
- If product info is provided, use its ACTUAL claims (e.g., "UPF 50+", "blocks 98% UV", "24-hour hydration") — NEVER invent claims.
- If making multiple carousels: each gets a DIFFERENT angle AND different scenes.
- Rotate the person across carousels: different gender, age (20s-30s), location, lighting, camera feel.
- Do NOT reuse the same setup twice across carousels.
- Mirror selfies: max once per batch.

## SLIDE STRUCTURE (mini story)

Each carousel has 3-6 slides:
- Slide 1 (HOOK): product in a real-world scene + big benefit caption + one white hand-drawn arrow pointing at the product.
- Middle slide(s): a person actually using it (person_using), a candid moment (candid), or a X-vs-check comparison flat-lay (comparison) — reinforcing the benefit.
- Last slide: product on pure white background (product).

## PROMPT TEMPLATES (use these exactly, filling in the brackets)

### Hook slide (ALWAYS slide 1):
Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: [person + action + the exact PRODUCT, exactly matching the reference product's design, logo, colors and typography]. [Location + 3-4 realism details + lighting]. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "[CAPTION]", positioned about 22% down from the top of the frame (not at the very top edge), plus one white hand-drawn arrow with black outline in the lower area pointing at the product. No other text or graphics. Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.

### Person-using slide (middle):
Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: [person of specified gender/age actually using the PRODUCT in a real setting, exactly matching the reference product's design, logo, colors and typography]. [Location + 3-4 realism details + lighting]. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "[CAPTION]", positioned about 22% down from the top of the frame (not at the very top edge). No other text or graphics. Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.

### Candid slide (middle):
Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: [candid unposed moment related to the product benefit, the PRODUCT visible in the scene exactly matching the reference product's design, logo, colors and typography]. [Location + 3-4 realism details + lighting]. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "[CAPTION]", positioned about 22% down from the top of the frame (not at the very top edge). No other text or graphics. Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.

### Comparison slide (optional middle):
Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: top-down flat-lay [surface + setting]. Left side: [old/inferior solution] with a bold red X over it. Right side: the PRODUCT (exactly matching the reference product's design, logo, colors and typography) with a bold green check over it. Baked-in TikTok-style captions in bold white rounded sans-serif with solid black outline in the upper third (below the top edge): left "[Name + emoji]" with line "[drawback]"; right "[Name + emoji]" with line "[benefit]". No other text or graphics. Authentic unfiltered phone snapshot, not polished, not cinematic.

### Final product slide (ALWAYS last):
Clean studio product photo: the PRODUCT (exactly matching the reference product's design, logo, colors, typography) centered on a pure white seamless background with a soft realistic shadow beneath, logo facing camera perfectly legible, true to life texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline, placed in the upper-middle area above the product (not at the very top edge): "[ACTION LINE]" and directly under it slightly smaller "([supporting detail})". No other text or graphics outside the product and caption. Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.

## RULES
- Each carousel: 3-6 slides (1 hook + 1-3 middle + 1 product)
- Each carousel in a batch: DIFFERENT angle, DIFFERENT scene, DIFFERENT person (gender/age 20s-30s)
- image_prompt: ALWAYS in English (except the [CAPTION] text which follows the user's language)
- header_text and body_text: in the user's language (for display + PostPeer caption)
- The caption text [CAPTION] inside image_prompt MUST MATCH header_text (and body_text if present)
- Last slide: ALWAYS type "product"
- Keep captions SHORT and SIMPLE (2-8 words) — AI image models misspell long text often
- The hook slide MUST include the white hand-drawn arrow pointing at the product
- The product slide MUST have pure white seamless background + soft realistic shadow

## LANGUAGE
- If the user writes in Arabic -> header_text/body_text in Arabic, and the [CAPTION] inside image_prompt in Arabic too
- If the user writes in English -> all text in English
- If the user writes in French -> all text in French
- The image_prompt structure (templates above) is always in English, but the [CAPTION] text inside follows the user's language

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "carousels": [
    {
      "carousel_title": "Short unique title for this carousel",
      "marketing_angle": "The single real product benefit this carousel focuses on",
      "slides": [
        {
          "slide_number": 1,
          "slide_type": "hook",
          "image_prompt": "Full prompt following the hook template, with brackets filled in, INCLUDING the baked-in caption and arrow",
          "header_text": "The caption text (same as [CAPTION] in image_prompt, for display)",
          "body_text": "null (hook slides have no body text)",
          "text_position": "top"
        },
        ...1-3 middle slides (person_using, candid, or comparison)...,
        {
          "slide_number": N,
          "slide_type": "product",
          "image_prompt": "Full prompt following the final product slide template",
          "header_text": "Action line (e.g., 'Get yours today')",
          "body_text": "Supporting detail (e.g., 'Link in bio')",
          "text_position": "top"
        }
      ]
    }
  ]
}

## QUALITY CHECK (self-check before returning)
- Product matches the reference (logo, colors, label legible) — mentioned in every image_prompt
- Caption is white with black outline, not touching the top edge — described in every image_prompt
- Last slide background is pure white — specified in the product slide template
- Across carousels: different angle, different scene, different person each time
- No typos in caption text — keep captions short and simple
- Hook slide has the white hand-drawn arrow

Generate EXACTLY the number of carousels requested. Each must have a completely different creative angle, scene, person, and slide structure. The last slide of EVERY carousel must be type "product".`;

// ─── Template-based fallback (UGC style, 3-6 slides, text baked in) ────────
function generateTemplateCarousels(
  idea: string,
  numCarousels: number,
  language: string
): Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> {
  const isAr = language === "ar";
  const isFr = language === "fr";

  // UGC angles — each tied to a product benefit
  const angles = isAr
    ? ["النتيجة التي تنتظرها", "الحل العملي", "الفارق الحقيقي", "تجربة مختلفة", "السر وراء النجاح"]
    : isFr
    ? ["Le resultat que vous attendez", "La solution pratique", "La vraie difference", "Une experience unique", "Le secret du succes"]
    : ["The result you want", "The practical fix", "The real difference", "A different experience", "The secret behind it"];

  // UGC persons — rotate gender/age/setting per carousel
  const persons = [
    "a 25-year-old woman with curly hair, wearing casual streetwear",
    "a 28-year-old man with short beard, wearing a plain t-shirt",
    "a 23-year-old woman with glasses, wearing athleisure",
    "a 30-year-old man with man-bun, wearing a hoodie",
    "a 26-year-old woman with straight hair, wearing a denim jacket",
  ];

  // UGC locations — rotate per carousel
  const locations = [
    "sunny kitchen counter, morning light streaming through window, coffee mug nearby, marble countertop",
    "modern bathroom shelf, soft fluorescent lighting, toiletries in background, white tiles",
    "cozy bedroom nightstand, warm lamp light, books and phone nearby, wooden surface",
    "office desk, natural daylight from window, laptop and notebook in background, clean white surface",
    "outdoor patio table, golden hour lighting, plants in background, rustic wood surface",
  ];

  const carousels: Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> = [];

  // Seeded pseudo-random for consistent but varied results
  let seed = 0;
  for (let i = 0; i < idea.length; i++) seed = ((seed << 5) - seed + idea.charCodeAt(i)) | 0;
  const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };

  for (let c = 0; c < numCarousels; c++) {
    const angle = angles[c % angles.length];
    const person = persons[c % persons.length];
    const location = locations[c % locations.length];
    const carouselTitle = `${angle} — ${idea.slice(0, 30)}`;
    const ctaText = isAr ? "اطلب الآن" : isFr ? "Commandez maintenant" : "Order now";
    const ctaSub = isAr ? "الرابط في البايو" : isFr ? "Lien dans la bio" : "Link in bio";

    // Random slide count: 3-5 (hook + 1-2 middle + product)
    const slideCount = 3 + Math.floor(seededRandom() * 3); // 3, 4, or 5

    const slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> = [];

    // ─── Slide 1: HOOK ───
    const hookCaption = isAr ? `${angle}!` : isFr ? `${angle} !` : `${angle}!`;
    slides.push({
      slideNumber: 1,
      slideType: "hook",
      title: hookCaption,
      body: "",
      imagePrompt: enforceUGCPrompt(
        `${person} holding the ${idea} product, exactly matching the reference product's design, logo, colors and typography. ${location}. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "${hookCaption}", positioned about 22% down from the top of the frame (not at the very top edge), plus one white hand-drawn arrow with black outline in the lower area pointing at the product. No other text or graphics.`
      ),
      headerText: hookCaption,
      bodyText: null,
      textPosition: "top" as const,
    });

    // ─── Middle slides: person_using or candid ───
    const middleCount = slideCount - 2; // minus hook and product
    for (let s = 0; s < middleCount; s++) {
      const midCaption = isAr
        ? s === 0 ? "استخدمتها هكذا" : "النتيجة واضحة"
        : isFr
        ? s === 0 ? "Je l'utilise comme ca" : "Le resultat parle"
        : s === 0 ? "This is how I use it" : "The result speaks";
      const midType = s === 0 ? "person_using" : "candid";
      const midAction = s === 0
        ? `${person} actually using the ${idea} product in real-time, exactly matching the reference product's design, logo, colors and typography`
        : `candid unposed moment with the ${idea} product naturally visible in the scene, exactly matching the reference product's design, logo, colors and typography`;

      slides.push({
        slideNumber: s + 2,
        slideType: midType,
        title: midCaption,
        body: "",
        imagePrompt: enforceUGCPrompt(
          `${midAction}. ${location}. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "${midCaption}", positioned about 22% down from the top of the frame (not at the very top edge). No other text or graphics.`
        ),
        headerText: midCaption,
        bodyText: null,
        textPosition: "top" as const,
      });
    }

    // ─── Last slide: PRODUCT on pure white ───
    slides.push({
      slideNumber: slideCount,
      slideType: "product",
      title: ctaText,
      body: ctaSub,
      imagePrompt: enforceUGCPrompt(
        `Clean studio product photo: the ${idea} product (exactly matching the reference product's design, logo, colors, typography) centered on a pure white seamless background with a soft realistic shadow beneath, logo facing camera perfectly legible, true to life texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline, placed in the upper-middle area above the product (not at the very top edge): "${ctaText}" and directly under it slightly smaller "(${ctaSub})". No other text or graphics outside the product and caption.`
      ),
      headerText: ctaText,
      bodyText: ctaSub,
      textPosition: "top" as const,
    });

    carousels.push({ carouselTitle, slides });
  }

  return carousels;
}

// ─── Generate carousel content with AI ──────────────────────────────────
async function generateCarouselContent(
  idea: string,
  numCarousels: number,
  language: string,
  productDescription?: string
): Promise<Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }>> {
  // Build the user message, including product description if available
  let userMessage = `Generate ${numCarousels} carousel(s) about: ${idea.trim()}. Language: ${language}. Each carousel must have a different creative angle and different slide structure. Choose between 3-8 slides per carousel based on what fits the topic best. The last slide must always be type "product".`;
  if (productDescription) {
    userMessage += `\n\nProduct info: ${productDescription.trim()}. Tailor the content to this specific product — use its real features, benefits, and use cases.`;
  }

  const completion = await chatCompletion([
    {
      role: "system",
      content: CAROUSEL_SKILL_PROMPT,
    },
    {
      role: "user",
      content: userMessage,
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
          const validSlideTypes = ["hook", "person_using", "candid", "comparison", "hero", "quote", "tip", "stat", "question", "problem", "benefit", "feature", "product"];
          const slides = rawSlides.map((slide: Record<string, unknown>, i: number) => {
            const rawType = (slide.slide_type as string) || "hook";
            // Validate slide type; if invalid, pick a sensible default based on position
            const slideType = validSlideTypes.includes(rawType) ? rawType : (i === rawSlides.length - 1 ? "product" : "hook");
            return {
              slideNumber: (slide.slide_number as number) || i + 1,
              slideType,
              title: (slide.header_text as string) || (slide.title as string) || `Slide ${i + 1}`,
              body: (slide.body_text as string) || (slide.body as string) || "",
              imagePrompt: enforceUGCPrompt((slide.image_prompt as string) || `Person holding the ${idea} product, exactly matching the reference product's design, logo, colors and typography. Real-world scene, candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "Check this out", positioned about 22% down from the top of the frame (not at the very top edge). No other text or graphics.`),
              headerText: (slide.header_text as string | null) ?? null,
              bodyText: (slide.body_text as string | null) ?? null,
              textPosition: (slide.text_position as string) || "top",
            };
          });
          // Ensure the last slide is always "product"
          if (slides.length > 0 && slides[slides.length - 1].slideType !== "product") {
            slides[slides.length - 1] = {
              ...slides[slides.length - 1],
              slideType: "product",
              imagePrompt: enforceUGCPrompt(`Clean studio product photo: the ${idea} product (exactly matching the reference product's design, logo, colors, typography) centered on a pure white seamless background with a soft realistic shadow beneath, logo facing camera perfectly legible, true to life texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline, placed in the upper-middle area above the product (not at the very top edge): "Order now" and directly under it slightly smaller "(Link in bio)". No other text or graphics outside the product and caption.`),
            };
          }
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

// ─── Generate a single slide image via kie.ai (nano-banana-pro with fallback) ──
// UGC methodology: uses Nano Banana Pro (edit mode) as primary model.
// Falls back to nano-banana-2 if Pro is unavailable.
// Always passes product image as reference (image_input) for logo/color consistency.
async function generateSlideImageKie(
  imagePrompt: string,
  apiKey: string,
  slideIndex: number,
  totalSlides: number,
  carouselIndex: number,
  totalCarousels: number,
  referenceImageUrl?: string
): Promise<string> {
  // Build input object for kie.ai API
  // Use image_size (not aspect_ratio/output_format — those cause "File type not supported")
  // Include image_input (product reference) whenever available — UGC methodology requires it
  const input: Record<string, unknown> = {
    prompt: imagePrompt,
    image_size: "768x1344",
  };
  if (referenceImageUrl) {
    input.image_input = [referenceImageUrl];
    console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: using product reference image for UGC consistency`);
  }

  // Try Nano Banana Pro first (user's preferred model for UGC), fall back to nano-banana-2
  const models = ["nano-banana-pro", "nano-banana-2"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: trying model ${model}...`);

      const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input }),
      });

      const submitText = await submitRes.text();
      console.log(`[Carousel] kie.ai (${model}) createTask response for carousel ${carouselIndex + 1} slide ${slideIndex + 1}: ${submitText.slice(0, 300)}`);

      let submitJson: Record<string, unknown>;
      try {
        submitJson = JSON.parse(submitText);
      } catch {
        throw new Error(`kie.ai (${model}) returned non-JSON: ` + submitText.slice(0, 200));
      }

      if (submitJson.code !== 200) {
        const errMsg = (submitJson.msg as string) || submitText.slice(0, 200);
        // If model not found/supported, try next model
        if (errMsg.toLowerCase().includes("model") || errMsg.toLowerCase().includes("not found") || errMsg.toLowerCase().includes("not support")) {
          console.warn(`[Carousel] Model ${model} not available (${errMsg}), trying next...`);
          lastError = new Error(`Model ${model}: ${errMsg}`);
          continue;
        }
        // For other errors, throw immediately
        throw new Error(
          "Failed to submit image for carousel " + (carouselIndex + 1) + " slide " + (slideIndex + 1) + " (" + model + "): " + errMsg
        );
      }

      const taskId = submitJson.data?.taskId;
      if (!taskId) {
        throw new Error("No taskId returned for carousel " + (carouselIndex + 1) + " slide " + (slideIndex + 1) + " (" + model + ")");
      }

      console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: ${model} task ${taskId} submitted, polling...`);
      const imageUrl = await pollKieImage(taskId, apiKey);
      console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: image ready (model: ${model})!`);
      return imageUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If this is a "model not available" error, continue to next model
      if (msg.includes("not available") || msg.toLowerCase().includes("not support") || msg.toLowerCase().includes("not found")) {
        console.warn(`[Carousel] Model ${model} failed (${msg}), trying next...`);
        lastError = err instanceof Error ? err : new Error(msg);
        continue;
      }
      // For other errors (timeout, generation failure), throw immediately
      throw err;
    }
  }

  throw lastError || new Error("All kie.ai models failed for carousel " + (carouselIndex + 1) + " slide " + (slideIndex + 1));
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
    const { idea, kieApiKey, numCarousels = 1, language = "en", productImageUrl, productLink } = body;

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
    // Validate productImageUrl — kie.ai only accepts public https:// URLs (NOT data: URLs, NOT internal URLs)
    let validProductImageUrl: string | undefined;
    if (productImageUrl && typeof productImageUrl === "string" && productImageUrl.trim()) {
      const url = productImageUrl.trim();
      if (url.startsWith("https://") && !url.includes("kobisto.com") && !url.includes("railway.app") && !url.includes("localhost")) {
        validProductImageUrl = url;
        console.log(`[Carousel] Valid product reference image URL: ${url.slice(0, 80)}...`);
      } else {
        console.warn(`[Carousel] Product image URL is not a valid public https URL — cannot use as kie.ai reference. URL type: ${url.startsWith("data:") ? "data URL" : url.startsWith("http://") ? "http (not https)" : "internal/self-referencing URL"}`);
      }
    }
    if (productLink) console.log(`[Carousel] Product link provided: ${productLink.slice(0, 80)}...`);

    const carouselCount = Math.max(1, Math.min(10, parseInt(numCarousels) || 1));

    // Step 0: Extract product info from productLink if provided
    let productDescription: string | undefined;
    if (productLink && typeof productLink === "string" && productLink.trim()) {
      console.log(`[Carousel] Extracting product info from link: ${productLink.trim().slice(0, 100)}`);
      try {
        const productInfoCompletion = await chatCompletion([
          {
            role: "user",
            content: `Based on this URL/domain, describe the product being sold. URL: ${productLink.trim()}. What is the product name, category, key features, and target audience? Keep it concise (2-3 sentences).`,
          },
        ], {
          temperature: 0.5,
          max_tokens: 300,
        });
        if (productInfoCompletion) {
          const productInfoContent = (productInfoCompletion as Record<string, unknown>)?.choices?.[0]?.message?.content;
          if (productInfoContent && typeof productInfoContent === "string") {
            productDescription = productInfoContent.trim();
            console.log(`[Carousel] Extracted product info: ${productDescription.slice(0, 100)}`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Carousel] Failed to extract product info from link: ${msg}`);
      }
    }

    // Step 1: Generate carousel content with AI (multiple distinct carousels)
    console.log(`[Carousel] Generating ${carouselCount} distinct carousels for idea: "${idea.slice(0, 50)}..."`);

    const carouselsContent = await generateCarouselContent(idea.trim(), carouselCount, language || "en", productDescription);

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
              carouselsContent.length,
              validProductImageUrl || undefined
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
