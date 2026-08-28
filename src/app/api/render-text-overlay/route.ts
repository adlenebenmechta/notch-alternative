import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-side text overlay rendering.
 * Fetches the image, composites text on top using SVG+Sharp,
 * uploads the result, and returns a persistent URL.
 * This avoids all client-side CORS/canvas taint issues.
 *
 * POST body: { imageUrl, headerText, bodyText, textPosition, slideIndex, totalSlides }
 * Returns: { imageUrl } (persistent URL of the composited image)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, headerText, bodyText, textPosition = "bottom", slideIndex = 0, totalSlides = 1 } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const hasHeader = headerText && headerText.trim() !== "";
    const hasBody = bodyText && bodyText.trim() !== "";

    if (!hasHeader && !hasBody) {
      return NextResponse.json({ imageUrl });
    }

    // Fetch the image server-side (no CORS restrictions)
    let imageBuffer: Buffer;
    let contentType = "image/png";

    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
      }
      contentType = `image/${match[1] === "jpg" ? "jpeg" : match[1]}`;
      imageBuffer = Buffer.from(match[2], "base64");
    } else {
      const imgRes = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KobistoBot/1.0)" },
      });
      if (!imgRes.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${imgRes.status}` }, { status: 502 });
      }
      const arrBuf = await imgRes.arrayBuffer();
      imageBuffer = Buffer.from(arrBuf);
      contentType = imgRes.headers.get("content-type") || "image/png";
    }

    // Use sharp for server-side compositing
    let sharp: typeof import("sharp");
    try {
      sharp = (await import("sharp")).default;
    } catch {
      console.warn("[render-text-overlay] Sharp not available");
      return NextResponse.json({ imageUrl, textNotComposited: true });
    }

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 768;
    const height = metadata.height || 1344;

    const isRTL = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test((headerText || "") + (bodyText || ""));
    const totalTextLen = (headerText || "").length + (bodyText || "").length;

    let gradHeight: number;
    if (totalTextLen > 150) gradHeight = Math.round(height * 0.6);
    else if (totalTextLen > 80) gradHeight = Math.round(height * 0.5);
    else gradHeight = Math.round(height * 0.4);

    let gradientY: number;
    if (textPosition === "top") gradientY = 0;
    else if (textPosition === "center") gradientY = Math.round((height - gradHeight) / 2);
    else gradientY = height - gradHeight;

    const headerFontSize = Math.max(18, Math.round(width * 0.07));
    const bodyFontSize = Math.max(14, Math.round(width * 0.055));
    const padding = Math.round(width * 0.075);
    const maxWidth = width - padding * 2;

    function svgWrapText(text: string, maxChars: number): string[] {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars && cur.length > 0) {
          lines.push(cur.trim());
          cur = w;
        } else {
          cur = (cur + " " + w).trim();
        }
      }
      if (cur.trim()) lines.push(cur.trim());
      return lines.slice(0, 8);
    }

    function escapeXml(s: string): string {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const maxHeaderChars = Math.round(maxWidth / (headerFontSize * 0.5));
    const maxBodyChars = Math.round(maxWidth / (bodyFontSize * 0.5));

    const headerLines = hasHeader ? svgWrapText(headerText!, maxHeaderChars) : [];
    const bodyLines = hasBody ? svgWrapText(bodyText!, maxBodyChars) : [];

    let svgTextParts: string[] = [];
    let curY = gradientY + gradHeight - padding;

    if (bodyLines.length > 0) {
      curY -= bodyLines.length * (bodyFontSize * 1.4);
      for (let i = 0; i < bodyLines.length; i++) {
        svgTextParts.push(
          `<text x="${isRTL ? width - padding : width / 2}" y="${curY + i * (bodyFontSize * 1.4)}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="${bodyFontSize}" fill="rgba(255,255,255,0.9)" text-anchor="${isRTL ? "end" : "middle"}">${escapeXml(bodyLines[i])}</text>`
        );
      }
      curY -= 10;
    }

    if (headerLines.length > 0) {
      curY -= headerLines.length * (headerFontSize * 1.35);
      for (let i = 0; i < headerLines.length; i++) {
        svgTextParts.push(
          `<text x="${isRTL ? width - padding : width / 2}" y="${curY + i * (headerFontSize * 1.35)}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="${headerFontSize}" font-weight="bold" fill="#FFFFFF" text-anchor="${isRTL ? "end" : "middle"}">${escapeXml(headerLines[i])}</text>`
        );
      }
    }

    // Slide number badge
    const badgeText = `${slideIndex + 1}/${totalSlides}`;
    const badgeFontSize = Math.round(width * 0.035);
    const badgeW = Math.round(badgeText.length * badgeFontSize * 0.65 + badgeFontSize);
    const badgeH = Math.round(badgeFontSize * 1.6);
    const badgeX = padding;
    const badgeY = gradientY + Math.round(padding * 0.5);

    svgTextParts.push(
      `<rect x="${badgeX}" y="${badgeY}" rx="${badgeH / 2}" ry="${badgeH / 2}" width="${badgeW}" height="${badgeH}" fill="rgba(0,0,0,0.55)"/>`,
      `<text x="${badgeX + badgeW / 2}" y="${badgeY + badgeH * 0.72}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="${badgeFontSize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${badgeText}</text>`
    );

    // Gradient direction
    let gradientDef: string;
    if (textPosition === "top") {
      gradientDef = `<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0.85)"/><stop offset="50%" stop-color="rgba(0,0,0,0.6)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>`;
    } else if (textPosition === "center") {
      gradientDef = `<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="30%" stop-color="rgba(0,0,0,0.6)"/><stop offset="50%" stop-color="rgba(0,0,0,0.85)"/><stop offset="70%" stop-color="rgba(0,0,0,0.6)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>`;
    } else {
      gradientDef = `<linearGradient id="grad" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="rgba(0,0,0,0.85)"/><stop offset="50%" stop-color="rgba(0,0,0,0.6)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>`;
    }

    const overlaySvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradientDef}</defs>
      <rect x="0" y="${gradientY}" width="${width}" height="${gradHeight}" fill="url(#grad)"/>
      ${svgTextParts.join("\n")}
    </svg>`;

    const overlayBuffer = Buffer.from(overlaySvg);

    // Composite and convert to JPEG for smaller size
    const composited = await sharp(imageBuffer)
      .composite([{ input: overlayBuffer, blend: "over" }])
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload the composited image via the existing upload-avatar endpoint
    const base64Result = composited.toString("base64");

    // Get the host from the request
    const host = req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const uploadRes = await fetch(`${baseUrl}/api/upload-avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Data: base64Result,
        fileName: `carousel-overlay-${slideIndex + 1}-${Date.now()}.jpg`,
      }),
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      if (uploadData.avatarUrl) {
        return NextResponse.json({ imageUrl: uploadData.avatarUrl });
      }
    }

    // If upload failed, return as data URL (last resort)
    console.warn("[render-text-overlay] Upload failed, returning data URL");
    const dataUrl = `data:image/jpeg;base64,${base64Result}`;
    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("[render-text-overlay] Error:", err);
    return NextResponse.json({ error: "Failed to render text overlay" }, { status: 500 });
  }
}
