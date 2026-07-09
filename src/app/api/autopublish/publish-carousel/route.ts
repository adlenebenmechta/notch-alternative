import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// ─── PostPeer API Configuration ──────────────────────────────────────────
const POSTPEER_API_URL = "https://api.postpeer.dev/v1/posts";

function getPostPeerApiKey(): string | null {
  return process.env.POSTPEER_API_KEY || null;
}

// ─── POST /api/autopublish/publish-carousel ──────────────────────────────
// Publish carousel images to social media via PostPeer API
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrls, caption, platforms, platformAccountIds, scheduleDate } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: "At least one image URL is required" }, { status: 400 });
    }

    if (!caption || caption.trim().length === 0) {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    const postpeerApiKey = getPostPeerApiKey();
    if (!postpeerApiKey) {
      return NextResponse.json(
        { error: "PostPeer API key not configured. Set POSTPEER_API_KEY environment variable." },
        { status: 500 }
      );
    }

    // Default platforms: Instagram + TikTok
    const targetPlatforms = platforms || ["instagram", "tiktok"];
    const accountIds = platformAccountIds || {};

    // Build PostPeer API request
    const platformEntries = targetPlatforms.map((p: string) => {
      const entry: Record<string, string> = { platform: p };
      if (accountIds[p]) entry.accountId = accountIds[p];
      return entry;
    });

    const postpeerBody: Record<string, unknown> = {
      platforms: platformEntries,
      content: caption.trim(),
      mediaUrls: imageUrls.filter((url: string) => url && url.trim()),
    };

    if (scheduleDate) {
      postpeerBody.scheduleDate = scheduleDate;
    }

    console.log(`[AutoPublish] Publishing carousel to ${targetPlatforms.join(", ")} via PostPeer`);
    console.log(`[AutoPublish] Images: ${imageUrls.length}, Caption: "${caption.slice(0, 50)}..."`);

    const response = await fetch(POSTPEER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${postpeerApiKey}`,
      },
      body: JSON.stringify(postpeerBody),
      signal: AbortSignal.timeout(60000),
    });

    const responseText = await response.text();
    let responseData: Record<string, unknown>;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("[AutoPublish] PostPeer API error:", response.status, responseText.slice(0, 500));
      return NextResponse.json({
        error: `PostPeer API failed (${response.status}): ${(responseData as Record<string, unknown>).error || responseData.message || responseText.slice(0, 200)}`,
        details: responseData,
      }, { status: response.status });
    }

    console.log("[AutoPublish] Successfully published via PostPeer!");

    return NextResponse.json({
      success: true,
      publishedPlatforms: targetPlatforms,
      postpeerResponse: responseData,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/autopublish/publish-carousel error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
