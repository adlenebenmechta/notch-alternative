import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ─── DeepSeek Config ────────────────────────────────────────────────────────
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_KEY || "sk-b1cf6ffa8ebd457abc96da5904912931";
const DEEPSEEK_MODEL = "deepseek-chat";

async function deepSeekChat(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.max_tokens ?? 6000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
    // Auth check with detailed logging
    const authHeader = request.headers.get("Authorization");
    console.log(`[Carousel/Slides] Auth header present: ${!!authHeader}`);

    const user = await getAuthUser(request);
    if (!user) {
      console.warn(`[Carousel/Slides] getAuthUser returned null`);
      return NextResponse.json({ error: "Unauthorized — please refresh the page and try again" }, { status: 401 });
    }

    console.log(`[Carousel/Slides] Authenticated: ${user.email}`);

    const body = await request.json();
    const { productInfo, numSlides, userInstructions, language } = body;

    if (!productInfo) {
      return NextResponse.json(
        { error: "Product info is required" },
        { status: 400 }
      );
    }

    const slideCount = numSlides || 3;
    const lang = language || "en";
    const instructions = userInstructions || "";

    // Build the slide generation prompt
    const slidePrompt = `أنت خبير في تصميم محتوى كاروسيل تسويقي فيروسي من نوع Problem/Solution.

## معلومات المنتج
الاسم: ${productInfo.productName || "Product"}
الوصف: ${productInfo.productDescription || ""}
الميزات: ${JSON.stringify(productInfo.features || [])}
المشاكل التي يحلها: ${JSON.stringify(productInfo.problems || [])}
الفوائد: ${JSON.stringify(productInfo.benefits || [])}
الجمهور المستهدف: ${productInfo.targetAudience || ""}

${instructions ? `## تعليمات إضافية من المستخدم:\n${instructions}` : ""}

## القواعد الأساسية
- عدد الشرائح المطلوب: ${slideCount}
- كل شريحة مكونة من صورتين: صورة المشكلة + صورة المنتج
- جميع الصور 9:16 عمودية (vertical) — إلزامي
- الصورة الأولى (المشكلة): تُظهر المشكلة/المعاناة بدون المنتج — مشهد واقعي يتفاعل معه الجمهور
- الصورة الثانية (المنتج): تُظهر المنتج بوضوح — مشهد إيجابي وجذاب
- الكاروسيل يستهدف جمهور بارد/دافئ — يجب أن يخلق الرغبة ثم يقدم المنتج

## هيكل كل شريحة
لكل شريحة:
1. مشكلة محددة يعاني منها الجمهور المستهدف — تُكتب بصيغة "If you are..." أو سؤال مباشر
2. المنتج كحل — مع نص "sorry if they sold out" لخلق الإلحاح

## قواعد الصور (image prompts) — الأهم!
- اكتب image_prompt دائماً بالإنجليزية فقط
- اكتب "9:16 vertical portrait" في كل وصف صورة
- ⛔⛔⛔ ممنوع تماماً وضع أي نص/كتابة/حروف/كلمات/علامات/شعارات في وصف الصورة — الصور يجب أن تكون نظيفة 100% بدون أي حروف أو كلمات أو نصوص
- ⛔⛔⛔ ممنوع تماماً وضع وجوه أو أشخاص في أي صورة — الوجوه تبدو مزيفة. لا تكتب "person", "woman", "man", "people", "hands", "face", "someone", "anyone" في أي image_prompt
- ⛔ ممنوع وضع "text overlay", "caption", "label", "sign", "banner", "headline" في أي image_prompt
- بدلاً من الأشخاص: ركّز على الأشياء، البيئة، المنتج نفسه، تفاصيل المكان، الإضاءة، الألوان، الملمس
- صورة المشكلة: ألوان داكنة، بيئة فوضوية، أشياء مكسورة أو غير مرتبة — بدون أشخاص وبدون أي نص مطلقاً
- صورة المنتج: ألوان زاهية، بيئة نظيفة ومنظمة، المنتج ظاهر بوضوح — بدون أشخاص وبدون أي نص مطلقاً
- صورة المنتج MUST: يجب أن تظهر المنتج بوضوح في المشهد — المنتج هو العنصر الرئيسي
- في image_prompt الخاص بالمنتج: اكتب وصف يركز على المنتج أولاً ثم البيئة حوله
- صيغة image_prompt للمنتج يجب أن تبدأ بوصف المنتج نفسه وليس المشهد

## قواعد النص — ستايل فيروسي
الصور تكون بدون أي نص — النص يُعرض بشكل منفصل للمستخدم لكي ينسخه ويكتبه بطريقته.
- problem_text: نص بصيغة "If you are struggling with..." أو "Tired of..." أو سؤال مباشر يخاطب الجمهور (10-15 كلمة كحد أقصى)
- solution_text: دائماً اكتب "sorry if they sold out" فقط (نفس العبارة لكل شريحة) — هذه تخلق الإلحاح والرغبة
- 🚫 لا تكتب أي شيء آخر في solution_text غير "sorry if they sold out"
${lang === "ar" ? "- problem_text بالعربية (بسؤال مباشر أو 'هل تعاني من...')" : lang === "fr" ? "- problem_text en français (question directe ou 'Tu en as marre de...')" : "- problem_text in English"}

## المطلوب كإنتاج
أرجع JSON فقط بهذا الشكل:
{
  "carousel_title": "string — عنوان الكاروسيل",
  "slides": [
    {
      "slide_number": 1,
      "problem": {
        "image_prompt": "وصف تفصيلي بالإنجليزية للصورة التي تُظهر المشكلة بدون المنتج، بدون أي أشخاص وبدون أي نص، 9:16 vertical portrait",
        "problem_text": "If you are struggling with [مشكلة محددة]..."
      },
      "solution": {
        "image_prompt": "وصف تفصيلي بالإنجليزية للصورة التي تُظهر المنتج بوضوح، بدون أي أشخاص وبدون أي نص، 9:16 vertical portrait",
        "solution_text": "sorry if they sold out"
      }
    }
  ]
}`;

    const responseText = await deepSeekChat([
      { role: "system", content: "أنت خبير تصميم كاروسيل تسويقي. أجب دائماً بـ JSON صالح فقط، بدون أي نص إضافي خارج JSON." },
      { role: "user", content: slidePrompt },
    ], { temperature: 0.8, max_tokens: 6000 });

    // Parse JSON from response
    let slidePlan;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        slidePlan = JSON.parse(jsonMatch[0]);
      } else {
        slidePlan = JSON.parse(responseText);
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to parse slide plan from AI response", raw: responseText },
        { status: 500 }
      );
    }

    // Validate structure
    if (!slidePlan.slides || !Array.isArray(slidePlan.slides)) {
      return NextResponse.json(
        { error: "Invalid slide plan structure", raw: responseText },
        { status: 500 }
      );
    }

    // Ensure we have the right number of slides
    if (slidePlan.slides.length !== slideCount) {
      // Trim or pad as needed
      if (slidePlan.slides.length > slideCount) {
        slidePlan.slides = slidePlan.slides.slice(0, slideCount);
      }
    }

    return NextResponse.json({
      success: true,
      plan: slidePlan,
    });
  } catch (error: unknown) {
    console.error("[Carousel/Generate-Slides] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate slides", details: message },
      { status: 500 }
    );
  }
}
