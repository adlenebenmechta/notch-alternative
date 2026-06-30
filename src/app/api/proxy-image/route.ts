import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Proxy for external images to bypass CORS restrictions.
 * Fetches an external image URL and returns it with proper CORS headers.
 * Used by CarouselView to load real product images from Amazon etc.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Only allow https URLs
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Only HTTPS URLs are allowed" }, { status: 400 });
    }

    // Fetch the image
    const imageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!imageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageRes.status}` },
        { status: 502 }
      );
    }

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await imageRes.arrayBuffer();

    // Return the image with CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Proxy/Image] Error:", message);
    return NextResponse.json(
      { error: "Failed to proxy image", details: message },
      { status: 500 }
    );
  }
}
