import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import ZAI from "z-ai-web-dev-sdk";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ─── DeepSeek Config ────────────────────────────────────────────────────────
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_KEY || "sk-b1cf6ffa8ebd457abc96da5904912931";
const DEEPSEEK_MODEL = "deepseek-chat";

// ─── Direct fetch to DeepSeek ───────────────────────────────────────────────
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
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4000,
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
    const xFirebaseToken = request.headers.get("X-Firebase-Id-Token");
    console.log(`[Carousel/Analyze] Auth header present: ${!!authHeader}, X-Firebase: ${!!xFirebaseToken}`);

    const user = await getAuthUser(request);
    if (!user) {
      console.warn(`[Carousel/Analyze] getAuthUser returned null. AuthHeader: ${authHeader ? authHeader.slice(0, 20) + '...' : 'NONE'}`);
      return NextResponse.json({ error: "Unauthorized — please refresh the page and try again" }, { status: 401 });
    }

    console.log(`[Carousel/Analyze] Authenticated: ${user.email}`);

    const body = await request.json();
    const { productUrl, numSlides, userInstructions } = body;

    if (!productUrl || typeof productUrl !== "string" || productUrl.trim().length === 0) {
      return NextResponse.json(
        { error: "Product URL is required" },
        { status: 400 }
      );
    }

    const slideCount = numSlides || 3;
    const instructions = userInstructions || "";

    // Step 1: Scrape product page content using ZAI web-reader
    let productContent = "";
    let productTitle = "";
    let productImages: string[] = [];
    try {
      const zai = await ZAI.create();
      const pageResult = await zai.functions.invoke("page_reader", {
        url: productUrl.trim(),
      });

      if (pageResult?.data?.html) {
        const rawHtml = pageResult.data.html;

        // Extract product images BEFORE stripping HTML tags
        const imgUrls = new Set<string>();

        // Amazon main product images (landingImage, imageBlock)
        const amazonMainMatch = rawHtml.match(/data-old-hires="([^"]+)"/g);
        if (amazonMainMatch) {
          for (const m of amazonMainMatch) {
            const urlMatch = m.match(/data-old-hires="([^"]+)"/);
            if (urlMatch && urlMatch[1]) imgUrls.add(urlMatch[1]);
          }
        }

        // Amazon image gallery (colorImages)
        const amazonGalleryMatch = rawHtml.match(/'colorImages':\s*\{\s*'initial':\s*\[([\s\S]*?)\]/);
        if (amazonGalleryMatch) {
          const urlMatches = amazonGalleryMatch[1].matchAll(/"(https?:\/\/[^"\s]+?)"/g);
          for (const um of urlMatches) {
            if (um[1] && !um[1].includes('sprite') && !um[1].includes('icon')) {
              imgUrls.add(um[1]);
            }
          }
        }

        // Generic: extract all img src tags with large images
        const imgSrcMatches = rawHtml.matchAll(/<img[^>]+src="(https?:\/\/[^"\s]+)"[^>]*>/gi);
        for (const m of imgSrcMatches) {
          const src = m[1];
          // Filter: only keep likely product images (high-res, not icons/logos)
          if (
            src &&
            !src.includes('sprite') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('badge') &&
            !src.includes('pixel') &&
            !src.includes('1x1') &&
            !src.includes('transparent') &&
            !src.includes('ads') &&
            (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))
          ) {
            imgUrls.add(src);
          }
        }

        // Try to get the highest-resolution versions by removing size constraints from URLs
        const processedUrls = new Set<string>();
        for (const url of imgUrls) {
          // Amazon: replace thumbnail sizes with full size
          let cleanUrl = url;
          if (url.includes('images-amazon.com') || url.includes('media-amazon.com')) {
            cleanUrl = url.replace(/\._[A-Z0-9_]+_\./, '.'); // Remove ._AC_UYXXX_. patterns
          }
          processedUrls.add(cleanUrl);
        }

        productImages = Array.from(processedUrls).slice(0, 10); // Limit to top 10 images
        console.log(`[Carousel/Analyze] Extracted ${productImages.length} product images`);

        // Strip HTML tags to get plain text
        productContent = rawHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000); // Limit to 6000 chars to stay within token limits

        productTitle = pageResult.data.title || "";
      }
    } catch (scrapeErr) {
      console.warn("[Carousel/Analyze] Web reader failed, proceeding with URL only:", scrapeErr);
    }

    // Step 2: Analyze product with DeepSeek
    const analysisPrompt = `أنت خبير تسويق متخصص في تحليل المنتجات وإنشاء محتوى كاروسيل فيروسي.

${productContent ? `## معلومات المنتج (من صفحة المنتج)
العنوان: ${productTitle}
المحتوى:
${productContent}` : `## رابط المنتج: ${productUrl}`}

${instructions ? `## تعليمات المستخدم الإضافية:\n${instructions}` : ""}

## المطلوب
حلل هذا المنتج بدقة واستخرج:
1. اسم المنتج
2. وصف مختصر (جملة واحدة)
3. الميزات الرئيسية (3-5 ميزات)
4. المشاكل التي يحلها (3-5 مشاكل)
5. الفوائد الرئيسية (3-5 فوائد)
6. الجمهور المستهدف

أرجع JSON فقط بهذا الشكل:
{
  "productName": "string",
  "productDescription": "string",
  "features": ["string"],
  "problems": ["string"],
  "benefits": ["string"],
  "targetAudience": "string"
}`;

    const analysisText = await deepSeekChat([
      { role: "system", content: "أنت خبير تسويق. أجب دائماً بـ JSON صالح فقط، بدون نص إضافي." },
      { role: "user", content: analysisPrompt },
    ], { temperature: 0.3 });

    let productInfo;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      productInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisText);
    } catch {
      productInfo = {
        productName: productTitle || "Product",
        productDescription: "",
        features: [],
        problems: [],
        benefits: [],
        targetAudience: "",
      };
    }

    return NextResponse.json({
      success: true,
      productInfo,
      productTitle: productInfo.productName || productTitle,
      productImages,
      scrapedContentLength: productContent.length,
    });
  } catch (error: unknown) {
    console.error("[Carousel/Analyze] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to analyze product", details: message },
      { status: 500 }
    );
  }
}
