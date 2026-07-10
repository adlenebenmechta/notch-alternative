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

const CAROUSEL_SKILL_PROMPT = `You are an expert at creating viral-style UGC (User-Generated Content) product carousels for TikTok and Instagram. You write like a real person sharing a tip, not like a brand.

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

## THE ONE JOB OF EACH SLIDE

- **Slide 1 (HOOK) = the scroll-stopper.** It must promise a benefit or spark curiosity in under 6 words. This is the only text most people read. If it's boring, nothing else matters.
- **Middle slides = proof or relatability.** Show the benefit being true, or name the pain the viewer already feels.
- **Last slide = the nudge.** Tell them what to do / what they get, plainly.

## RULES FOR WRITING THE CAPTIONS

1. **Short beats clever.** "BLOCKS 98% OF UV RAYS" beats "The ultimate sun-defense technology." Aim for 3–6 words on hooks. If you can cut a word, cut it.
2. **Talk like a person texting, not a brand.** Lowercase middle captions ("melts on your tongue, no pills") feel native to TikTok. ALL CAPS only for the big hook line.
3. **Use one real number or claim.** Numbers feel true: "98%", "UPF 50+", "30 strips", "1 a day". Pull them from the actual product page — never invent them. A single concrete fact outperforms three vague adjectives.
4. **Lead with the benefit, not the feature.** Feature = "compression fabric." Benefit = "less fatigue, less soreness." The viewer cares what it does for them.
5. **One idea per slide.** Don't cram two benefits into one caption. Split them across slides.
6. **Emojis as punctuation, not decoration.** One emoji that matches the message (sun for sun, basketball for sport, check for the payoff). Never a string of them.

## HOOK FORMULAS (use one of these — they reliably work)

1. **POV:** "POV: it's week 6 of no sun and your energy is at 2%"
2. **The blunt claim:** "BLOCKS 98% OF UV RAYS" (with a sun emoji)
3. **The objection/answer:** "can't swallow big pills?" then next slide "just use strips"
4. **The overheard convo:** "bro why am I always tired lately?" / "vitamin D3" / "but I hate pills"
5. **Old way vs new way:** "pills (nausea emoji) vs strips (relieved emoji)" — the X/check slide
6. **The relatable fail:** "I buy vitamins and forget them in a drawer"

The convo and POV formats work because they feel like a real moment you're eavesdropping on, not an ad.

## STEP 1: ANALYZE THE PRODUCT FIRST (do this before writing any slides)

Before generating slides, analyze the product and choose the best approach:

1. **Identify the product category:** supplement/health, sports/performance, beauty/skincare, everyday/utility, food/beverage, tech/gadget, apparel/accessory, or other.
2. **Extract REAL benefits and claims** from the product info provided (or from the idea if no product info). Look for: numbers (98%, UPF 50+, 30 strips), specific features (compression fabric, UV blocking, dissolvable strips), pain points it solves (big pills, sun damage, fatigue).
3. **Pick the best carousel STRUCTURE** for this product from the menu below — the structure should fit the product's story, not force the product into a template.
4. **Decide slide count** based on how much story the product needs (3-8 slides). A simple benefit might need only 3; a product with multiple angles or a comparison might need 5-7.

## STEP 2: CHOOSE A CAROUSEL STRUCTURE (pick one per carousel — vary across batch)

Each carousel must use ONE of these structures. If making multiple carousels, each uses a DIFFERENT structure:

### Structure A: Problem → Solution → Product (3-4 slides)
Best for: products that solve a clear pain point.
- Slide 1 (problem): Show the pain relatably. Caption names the problem ("can't swallow big pills?").
- Slide 2 (solution): Introduce the product as the fix. Caption is the benefit ("just use strips").
- Slide 3 (product): Product on white + CTA.
- Optional Slide 2.5 (proof): A candid using-it shot or a comparison.

### Structure B: POV → Proof → Product (3-5 slides)
Best for: lifestyle/wellness products where the viewer should see themselves.
- Slide 1 (POV hook): "POV: it's week 6 of no sun and your energy is at 2%"
- Slide 2-3 (proof): Candid moments showing the fix in real life.
- Last slide (product): Product on white + CTA.

### Structure C: Blunt Claim → Evidence → Product (3-4 slides)
Best for: products with a strong number/claim (UPF 50+, blocks 98% UV).
- Slide 1 (claim): "BLOCKS 98% OF UV RAYS" (ALL CAPS, with sun emoji)
- Slide 2 (evidence): Person using it in the relevant setting (sunny outdoors).
- Slide 3 (product): Product on white + CTA.

### Structure D: Comparison (Old vs New) → Product (3-4 slides)
Best for: products that replace an inferior solution (pills vs strips, regular vs compression).
- Slide 1 (comparison flat-lay): "pills (nausea emoji) vs strips (relieved emoji)" — X over old, check over new.
- Slide 2 (in action): Person using the new way.
- Slide 3 (product): Product on white + CTA.

### Structure E: Objection → Answer → Product (3-5 slides)
Best for: products where people have a common hesitation.
- Slide 1 (objection): "can't swallow big pills?" or "too busy for skincare?"
- Slide 2 (answer): "just use strips" or "30 seconds, that's it"
- Slide 3-4 (proof): Show it being easy.
- Last slide (product): Product on white + CTA.

### Structure F: Overheard Convo → Product (3-4 slides)
Best for: products that spark conversation (supplements, wellness, relatable problems).
- Slide 1 (convo): "bro why am I always tired lately?" / "vitamin D3" / "but I hate pills"
- Slide 2 (the fix): Show the product as the answer.
- Slide 3 (product): Product on white + CTA.

### Structure G: Relatable Fail → The Fix → Product (3-4 slides)
Best for: products that fix a common behavior people laugh at.
- Slide 1 (the fail): "I buy vitamins and forget them in a drawer"
- Slide 2 (the fix): Show the product making it effortless.
- Slide 3 (product): Product on white + CTA.

### Structure H: Benefit Cascade → Product (4-6 slides)
Best for: products with multiple benefits worth showing separately.
- Slide 1 (hook): Lead with the biggest benefit.
- Slides 2-4 (one benefit each): Each slide shows ONE benefit in action.
- Last slide (product): Product on white + CTA.

**When in doubt:** Pick the structure that best matches the product's strongest selling point. A sun sleeve with UPF 50+ wants Structure C (blunt claim). A dissolvable vitamin strip wants Structure A or E. A compression sleeve wants Structure D or H.

## MAKING THE SEQUENCE FEEL HUMAN (NOT AI)

- **Vary the scenes and people across carousels** — different person, place, and moment each time. Repetition is the biggest tell of AI content.
- **Show someone doing something** — handing a coffee, racking a weight, pulling a sleeve on before work — not just posing. Action reads as real.
- **Keep it slightly imperfect.** A candid, mid-motion, arm's-length feel beats a centered studio look for slides 1–3. Save the clean look for the final product slide.
- **Match the caption to the scene.** If they're at the gym, the copy talks performance. If on a sunny course, it talks sun. Mismatched text feels stock.

## TONE BY PRODUCT CATEGORY (adapt to the product)

- **Supplements/health:** reassuring + effortless. "never miss a day", "no pills, no water."
- **Sports/performance:** punchy, confident. "keeps you going", "built for game day."
- **Beauty/skincare:** gentle + aspirational. "glow without the 10-step routine."
- **Everyday/utility:** practical, relatable. "work-ready in seconds", "fits in your pocket."
- **Food/beverage:** sensory + simple. "melts on your tongue", "no aftertaste."
- **Tech/gadget:** clever + time-saving. "sets up in 60 seconds."

## PLANNING EACH CAROUSEL

- **Analyze the product first** (Step 1 above), then pick a structure (Step 2).
- Give each carousel ONE marketing angle tied to a REAL product benefit.
- If product info is provided, use its ACTUAL claims (e.g., "UPF 50+", "blocks 98% UV", "24-hour hydration") — NEVER invent claims.
- If making multiple carousels: each gets a DIFFERENT structure AND different angle AND different scenes.
- Rotate the person across carousels: different gender, age (20s-30s), location, lighting, camera feel.
- Do NOT reuse the same setup twice across carousels.
- Mirror selfies: max once per batch.
- **Slide count is content-driven:** 3 slides for a simple punchy angle, up to 6-8 for a product with multiple benefits or a story arc. Don't pad — if the story is done in 3, stop at 3.

## SLIDE TYPES (use the one that matches the structure's slot)

- **hook**: The scroll-stopper slide (POV, blunt claim, objection, convo, or relatable fail). ALWAYS slide 1. Includes the white hand-drawn arrow pointing at the product.
- **problem**: Shows the pain point relatably (used in Structure A, E, G).
- **solution**: Introduces the product as the fix (used in Structure A, E).
- **person_using**: A person actually using the product in a real setting.
- **candid**: A candid unposed moment related to the benefit.
- **comparison**: X-vs-check flat-lay (used in Structure D).
- **benefit**: Shows ONE specific benefit in action (used in Structure H).
- **proof**: Evidence that the claim is true (used in Structure B, C).
- **product**: ALWAYS the last slide — product on pure white background + CTA.

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
- **Analyze the product first** (Step 1), then pick a structure (Step 2), then write slides.
- Each carousel: 3-8 slides depending on the structure and content (NOT fixed — let the story decide)
- Each carousel in a batch: DIFFERENT structure, DIFFERENT angle, DIFFERENT scene, DIFFERENT person (gender/age 20s-30s)
- image_prompt: ALWAYS in English (except the [CAPTION] text which follows the user's language)
- header_text and body_text: in the user's language (for display + PostPeer caption)
- The caption text [CAPTION] inside image_prompt MUST MATCH header_text (and body_text if present)
- First slide: ALWAYS type "hook" (includes the white hand-drawn arrow pointing at the product)
- Last slide: ALWAYS type "product" (pure white seamless background + soft realistic shadow)
- **Hook captions: 3-6 words, ALL CAPS if blunt claim, lowercase if POV/convo.** AI image models misspell long text — keep it short.
- **Middle captions: lowercase, texting-style, one idea, max 8 words.**
- **Product slide caption: plain "do this" nudge (e.g., "1 a day" + check emoji, "get yours", "link in bio").**
- The product slide MUST have pure white seamless background + soft realistic shadow
- **One real number or claim per carousel** — pull from product info, never invent
- **One emoji max per slide** — matching the message, never a string

## LANGUAGE
- If the user writes in Arabic -> header_text/body_text in Arabic, and the [CAPTION] inside image_prompt in Arabic too
- If the user writes in English -> all text in English
- If the user writes in French -> all text in French
- The image_prompt structure (templates above) is always in English, but the [CAPTION] text inside follows the user's language
- Arabic captions: keep them short (2-5 words) since Arabic text in AI images can be harder to render correctly

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "carousels": [
    {
      "carousel_title": "Short unique title for this carousel",
      "marketing_angle": "The single real product benefit this carousel focuses on",
      "structure": "One of: problem_solution, pov_proof, blunt_claim, comparison, objection_answer, overheard_convo, relatable_fail, benefit_cascade",
      "product_category": "One of: supplement_health, sports_performance, beauty_skincare, everyday_utility, food_beverage, tech_gadget, apparel_accessory, other",
      "slides": [
        {
          "slide_number": 1,
          "slide_type": "hook",
          "image_prompt": "Full prompt following the hook template, with brackets filled in, INCLUDING the baked-in caption and arrow",
          "header_text": "The caption text (same as [CAPTION] in image_prompt, for display)",
          "body_text": "null (hook slides have no body text)",
          "text_position": "top"
        },
        ...2-6 middle slides (slide_type matches the chosen structure)...,
        {
          "slide_number": N,
          "slide_type": "product",
          "image_prompt": "Full prompt following the final product slide template",
          "header_text": "Action line (e.g., '1 a day')",
          "body_text": "Supporting detail (e.g., 'link in bio')",
          "text_position": "top"
        }
      ]
    }
  ]
}

## BEFORE YOU SHIP THE COPY — QUICK TEST (self-check before returning)
- Does slide 1 make sense in half a second with sound off?
- Is there one real number or claim somewhere in the carousel?
- Could a friend have texted this caption? (If it sounds like a brochure, rewrite.)
- Does each slide push toward the next, ending on a clear "do this"?
- No typos in the baked text? (AI misspells — always read it back. If a caption is long enough to risk a typo, shorten it.)
- Product matches the reference (logo, colors, label legible) — mentioned in every image_prompt
- Caption is white with black outline, not touching the top edge — described in every image_prompt
- Last slide background is pure white — specified in the product slide template
- Across carousels: different angle, different scene, different person each time
- Hook slide has the white hand-drawn arrow

## THE SHORT VERSION
Write like a real person sharing a tip, lead every hook with one concrete benefit, keep one idea per slide, and vary the scenes so it never smells like a template.

Generate EXACTLY the number of carousels requested. Each must have a completely different creative angle, scene, person, and slide structure. The last slide of EVERY carousel must be type "product".`;

