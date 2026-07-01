import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import crypto from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

// ─── Text overlay position presets ─────────────────────────────────────────
type TextPosition = "top" | "center" | "bottom" | "custom";

interface TextOverlayParams {
  imageUrl: string;         // Image URL to overlay text on
  text: string;             // The text content
  fontSize?: number;        // Font size in pixels (default: 48)
  fontColor?: string;       // Font color hex (default: "#FFFFFF")
  strokeColor?: string;     // Stroke/outline color hex (default: "#000000")
  strokeWidth?: number;     // Stroke width in pixels (default: 3)
  position?: TextPosition;  // Position preset (default: "bottom")
  x?: number;               // Custom X offset (percentage 0-100, for "custom" position)
  y?: number;               // Custom Y offset (percentage 0-100, for "custom" position)
  lineHeight?: number;      // Line height multiplier (default: 1.4)
  fontFile?: string;        // Font file path (default: bold font)
  shadow?: boolean;         // Drop shadow (default: true)
  maxWidth?: number;        // Max text width as % of image (default: 85)
  alignment?: "left" | "center" | "right"; // Text alignment (default: "center")
}

// Available fonts — resolve dynamically via fc-list for Docker/Alpine compatibility
// Fallback paths for both Debian (local dev) and Alpine (Docker/Railway)
const FONTS: Record<string, string[]> = {
  "dejavu-bold": [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  ],
  "dejavu-regular": [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
  ],
  "tinos-bold": [
    "/usr/share/fonts/truetype/english/Tinos-Bold.ttf",
    "/usr/share/fonts/TTF/Tinos-Bold.ttf",
  ],
  "carlito-bold": [
    "/usr/share/fonts/truetype/english/Carlito-Bold.ttf",
    "/usr/share/fonts/TTF/Carlito-Bold.ttf",
  ],
  "noto-sans-sc": [
    "/usr/share/fonts/truetype/chinese/NotoSansSC[wght].ttf",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  ],
  "poppins-bold": [
    "/usr/share/fonts/truetype/custom/Poppins-Bold.ttf",
  ],
};

function resolveFont(fontName: string): string {
  const candidates = FONTS[fontName] || FONTS["dejavu-bold"];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  // Last resort: return first candidate and let FFmpeg handle the error
  return candidates[0];
}

function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\\\:")
    .replace(/\[/g, "\\\\[")
    .replace(/\]/g, "\\\\]")
    .replace(/%/g, "%%");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TextOverlayParams = await request.json();
    const {
      imageUrl,
      text,
      fontSize = 48,
      fontColor = "#FFFFFF",
      strokeColor = "#000000",
      strokeWidth = 3,
      position = "bottom",
      x: customX,
      y: customY,
      lineHeight = 1.4,
      fontFile = "dejavu-bold",
      shadow = true,
      maxWidth = 85,
      alignment = "center",
    } = body;

    if (!imageUrl || !text) {
      return NextResponse.json({ error: "imageUrl and text are required" }, { status: 400 });
    }

    const id = crypto.randomBytes(8).toString("hex");
    const inputPath = join(tmpdir(), `carousel_input_${id}.png`);
    const outputPath = join(tmpdir(), `carousel_output_${id}.png`);

    try {
      // Step 1: Download the image
      console.log(`[Carousel/AddText] Downloading image: ${imageUrl.slice(0, 80)}...`);
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      writeFileSync(inputPath, imgBuffer);

      // Step 2: Get image dimensions
      const { stdout: probeOut } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        inputPath,
      ]);
      const [imgW, imgH] = probeOut.trim().split(",").map(Number);
      console.log(`[Carousel/AddText] Image dimensions: ${imgW}x${imgH}`);

      // Step 3: Calculate text position
      let xExpr: string;
      let yExpr: string;

      // Calculate Y position based on preset
      let yPercent: number;
      switch (position) {
        case "top":
          yPercent = 8;
          break;
        case "center":
          yPercent = 45;
          break;
        case "bottom":
          yPercent = 82;
          break;
        case "custom":
          yPercent = customY ?? 82;
          break;
        default:
          yPercent = 82;
      }

      // Calculate X alignment
      switch (alignment) {
        case "left":
          xExpr = `(w*${(maxWidth - 85 + 5) / 100})`;
          break;
        case "right":
          xExpr = `(w-w*${(maxWidth - 85 + 5) / 100}-tw)`;
          break;
        case "center":
        default:
          xExpr = `(w-tw)/2`;
          break;
      }

      yExpr = `(h*${yPercent / 100}-th/2)`;

      // If custom X is provided
      if (position === "custom" && customX !== undefined) {
        xExpr = `(w*${customX / 100})`;
      }

      // Step 4: Resolve font path
      const resolvedFont = resolveFont(fontFile);

      // Step 5: Build FFmpeg drawtext filter
      // Handle multiline text — split by \n and create multiple drawtext filters
      const lines = text.split("\\n").length > 1 ? text.split("\\n") : text.split("\n");

      // Scale fontSize relative to image width (target: 1080px base)
      const scaledFontSize = Math.round(fontSize * (imgW / 1080));
      const scaledStroke = Math.round(strokeWidth * (imgW / 1080));
      const lineSpacing = Math.round(scaledFontSize * lineHeight);

      const drawTextFilters: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const lineText = escapeFFmpegText(lines[i]);
        const lineYOffset = (i - (lines.length - 1) / 2) * lineSpacing;

        let filter = `drawtext=fontfile='${resolvedFont}'` +
          `:text='${lineText}'` +
          `:fontsize=${scaledFontSize}` +
          `:fontcolor='${fontColor}'` +
          `:borderw=${scaledStroke}` +
          `:bordercolor='${strokeColor}'` +
          `:x='${xExpr}'` +
          `:y='${yExpr}+${lineYOffset}'`;

        // Add shadow effect
        if (shadow) {
          const shadowOffset = Math.max(2, Math.round(scaledFontSize * 0.05));
          const shadowFilter = `drawtext=fontfile='${resolvedFont}'` +
            `:text='${lineText}'` +
            `:fontsize=${scaledFontSize}` +
            `:fontcolor='black@0.5'` +
            `:borderw=0` +
            `:x='${xExpr}+${shadowOffset}'` +
            `:y='${yExpr}+${lineYOffset}+${shadowOffset}'`;
          drawTextFilters.push(shadowFilter);
        }

        drawTextFilters.push(filter);
      }

      // Also handle maxWidth — wrap text if needed using drawtext's text_shaping
      // For simplicity, we use the text as-is. The user controls line breaks with \n.

      const filterComplex = drawTextFilters.join(",");

      // Step 6: Run FFmpeg
      console.log(`[Carousel/AddText] Running FFmpeg with ${drawTextFilters.length} filters...`);

      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-vf", filterComplex,
        "-q:v", "2",
        outputPath,
      ], { timeout: 30000 });

      // Step 7: Read the output and return as base64
      if (!existsSync(outputPath)) {
        throw new Error("FFmpeg did not produce output file");
      }

      const outputBuffer = readFileSync(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      console.log(`[Carousel/AddText] Text overlay complete! (${(outputBuffer.length / 1024).toFixed(0)}KB)`);

      return NextResponse.json({
        success: true,
        image: dataUrl,
      });

    } finally {
      // Cleanup temp files
      try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch {}
      try { if (existsSync(outputPath)) unlinkSync(outputPath); } catch {}
    }
  } catch (error: unknown) {
    console.error("[Carousel/AddText] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to add text overlay", details: message }, { status: 500 });
  }
}
