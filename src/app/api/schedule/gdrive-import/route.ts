import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { listFolderFiles, extractFolderId } from '@/lib/googleDriveService';
import { createSlot, createPlan, getScheduleAccounts } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — video listing + AI calls can be slow

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParsedSchedulePlan {
  postsPerDay: number;
  timesOfDay: string[]; // ["18:00", "21:00"]
  daysAhead: number;
  startDate: string | null; // YYYY-MM-DD
  accountIds: string[] | null; // null = use all
  captionTone: string; // e.g. "funny", "professional", "hype"
  hashtagsFocus: string[]; // topic hashtags to always include, e.g. ["outdoor", "deals"]
  explanation: string;
}

interface GeneratedCaption {
  caption: string;
  hashtags: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function nextSlotDate(startDate: Date, dayOffset: number, timeStr: string): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  const [hh, mm] = timeStr.split(':').map(Number);
  d.setHours(hh || 18, mm || 0, 0, 0);
  return d;
}

// ─── AI: Parse scheduling instructions ─────────────────────────────────────

async function parseScheduleInstructions(
  instructions: string,
  availableAccounts: { id: string; username: string }[],
  videoCount: number
): Promise<ParsedSchedulePlan> {
  const zai = await ZAI.create();

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const accountList = availableAccounts
    .map((a, i) => `${i + 1}. @${a.username} (id: ${a.id})`)
    .join('\n');

  const systemPrompt = `You are an AI scheduling assistant. Parse the user's natural-language instructions about how to schedule ${videoCount} videos from a Google Drive folder.

Current time: ${now}
Today's date: ${today}

Available TikTok accounts:
${accountList || 'None connected'}

Output ONLY valid JSON (no markdown fences) matching this schema:
{
  "postsPerDay": <number, default 2>,
  "timesOfDay": ["HH:MM", ...],  // 24-hour times, e.g. ["18:00", "21:00"]. Must match postsPerDay length. Default ["18:00", "20:00"].
  "daysAhead": <number, default 7>,
  "startDate": "<YYYY-MM-DD or null, default today>",
  "accountIds": ["<id>", ...] or null,  // null = use all accounts in rotation
  "captionTone": "<one word: funny | professional | hype | casual | educational | inspirational | aggressive | friendly>",
  "hashtagsFocus": ["topic", "words"],  // topic words to always include as hashtags based on the user's content focus. Empty array if not specified.
  "explanation": "<one-sentence summary of what will happen>"
}

Parsing rules:
- "2 per day at 6pm and 9pm" → postsPerDay=2, timesOfDay=["18:00","21:00"]
- "every day at 8pm" → postsPerDay=1, timesOfDay=["20:00"], daysAhead=7
- "3 times a day" → postsPerDay=3, timesOfDay=["09:00","15:00","20:00"]
- "for the next 14 days" → daysAhead=14
- "starting Monday" → startDate=next Monday's date (YYYY-MM-DD)
- "post on @armoray.deals only" → accountIds=["<that id>"]
- "use funny captions" → captionTone="funny"
- "outdoor deals content" → hashtagsFocus=["outdoor","deals","gear"]
- "make it viral" → captionTone="hype", hashtagsFocus=["viral","fyp","foryou"]
- Default tone: "casual"
- If user mentions specific accounts, set accountIds to their ids. Otherwise null.
- If postsPerDay does not match timesOfDay length, generate evenly-spaced times.
- timesOfDay MUST be in 24-hour "HH:MM" format.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: instructions },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(jsonStr);

  // Defaults & validation
  const postsPerDay = Math.max(1, Math.min(10, parsed.postsPerDay || 2));
  let timesOfDay: string[] = (parsed.timesOfDay || []).filter((t: string) => /^\d{2}:\d{2}$/.test(t));
  if (timesOfDay.length !== postsPerDay) {
    // Generate evenly-spaced default times
    timesOfDay = generateDefaultTimes(postsPerDay);
  }
  timesOfDay.sort();

  return {
    postsPerDay,
    timesOfDay,
    daysAhead: Math.max(1, Math.min(60, parsed.daysAhead || 7)),
    startDate: parsed.startDate || null,
    accountIds: Array.isArray(parsed.accountIds) && parsed.accountIds.length > 0 ? parsed.accountIds : null,
    captionTone: parsed.captionTone || 'casual',
    hashtagsFocus: Array.isArray(parsed.hashtagsFocus) ? parsed.hashtagsFocus : [],
    explanation: parsed.explanation || `Scheduling ${postsPerDay} videos per day for ${parsed.daysAhead || 7} days.`,
  };
}

function generateDefaultTimes(postsPerDay: number): string[] {
  const presets: Record<number, string[]> = {
    1: ['18:00'],
    2: ['12:00', '20:00'],
    3: ['09:00', '15:00', '20:00'],
    4: ['09:00', '13:00', '17:00', '21:00'],
    5: ['08:00', '11:00', '14:00', '18:00', '21:00'],
  };
  return presets[postsPerDay] || presets[2];
}

// ─── AI: Generate captions + hashtags for each video ───────────────────────

async function generateCaptionsForVideos(
  videos: { id: string; name: string }[],
  plan: ParsedSchedulePlan
): Promise<Map<string, GeneratedCaption>> {
  const zai = await ZAI.create();
  const results = new Map<string, GeneratedCaption>();

  const videoList = videos.map((v, i) => `${i + 1}. id="${v.id}" filename="${v.name}"`).join('\n');

  const focusHashtagsStr = plan.hashtagsFocus.length > 0
    ? `Always include these topic hashtags (in addition to generated ones): ${plan.hashtagsFocus.join(', ')}`
    : '';

  const systemPrompt = `You are a TikTok content strategist. Generate a caption and 5-8 hashtags for each video below.

Tone: ${plan.captionTone}
${focusHashtagsStr}

Rules:
- Caption: 1-3 sentences, max 220 characters. Match the requested tone.
- Hashtags: 5-8 tags. Mix of broad viral tags (#fyp #foryou #viral) and topic-specific ones based on the filename.
- For filenames like "IMG_1234.mp4" or "video_001.mp4", invent a creative caption based on the tone and focus topics.
- For descriptive filenames like "outdoor_hiking_deal.mp4", use the filename as inspiration.
- Each video MUST get a unique caption (don't reuse).

Output ONLY valid JSON (no markdown fences) — an array of objects:
[
  { "id": "<video id>", "caption": "...", "hashtags": ["tag1", "tag2", ...] },
  ...
]

Videos to write captions for:
${videoList}`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate captions and hashtags for all ${videos.length} videos above.` },
      ],
      temperature: 0.7,
      max_tokens: Math.min(4000, 300 * videos.length),
    });

    const content = completion.choices[0]?.message?.content ?? '[]';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed: GeneratedCaption[] = JSON.parse(jsonStr);

    for (const item of parsed) {
      if (item.id && item.caption) {
        // Always append focus hashtags if not already present
        const existingLower = (item.hashtags || []).map((h) => h.toLowerCase().replace(/^#/, ''));
        const merged = [...(item.hashtags || [])];
        for (const focus of plan.hashtagsFocus) {
          if (!existingLower.includes(focus.toLowerCase())) {
            merged.push(focus);
          }
        }
        results.set(item.id, {
          caption: item.caption,
          hashtags: merged.slice(0, 12),
        });
      }
    }
  } catch (err: any) {
    console.error('[gdrive-import] AI caption generation failed:', err.message);
    // Fallback: use filename as caption, generic hashtags
    for (const v of videos) {
      results.set(v.id, {
        caption: v.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        hashtags: ['fyp', 'foryou', 'viral', ...plan.hashtagsFocus],
      });
    }
  }

  return results;
}