// ─── Template-based fallback (UGC style, VARIED structures, text baked in) ──
// Each carousel uses a DIFFERENT structure from the menu below.
// Structure dictates: slide count, slide types, caption style, scene type.
// This mirrors the AI prompt's structure-variety system.
function generateTemplateCarousels(
  idea: string,
  numCarousels: number,
  language: string
): Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> {
  const isAr = language === "ar";
  const isFr = language === "fr";

  // ─── 8 carousel structures, each with its own slide pattern ───
  // Each structure defines: hookCaption, hookEmoji, middleSlides (type + caption + scene),
  // and the product slide caption. Each carousel in the batch uses a different structure.
  type StructureDef = {
    name: string;
    hookCaption: string;
    hookEmoji: string;
    angle: string;
    middleSlides: Array<{ type: string; caption: string; scene: string }>;
  };

  const structures: StructureDef[] = isAr
    ? [
        // Structure A: Problem → Solution
        {
          name: "problem_solution",
          hookCaption: "تعرف هذا الشعور؟",
          hookEmoji: "🤔",
          angle: "المشكلة والحل",
          middleSlides: [
            { type: "solution", caption: "الحل هنا", scene: "person using the product as the fix" },
          ],
        },
        // Structure B: POV
        {
          name: "pov_proof",
          hookCaption: "من وجهة نظري",
          hookEmoji: "👀",
          angle: "تجربة شخصية",
          middleSlides: [
            { type: "proof", caption: "الفرق حقيقي", scene: "candid moment showing the benefit in real life" },
            { type: "candid", caption: "أصبح روتيني", scene: "candid daily routine moment with the product" },
          ],
        },
        // Structure C: Blunt Claim
        {
          name: "blunt_claim",
          hookCaption: "يعمل بفعالية",
          hookEmoji: "✅",
          angle: "النتيجة المضمونة",
          middleSlides: [
            { type: "proof", caption: "النتيجة تتكلم", scene: "person experiencing the claimed benefit" },
          ],
        },
        // Structure D: Comparison
        {
          name: "comparison",
          hookCaption: "القديم مقابل الجديد",
          hookEmoji: "⚖️",
          angle: "المقارنة",
          middleSlides: [
            { type: "comparison", caption: "الفرق واضح", scene: "top-down flat-lay comparing old way vs the product" },
            { type: "person_using", caption: "هكذا أستعمله", scene: "person using the new way" },
          ],
        },
        // Structure E: Objection → Answer
        {
          name: "objection_answer",
          hookCaption: "تعاني من هذا؟",
          hookEmoji: "😤",
          angle: "الاعتراض والجواب",
          middleSlides: [
            { type: "solution", caption: "الحل بسيط", scene: "product as the easy answer" },
            { type: "proof", caption: "سهل وسريع", scene: "showing how easy it is to use" },
          ],
        },
        // Structure F: Overheard Convo
        {
          name: "overheard_convo",
          hookCaption: "سمعت هذا؟",
          hookEmoji: "💬",
          angle: "محادثة",
          middleSlides: [
            { type: "solution", caption: "هذا الحل", scene: "product as the answer to the convo" },
          ],
        },
        // Structure G: Relatable Fail
        {
          name: "relatable_fail",
          hookCaption: "فعلت هذا؟",
          hookEmoji: "😅",
          angle: "خطأ شائع",
          middleSlides: [
            { type: "solution", caption: "انتهى الأمر", scene: "product making it effortless" },
          ],
        },
        // Structure H: Benefit Cascade
        {
          name: "benefit_cascade",
          hookCaption: "فوائد حقيقية",
          hookEmoji: "🔥",
          angle: "فوائد متعددة",
          middleSlides: [
            { type: "benefit", caption: "فائدة 1", scene: "showing first benefit in action" },
            { type: "benefit", caption: "فائدة 2", scene: "showing second benefit in action" },
            { type: "benefit", caption: "فائدة 3", scene: "showing third benefit in action" },
          ],
        },
      ]
    : isFr
    ? [
        {
          name: "problem_solution",
          hookCaption: "TU CONNAIS CA ?",
          hookEmoji: "🤔",
          angle: "Le probleme et la solution",
          middleSlides: [
            { type: "solution", caption: "la solution ici", scene: "person using the product as the fix" },
          ],
        },
        {
          name: "pov_proof",
          hookCaption: "POV: tu te sens comme ca",
          hookEmoji: "👀",
          angle: "Experience personnelle",
          middleSlides: [
            { type: "proof", caption: "la difference est reelle", scene: "candid moment showing the benefit in real life" },
            { type: "candid", caption: "maintenant c'est ma routine", scene: "candid daily routine moment with the product" },
          ],
        },
        {
          name: "blunt_claim",
          hookCaption: "VRAIMENT EFFICACE",
          hookEmoji: "✅",
          angle: "Le resultat garanti",
          middleSlides: [
            { type: "proof", caption: "le resultat parle", scene: "person experiencing the claimed benefit" },
          ],
        },
        {
          name: "comparison",
          hookCaption: "ANCIEN VS NOUVEAU",
          hookEmoji: "⚖️",
          angle: "La comparaison",
          middleSlides: [
            { type: "comparison", caption: "la difference saute aux yeux", scene: "top-down flat-lay comparing old way vs the product" },
            { type: "person_using", caption: "je l'utilise comme ca", scene: "person using the new way" },
          ],
        },
        {
          name: "objection_answer",
          hookCaption: "TU AS DU MAL AVEC CA ?",
          hookEmoji: "😤",
          angle: "L'objection et la reponse",
          middleSlides: [
            { type: "solution", caption: "c'est simple en fait", scene: "product as the easy answer" },
            { type: "proof", caption: "simple et rapide", scene: "showing how easy it is to use" },
          ],
        },
        {
          name: "overheard_convo",
          hookCaption: "T'AS ENTENDU CA ?",
          hookEmoji: "💬",
          angle: "Conversation",
          middleSlides: [
            { type: "solution", caption: "c'est la reponse", scene: "product as the answer to the convo" },
          ],
        },
        {
          name: "relatable_fail",
          hookCaption: "T'AS DEJA FAIT CA ?",
          hookEmoji: "😅",
          angle: "Erreur courante",
          middleSlides: [
            { type: "solution", caption: "c'est fini", scene: "product making it effortless" },
          ],
        },
        {
          name: "benefit_cascade",
          hookCaption: "DES VRAIS BENEFICES",
          hookEmoji: "🔥",
          angle: "Plusieurs benefices",
          middleSlides: [
            { type: "benefit", caption: "benefice 1", scene: "showing first benefit in action" },
            { type: "benefit", caption: "benefice 2", scene: "showing second benefit in action" },
            { type: "benefit", caption: "benefice 3", scene: "showing third benefit in action" },
          ],
        },
      ]
    : [
        {
          name: "problem_solution",
          hookCaption: "KNOW THIS FEELING?",
          hookEmoji: "🤔",
          angle: "The problem and the fix",
          middleSlides: [
            { type: "solution", caption: "the fix is here", scene: "person using the product as the fix" },
          ],
        },
        {
          name: "pov_proof",
          hookCaption: "POV: you feel like this",
          hookEmoji: "👀",
          angle: "Personal experience",
          middleSlides: [
            { type: "proof", caption: "the difference is real", scene: "candid moment showing the benefit in real life" },
            { type: "candid", caption: "now it's my routine", scene: "candid daily routine moment with the product" },
          ],
        },
        {
          name: "blunt_claim",
          hookCaption: "ACTUALLY WORKS",
          hookEmoji: "✅",
          angle: "The guaranteed result",
          middleSlides: [
            { type: "proof", caption: "the proof is real", scene: "person experiencing the claimed benefit" },
          ],
        },
        {
          name: "comparison",
          hookCaption: "OLD VS NEW",
          hookEmoji: "⚖️",
          angle: "The comparison",
          middleSlides: [
            { type: "comparison", caption: "the difference is obvious", scene: "top-down flat-lay comparing old way vs the product" },
            { type: "person_using", caption: "this is how i use it", scene: "person using the new way" },
          ],
        },
        {
          name: "objection_answer",
          hookCaption: "STRUGGLING WITH THIS?",
          hookEmoji: "😤",
          angle: "The objection and the answer",
          middleSlides: [
            { type: "solution", caption: "it's actually simple", scene: "product as the easy answer" },
            { type: "proof", caption: "simple and fast", scene: "showing how easy it is to use" },
          ],
        },
        {
          name: "overheard_convo",
          hookCaption: "HEARD THIS BEFORE?",
          hookEmoji: "💬",
          angle: "Conversation",
          middleSlides: [
            { type: "solution", caption: "this is the answer", scene: "product as the answer to the convo" },
          ],
        },
        {
          name: "relatable_fail",
          hookCaption: "DONE THIS BEFORE?",
          hookEmoji: "😅",
          angle: "Common mistake",
          middleSlides: [
            { type: "solution", caption: "not anymore", scene: "product making it effortless" },
          ],
        },
        {
          name: "benefit_cascade",
          hookCaption: "REAL BENEFITS",
          hookEmoji: "🔥",
          angle: "Multiple benefits",
          middleSlides: [
            { type: "benefit", caption: "benefit one", scene: "showing first benefit in action" },
            { type: "benefit", caption: "benefit two", scene: "showing second benefit in action" },
            { type: "benefit", caption: "benefit three", scene: "showing third benefit in action" },
          ],
        },
      ];

  // UGC persons — rotate gender/age/setting per carousel (vary scenes so it never smells like a template)
  const persons = [
    "a 25-year-old woman with curly hair, wearing casual streetwear, mid-motion reaching for the product",
    "a 28-year-old man with short beard, wearing a plain t-shirt, pulling the product on before heading out",
    "a 23-year-old woman with glasses, wearing athleisure, holding the product at arm's length",
    "a 30-year-old man with man-bun, wearing a hoodie, using the product mid-task",
    "a 26-year-old woman with straight hair, wearing a denim jacket, candidly using the product",
    "a 27-year-old man with clean shave, wearing a polo shirt, using the product at work",
    "a 24-year-old woman with pixie cut, wearing gym gear, using the product post-workout",
    "a 29-year-old man with stubble, wearing a flannel shirt, using the product outdoors",
  ];

  // UGC locations — rotate per carousel, match caption to scene
  const locations = [
    "sunny kitchen counter, morning light streaming through window, coffee mug nearby, marble countertop",
    "modern bathroom shelf, soft fluorescent lighting, toiletries in background, white tiles",
    "cozy bedroom nightstand, warm lamp light, books and phone nearby, wooden surface",
    "office desk, natural daylight from window, laptop and notebook in background, clean white surface",
    "outdoor patio table, golden hour lighting, plants in background, rustic wood surface",
    "gym bench, harsh overhead lighting, water bottle and towel nearby, rubber floor",
    "car interior, soft afternoon light through windshield, dashboard and steering wheel visible",
    "park bench, dappled sunlight through trees, grass and path in background",
  ];

  const carousels: Array<{ carouselTitle: string; slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> }> = [];

  // Seeded pseudo-random for consistent but varied results
  let seed = 0;
  for (let i = 0; i < idea.length; i++) seed = ((seed << 5) - seed + idea.charCodeAt(i)) | 0;
  const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };

  for (let c = 0; c < numCarousels; c++) {
    const structure = structures[c % structures.length];
    const person = persons[c % persons.length];
    const location = locations[c % locations.length];
    const carouselTitle = `${structure.angle} — ${idea.slice(0, 30)}`;
    // Product slide nudge — plain "do this" + supporting line (lowercase, texting-style)
    const ctaText = isAr ? "اطلب الآن" : isFr ? "commandez maintenant" : "1 a day";
    const ctaSub = isAr ? "الرابط في البايو" : isFr ? "lien dans la bio" : "link in bio";

    const slides: Array<{ slideNumber: number; slideType: string; title: string; body: string; imagePrompt: string; headerText: string | null; bodyText: string | null; textPosition: string }> = [];

    // ─── Slide 1: HOOK (uses the structure's hook caption) ───
    const hookCaptionWithEmoji = `${structure.hookCaption} ${structure.hookEmoji}`;
    slides.push({
      slideNumber: 1,
      slideType: "hook",
      title: hookCaptionWithEmoji,
      body: "",
      imagePrompt: enforceUGCPrompt(
        `${person} holding the ${idea} product, exactly matching the reference product's design, logo, colors and typography. ${location}. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "${hookCaptionWithEmoji}", positioned about 22% down from the top of the frame (not at the very top edge), plus one white hand-drawn arrow with black outline in the lower area pointing at the product. No other text or graphics.`
      ),
      headerText: hookCaptionWithEmoji,
      bodyText: null,
      textPosition: "top" as const,
    });

    // ─── Middle slides: from the structure's middleSlides definition ───
    for (let s = 0; s < structure.middleSlides.length; s++) {
      const mid = structure.middleSlides[s];
      const midCaption = mid.caption;
      const midType = mid.type;

      // Build the scene description based on slide type
      let midAction: string;
      if (midType === "comparison") {
        midAction = `top-down flat-lay on ${location}. Left side: an old or inferior solution with a bold red X over it. Right side: the ${idea} product (exactly matching the reference product's design, logo, colors and typography) with a bold green check over it`;
      } else if (midType === "solution") {
        midAction = `${person} using the ${idea} product as the fix, exactly matching the reference product's design, logo, colors and typography, ${mid.scene}`;
      } else if (midType === "proof") {
        midAction = `candid moment proving the benefit, ${person}, the ${idea} product visible, exactly matching the reference product's design, logo, colors and typography, ${mid.scene}`;
      } else if (midType === "benefit") {
        midAction = `${person} experiencing one specific benefit of the ${idea} product, exactly matching the reference product's design, logo, colors and typography, ${mid.scene}`;
      } else {
        // candid / person_using / default
        midAction = `${person}, ${mid.scene}, the ${idea} product naturally visible, exactly matching the reference product's design, logo, colors and typography`;
      }

      // For comparison slides, use the comparison caption format
      let imagePromptStr: string;
      if (midType === "comparison") {
        imagePromptStr = enforceUGCPrompt(
          `Hyper realistic photorealistic photo shot on an iPhone 15 Pro Max: ${midAction}. ${location}. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style captions in bold white rounded sans-serif with solid black outline in the upper third (below the top edge): left "old way" with line "drawback"; right "new way" with line "${midCaption}". No other text or graphics. Authentic unfiltered phone snapshot, slightly imperfect composition, not polished, not cinematic.`
        );
      } else {
        imagePromptStr = enforceUGCPrompt(
          `${midAction}. ${location}. Candid handheld composition, realistic skin and material texture. Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading: "${midCaption}", positioned about 22% down from the top of the frame (not at the very top edge). No other text or graphics.`
        );
      }

      slides.push({
        slideNumber: s + 2,
        slideType: midType,
        title: midCaption,
        body: "",
        imagePrompt: imagePromptStr,
        headerText: midCaption,
        bodyText: null,
        textPosition: "top" as const,
      });
    }

    // ─── Last slide: PRODUCT on pure white + plain "do this" nudge ───
    const lastSlideNumber = slides.length + 1;
    slides.push({
      slideNumber: lastSlideNumber,
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
          const validSlideTypes = ["hook", "problem", "solution", "person_using", "candid", "comparison", "benefit", "proof", "hero", "quote", "tip", "stat", "question", "feature", "product"];
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

// ─── Generate a single slide image — NEVER FAILS (multi-strategy retry) ──
// Strategy chain (tries each in order until one succeeds):
//   1. nano-banana-pro + full prompt + product reference
//   2. nano-banana-pro + full prompt WITHOUT reference (sometimes ref causes issues)
//   3. nano-banana-2 + full prompt + product reference
//   4. nano-banana-2 + full prompt WITHOUT reference
//   5. nano-banana-2 + SIMPLIFIED prompt (no baked-in text, clean image) + reference
//   6. nano-banana-2 + SIMPLIFIED prompt WITHOUT reference
//   7. Built-in ZAI image generation (last resort)
// The goal: EVERY slide gets an image. No "image failed" ever.
async function generateSlideImageKie(
  imagePrompt: string,
  apiKey: string,
  slideIndex: number,
  totalSlides: number,
  carouselIndex: number,
  totalCarousels: number,
  referenceImageUrl?: string
): Promise<string> {
  const logPrefix = `[Carousel] Carousel ${carouselIndex + 1}/${totalCarousels} Slide ${slideIndex + 1}/${totalSlides}`;

  // ─── Helper: submit a kie.ai task and poll for result ───
  async function tryKieModel(
    model: string,
    prompt: string,
    useReference: boolean
  ): Promise<string> {
    const input: Record<string, unknown> = {
      prompt,
      image_size: "768x1344",
    };
    if (useReference && referenceImageUrl) {
      input.image_input = [referenceImageUrl];
    }

    console.log(`${logPrefix}: trying ${model}${useReference ? " + reference" : " (no reference)"}...`);

    const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input }),
    });

    const submitText = await submitRes.text();
    let submitJson: Record<string, unknown>;
    try {
      submitJson = JSON.parse(submitText);
    } catch {
      throw new Error(`${model} returned non-JSON: ${submitText.slice(0, 200)}`);
    }

    if (submitJson.code !== 200) {
      const errMsg = (submitJson.msg as string) || submitText.slice(0, 200);
      throw new Error(`${model} submit failed: ${errMsg}`);
    }

    const taskId = submitJson.data?.taskId;
    if (!taskId) {
      throw new Error(`${model} returned no taskId`);
    }

    console.log(`${logPrefix}: ${model} task ${taskId} submitted, polling...`);
    const imageUrl = await pollKieImage(taskId, apiKey);
    console.log(`${logPrefix}: image ready (model: ${model})!`);
    return imageUrl;
  }

  // ─── Simplified prompt: strip the baked-in text requirement ───
  // Used as a fallback when the full prompt (with text instructions) fails.
  // Generates a clean image without text — better than no image.
  function simplifyPrompt(prompt: string): string {
    // Remove the "Baked-in TikTok-style caption..." instruction
    let simplified = prompt.replace(
      /Baked-in TikTok-style caption in bold white rounded sans-serif with solid black outline reading:\s*"[^"]*"[^.]*\.\s*/gi,
      ""
    );
    // Also remove any secondary caption instruction (for product slide)
    simplified = simplified.replace(
      /Baked-in TikTok-style caption[^.]*\.\s*/gi,
      ""
    );
    // Remove "No other text or graphics" since we're not adding text anyway
    simplified = simplified.replace(/No other text or graphics[^.]*\.\s*/gi, "");
    // Remove "plus one white hand-drawn arrow" — keep it simple
    simplified = simplified.replace(/,?\s*plus one white hand-drawn arrow[^.]*\./gi, ".");
    // Clean up double spaces
    simplified = simplified.replace(/\s{2,}/g, " ").trim();
    return simplified;
  }

  const errors: string[] = [];

  // ─── Strategy 1: nano-banana-pro + full prompt + reference ───
  if (referenceImageUrl) {
    try {
      return await tryKieModel("nano-banana-pro", imagePrompt, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`pro+ref: ${msg}`);
      console.warn(`${logPrefix}: Strategy 1 failed: ${msg}`);
    }
  }

  // ─── Strategy 2: nano-banana-pro + full prompt WITHOUT reference ───
  try {
    return await tryKieModel("nano-banana-pro", imagePrompt, false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`pro-only: ${msg}`);
    console.warn(`${logPrefix}: Strategy 2 failed: ${msg}`);
  }

  // ─── Strategy 3: nano-banana-2 + full prompt + reference ───
  if (referenceImageUrl) {
    try {
      return await tryKieModel("nano-banana-2", imagePrompt, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`v2+ref: ${msg}`);
      console.warn(`${logPrefix}: Strategy 3 failed: ${msg}`);
    }
  }

  // ─── Strategy 4: nano-banana-2 + full prompt WITHOUT reference ───
  try {
    return await tryKieModel("nano-banana-2", imagePrompt, false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`v2-only: ${msg}`);
    console.warn(`${logPrefix}: Strategy 4 failed: ${msg}`);
  }

  // ─── Strategy 5: nano-banana-2 + SIMPLIFIED prompt + reference ───
  const simplifiedPrompt = simplifyPrompt(imagePrompt);
  if (referenceImageUrl && simplifiedPrompt !== imagePrompt) {
    try {
      console.log(`${logPrefix}: trying simplified prompt (no baked-in text) + reference...`);
      return await tryKieModel("nano-banana-2", simplifiedPrompt, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`v2+simplified+ref: ${msg}`);
      console.warn(`${logPrefix}: Strategy 5 failed: ${msg}`);
    }
  }

  // ─── Strategy 6: nano-banana-2 + SIMPLIFIED prompt WITHOUT reference ───
  if (simplifiedPrompt !== imagePrompt) {
    try {
      console.log(`${logPrefix}: trying simplified prompt (no baked-in text, no reference)...`);
      return await tryKieModel("nano-banana-2", simplifiedPrompt, false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`v2+simplified-only: ${msg}`);
      console.warn(`${logPrefix}: Strategy 6 failed: ${msg}`);
    }
  }

  // ─── Strategy 7: Built-in ZAI image generation (last resort) ───
  try {
    console.log(`${logPrefix}: trying built-in ZAI image generation as last resort...`);
    const zaiImageUrl = await generateSlideImageBuiltIn(simplifiedPrompt || imagePrompt);
    console.log(`${logPrefix}: ZAI image ready!`);
    return zaiImageUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`zai: ${msg}`);
    console.warn(`${logPrefix}: Strategy 7 failed: ${msg}`);
  }

  // ─── ABSOLUTE LAST RESORT: Return a placeholder SVG data URL ───
  // This ensures the slide ALWAYS has an image, even if every AI API is down.
  // The user can regenerate later. Better than showing "image failed".
  console.error(`${logPrefix}: ALL strategies failed. Generating placeholder image.`);
  console.error(`${logPrefix} errors: ${errors.join(" | ")}`);
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1344" viewBox="0 0 768 1344">
    <rect width="768" height="1344" fill="#1A1A1A"/>
    <rect x="40" y="40" width="688" height="1264" rx="20" fill="none" stroke="#E461AD" stroke-width="3" stroke-dasharray="10 8"/>
    <text x="384" y="620" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="42" font-weight="bold" fill="#E461AD">Image unavailable</text>
    <text x="384" y="680" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="24" fill="#888">Slide ${slideIndex + 1} of ${totalSlides}</text>
    <text x="384" y="720" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="18" fill="#666">Try regenerating this carousel</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString("base64")}`;
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

    // Step 2: Stream progress + generate images IN PARALLEL within each carousel
    // This keeps the connection alive (no browser timeout) and speeds up generation.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        };

        try {
          // Send initial metadata so the client knows generation has started
          send({
            type: "start",
            totalCarousels: carouselsContent.length,
            totalSlides: carouselsContent.reduce((acc, c) => acc + c.slides.length, 0),
          });

          const carouselsWithImages = [];

          for (let c = 0; c < carouselsContent.length; c++) {
            const { carouselTitle, slides } = carouselsContent[c];
            send({ type: "carousel_start", carouselIndex: c, carouselTitle, slideCount: slides.length });

            // ─── Generate ALL slides in this carousel IN PARALLEL ───
            // Each slide takes ~40-50s; sequential = 2.5min for 3 slides, parallel = ~50s
            const slidePromises = slides.map(async (slide, i) => {
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

                // Stream this slide as soon as it's ready
                send({
                  type: "slide_ready",
                  carouselIndex: c,
                  slideIndex: i,
                  slide: {
                    ...slide,
                    imageUrl,
                    status: "done",
                    slideType: slide.slideType || "hook",
                    headerText: slide.headerText ?? null,
                    bodyText: slide.bodyText ?? null,
                    textPosition: slide.textPosition || "top",
                  },
                });

                return {
                  ...slide,
                  imageUrl,
                  status: "done" as const,
                  slideType: slide.slideType || "hook",
                  headerText: slide.headerText ?? null,
                  bodyText: slide.bodyText ?? null,
                  textPosition: slide.textPosition || "top",
                };
              } catch (imgErr) {
                const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
                console.error(`[Carousel] Carousel ${c + 1} Slide ${i + 1} image failed:`, msg);

                send({
                  type: "slide_failed",
                  carouselIndex: c,
                  slideIndex: i,
                  error: msg,
                });

                return {
                  ...slide,
                  imageUrl: null,
                  status: "image_failed" as const,
                  error: msg,
                  slideType: slide.slideType || "hook",
                  headerText: slide.headerText ?? null,
                  bodyText: slide.bodyText ?? null,
                  textPosition: slide.textPosition || "top",
                };
              }
            });

            const slidesWithImages = await Promise.all(slidePromises);

            carouselsWithImages.push({
              carouselTitle,
              slides: slidesWithImages.map(s => ({
                ...s,
                slideType: s.slideType || "hook",
                headerText: s.headerText ?? null,
                bodyText: s.bodyText ?? null,
                textPosition: s.textPosition || "top",
              })),
            });

            send({ type: "carousel_done", carouselIndex: c });
          }

          // Send final complete message with all carousels
          send({
            type: "complete",
            success: true,
            carousels: carouselsWithImages,
            idea: idea.trim(),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[Carousel] Stream error:", msg);
          send({ type: "error", error: msg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/generate-carousel error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
