import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export const maxDuration = 600; // 10 minutes for long pipelines
export const dynamic = "force-dynamic";

const DEFAULT_KIE_KEY = process.env.KIE_KEY || "aaf0ea1db84a074fb1ed0ba386bbf615";
const DEFAULT_FAL_KEY = process.env.FAL_KEY || "c8b8a13a-d358-4a8c-b4a0-a6aee1da0bc5:c5c823fe4dad5a72691a9ab8eac5ef2c";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── SSE Helper ────────────────────────────────────────────────────────
interface SafeWriter {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  closed: boolean;
}

function sseSend(sw: SafeWriter, event: Record<string, unknown>): boolean {
  if (sw.closed) return false;
  try {
    sw.writer.write(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
    return true;
  } catch {
    sw.closed = true;
    return false;
  }
}

async function startHeartbeat(sw: SafeWriter, stopSignal: { stopped: boolean }) {
  while (!stopSignal.stopped) {
    await sleep(8000);
    if (!stopSignal.stopped) {
      const ok = sseSend(sw, { type: "ping", t: Date.now() });
      if (!ok) stopSignal.stopped = true;
    }
  }
}

// ─── Upload Image to KIE ─────────────────────────────────────────────
async function uploadImageToKie(
  base64Data: string,
  fileName: string,
  apiKey: string
): Promise<string> {
  let rawBase64 = base64Data;
  if (rawBase64.includes(",")) rawBase64 = rawBase64.split(",")[1];

  const res = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ base64Data: rawBase64, fileName, uploadPath: "images" }),
  });

  const json = await res.json();
  if (!json.success) throw new Error("Image upload failed: " + (json.msg || JSON.stringify(json)));
  const downloadUrl = json.data?.downloadUrl;
  if (!downloadUrl) throw new Error("Upload succeeded but no downloadUrl returned");
  return downloadUrl;
}

// ─── Generate Script (DeepSeek) ────────────────────────────────────────
async function generateScript(
  topic: string,
  duration: number,
  apiKey: string,
  provider: string = "deepseek"
): Promise<Array<{ script: string; framePrompt: string; description: string; label: string }>> {
  const AI_PROVIDERS: Record<string, { apiUrl: string; model: string }> = {
    deepseek: { apiUrl: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
    groq: { apiUrl: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
    gemini: { apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.0-flash" },
  };

  const prov = AI_PROVIDERS[provider] || AI_PROVIDERS.deepseek;
  const sceneCount = Math.max(2, Math.ceil(duration / 8));

  const systemPrompt =
    `You are an expert video scriptwriter. You create engaging scripts for AI avatar videos.` +
    `\n\nRules:` +
    `\n- Create EXACTLY ${sceneCount} scenes` +
    `\n- Each scene should be 15-25 words (2-3 short sentences, ~8 seconds spoken)` +
    `\n- Each scene flows naturally into the next` +
    `\n- Use conversational, engaging language` +
    `\n- For EACH scene, create a detailed IMAGE PROMPT describing the visual setting, person's appearance, pose, expression, and environment` +
    `\n- The image prompts should describe DIFFERENT backgrounds/environments per scene to make the video visually interesting` +
    `\n- Person should be looking at camera in every scene` +
    `\n\nCRITICAL: Respond ONLY with a valid JSON object. No markdown. No code blocks.` +
    `\n{"scenes": [{"label": "SCENE_LABEL", "script": "the spoken dialogue", "framePrompt": "detailed image prompt: describe the person, their pose, expression, clothing, and the background/setting for this scene. Looking at camera. Photorealistic.", "description": "brief visual setting"}]}`;

  const userPrompt = `Topic: "${topic}"\nDuration: ${duration} seconds (${sceneCount} scenes)\n\nCreate the script:`;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await fetch(prov.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: prov.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        if (attempt < 2) { await sleep(2000); continue; }
        throw new Error(`Script API error (${response.status}): ${errText.slice(0, 300)}`);
      }

      const completion = await response.json();
      const rawContent = completion?.choices?.[0]?.message?.content || "";
      if (!rawContent.trim()) { if (attempt < 2) { await sleep(2000); continue; } throw new Error("Empty script response"); }

      // Parse JSON
      let jsonStr = rawContent.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      const braceStart = jsonStr.indexOf("{");
      const braceEnd = jsonStr.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1) jsonStr = jsonStr.slice(braceStart, braceEnd + 1);

      let parsed;
      try { parsed = JSON.parse(jsonStr); } catch { if (attempt < 2) { await sleep(2000); continue; } throw new Error("Failed to parse script JSON"); }

      const scenes = parsed.scenes;
      if (!Array.isArray(scenes) || scenes.length === 0) throw new Error("No scenes in script");

      return scenes.map((s: any, i: number) => ({
        script: s.script || "",
        framePrompt: s.framePrompt || `Person looking at camera, ${s.description || "neutral background"}`,
        description: s.description || `Scene ${i + 1}`,
        label: s.label || `Scene ${i + 1}`,
      }));
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(2000);
    }
  }
  throw new Error("Script generation failed after retries");
}

// ─── Generate Frame with Reference (google/nano-banana-edit) ─────────────────
async function generateFrameWithRef(
  prompt: string,
  referenceImageUrl: string,
  apiKey: string,
  onProgress?: (elapsed: number, pollCount: number) => void
): Promise<string> {
  const imgPrompt =
    prompt.trim() +
    ". Keep the EXACT SAME person from the reference image — same face, same facial features, same hair, same skin tone, same body. " +
    "Photorealistic, high quality, 9:16 vertical format. Fixed tripod shot, looking at camera.";

  const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: { prompt: imgPrompt, image_urls: [referenceImageUrl], image_size: "9:16", output_format: "png", strength: 0.35 },
    }),
  });

  const json = await res.json();
  if (json.code !== 200) throw new Error("Frame submit failed: " + (json.msg || JSON.stringify(json)));
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error("No taskId for frame generation");

  // Poll for result
  for (let i = 0; i < 120; i++) {
    // Send progress update every 2 poll cycles (~6s)
    if (onProgress && i % 2 === 0) {
      onProgress(i * 3, i);
    }
    try {
      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollJson = await pollRes.json();

      if (pollJson.code === 200) {
        const d = pollJson.data;
        if (d?.state === "success") {
          let result;
          if (typeof d.resultJson === "string") { try { result = JSON.parse(d.resultJson); } catch { result = d.resultJson; } }
          else { result = d.resultJson; }
          const imageUrl = result?.resultUrls?.[0] || result?.result_url || result?.url;
          if (imageUrl) return imageUrl;
          throw new Error("Frame ready but no URL");
        }
        if (d?.state === "fail") throw new Error("Frame generation failed: " + (d?.failMsg || "unknown"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("generation failed") || msg.includes("no URL")) throw err;
    }
    await sleep(3000);
  }
  throw new Error("Frame generation timed out after 6 minutes");
}

// ─── Download & Re-upload Frame to KIE ────────────────────────────────
async function downloadAndReupload(imageUrl: string, apiKey: string, label: string): Promise<string> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return await uploadImageToKie(dataUrl, `${label}_${Date.now()}.png`, apiKey);
  } catch {
    return imageUrl; // Fallback to original URL
  }
}

