import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }

    // Proxy download: fetch the URL and stream it back
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${res.status}): ${res.statusText}` },
        { status: 500 }
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentLength = res.headers.get("content-length");

    // Stream the response back
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="download"`,
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new Response(res.body, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Video download error:", msg);
    return NextResponse.json({ error: "Download failed: " + msg }, { status: 500 });
  }
}