// ─── Main POST handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderUrl, instructions, accountIds, userEmail } = body;

    // Validate inputs
    if (!folderUrl || typeof folderUrl !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'folderUrl is required' },
        { status: 400 }
      );
    }
    if (!instructions || typeof instructions !== 'string' || instructions.trim().length < 5) {
      return NextResponse.json(
        { ok: false, error: 'instructions are required (tell the bot how to schedule your videos)' },
        { status: 400 }
      );
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: 'Could not extract folder ID from URL. Make sure it looks like: https://drive.google.com/drive/folders/XXXXX' },
        { status: 400 }
      );
    }

    console.log(`[gdrive-import] Starting import for folder ${folderId}, instructions: "${instructions.slice(0, 100)}..."`);

    // ── Step 1: List videos in the folder ────────────────────────────────
    let files: Awaited<ReturnType<typeof listFolderFiles>> = [];
    try {
      files = await listFolderFiles(folderUrl);
    } catch (err: any) {
      console.error('[gdrive-import] listFolderFiles failed:', err.message);
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to list Google Drive folder: ${err.message}. Make sure the folder is shared as "Anyone with the link can view".`,
        },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No video files found in this Google Drive folder. Make sure the folder contains video files (MP4, MOV, etc.) and is shared as "Anyone with the link can view".',
        },
        { status: 400 }
      );
    }

    console.log(`[gdrive-import] Found ${files.length} video files`);

    // ── Step 2: Get available accounts ───────────────────────────────────
    const allAccounts = await getScheduleAccounts().catch(() => []);
    if (allAccounts.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No TikTok accounts connected. Connect an account in PostPeer first.' },
        { status: 400 }
      );
    }

    // ── Step 3: Parse instructions with AI ──────────────────────────────
    const plan = await parseScheduleInstructions(
      instructions,
      allAccounts.map((a) => ({ id: a.id, username: a.username })),
      files.length
    );

    console.log('[gdrive-import] Plan:', JSON.stringify(plan, null, 2));

    // If user specified accountIds in the API call body, override
    if (Array.isArray(accountIds) && accountIds.length > 0) {
      plan.accountIds = accountIds;
    }

    // Determine accounts to use
    const accountsToUse = plan.accountIds
      ? allAccounts.filter((a) => plan.accountIds!.includes(a.id))
      : allAccounts;

    if (accountsToUse.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No matching TikTok accounts found for the specified accountIds.' },
        { status: 400 }
      );
    }

    // ── Step 4: Generate captions + hashtags for each video ─────────────
    const captionMap = await generateCaptionsForVideos(
      files.map((f) => ({ id: f.id, name: f.name })),
      plan
    );

    console.log(`[gdrive-import] Generated captions for ${captionMap.size} videos`);

    // ── Step 5: Generate slot times ─────────────────────────────────────
    const startDate = plan.startDate ? new Date(plan.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);

    // If startDate is in the past, advance to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      startDate.setTime(today.getTime());
    }

    const slotTimes: Date[] = [];
    let dayOffset = 0;
    let timeIdx = 0;
    for (let i = 0; i < files.length; i++) {
      const slotDate = nextSlotDate(startDate, dayOffset, plan.timesOfDay[timeIdx]);
      // Skip past times today
      if (slotDate.getTime() > Date.now() + 60000) {
        slotTimes.push(slotDate);
      } else {
        // Skip this slot, try next
        i--;
      }
      timeIdx++;
      if (timeIdx >= plan.timesOfDay.length) {
        timeIdx = 0;
        dayOffset++;
        // Safety: don't schedule more than daysAhead days out
        if (dayOffset > plan.daysAhead) {
          console.warn(`[gdrive-import] Hit daysAhead limit (${plan.daysAhead}), some videos not scheduled`);
          break;
        }
      }
    }

    console.log(`[gdrive-import] Generated ${slotTimes.length} slot times`);

    // ── Step 6: Create a plan + slots ───────────────────────────────────
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.daysAhead);
    const dbPlan = await createPlan({
      name: `Google Drive Import (${new Date().toLocaleDateString()})`,
      description: `Imported ${files.length} videos from Google Drive. Instructions: "${instructions.slice(0, 200)}"`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      settings: {
        source: 'gdrive_import',
        folderUrl,
        instructions,
        plan,
      },
    });

    const createdSlots: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < Math.min(files.length, slotTimes.length); i++) {
      const file = files[i];
      const slotTime = slotTimes[i];
      const account = accountsToUse[i % accountsToUse.length];
      const captionData = captionMap.get(file.id) || {
        caption: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        hashtags: ['fyp', 'foryou', 'viral', ...plan.hashtagsFocus],
      };

      try {
        const slot = await createSlot({
          planId: dbPlan.id,
          accountId: account.id,
          accountLabel: account.username,
          scheduledAt: slotTime.toISOString(),
          videoUrl: file.downloadUrl,
          caption: captionData.caption,
          hashtags: captionData.hashtags,
          source: 'gdrive_import',
        });
        createdSlots.push({
          slotId: slot.id,
          filename: file.name,
          scheduledAt: slotTime.toISOString(),
          account: account.username,
          caption: captionData.caption,
          hashtags: captionData.hashtags,
        });

        // Stagger PostPeer API calls to avoid rate-limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        console.error(`[gdrive-import] Failed to create slot for ${file.name}:`, err.message);
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    console.log(`[gdrive-import] Done. Created ${createdSlots.length} slots, ${errors.length} errors`);

    return NextResponse.json({
      ok: true,
      plan: {
        postsPerDay: plan.postsPerDay,
        timesOfDay: plan.timesOfDay,
        daysAhead: plan.daysAhead,
        captionTone: plan.captionTone,
        hashtagsFocus: plan.hashtagsFocus,
        explanation: plan.explanation,
      },
      videosFound: files.length,
      slotsCreated: createdSlots.length,
      slots: createdSlots,
      errors,
      planId: dbPlan.id,
    });
  } catch (err: any) {
    console.error('[API /schedule/gdrive-import] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Preview folder contents (without scheduling) ────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderUrl = searchParams.get('folderUrl');

    if (!folderUrl) {
      return NextResponse.json(
        { ok: false, error: 'folderUrl query param is required' },
        { status: 400 }
      );
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: 'Could not extract folder ID from URL' },
        { status: 400 }
      );
    }

    const files = await listFolderFiles(folderUrl);

    return NextResponse.json({
      ok: true,
      folderId,
      filesFound: files.length,
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
      })),
    });
  } catch (err: any) {
    console.error('[API /schedule/gdrive-import GET] Error:', err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