// ─── Generate Video (Veo / Grok) ────────────────────────────────────────────
async function generateVideo(
  frameUrl: string,
  script: string,
  apiKey: string,
  videoModel: string = "veo3_lite",
  onProgress?: (elapsed: number, pollCount: number) => void,
  videoPromptSuffix?: string
): Promise<string> {
  const videoPrompt =
    `IMPORTANT: This is a RAW UNCUT CONTINUOUS SHOT — NOT an edited video. You must NOT apply ANY post-production effects, transitions, or editing. Output must look like raw footage from a single locked camera — like a webcam recording. No editing, no effects, no transitions at all. ` +
    `1. ABSOLUTE BAN ON ALL TRANSITIONS (ZERO TOLERANCE): Do NOT add ANY visual transitions at ANY point — beginning, middle, or end of the video. BANNED transitions (ALL of these are FORBIDDEN): fade-in from black, fade-out to black, fade-in from white, fade-out to white, cross-dissolve, cross-fade, wipe, flash, glitch, jump cut, whip pan, blur transition, iris wipe, slide transition, zoom transition, dip to color, soft wipe, hard cut, morph transition, ink wipe, clock wipe, star wipe, any fade effect, any dissolve effect, any color flash. The video must START INSTANTLY at full brightness — NO fade-in. The video must END INSTANTLY at full brightness — NO fade-out. There must be ZERO cuts, ZERO edits, ZERO transition effects of ANY kind at ANY timestamp in the video. Every single frame from 0:00 to the end must maintain full, consistent visibility with NO opacity changes, NO color shifts, NO brightness changes. ` +
    `2. STATIC CAMERA (LOCKED TRIPOD): The camera angle, framing, and composition MUST remain IDENTICAL to the reference image for the ENTIRE duration. NO zooming, NO panning, NO tilting, NO tracking, NO dolly, NO camera shake, NO floating camera movement. The camera must be 100% locked and static — no movement whatsoever. ` +
    `3. OBJECT LOCK: Do NOT add, remove, modify, or animate ANY objects that were not in the reference image. NO floating text, NO graphics, NO subtitles, NO overlays, NO particles, NO sparkles, NO light rays, NO lens flare, NO bokeh. The background must remain EXACTLY as shown in the reference image — no changes. ` +
    `3.5. ABSOLUTE BAN ON TEXT (ZERO TOLERANCE): Do NOT add ANY text, words, letters, numbers, captions, subtitles, titles, watermarks, logos, or typography of ANY kind ANYWHERE in the video — not on screen, not floating, not embedded in the background, not on clothing, not on objects. NO text overlays, NO lower thirds, NO name cards, NO credits, NO chyron, NO ticker, NO speech bubbles, NO comic-style text, NO animated text. This includes ALL languages and ALL scripts (Latin, Arabic, Chinese, Japanese, Korean, Cyrillic, etc.). The video must contain ZERO text of any kind from the first frame to the last frame. If any text appears in the video, it will be REJECTED. ` +
    `4. EXPRESSIVE PERSON MOVEMENT (natural speaker style): The person should be an engaging, expressive speaker — NOT a stiff news anchor. Movement should feel natural and contextual. ENCOURAGED movements that match the dialogue: Hand gestures: pointing, open palms, counting on fingers, waving, thumbs up, natural gesticulation while speaking. Arm movement: natural arm raises, gentle hand sweeps, bringing hands together or apart to emphasize points. Head movement: natural head tilts, slight nods for emphasis, occasional head turns, looking side to side naturally. Shoulder movement: subtle shoulder shrugs, natural shoulder shifts when gesturing. Upper body: slight torso rotation, natural lean forward when making important points. Facial expressions: animated eyebrows, natural smiles, expressive eyes, raised eyebrows for emphasis, thoughtful expressions. IMPORTANT: All movements must be SMOOTH and NATURAL — not robotic, not exaggerated, not dramatic. Movements should correlate with the content being spoken. When listing items, use counting gestures. When emphasizing a point, use hand gestures. When asking a question, raise eyebrows slightly. FORBIDDEN: standing up, walking, dancing, jumping, running, touching face excessively, picking up objects, crossing arms tightly, putting hands in pockets, overly dramatic or theatrical movements. ` +
    `5. LIGHTING CONSISTENCY: Lighting must remain EXACTLY as shown in the reference image — NO changes, NO flickering, NO color shifts, NO brightness changes. ` +
    `6. SCRIPT BOUNDARY — SILENCE AFTER LAST WORD: The person must say ONLY the exact words in the dialogue and NOTHING ELSE. After the last word: mouth CLOSED, gentle smile, hands come to rest naturally, steady eye contact. ZERO extra words, ZERO filler sounds, ZERO lip movement after script ends. ` +
    `REFERENCE IMAGE: This is a talking-head video with expressive hand gestures and body language. The reference image is the ONLY source of truth for the person's appearance. Output must look like a raw, unedited, continuous webcam recording of an engaging speaker who uses natural hand gestures, head movements, and facial expressions while speaking. CRITICAL REMINDERS: NO fade-in at start. NO fade-out at end. NO transitions whatsoever. NO cuts. Camera stays STATIC (locked tripod). RAW FOOTAGE ONLY. INSTANT start, INSTANT end. Full brightness at all times. The person should use hand gestures, natural head movement, and expressive body language that MATCHES the dialogue content. Dialogue: "${script}" ` +
    `AUDIO RULES: MUTE ALL BACKGROUND AUDIO COMPLETELY. ZERO music — no background music, no instrumental music, no ambient music, no soundtrack, no beat, no melody, no jingle, no BGM of any kind. ZERO ambient sounds — no wind, no birds, no traffic, no footsteps, no nature sounds, no room tone, no echo, no reverb, no environmental audio whatsoever. The ONLY audio allowed is the person's own voice: a clear, warm, natural speaking voice with confident tone and friendly delivery. The audio track must contain ONLY clean, dry voice — no music intro, no music outro, no music transitions between scenes, no background score at any point. Absolutely no sound effects, no whoosh, no ding, no transition sounds. This is critical: the final audio must be 100% voice-only with zero musical or ambient elements.`
    + (videoPromptSuffix?.trim() ? ` ADDITIONAL INSTRUCTIONS: ${videoPromptSuffix.trim()}` : "");

  // ── Route to correct API based on model ──
  const isVeoModel = videoModel.startsWith("veo");
  let taskId: string;

  if (isVeoModel) {
    // Veo models use /api/v1/veo/generate endpoint
    const res = await fetch("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: videoPrompt,
        imageUrls: [frameUrl],
        model: videoModel,
        aspect_ratio: "9:16",
        enableTranslation: true,
      }),
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error("Video submit failed: " + (json.msg || JSON.stringify(json)));
    taskId = json.data?.taskId;
    if (!taskId) throw new Error("No taskId for video generation");
  } else {
    // Non-Veo models (Grok, etc.) use /api/v1/jobs/createTask endpoint
    const res = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: videoModel,
        input: {
          prompt: videoPrompt,
          image_urls: [frameUrl],
          aspect_ratio: "9:16",
        },
      }),
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error("Video submit failed: " + (json.msg || JSON.stringify(json)));
    taskId = json.data?.taskId;
    if (!taskId) throw new Error("No taskId for video generation");
  }

  // Poll for result — use correct polling endpoint based on model
  const pollEndpoint = isVeoModel
    ? `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`
    : `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`;

  for (let i = 0; i < 180; i++) {
    // Send progress update every 2 poll cycles (~10s)
    if (onProgress && i % 2 === 0) {
      onProgress(i * 5, i);
    }
    try {
      const pollRes = await fetch(pollEndpoint, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollJson = await pollRes.json();

      if (pollJson.code === 200) {
        const d = pollJson.data;

        // Check success — Veo uses successFlag/status/state, Jobs uses state
        const isSuccess = isVeoModel
          ? (d?.successFlag === 1 || d?.status === "success" || d?.state === "success")
          : d?.state === "success";
        const isFailed = isVeoModel
          ? (d?.successFlag === 2 || d?.successFlag === 3 || d?.status === "failed" || d?.state === "fail")
          : d?.state === "fail";

        if (isSuccess) {
          // Extract video URL from response
          let resp = d.response || d.result || d;
          if (typeof resp === "string") { try { resp = JSON.parse(resp); } catch {} }
          let videoUrl =
            resp?.resultUrls?.[0] || resp?.originUrls?.[0] || resp?.url ||
            resp?.videoUrl || resp?.video_url ||
            d.resultUrls?.[0] || d.videoUrl || d.url;
          if (!videoUrl && typeof resp?.resultUrls === "string") { try { videoUrl = JSON.parse(resp.resultUrls)[0]; } catch {} }
          if (!videoUrl) {
            const urlPattern = /https?:\/\/[^\s"']+\.(mp4|mov|avi|webm)/i;
            const match = JSON.stringify(d).match(urlPattern);
            if (match) videoUrl = match[0];
          }
          if (!videoUrl) {
            const anyUrlPattern = /https?:\/\/[^\s"']+/g;
            const allUrls = JSON.stringify(d).match(anyUrlPattern) || [];
            videoUrl = allUrls.find((u: string) => /video|cdn|media|output|result|download|veo|sora/i.test(u)) || allUrls[0] || "";
          }
          if (videoUrl) return videoUrl;
          throw new Error("Video ready but no URL");
        }
        if (isFailed) {
          throw new Error("Video generation failed: " + (d?.errorMessage || d?.error || d?.failMsg || "unknown"));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("generation failed") || msg.includes("no URL")) throw err;
    }
    await sleep(5000);
  }
  throw new Error("Video generation timed out after 15 minutes");
}

// ─── Merge Videos (fal.ai) ───────────────────────────────────────────
async function mergeVideos(videoUrls: string[], falApiKey: string): Promise<string> {
  const res = await fetch("https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos", {
    method: "POST",
    headers: { Authorization: `Key ${falApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ video_urls: videoUrls }),
  });

  const json = await res.json();

  // Direct result
  if (json.video?.url) return json.video.url;
  if (typeof json.url === "string") return json.url;

  // Async polling
  const requestId = json.request_id;
  if (requestId) {
    const statusUrl = json.status_url || `https://queue.fal.run/fal-ai/ffmpeg-api/requests/${requestId}/status`;
    const responseUrl = json.response_url || `https://queue.fal.run/fal-ai/ffmpeg-api/requests/${requestId}`;

    for (let i = 0; i < 90; i++) {
      await sleep(3000);
      try {
        const statusRes = await fetch(statusUrl, { headers: { Authorization: `Key ${falApiKey}` } });
        const statusJson = await statusRes.json();

        if (statusJson.status === "COMPLETED") {
          const resultRes = await fetch(responseUrl, { headers: { Authorization: `Key ${falApiKey}` } });
          const resultJson = await resultRes.json();
          if (resultJson.video?.url) return resultJson.video.url;
          if (typeof resultJson.url === "string") return resultJson.url;
          throw new Error("Merge done but no URL");
        }
        if (statusJson.status === "FAILED") throw new Error("Merge failed: " + (statusJson.error || "unknown"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Merge failed") || msg.includes("no URL")) throw err;
      }
    }
    throw new Error("Merge timed out");
  }

  throw new Error("Merge failed: " + JSON.stringify(json).slice(0, 300));
}

// ═══════════════════════════════════════════════════════════════════════
// POST Handler — Auto Chain Pipeline
// ═══════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    action,
    // Script generation
    topic, duration, aiApiKey, aiProvider,
    // Full pipeline
    characterImageUrl, scenes: requestScenes,
    kieApiKey, falApiKey, videoModel,
    // Manual frames mode: skip frame generation, use pre-uploaded frame URLs
    skipFrames,
    preUploadedFrameUrls,
    // Resume mode: pass already-completed URLs to skip them
    existingFrameUrls,
    existingVideoUrls,
    // Per-scene custom reference images (optional — used alongside Scene 1 frame as reference)
    customReferenceImages,
    // Merge-only action
    videoUrls: mergeVideoUrls,
    // Frames-only mode: stop after generating frames, don't generate videos
    framesOnly,
    // Single-scene frame regeneration: regenerate just one scene's frame
    regenerateSceneIndex,
    // Avatar-only mode: skip frame generation, use characterImageUrl as frame for every scene
    avatarOnly,
  } = body as {
    action?: string;
    topic?: string;
    duration?: number;
    aiApiKey?: string;
    aiProvider?: string;
    characterImageUrl?: string;
    scenes?: Array<{ script: string; framePrompt: string; description: string; label: string; videoPromptSuffix?: string }>;
    kieApiKey?: string;
    falApiKey?: string;
    videoModel?: string;
    skipFrames?: boolean;
    preUploadedFrameUrls?: string[];
    existingFrameUrls?: string[];
    existingVideoUrls?: string[];
    customReferenceImages?: string[];
    videoUrls?: string[];
    framesOnly?: boolean;
    regenerateSceneIndex?: number;
    avatarOnly?: boolean;
  };

  // ── Action: Generate Script Only ──
  if (action === "generate_script") {
    if (!topic?.trim()) return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    if (!aiApiKey) return NextResponse.json({ error: "AI API key is required" }, { status: 400 });

    try {
      const scenes = await generateScript(topic.trim(), duration || 30, aiApiKey, aiProvider || "deepseek");
      return NextResponse.json({ scenes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Resolve API keys: use client-provided keys if valid, otherwise fall back to server defaults
  const effectiveKieKey = (kieApiKey && kieApiKey.length >= 10) ? kieApiKey : DEFAULT_KIE_KEY;
  const effectiveFalKey = (falApiKey && falApiKey.length >= 10) ? falApiKey : DEFAULT_FAL_KEY;

  // ── Action: Merge Videos Only ──
  if (action === "merge_only") {
    if (!mergeVideoUrls || mergeVideoUrls.length < 2) return NextResponse.json({ error: "At least 2 video URLs are required" }, { status: 400 });

    try {
      const mergedUrl = await mergeVideos(mergeVideoUrls, effectiveFalKey);
      return NextResponse.json({ videoUrl: mergedUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Action: Regenerate a Single Frame ──
  if (action === "regenerate_frame") {
    if (regenerateSceneIndex === undefined || regenerateSceneIndex === null) return NextResponse.json({ error: "regenerateSceneIndex is required" }, { status: 400 });
    if (!requestScenes || requestScenes.length === 0) return NextResponse.json({ error: "Scenes are required" }, { status: 400 });
    if (!effectiveKieKey) return NextResponse.json({ error: "KIE API key is required" }, { status: 400 });
    if (!characterImageUrl && !existingFrameUrls?.[0]) return NextResponse.json({ error: "Character image URL or Scene 1 frame URL is required" }, { status: 400 });

    const sceneIdx = regenerateSceneIndex;
    const scene = requestScenes[sceneIdx];
    if (!scene) return NextResponse.json({ error: `Scene ${sceneIdx + 1} not found` }, { status: 400 });

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const sw: SafeWriter = { writer, closed: false };
    const heartbeatStop = { stopped: false };
    startHeartbeat(sw, heartbeatStop);

    (async () => {
      try {
        sseSend(sw, { type: "pipeline_started", totalScenes: 1, message: `Regenerating frame for Scene ${sceneIdx + 1}...` });

        // Determine reference: Scene 1 frame if available, otherwise character image
        let refUrl = characterImageUrl || "";
        if (sceneIdx > 0 && existingFrameUrls?.[0]) {
          refUrl = existingFrameUrls[0]; // Use Scene 1's frame as reference for other scenes
        }

        const customRefImage = customReferenceImages?.[sceneIdx];
        const imageUrls: string[] = [];
        if (customRefImage && sceneIdx > 0) {
          imageUrls.push(customRefImage);
          if (existingFrameUrls?.[0]) imageUrls.push(existingFrameUrls[0]);
          else if (characterImageUrl) imageUrls.push(characterImageUrl);
        } else if (customRefImage && sceneIdx === 0) {
          imageUrls.push(customRefImage);
          if (characterImageUrl) imageUrls.push(characterImageUrl);
        } else {
          imageUrls.push(refUrl);
        }

        sseSend(sw, { type: "step_change", step: "frames", message: `Regenerating frame ${sceneIdx + 1}...` });

        const MAX_RETRIES = 3;
        let frameUrl = "";
        let lastError = "";

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          sseSend(sw, { type: "frame_progress", sceneIndex: sceneIdx, pct: 0, message: attempt === 1 ? `Regenerating frame ${sceneIdx + 1}...` : `Retry ${attempt}/${MAX_RETRIES}: ${lastError.slice(0, 80)}` });

          try {
            const imgPrompt = scene.framePrompt.trim() + ". Keep the EXACT SAME person from the reference image — same face, same facial features, same hair, same skin tone, same body. Photorealistic, high quality, 9:16 vertical format. Fixed tripod shot, looking at camera.";

            const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
              method: "POST",
              headers: { Authorization: `Bearer ${effectiveKieKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: "google/nano-banana-edit", input: { prompt: imgPrompt, image_urls: imageUrls, image_size: "9:16", output_format: "png", strength: 0.35 } }),
            });

            const submitJson = await submitRes.json();
            if (submitJson.code !== 200) throw new Error("Frame submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
            const taskId = submitJson.data?.taskId;
            if (!taskId) throw new Error("No taskId for frame generation");

            let rawFrameUrl = "";
            for (let p = 0; p < 120; p++) {
              if (p % 2 === 0) sseSend(sw, { type: "frame_progress", sceneIndex: sceneIdx, pct: 0, message: `Regenerating frame ${sceneIdx + 1}... (${p * 3}s)` });
              try {
                const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers: { Authorization: `Bearer ${effectiveKieKey}` } });
                const pollJson = await pollRes.json();
                if (pollJson.code === 200) {
                  const d = pollJson.data;
                  if (d?.state === "success") {
                    let result;
                    if (typeof d.resultJson === "string") { try { result = JSON.parse(d.resultJson); } catch { result = d.resultJson; } } else { result = d.resultJson; }
                    const imageUrl = result?.resultUrls?.[0] || result?.result_url || result?.url;
                    if (imageUrl) { rawFrameUrl = imageUrl; break; }
                    throw new Error("Frame ready but no URL");
                  }
                  if (d?.state === "fail") throw new Error("Frame generation failed: " + (d?.failMsg || "unknown"));
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes("generation failed") || msg.includes("no URL")) throw err;
              }
              await sleep(3000);
            }
            if (!rawFrameUrl) throw new Error("Frame generation timed out");

            frameUrl = await downloadAndReupload(rawFrameUrl, effectiveKieKey, `regen_frame_${sceneIdx}`);
            lastError = "";
            break;
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            if (attempt < MAX_RETRIES) {
              sseSend(sw, { type: "frame_error", sceneIndex: sceneIdx, error: lastError, retryAttempt: attempt, maxRetries: MAX_RETRIES, message: `Frame ${sceneIdx + 1} ERROR (attempt ${attempt}/${MAX_RETRIES}): ${lastError} — retrying...` });
              await sleep(10000);
            }
          }
        }

        if (frameUrl) {
          sseSend(sw, { type: "frame_done", sceneIndex: sceneIdx, frameUrl, message: `Frame ${sceneIdx + 1} regenerated!` });
        } else {
          sseSend(sw, { type: "frame_error", sceneIndex: sceneIdx, error: lastError, message: `Frame ${sceneIdx + 1} FAILED: ${lastError}` });
        }

        sseSend(sw, { type: "frames_complete", frameUrls: [frameUrl], successCount: frameUrl ? 1 : 0, regeneratedSceneIndex: sceneIdx, message: `Frame regeneration ${frameUrl ? "complete" : "failed"}` });
        sseSend(sw, { type: "done", frameUrls: [frameUrl], regeneratedSceneIndex: sceneIdx });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sseSend(sw, { type: "error", message: msg });
      } finally {
        heartbeatStop.stopped = true;
        try { writer.close(); } catch {}
      }
    })();

    return new Response(stream.readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Keep-Alive": "timeout=900, max=10000" } });
  }

  // ── Action: Videos Only (frames already generated, just generate videos + merge) ──
  if (action === "videos_only") {
    if (!requestScenes || requestScenes.length === 0) return NextResponse.json({ error: "Scenes are required" }, { status: 400 });
    if (!effectiveKieKey) return NextResponse.json({ error: "KIE API key is required" }, { status: 400 });
    if (!existingFrameUrls || existingFrameUrls.filter(Boolean).length === 0) return NextResponse.json({ error: "Frame URLs are required for video generation" }, { status: 400 });

    const totalScenes = requestScenes.length;
    const model = videoModel || "veo3_lite";

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const sw: SafeWriter = { writer, closed: false };
    const heartbeatStop = { stopped: false };
    startHeartbeat(sw, heartbeatStop);

    (async () => {
      try {
        sseSend(sw, { type: "pipeline_started", totalScenes, message: `Generating videos for ${totalScenes} scenes...` });

        const frameUrls = [...existingFrameUrls];
        const MAX_VIDEO_RETRIES = 5;
        const videoUrls: string[] = [];
        if (existingVideoUrls) { for (let i = 0; i < totalScenes; i++) videoUrls[i] = existingVideoUrls[i] || ""; }

        sseSend(sw, { type: "step_change", step: "videos", message: "Generating videos from approved frames..." });

        for (let i = 0; i < totalScenes; i++) {
          if (videoUrls[i]) continue;
          if (!frameUrls[i]) { videoUrls[i] = ""; continue; }

          const scene = requestScenes[i];
          let videoUrl = "";
          let lastVideoError = "";

          for (let attempt = 1; attempt <= MAX_VIDEO_RETRIES; attempt++) {
            const pct = Math.round(((i) / totalScenes) * 80);
            sseSend(sw, { type: "video_progress", sceneIndex: i, pct, message: attempt === 1 ? `Video ${i + 1}/${totalScenes}: Generating...` : `Video ${i + 1} retry ${attempt}/${MAX_VIDEO_RETRIES}: ${lastVideoError.slice(0, 60)}` });

            try {
              videoUrl = await generateVideo(
                frameUrls[i], scene.script, effectiveKieKey, model,
                (elapsed, pollCount) => {
                  sseSend(sw, { type: "video_progress", sceneIndex: i, pct, message: `Video ${i + 1}/${totalScenes}: Generating... (${elapsed}s elapsed)` });
                },
                scene.videoPromptSuffix
              );
              lastVideoError = "";
              break;
            } catch (err) {
              lastVideoError = err instanceof Error ? err.message : String(err);
              if (attempt < MAX_VIDEO_RETRIES) {
                sseSend(sw, { type: "video_error", sceneIndex: i, error: lastVideoError, message: `Video ${i + 1} ERROR (attempt ${attempt}/${MAX_VIDEO_RETRIES}) — retrying in 10s...` });
                await sleep(10000);
              }
            }
          }

          if (videoUrl) {
            videoUrls[i] = videoUrl;
            sseSend(sw, { type: "video_done", sceneIndex: i, videoUrl, message: `Video ${i + 1}/${totalScenes} complete!` });
          } else {
            videoUrls[i] = "";
            sseSend(sw, { type: "video_error", sceneIndex: i, error: lastVideoError, message: `Video ${i + 1} FAILED: ${lastVideoError}` });
          }
        }

        const successfulVideos = videoUrls.filter(Boolean);
        sseSend(sw, { type: "videos_complete", videoUrls, successCount: successfulVideos.length });

        if (successfulVideos.length === 0) {
          sseSend(sw, { type: "error", message: "No videos were generated successfully" });
          return;
        }

        // Merge if multiple videos
        if (successfulVideos.length > 1) {
          sseSend(sw, { type: "step_change", step: "merge", message: "Merging videos..." });
          try {
            const mergedUrl = await mergeVideos(successfulVideos, effectiveFalKey);
            sseSend(sw, { type: "done", videoUrl: mergedUrl, videoUrls: successfulVideos });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            sseSend(sw, { type: "merge_error", error: msg, message: `Merge failed: ${msg}` });
            sseSend(sw, { type: "done", videoUrls: successfulVideos });
          }
        } else {
          sseSend(sw, { type: "done", videoUrl: successfulVideos[0], videoUrls: successfulVideos });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sseSend(sw, { type: "error", message: msg });
      } finally {
        heartbeatStop.stopped = true;
        try { writer.close(); } catch {}
      }
    })();

    return new Response(stream.readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Keep-Alive": "timeout=900, max=10000" } });
  }

  // ── Action: Full Auto Chain Pipeline ──
  // In skipFrames mode, characterImageUrl is optional (user uploaded their own frames)
  // In avatarOnly mode, characterImageUrl IS required (it becomes the frame for every scene)
  if (!skipFrames && !avatarOnly && !characterImageUrl) return NextResponse.json({ error: "Character image URL is required" }, { status: 400 });
  if (avatarOnly && !characterImageUrl) return NextResponse.json({ error: "Character image URL is required for avatar-only mode" }, { status: 400 });
  if (!requestScenes || requestScenes.length === 0) return NextResponse.json({ error: "Scenes are required" }, { status: 400 });
  if (!effectiveKieKey) return NextResponse.json({ error: "KIE API key is required" }, { status: 400 });
  if (skipFrames && !avatarOnly && (!preUploadedFrameUrls || preUploadedFrameUrls.length === 0)) {
    return NextResponse.json({ error: "Pre-uploaded frame URLs are required when skipFrames is true" }, { status: 400 });
  }

  const model = videoModel || "veo3_lite";
  const totalScenes = requestScenes.length;

  // Set up SSE stream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const sw: SafeWriter = { writer, closed: false };
  const heartbeatStop = { stopped: false };
  startHeartbeat(sw, heartbeatStop);

  // Run pipeline in background
  (async () => {
    try {
      sseSend(sw, { type: "pipeline_started", totalScenes, message: `Auto Chain: ${totalScenes} scenes${avatarOnly ? " (avatar only — skipping frame generation)" : skipFrames ? " (pre-set frames — skipping generation)" : ""}${existingVideoUrls?.some(Boolean) ? " (resuming)" : ""}` });

      // ── STEP 1: Frame Generation (skip if avatar-only, user uploaded their own frames, OR resuming with existing frames) ──
      const frameUrls: string[] = [];

      // Pre-fill with existing frame URLs from resume
      if (existingFrameUrls) {
        for (let i = 0; i < totalScenes; i++) {
          frameUrls[i] = existingFrameUrls[i] || "";
        }
      }

      if (avatarOnly && characterImageUrl) {
        // ── Avatar-Only mode: use the character/avatar image as the frame for EVERY scene ──
        // No AI frame generation — the uploaded avatar IS the first frame for all scenes
        sseSend(sw, { type: "step_change", step: "frames", message: "Avatar Only mode: using your avatar image as frame for all scenes (skipping frame generation)..." });
        for (let i = 0; i < totalScenes; i++) {
          frameUrls.push(characterImageUrl);
          sseSend(sw, { type: "frame_done", sceneIndex: i, frameUrl: characterImageUrl, message: `Frame ${i + 1}/${totalScenes}: Using avatar image` });
        }
        sseSend(sw, { type: "frames_complete", frameUrls, successCount: totalScenes, message: `${totalScenes}/${totalScenes} frames ready (avatar image)` });

        // ── Frames-only mode: stop here, let user review before generating videos ──
        if (framesOnly) {
          sseSend(sw, { type: "done", frameUrls, framesOnly: true, message: "Frames ready! Review and then generate videos." });
          return;
        }
      } else if (skipFrames && preUploadedFrameUrls) {
        // User already has frames — skip generation, use pre-uploaded URLs directly
        // NOTE: preUploadedFrameUrls may have undefined entries for scenes without custom frames
        // We need to handle gaps: scenes with URLs use them, scenes without need AI generation
        const hasAllFrames = preUploadedFrameUrls.filter((u: string | undefined) => u && u.length > 0).length === totalScenes;
        
        if (hasAllFrames) {
          // All scenes have uploaded frames — skip generation entirely
          sseSend(sw, { type: "step_change", step: "frames", message: "Using pre-set frames (skipping generation)..." });
          for (let i = 0; i < totalScenes; i++) {
            const frameUrl = preUploadedFrameUrls[i] || "";
            frameUrls.push(frameUrl);
            if (frameUrl) {
              const isSameUrl = preUploadedFrameUrls.every((u: string | undefined) => u === preUploadedFrameUrls[0]);
              sseSend(sw, { type: "frame_done", sceneIndex: i, frameUrl, message: `Frame ${i + 1}/${totalScenes}: ${isSameUrl ? "Using avatar image" : "Using uploaded frame"}` });
            } else {
              sseSend(sw, { type: "frame_error", sceneIndex: i, error: "No frame uploaded", message: `Frame ${i + 1}: No uploaded frame` });
            }
          }
          const successfulFrames = frameUrls.filter(Boolean);
          const isAvatarOnly = preUploadedFrameUrls.length > 0 && preUploadedFrameUrls.every((u: string | undefined) => u === preUploadedFrameUrls[0]);
          sseSend(sw, { type: "frames_complete", frameUrls, successCount: successfulFrames.length, message: `${successfulFrames.length}/${totalScenes} frames ready (${isAvatarOnly ? "avatar image" : "uploaded"})` });

          if (successfulFrames.length === 0) {
            sseSend(sw, { type: "error", message: "No uploaded frames were provided" });
            return;
          }

          // ── Frames-only mode: stop here, let user review before generating videos ──
          if (framesOnly) {
            sseSend(sw, { type: "done", frameUrls, framesOnly: true, message: "Frames ready! Review and then generate videos." });
            return;
          }
        } else {
          // MIXED MODE: Some scenes have custom frames, others need AI generation
          // Pre-fill the uploaded frame URLs, then generate missing ones
          sseSend(sw, { type: "step_change", step: "frames", message: "Using uploaded frames + generating missing ones..." });
          
          const uploadedCount = preUploadedFrameUrls.filter((u: string | undefined) => u && u.length > 0).length;
          const missingCount = totalScenes - uploadedCount;
          sseSend(sw, { type: "log", message: `[Auto Chain] ${uploadedCount} scenes have custom frames, ${missingCount} need AI generation` });
          
          // Pre-fill uploaded frame URLs
          for (let i = 0; i < totalScenes; i++) {
            const url = preUploadedFrameUrls[i];
            if (url && url.length > 0) {
              frameUrls.push(url);
              sseSend(sw, { type: "frame_done", sceneIndex: i, frameUrl: url, message: `Frame ${i + 1}/${totalScenes}: Using uploaded frame` });
            } else {
              frameUrls.push(""); // Placeholder — will be filled by AI generation
            }
          }
          
          // Now generate frames for scenes that don't have one (using character image as reference)
          if (missingCount > 0 && characterImageUrl) {
            sseSend(sw, { type: "frame_progress", sceneIndex: -1, pct: 0, message: `Generating ${missingCount} missing frame(s) using character reference...` });
            
            const MAX_FRAME_RETRIES = 3;
            let scene1FrameUrl = frameUrls[0] || ""; // If Scene 1 has a custom frame, use it as reference for others
            
            for (let i = 0; i < totalScenes; i++) {
              if (frameUrls[i]) continue; // Already has uploaded frame — skip
              
              let frameUrl = "";
              let lastFrameError = "";
              for (let attempt = 1; attempt <= MAX_FRAME_RETRIES; attempt++) {
                const refUrl = i === 0 ? characterImageUrl : (scene1FrameUrl || characterImageUrl);
                const refDesc = i === 0 ? "character image" : (scene1FrameUrl ? "Scene 1 frame" : "character image");
                sseSend(sw, { type: "frame_progress", sceneIndex: i, pct: 0, message: attempt === 1 ? `Frame ${i + 1}/${totalScenes}: Generating with ${refDesc}...` : `Frame ${i + 1} retry ${attempt}: ${lastFrameError.slice(0, 60)}` });
                
                try {
                  const imgPrompt = (requestScenes[i]?.framePrompt || requestScenes[i]?.description || "").trim();
                  const prompt = imgPrompt + ". Keep the EXACT SAME person from the reference image — same face, same facial features, same hair, same skin tone. Photorealistic, high quality. Fixed tripod shot, looking at camera.";
                  
                  const customRefImage = customReferenceImages?.[i];
                  const imageUrls: string[] = [];
                  if (customRefImage && i > 0) {
                    imageUrls.push(customRefImage);
                    if (scene1FrameUrl) imageUrls.push(scene1FrameUrl);
                  } else {
                    imageUrls.push(refUrl);
                  }
                  
                  const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${effectiveKieKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: "google/nano-banana-edit", input: { prompt, image_urls: imageUrls, image_size: "9:16", output_format: "png", strength: 0.35 } }),
                  });
                  const submitJson = await submitRes.json();
                  if (submitJson.code !== 200) throw new Error("Frame submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
                  const taskId = submitJson.data?.taskId;
                  if (!taskId) throw new Error("No taskId for frame generation");
                  
                  // Poll for frame result
                  for (let p = 0; p < 72; p++) {
                    await sleep(5000);
                    try {
                      const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers: { Authorization: `Bearer ${effectiveKieKey}` } });
                      const pollJson = await pollRes.json();
                      if (pollJson.code === 200 && pollJson.data?.state === "success") {
                        let result = pollJson.data.resultJson;
                        if (typeof result === "string") try { result = JSON.parse(result); } catch {}
                        const rawUrl = result?.resultUrls?.[0] || result?.url || "";
                        if (rawUrl) {
                          frameUrl = await downloadAndReupload(rawUrl, effectiveKieKey, `frame_${i}`);
                          if (i === 0 && !scene1FrameUrl) scene1FrameUrl = frameUrl;
                        }
                        break;
                      }
                      if (pollJson.data?.state === "fail") throw new Error(pollJson.data?.failMsg || "Frame generation failed");
                    } catch (pollErr) { if (p === 71) throw pollErr; }
                  }
                  
                  if (frameUrl) { frameUrls[i] = frameUrl; break; }
                } catch (err) {
                  lastFrameError = err instanceof Error ? err.message : String(err);
                  if (attempt === MAX_FRAME_RETRIES) {
                    sseSend(sw, { type: "frame_error", sceneIndex: i, error: lastFrameError });
                  }
                }
              }
              
              if (frameUrl) {
                sseSend(sw, { type: "frame_done", sceneIndex: i, frameUrl });
              }
            }
          }
          
          const successfulFrames = frameUrls.filter(Boolean);
          sseSend(sw, { type: "frames_complete", frameUrls, successCount: successfulFrames.length, message: `${successfulFrames.length}/${totalScenes} frames ready` });
          
          if (successfulFrames.length === 0) {
            sseSend(sw, { type: "error", message: "No frames could be generated or uploaded" });
            return;
          }
          
          if (framesOnly) {
            sseSend(sw, { type: "done", frameUrls, framesOnly: true, message: "Frames ready! Review and then generate videos." });
            return;
          }
        }
      } else {
        // Generate frames using AI (Scene 1 uses character ref, Scenes 2+ use Scene 1 frame as ref) — with per-frame retry
        // Skip frames that already exist from resume
        const existingFrameCount = frameUrls.filter(Boolean).length;
        const MAX_FRAME_RETRIES = 3;
        sseSend(sw, { type: "step_change", step: "frames", message: existingFrameCount > 0 ? `Resuming: ${existingFrameCount} frames already done, generating remaining...` : "Generating frames..." });

        // NEW LOGIC: Scene 1 uses character image as reference.
        // Scenes 2+ use Scene 1's generated frame as reference (NOT the previous scene's frame).
        // If a scene has a customReferenceImage, it's used alongside Scene 1's frame.
        let scene1FrameUrl = ""; // Will be set after Scene 1 is generated

        // For resume: find Scene 1's frame URL if it already exists
        if (existingFrameCount > 0 && frameUrls[0]) {
          scene1FrameUrl = frameUrls[0];
        }

        // Log skipped frames from resume
        if (existingFrameCount > 0) {
          for (let j = 0; j < totalScenes; j++) {
            if (frameUrls[j]) {
              sseSend(sw, { type: "frame_done", sceneIndex: j, frameUrl: frameUrls[j], isResume: true, message: `Frame ${j + 1}/${totalScenes}: Already done (resuming)` });
            }
          }
        }

        for (let i = 0; i < totalScenes; i++) {
          // Skip if frame already exists from resume
          if (frameUrls[i]) continue;

          const scene = requestScenes[i];
          const pct = Math.round(((i) / totalScenes) * 50);

          // Determine reference image for this scene:
          // - Scene 1: use character image
          // - Scenes 2+: use Scene 1 frame (if available), fallback to character image
          // - If scene has a customReferenceImage, use it as additional reference
          let refUrl: string;
          if (i === 0) {
            refUrl = characterImageUrl!;
          } else {
            refUrl = scene1FrameUrl || characterImageUrl!;
          }

          // If this scene has a custom reference image, use it as the primary reference
          // The custom ref image is used alongside Scene 1 frame — pass both as image_urls
          const customRefImage = customReferenceImages?.[i];
          const imageUrls: string[] = [];
          if (customRefImage && i > 0) {
            // Use custom reference image + Scene 1 frame for best consistency
            imageUrls.push(customRefImage);
            if (scene1FrameUrl) imageUrls.push(scene1FrameUrl);
          } else if (customRefImage && i === 0) {
            // Scene 1 with custom reference: use custom ref + character image
            imageUrls.push(customRefImage);
            imageUrls.push(characterImageUrl!);
          } else {
            // No custom reference: use the determined refUrl
            imageUrls.push(refUrl);
          }

          // Retry loop for frame generation
          let frameUrl = "";
          let lastFrameError = "";
          for (let attempt = 1; attempt <= MAX_FRAME_RETRIES; attempt++) {
            const refDesc = i === 0
              ? "character image"
              : (customRefImage ? "custom reference + Scene 1" : "Scene 1 frame");
            sseSend(sw, {
              type: "frame_progress",
              sceneIndex: i,
              pct,
              message: attempt === 1
                ? `Frame ${i + 1}/${totalScenes}: Generating with ${refDesc} as reference...`
                : `Frame ${i + 1}/${totalScenes}: Retry ${attempt}/${MAX_FRAME_RETRIES} after error: ${lastFrameError.slice(0, 80)}`,
            });

            try {
              // Build prompt with appropriate reference images
              const imgPrompt =
                scene.framePrompt.trim() +
                ". Keep the EXACT SAME person from the reference image — same face, same facial features, same hair, same skin tone, same body. " +
                "Photorealistic, high quality, 9:16 vertical format. Fixed tripod shot, looking at camera.";

              const submitRes = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
                method: "POST",
                headers: { Authorization: `Bearer ${effectiveKieKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/nano-banana-edit",
                  input: { prompt: imgPrompt, image_urls: imageUrls, image_size: "9:16", output_format: "png", strength: 0.35 },
                }),
              });

              const submitJson = await submitRes.json();
              if (submitJson.code !== 200) throw new Error("Frame submit failed: " + (submitJson.msg || JSON.stringify(submitJson)));
              const taskId = submitJson.data?.taskId;
              if (!taskId) throw new Error("No taskId for frame generation");

              // Poll for result
              let rawFrameUrl = "";
              for (let p = 0; p < 120; p++) {
                if (p % 2 === 0) {
                  sseSend(sw, {
                    type: "frame_progress",
                    sceneIndex: i,
                    pct,
                    message: `Frame ${i + 1}/${totalScenes}: Generating... (${p * 3}s elapsed)`,
                  });
                }
                try {
                  const pollRes = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
                    headers: { Authorization: `Bearer ${effectiveKieKey}` },
                  });
                  const pollJson = await pollRes.json();
                  if (pollJson.code === 200) {
                    const d = pollJson.data;
                    if (d?.state === "success") {
                      let result;
                      if (typeof d.resultJson === "string") { try { result = JSON.parse(d.resultJson); } catch { result = d.resultJson; } }
                      else { result = d.resultJson; }
                      const imageUrl = result?.resultUrls?.[0] || result?.result_url || result?.url;
                      if (imageUrl) { rawFrameUrl = imageUrl; break; }
                      throw new Error("Frame ready but no URL");
                    }
                    if (d?.state === "fail") throw new Error("Frame generation failed: " + (d?.failMsg || "unknown"));
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  if (msg.includes("generation failed") || msg.includes("no URL")) throw err;
                }
                await sleep(3000);
              }
              if (!rawFrameUrl) throw new Error("Frame generation timed out after 6 minutes");

              const kieFrameUrl = await downloadAndReupload(rawFrameUrl, effectiveKieKey, `chain_frame_${i}`);
              frameUrl = kieFrameUrl;
              lastFrameError = "";
              break; // Success
            } catch (err) {
              lastFrameError = err instanceof Error ? err.message : String(err);
              if (attempt < MAX_FRAME_RETRIES) {
                sseSend(sw, {
                  type: "frame_error",
                  sceneIndex: i,
                  error: lastFrameError,
                  retryAttempt: attempt,
                  maxRetries: MAX_FRAME_RETRIES,
                  message: `Frame ${i + 1} ERROR (attempt ${attempt}/${MAX_FRAME_RETRIES}): ${lastFrameError} — retrying in 10s...`,
                });
                await sleep(10000);
              }
            }
          }

          if (frameUrl) {
            frameUrls.push(frameUrl);
            // Save Scene 1's frame as the permanent reference for all subsequent scenes
            if (i === 0) {
              scene1FrameUrl = frameUrl;
            }
            sseSend(sw, {
              type: "frame_done",
              sceneIndex: i,
              frameUrl,
              message: `Frame ${i + 1}/${totalScenes} complete!`,
            });
          } else {
            frameUrls.push("");
            sseSend(sw, {
              type: "frame_error",
              sceneIndex: i,
              error: lastFrameError,
              message: `Frame ${i + 1}/${totalScenes} FAILED after ${MAX_FRAME_RETRIES} attempts: ${lastFrameError}`,
            });
          }
        }

        const successfulFrames = frameUrls.filter(Boolean);
        sseSend(sw, { type: "frames_complete", frameUrls, successCount: successfulFrames.length, message: `${successfulFrames.length}/${totalScenes} frames generated` });

        if (successfulFrames.length === 0) {
          sseSend(sw, { type: "error", message: "No frames were generated successfully" });
          return;
        }

        // ── Frames-only mode: stop here, let user review before generating videos ──
        if (framesOnly) {
          sseSend(sw, { type: "done", frameUrls, framesOnly: true, message: "Frames generated! Review and then generate videos." });
          return;
        }
      }

      // ── STEP 2: Video Generation (with per-video retry) ──
      const MAX_VIDEO_RETRIES = 5;
      const videoUrls: string[] = [];

      // Pre-fill with existing video URLs from resume
      if (existingVideoUrls) {
        for (let i = 0; i < totalScenes; i++) {
          videoUrls[i] = existingVideoUrls[i] || "";
        }
      }

      const existingVideoCount = videoUrls.filter(Boolean).length;
      sseSend(sw, { type: "step_change", step: "videos", message: existingVideoCount > 0 ? `Resuming: ${existingVideoCount} videos already done, generating remaining...` : "Generating videos..." });

      // Log skipped (already done) videos (silently, not as "new" completions)
      for (let i = 0; i < totalScenes; i++) {
        if (videoUrls[i]) {
          sseSend(sw, { type: "video_done", sceneIndex: i, videoUrl: videoUrls[i], isResume: true, message: `Video ${i + 1}/${totalScenes}: Already done (resuming)` });
        }
      }

      for (let i = 0; i < totalScenes; i++) {
        // Skip if video already exists from resume
        if (videoUrls[i]) continue;
        if (!frameUrls[i]) {
          // Skip scenes where frame failed
          videoUrls[i] = "";
          continue;
        }

        const scene = requestScenes[i];
        const pct = 50 + Math.round((i / totalScenes) * 40);

        // Retry loop: keep trying until success or max retries exhausted
        let videoUrl = "";
        let lastError = "";
        for (let attempt = 1; attempt <= MAX_VIDEO_RETRIES; attempt++) {
          sseSend(sw, {
            type: "video_progress",
            sceneIndex: i,
            pct,
            message: attempt === 1
              ? `Video ${i + 1}/${totalScenes}: Generating...`
              : `Video ${i + 1}/${totalScenes}: Retry ${attempt}/${MAX_VIDEO_RETRIES} after error: ${lastError.slice(0, 80)}`,
          });

          try {
            videoUrl = await generateVideo(
              frameUrls[i], scene.script, effectiveKieKey, model,
              (elapsed, pollCount) => {
                // Send SSE progress update every ~10s during video polling
                sseSend(sw, {
                  type: "video_progress",
                  sceneIndex: i,
                  pct,
                  message: `Video ${i + 1}/${totalScenes}: Generating... (${elapsed}s elapsed, poll #${pollCount})`,
                });
              },
              scene.videoPromptSuffix
            );
            lastError = "";
            break; // Success — exit retry loop
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            if (attempt < MAX_VIDEO_RETRIES) {
              sseSend(sw, {
                type: "video_error",
                sceneIndex: i,
                error: lastError,
                retryAttempt: attempt,
                maxRetries: MAX_VIDEO_RETRIES,
                message: `Video ${i + 1}/${totalScenes} ERROR (attempt ${attempt}/${MAX_VIDEO_RETRIES}): ${lastError} — retrying in 10s...`,
              });
              await sleep(10000); // Wait 10 seconds before retrying
            }
          }
        }

        if (videoUrl) {
          videoUrls[i] = videoUrl;
          sseSend(sw, {
            type: "video_done",
            sceneIndex: i,
            videoUrl,
            message: `Video ${i + 1}/${totalScenes} complete!`,
          });
        } else {
          videoUrls[i] = "";
          sseSend(sw, {
            type: "video_error",
            sceneIndex: i,
            error: lastError,
            message: `Video ${i + 1}/${totalScenes} FAILED after ${MAX_VIDEO_RETRIES} attempts: ${lastError}`,
          });
        }
      }

      const successfulVideos = videoUrls.filter(Boolean);
      sseSend(sw, { type: "videos_complete", videoUrls, successCount: successfulVideos.length, message: `${successfulVideos.length}/${totalScenes} videos generated` });

      if (successfulVideos.length === 0) {
        sseSend(sw, { type: "error", message: "No videos were generated successfully" });
        return;
      }

      // ── STEP 3: Merge ──
      if (successfulVideos.length > 1) {
        sseSend(sw, { type: "step_change", step: "merge", message: "Merging videos..." });

        try {
          const mergedUrl = await mergeVideos(successfulVideos, effectiveFalKey);
          sseSend(sw, { type: "done", videoUrl: mergedUrl, videoUrls: successfulVideos, frameUrls, message: "Auto Chain complete! Merged video ready." });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          sseSend(sw, { type: "merge_error", error: msg, message: `Merge failed: ${msg}` });
          sseSend(sw, { type: "done", videoUrls: successfulVideos, frameUrls, message: "Videos ready (merge failed)" });
        }
      } else if (successfulVideos.length === 1) {
        sseSend(sw, { type: "done", videoUrl: successfulVideos[0], videoUrls: successfulVideos, frameUrls, message: "Auto Chain complete! Single video ready." });
      } else {
        sseSend(sw, { type: "done", videoUrls: successfulVideos, frameUrls, message: `${successfulVideos.length} videos ready (no merge key)` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sseSend(sw, { type: "error", message: msg });
    } finally {
      heartbeatStop.stopped = true;
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Keep-Alive": "timeout=900, max=10000" },
  });
}
