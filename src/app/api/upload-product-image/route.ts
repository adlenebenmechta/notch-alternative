import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEFAULT_KIE_KEY = process.env.KIE_KEY || process.env.KIE_API_KEY || "";

const MAX_UPLOAD_RETRIES = 3;

// Upload a product image to kie.ai hosting and return a public URL
// This URL can then be used as image_input reference for nano-banana-2
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const productImage = formData.get("productImage") as File | null;
    const kieApiKey = (formData.get("kieApiKey") as string | null) || DEFAULT_KIE_KEY;

    if (!productImage) {
      return NextResponse.json({ error: "No product image provided" }, { status: 400 });
    }

    if (productImage.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await productImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = productImage.type || "image/jpeg";
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    console.log(`[Upload Product] Uploading ${fileName}, size=${(productImage.size / 1024).toFixed(1)}KB, type=${mimeType}`);

    // Upload to kie.ai file hosting — retry up to 3 times
    let json: Record<string, unknown> | null = null;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        const uploadRes = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${kieApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64Data: base64, fileName, uploadPath: "images" }),
        });

        json = await uploadRes.json() as Record<string, unknown>;
        const data = json.data as Record<string, unknown> | undefined;

        if (json.success && data?.downloadUrl) {
          break; // Success
        }

        lastError = (json.msg as string) || (json.error as string) || `HTTP ${uploadRes.status}`;
        console.warn(`[Upload Product] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`[Upload Product] Attempt ${attempt} fetch error: ${lastError}`);
        if (attempt < MAX_UPLOAD_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    if (!json?.success) {
      console.error(`[Upload Product] All ${MAX_UPLOAD_RETRIES} attempts failed: ${lastError}`);
      return NextResponse.json(
        { error: `Image upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${lastError || "unknown"}` },
        { status: 500 }
      );
    }

    const data = json.data as Record<string, unknown>;
    const downloadUrl = data?.downloadUrl as string;
    if (!downloadUrl) {
      return NextResponse.json({ error: "Upload succeeded but no URL returned" }, { status: 500 });
    }

    console.log(`[Upload Product] Success! URL: ${downloadUrl.slice(0, 100)}...`);
    return NextResponse.json({
      success: true,
      productImageUrl: downloadUrl,
      sizeKB: Math.round(buffer.length / 1024),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Upload Product] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
