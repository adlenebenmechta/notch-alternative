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

// ─── Carousel Skill Prompt (Flexible Slide Count) ────────────────────────────
// Model: Nano Banana 2 (nano_banana_2), 3:4 aspect ratio, product as reference
// Text style: bold white rounded font with solid black outline, ~22% from top
// Slide count: 3-8 per carousel (AI decides based on topic), last slide always "product"

const CAROUSEL_SKILL_PROMPT = `You are an expert at designing viral marketing carousel content for social media (Instagram, TikTok).

## LOCKED SETTINGS (never change these)
- Image model: Nano Banana 2 (nano_banana_2), 3:4 aspect ratio (768x1344)
- The product is imported as reference so the tin/pack ALWAYS matches across all slides
- Text is baked into the images (bold white rounded font with solid black outline, positioned ~22% from the top, never at the top edge)

## FLEXIBLE SLIDE COUNT
- Each carousel can have between 3 and 8 slides — choose the number that best fits the topic and storytelling flow
- Some topics need only 3 slides (quick punchy hook → key point → product), others benefit from 6-8 slides (building a narrative arc)
- Each carousel in a batch can have a DIFFERENT number of slides
- Vary the slide count across carousels to create diversity

## AVAILABLE SLIDE TYPES (choose from these, in any order except the last)
- **hero**: Product hero shot on a dramatic background, with bold visual arrows or pointers drawing the eye to the product. Photorealistic, studio lighting.
  - image_prompt MUST include: "product hero shot, dramatic lighting, visual arrows pointing at product, studio photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A punchy hook headline (max 6 words) about the DESIRE not the problem
  - body_text: null (let the visual do the talking)

- **quote**: A relatable scene of someone talking, whispering, or in a conversation setting. Natural candid moment. Product subtly visible. Photorealistic, natural lighting.
  - image_prompt MUST include: "candid conversation scene, person whispering or talking naturally, product subtly visible, lifestyle photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A powerful quote or statement in quotes (max 8 words)
  - body_text: A supporting line that amplifies the quote (max 12 words)

- **comparison**: Split or side-by-side visual — the "wrong way" on one side and the "right way" (with product) on the other. Clean, minimal, photorealistic.
  - image_prompt MUST include: "split comparison scene, wrong way vs right way, before and after visual, clean minimal background, product on the correct side, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: "❌ [the wrong way]" on first line, then "✅ [the right way with product]" on second line
  - body_text: null

- **tip**: A lifestyle scene showing someone benefiting from a tip or trick related to the product. Natural, relatable.
  - image_prompt MUST include: "lifestyle scene showing tip or trick being used, person benefiting from advice, product naturally present, lifestyle photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A practical tip or advice headline starting with "💡" or "Pro tip:" (max 8 words)
  - body_text: Brief explanation of the tip (max 15 words)

- **stat**: A scene that visually represents data or a surprising number. The product is visible in the scene.
  - image_prompt MUST include: "scene visually representing data or statistics, surprising number visual, product present in scene, photorealistic, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A surprising statistic with a number and "%" or "x" (max 8 words)
  - body_text: Brief context for the stat (max 12 words)

- **question**: A thought-provoking scene with someone looking curious or pondering. The product is visible.
  - image_prompt MUST include: "person looking curious or pondering, thought-provoking scene, product visible, candid photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A provocative question that makes the viewer stop scrolling (max 8 words)
  - body_text: null or a brief follow-up (max 10 words)

- **problem**: A scene showing the pain point or frustration the product solves. Relatable, emotional.
  - image_prompt MUST include: "person showing frustration or pain point, relatable problem scene, emotional, product not yet visible, photorealistic, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A relatable problem statement (max 8 words)
  - body_text: null or brief amplification (max 10 words)

- **benefit**: A scene showing the positive outcome or transformation after using the product. Aspirational.
  - image_prompt MUST include: "person experiencing positive outcome or transformation, aspirational scene, product naturally present, lifestyle photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: A benefit statement starting with a verb like "Feel", "Get", "Enjoy" (max 8 words)
  - body_text: Brief elaboration (max 12 words)

- **feature**: A close-up or detail shot highlighting a specific product feature. Studio or lifestyle.
  - image_prompt MUST include: "close-up detail shot of product feature, highlighting specific aspect, studio or lifestyle photography, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: Feature name or highlight (max 6 words)
  - body_text: Brief explanation of why it matters (max 12 words)

- **product** (ALWAYS THE LAST SLIDE): The product (tin/pack) centered on a PURE WHITE background, clean, professional product photography, no shadows, no props. Like an Amazon listing photo.
  - image_prompt MUST include: "product tin pack centered on pure white background, professional product photography, clean, no shadows, no props, Amazon listing style, NO TEXT NO WORDS NO LETTERS IN IMAGE"
  - header_text: The product name or tagline (max 5 words)
  - body_text: A single clear CTA command (max 6 words), like "Order now — link in bio"

## RULES
- The LAST slide must ALWAYS be type "product" (product on pure white background) — no exceptions
- Each carousel must have a DIFFERENT creative angle and DIFFERENT slide structure (different types and different count)
- Choose slide types that create the best storytelling arc for each carousel's angle
- image_prompt is ALWAYS in English even if content is in another language
- image_prompt must describe a photorealistic scene (NOT illustration, NOT graphic design, NOT infographic)
- ⛔ ABSOLUTELY NO TEXT/WORDS/LETTERS in image_prompt — text goes in header_text and body_text only
- The product tin/pack must appear consistently across all slides of each carousel
- text_position is always "top" (text is ~22% from top, never at the edge)
- If a product description is provided, tailor the content to that specific product — use its real features, benefits, and use cases

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
          "slide_type": "one of: hero, quote, comparison, tip, stat, question, problem, benefit, feature, product",
          "image_prompt": "...",
          "header_text": "...",
          "body_text": "... or null",
          "text_position": "top"
        }
      ]
    }
  ]
}

Generate EXACTLY the number of carousels requested by the user. Each must have a completely different creative angle, slide structure, and slide count. The last slide of EVERY carousel must be type "product".`;

