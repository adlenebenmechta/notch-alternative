import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { PostPeerService } from "@/lib/postpeer";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

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

    const postpeerApiKey = process.env.POSTPEER_API_KEY;
    if (!postpeerApiKey) {
      return NextResponse.json(
        { error: "PostPeer API key not configured. Set POSTPEER_API_KEY environment variable." },
        { status: 500 }
      );
    }

    // Default platforms: TikTok
    const targetPlatforms = platforms || ["tiktok"];
    const accountIds = platformAccountIds || {};

    // Build PostPeer API request using correct format
    const platformEntries = targetPlatforms.map((p: string) => {
      const entry: Record<string, unknown> = { platform: p };
      if (accountIds[p]) entry.accountId = accountIds[p];

      // Add TikTok-specific data for photo carousels
      if (p === "tiktok") {
        entry.platformSpecificData = {
          privacyLevel: "PUBLIC_TO_EVERYONE",
          draft: false,
          autoAddMusic: true,
          photoCoverIndex: 0,
        };
      }

      return entry;
    });

    const postpeerBody: Record<string, unknown> = {
      platforms: platformEntries,
      content: caption.trim(),
      mediaItems: imageUrls
        .filter((url: string) => url && url.trim())
        .map((url: string) => ({ type: "image", url })),
    };

    if (scheduleDate) {
      postpeerBody.scheduledFor = scheduleDate;
      postpeerBody.timezone = "UTC";
    } else {
      postpeerBody.publishNow = true;
    }

    console.log(`[AutoPublish] Publishing carousel to ${targetPlatforms.join(", ")} via PostPeer`);
    console.log(`[AutoPublish] Images: ${imageUrls.length}, Caption: "${caption.slice(0, 50)}..."`);

    const response = await fetch("https://api.postpeer.dev/v1/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-key": postpeerApiKey,
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