// ─── Template-based fallback (random slide count, 3-6 slides) ──────────────
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

  // Available slide types for the middle slides (before the product slide)
  const middleSlideTypes: Array<"hero" | "quote" | "comparison" | "tip" | "stat" | "question" | "problem" | "benefit" | "feature"> = [
    "hero", "quote", "comparison", "tip", "stat", "question", "problem", "benefit", "feature",
  ];

  // Template content generators per slide type
  const slideTypeTemplates: Record<string, {
    getTitle: (idea: string, angle: string, isAr: boolean, isFr: boolean) => string;
    getBody: (idea: string, angle: string, isAr: boolean, isFr: boolean) => string | null;
    getImagePrompt: (idea: string) => string;
  }> = {
    hero: {
      getTitle: (_idea, angle, isAr, isFr) => isAr ? `${angle} أخيراً!` : isFr ? `${angle} enfin !` : `${angle} — finally!`,
      getBody: () => null,
      getImagePrompt: (idea) => `Product hero shot on dramatic background, visual arrows pointing at product, studio lighting, professional photography, 3:4 ratio, related to ${idea}`,
    },
    quote: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? `"لم أصدق النتيجة"` : isFr ? `"Je n'ai pas cru au résultat"` : `"I couldn't believe the results"`,
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "كل من جربها وافق" : isFr ? "Tous ceux qui ont essayé sont d'accord" : "Everyone who tried agrees",
      getImagePrompt: (idea) => `Candid conversation scene, person whispering naturally, product subtly visible, lifestyle photography, related to ${idea}`,
    },
    comparison: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? `❌ الطريقة القديمة\n✅ مع منتجنا` : isFr ? `❌ L'ancienne méthode\n✅ Avec notre produit` : `❌ The old way\n✅ With our product`,
      getBody: () => null,
      getImagePrompt: (idea) => `Split comparison scene, wrong way vs right way, before and after visual, clean minimal background, product on correct side, related to ${idea}`,
    },
    tip: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "💡 نصيحة ذهبية" : isFr ? "💡 Conseil d'or" : "💡 Pro tip for best results",
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "استخدمه يومياً للنتيجة المثالية" : isFr ? "Utilisez-le quotidiennement pour des résultats optimaux" : "Use it daily for the best results",
      getImagePrompt: (idea) => `Lifestyle scene showing tip or trick being used, person benefiting from advice, product naturally present, lifestyle photography, related to ${idea}`,
    },
    stat: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "97% يلاحظون الفرق" : isFr ? "97% remarquent la différence" : "97% see the difference",
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "رقم حقيقي من مستخدمين حقيقيين" : isFr ? "Un chiffre réel de vrais utilisateurs" : "Real number from real users",
      getImagePrompt: (idea) => `Scene visually representing data or statistics, surprising number visual, product present in scene, photorealistic, related to ${idea}`,
    },
    question: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "هل تعاني من هذه المشكلة؟" : isFr ? "Vous souffrez de ce problème ?" : "Still struggling with this?",
      getBody: () => null,
      getImagePrompt: (idea) => `Person looking curious or pondering, thought-provoking scene, product visible, candid photography, related to ${idea}`,
    },
    problem: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "المشكلة التي تزعج الجميع" : isFr ? "Le problème qui dérange tout le monde" : "The problem everyone hates",
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "انتهى الأمر الآن" : isFr ? "C'est enfin fini" : "It ends now",
      getImagePrompt: (idea) => `Person showing frustration or pain point, relatable problem scene, emotional, product not yet visible, photorealistic, related to ${idea}`,
    },
    benefit: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "شعر بالفرق من أول مرة" : isFr ? "Sentez la différence dès la première fois" : "Feel the difference instantly",
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "نتائج ملموسة وسريعة" : isFr ? "Des résultats tangibles et rapides" : "Real results you can see and feel",
      getImagePrompt: (idea) => `Person experiencing positive outcome or transformation, aspirational scene, product naturally present, lifestyle photography, related to ${idea}`,
    },
    feature: {
      getTitle: (_idea, _angle, isAr, isFr) => isAr ? "ميزة فريدة" : isFr ? "Caractéristique unique" : "What makes it unique",
      getBody: (_idea, _angle, isAr, isFr) => isAr ? "تصميم مبتكر يعمل بشكل أفضل" : isFr ? "Conception innovante qui fonctionne mieux" : "Innovative design that works better",
      getImagePrompt: (idea) => `Close-up detail shot of product feature, highlighting specific aspect, studio or lifestyle photography, related to ${idea}`,
    },
  };

  const carousels: Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> = [];

  // Use a seeded pseudo-random based on idea to get consistent but varied results
  let seed = 0;
  for (let i = 0; i < idea.length; i++) seed = ((seed << 5) - seed + idea.charCodeAt(i)) | 0;
  const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };

  for (let c = 0; c < numCarousels; c++) {
    const angle = angles[c % angles.length];
    const carouselTitle = `${angle} — ${idea.slice(0, 30)}`;
    const ctaText = isAr ? "اطلب الآن!" : isFr ? "Commandez maintenant!" : "Order now!";

    // Random slide count between 3 and 6 for template fallback
    const slideCount = 3 + Math.floor(seededRandom() * 4); // 3, 4, 5, or 6

    // Pick random middle slide types (all but the last which is always "product")
    const middleCount = slideCount - 1;
    const usedTypes: string[] = [];
    const availableTypes = [...middleSlideTypes];

    for (let s = 0; s < middleCount; s++) {
      // Always start with hero if it's the first slide
      if (s === 0) {
        usedTypes.push("hero");
        const heroIdx = availableTypes.indexOf("hero");
        if (heroIdx > -1) availableTypes.splice(heroIdx, 1);
      } else {
        // Pick a random type from remaining available
        const typeIdx = Math.floor(seededRandom() * availableTypes.length);
        const chosenType = availableTypes[typeIdx];
        usedTypes.push(chosenType);
        // Allow reuse of some types but prefer variety
        if (availableTypes.length > 1) availableTypes.splice(typeIdx, 1);
      }
    }

    const slides = usedTypes.map((slideType, i) => {
      const template = slideTypeTemplates[slideType];
      const title = template.getTitle(idea, angle, isAr, isFr);
      const body = template.getBody(idea, angle, isAr, isFr);
      const imagePrompt = template.getImagePrompt(idea);

      return {
        slideNumber: i + 1,
        slideType,
        title,
        body: body || "",
        imagePrompt: enforcePhotorealisticPrompt(imagePrompt),
        headerText: title,
        bodyText: body,
        textPosition: "top" as const,
      };
    });

    // Always add product slide as the last one
    slides.push({
      slideNumber: slideCount,
      slideType: "product",
      title: idea.slice(0, 20),
      body: ctaText,
      imagePrompt: enforcePhotorealisticPrompt(`Product tin pack centered on pure white background, professional product photography, clean, no shadows, no props, Amazon listing style, related to ${idea}`),
      headerText: idea.slice(0, 20),
      bodyText: ctaText,
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
          const validSlideTypes = ["hero", "quote", "comparison", "tip", "stat", "question", "problem", "benefit", "feature", "product"];
          const slides = rawSlides.map((slide: Record<string, unknown>, i: number) => {
            const rawType = (slide.slide_type as string) || "hero";
            // Validate slide type; if invalid, pick a sensible default based on position
            const slideType = validSlideTypes.includes(rawType) ? rawType : (i === rawSlides.length - 1 ? "product" : "hero");
            return {
              slideNumber: (slide.slide_number as number) || i + 1,
              slideType,
              title: (slide.header_text as string) || (slide.title as string) || `Slide ${i + 1}`,
              body: (slide.body_text as string) || (slide.body as string) || "",
              imagePrompt: enforcePhotorealisticPrompt((slide.image_prompt as string) || `Professional photograph related to ${idea}, realistic, natural lighting`),
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
              imagePrompt: enforcePhotorealisticPrompt(`Product tin pack centered on pure white background, professional product photography, clean, no shadows, no props, Amazon listing style, related to ${idea}`),
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

// ─── Generate a single slide image via kie.ai (nano_banana_2) ──────────
async function generateSlideImageKie(
  imagePrompt: string,
  apiKey: string,
  slideIndex: number,
  totalSlides: number,
  carouselIndex: number,
  totalCarousels: number,
  referenceImageUrl?: string
): Promise<string> {
  // Build input object for kie.ai nano-banana-2 API
  // Use image_size (not aspect_ratio/output_format — those cause "File type not supported")
  // ONLY include image_input when a reference image is provided
  const input: Record<string, unknown> = {
    prompt: imagePrompt,
    image_size: "768x1344",
  };
  if (referenceImageUrl) {
    input.image_input = [referenceImageUrl];
    console.log(`[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}: using reference image for product consistency`);
  }

  const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input,
    }),
  });

  const submitText = await submitRes.text();
  console.log(`[Carousel] kie.ai createTask response for carousel ${carouselIndex + 1} slide ${slideIndex + 1}: ${submitText.slice(0, 300)}`);
  console.log(`[Carousel] kie.ai createTask input: prompt=${imagePrompt.slice(0, 100)}, image_size=${input.image_size}, has_image_input=${!!input.image_input}`);

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
