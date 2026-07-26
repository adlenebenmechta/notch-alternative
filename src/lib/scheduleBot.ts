// Schedule Bot - AI-powered scheduling assistant with FULL EXECUTION MODE
// Interprets natural language commands and executes them directly (no confirmation).
// Built on ZAI SDK for natural language understanding.

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import {
  createSlot,
  updateSlot,
  deleteSlot,
  createPlan,
  createRule,
  getSlots,
  getBestTimeRecommendations,
  getScheduleAccounts,
  type ScheduleAccount,
} from '@/lib/scheduleService';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ScheduleAction =
  | 'plan_calendar'
  | 'schedule_video'
  | 'bulk_schedule'
  | 'reschedule'
  | 'cancel_slot'
  | 'fill_gaps'
  | 'setup_recurring'
  | 'list_upcoming'
  | 'suggest_best_times'
  | 'help'
  | 'unknown';

export interface ParsedScheduleCommand {
  action: ScheduleAction;
  // For plan_calendar
  postsPerDay?: number;
  daysAhead?: number;
  startDate?: string;
  endDate?: string;
  // For schedule_video / bulk_schedule
  videoTitle?: string;
  videoCount?: number;
  // For reschedule
  fromDay?: string; // weekday or date
  toDay?: string;
  slotIds?: string[];
  // For setup_recurring
  frequency?: 'daily' | 'weekly' | 'monthly' | 'interval';
  interval?: number;
  weekdays?: number[];
  timeOfDay?: string;
  // Common
  accountIds?: string[];
  caption?: string;
  hashtags?: string[];
  scheduledAt?: string;
  explanation: string;
  rawCommand: string;
}

export interface BotExecutionResult {
  ok: boolean;
  message: string;
  action: ScheduleAction;
  slotsCreated?: number;
  slotsModified?: number;
  slotsCancelled?: number;
  planCreated?: boolean;
  ruleCreated?: boolean;
  slotIds?: string[];
  bestTimes?: any[];
  metadata?: any;
}

// ─── Main entry point ─────────────────────────────────────────────────────

export async function processScheduleCommand(
  command: string,
  context: {
    libraryVideos: any[];
    accounts: ScheduleAccount[];
    existingSlots?: any[];
    conversationId?: string;
  }
): Promise<BotExecutionResult> {
  console.log('[ScheduleBot] Processing:', command);

  // 1. Parse the command using AI
  const parsed = await parseScheduleCommand(command, context);
  console.log('[ScheduleBot] Parsed action:', parsed.action, parsed.explanation);

  // 2. Execute directly (full execution mode — no confirmation)
  const result = await executeScheduleCommand(parsed, context);
  console.log('[ScheduleBot] Result:', result.ok, result.message);

  return result;
}

// ─── AI parsing ────────────────────────────────────────────────────────────

async function parseScheduleCommand(
  command: string,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[]; existingSlots?: any[] }
): Promise<ParsedScheduleCommand> {
  try {
    const zai = await ZAI.create();

    const videoList = context.libraryVideos
      .slice(0, 30)
      .map((v, i) => `${i + 1}. "${v.title}" (provider: ${v.provider}, id: ${v.id})`)
      .join('\n');

    const accountList = context.accounts
      .map((a, i) => `${i + 1}. @${a.username} (id: ${a.id})`)
      .join('\n');

    const upcomingSlots = (context.existingSlots || [])
      .slice(0, 10)
      .map((s) => `- ${s.scheduledAt} on @${s.accountLabel || s.accountId} (${s.status})`)
      .join('\n');

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const systemPrompt = `You are an AI scheduling assistant for a TikTok content calendar. Parse the user's natural language command into a JSON action that will be EXECUTED IMMEDIATELY without confirmation.

Current time: ${now}
Today's date: ${today}

Available TikTok accounts:
${accountList || 'None connected'}

Available videos in user's library:
${videoList || 'Library is empty'}

Existing upcoming scheduled slots:
${upcomingSlots || 'No upcoming slots'}

You must output ONLY valid JSON (no markdown fences) matching this schema:

{
  "action": "plan_calendar" | "schedule_video" | "bulk_schedule" | "reschedule" | "cancel_slot" | "fill_gaps" | "setup_recurring" | "list_upcoming" | "suggest_best_times" | "help" | "unknown",
  "postsPerDay": <number or null>,
  "daysAhead": <number or null>,
  "startDate": "<YYYY-MM-DD or null>",
  "endDate": "<YYYY-MM-DD or null>",
  "videoTitle": "<exact title from library or null>",
  "videoCount": <number or null>,
  "fromDay": "<weekday name or YYYY-MM-DD or null>",
  "toDay": "<weekday name or YYYY-MM-DD or null>",
  "frequency": "daily" | "weekly" | "monthly" | "interval" or null,
  "interval": <number or null>,
  "weekdays": [<0-6 array, 0=Sunday> or null],
  "timeOfDay": "<HH:MM 24h or null>",
  "accountIds": ["<postpeer account id>", ...] or null,
  "caption": "<caption text or null>",
  "hashtags": ["tag1", "tag2"] or null,
  "scheduledAt": "<ISO datetime or null>",
  "explanation": "<one-sentence human-readable summary of what you will do>"
}

Action selection rules:
- "plan my week" / "plan content for next 7 days" / "fill my calendar" → plan_calendar
- "schedule [video title] for tomorrow 8pm" → schedule_video (with videoTitle + scheduledAt)
- "schedule 5 videos" / "bulk schedule" → bulk_schedule (with videoCount)
- "move Monday's posts to Tuesday" / "reschedule tomorrow's to next week" → reschedule (fromDay + toDay)
- "cancel tomorrow's post" / "delete slot X" → cancel_slot
- "fill empty slots" / "fill gaps with my best videos" → fill_gaps
- "every day at 8pm" / "weekly on Mondays" → setup_recurring (frequency + timeOfDay)
- "what's coming up" / "show scheduled" → list_upcoming
- "best times to post" → suggest_best_times
- "help" → help

Time parsing rules:
- "8pm" → "20:00"
- "8am" → "08:00"
- "tomorrow" → tomorrow's date
- "next week" → +7 days
- "in 2 hours" → now + 2h
- "next Monday" → compute the date
- Weekday names: 0=Sunday, 1=Monday, ..., 6=Saturday

If user doesn't specify accounts, leave accountIds null (will use all active).
If user doesn't specify videos, leave videoTitle null (will use library most recent).
Always include a clear explanation of what you'll do.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command },
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      action: (parsed.action || 'unknown') as ScheduleAction,
      postsPerDay: parsed.postsPerDay || undefined,
      daysAhead: parsed.daysAhead || undefined,
      startDate: parsed.startDate || undefined,
      endDate: parsed.endDate || undefined,
      videoTitle: parsed.videoTitle || undefined,
      videoCount: parsed.videoCount || undefined,
      fromDay: parsed.fromDay || undefined,
      toDay: parsed.toDay || undefined,
      frequency: parsed.frequency || undefined,
      interval: parsed.interval || undefined,
      weekdays: parsed.weekdays || undefined,
      timeOfDay: parsed.timeOfDay || undefined,
      accountIds: parsed.accountIds || undefined,
      caption: parsed.caption || undefined,
      hashtags: parsed.hashtags || undefined,
      scheduledAt: parsed.scheduledAt || undefined,
      explanation: parsed.explanation || 'I will process your request.',
      rawCommand: command,
    };
  } catch (err: any) {
    console.error('[ScheduleBot] AI parse failed, using fallback:', err.message);
    return fallbackParse(command);
  }
}

// ─── Fallback parser (keyword-based, used when AI is unavailable) ──────────

function fallbackParse(command: string): ParsedScheduleCommand {
  const cmd = command.toLowerCase().trim();

  if (cmd === 'help' || cmd.includes('what can you')) {
    return { action: 'help', rawCommand: command, explanation: 'Showing help information.' };
  }

  if (cmd.includes('best time')) {
    return { action: 'suggest_best_times', rawCommand: command, explanation: 'Suggesting best times to post.' };
  }

  if (cmd.includes('list') || cmd.includes('upcoming') || cmd.includes('what\'s scheduled')) {
    return { action: 'list_upcoming', rawCommand: command, explanation: 'Listing your upcoming scheduled slots.' };
  }

  // Recurring
  if (cmd.includes('every day') || cmd.includes('daily')) {
    const timeMatch = cmd.match(/(\d{1,2})\s*(am|pm)?/);
    let time = '12:00';
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      if (timeMatch[2]?.toLowerCase() === 'pm' && h < 12) h += 12;
      if (timeMatch[2]?.toLowerCase() === 'am' && h === 12) h = 0;
      time = `${h.toString().padStart(2, '0')}:00`;
    }
    return {
      action: 'setup_recurring',
      frequency: 'daily',
      interval: 1,
      timeOfDay: time,
      rawCommand: command,
      explanation: `Setting up daily auto-scheduling at ${time}.`,
    };
  }

  // Plan calendar
  if (cmd.includes('plan') || cmd.includes('fill my calendar') || cmd.includes('fill my week')) {
    const daysMatch = cmd.match(/(\d+)\s*day/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 7;
    const perDayMatch = cmd.match(/(\d+)\s*(per day|a day|times a day|posts per day)/);
    const perDay = perDayMatch ? parseInt(perDayMatch[1]) : 2;

    return {
      action: 'plan_calendar',
      daysAhead: days,
      postsPerDay: perDay,
      rawCommand: command,
      explanation: `Planning a ${days}-day content calendar with ${perDay} posts per day at peak times.`,
    };
  }

  // Bulk schedule
  if (cmd.includes('bulk') || cmd.includes('batch')) {
    const countMatch = cmd.match(/(\d+)\s*video/);
    const count = countMatch ? parseInt(countMatch[1]) : 3;
    return {
      action: 'bulk_schedule',
      videoCount: count,
      rawCommand: command,
      explanation: `Bulk scheduling ${count} videos at 2-hour intervals starting tomorrow.`,
    };
  }

  // Schedule single video
  if (cmd.includes('schedule') || cmd.includes('tomorrow')) {
    const titleMatch = command.match(/[""']([^""']+)[""']/);
    const videoTitle = titleMatch ? titleMatch[1] : undefined;

    // Parse "tomorrow 8pm"
    let scheduledAt: string | undefined;
    const now = new Date();
    if (cmd.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const timeMatch = cmd.match(/(\d{1,2})\s*(am|pm)/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        if (timeMatch[2]?.toLowerCase() === 'pm' && h < 12) h += 12;
        if (timeMatch[2]?.toLowerCase() === 'am' && h === 12) h = 0;
        tomorrow.setHours(h, 0, 0, 0);
      } else {
        tomorrow.setHours(18, 0, 0, 0);
      }
      scheduledAt = tomorrow.toISOString();
    }

    return {
      action: 'schedule_video',
      videoTitle,
      scheduledAt,
      rawCommand: command,
      explanation: `Scheduling ${videoTitle ? `"${videoTitle}"` : 'a video'}${scheduledAt ? ` for ${new Date(scheduledAt).toLocaleString()}` : ' for tomorrow at 6pm'}.`,
    };
  }

  // Fill gaps
  if (cmd.includes('fill') && (cmd.includes('gap') || cmd.includes('empty'))) {
    return {
      action: 'fill_gaps',
      rawCommand: command,
      explanation: 'Filling empty calendar slots with your best videos.',
    };
  }

  // Cancel
  if (cmd.includes('cancel') || cmd.includes('delete')) {
    return {
      action: 'cancel_slot',
      rawCommand: command,
      explanation: 'Cancelling the specified scheduled slot.',
    };
  }

  return {
    action: 'unknown',
    rawCommand: command,
    explanation: "I couldn't understand that. Try 'plan my week', 'schedule a video for tomorrow 8pm', or 'every day at 6pm'.",
  };
}

// ─── Execution ─────────────────────────────────────────────────────────────

async function executeScheduleCommand(
  parsed: ParsedScheduleCommand,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[] }
): Promise<BotExecutionResult> {
  try {
    // Need at least one account for most actions
    const accounts = context.accounts;
    if (
      !accounts.length &&
      !['help', 'list_upcoming', 'suggest_best_times', 'unknown'].includes(parsed.action)
    ) {
      return {
        ok: false,
        message: '⚠️ No TikTok accounts connected. Please connect an account in PostPeer first, then refresh this page.',
        action: parsed.action,
      };
    }

    switch (parsed.action) {
      case 'plan_calendar':
        return await executePlanCalendar(parsed, context);

      case 'schedule_video':
        return await executeScheduleVideo(parsed, context);

      case 'bulk_schedule':
        return await executeBulkSchedule(parsed, context);

      case 'reschedule':
        return await executeReschedule(parsed);

      case 'cancel_slot':
        return await executeCancelSlot(parsed);

      case 'fill_gaps':
        return await executeFillGaps(parsed, context);

      case 'setup_recurring':
        return await executeSetupRecurring(parsed);

      case 'list_upcoming':
        return await executeListUpcoming();

      case 'suggest_best_times':
        return await executeSuggestBestTimes();

      case 'help':
        return {
          ok: true,
          action: 'help',
          message: getHelpText(),
        };

      default:
        return {
          ok: false,
          action: 'unknown',
          message: parsed.explanation || "I couldn't understand that. Type 'help' to see what I can do.",
        };
    }
  } catch (err: any) {
    console.error('[ScheduleBot] Execution error:', err);
    return {
      ok: false,
      action: parsed.action,
      message: `❌ Error: ${err.message}`,
    };
  }
}

// ─── Action implementations ───────────────────────────────────────────────

async function executePlanCalendar(
  parsed: ParsedScheduleCommand,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[] }
): Promise<BotExecutionResult> {
  const days = parsed.daysAhead || 7;
  const perDay = parsed.postsPerDay || 2;
  const startDate = parsed.startDate
    ? new Date(parsed.startDate)
    : new Date();
  startDate.setHours(0, 0, 0, 0);

  if (context.libraryVideos.length === 0) {
    return {
      ok: false,
      action: 'plan_calendar',
      message: '📭 Your video library is empty. Create some videos first using the AI Avatar Machine or upload from Google Drive, then I can plan your calendar.',
    };
  }

  // Get best-time recommendations
  const bestTimes = getBestTimeRecommendations(days);

  // Create a plan
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days - 1);
  const plan = await createPlan({
    name: `${days}-day plan (${new Date().toLocaleDateString()})`,
    description: `Auto-generated by Schedule Bot: ${perDay} posts per day for ${days} days`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    settings: { daysAhead: days, postsPerDay: perDay, source: 'bot' },
  });

  const slotsCreated: string[] = [];
  const accountsToUse = parsed.accountIds
    ? context.accounts.filter((a) => parsed.accountIds!.includes(a.id))
    : context.accounts;

  if (accountsToUse.length === 0) {
    return {
      ok: false,
      action: 'plan_calendar',
      message: '⚠️ No matching accounts found.',
    };
  }

  // Distribute videos across slots
  const videosAvailable = [...context.libraryVideos];
  let videoIdx = 0;

  // Group bestTimes by date
  const byDate: { [date: string]: typeof bestTimes } = {};
  for (const bt of bestTimes) {
    if (!byDate[bt.date]) byDate[bt.date] = [];
    byDate[bt.date].push(bt);
  }

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    const todayTimes = byDate[dateStr] || [];
    const topTimes = todayTimes.slice(0, perDay);

    for (let i = 0; i < topTimes.length; i++) {
      const bt = topTimes[i];
      const [hh, mm] = bt.time.split(':').map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hh, mm, 0, 0);

      // Skip if in the past
      if (scheduledAt.getTime() <= Date.now() + 60000) continue;

      // Cycle through accounts and videos
      const account = accountsToUse[(d * perDay + i) % accountsToUse.length];
      const video = videosAvailable[videoIdx % videosAvailable.length];
      videoIdx++;

      const slot = await createSlot({
        planId: plan.id,
        accountId: account.id,
        accountLabel: account.username,
        scheduledAt: scheduledAt.toISOString(),
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        caption: parsed.caption || video.title,
        hashtags: parsed.hashtags,
        sourceVideoId: video.id,
        source: 'bot',
      });

      slotsCreated.push(slot.id);
    }
  }

  return {
    ok: true,
    action: 'plan_calendar',
    message: `📅 Created a ${days}-day content calendar with ${slotsCreated.length} scheduled posts across ${accountsToUse.length} account(s). Each post is scheduled at a peak engagement time and filled with videos from your library. All posts are now queued in PostPeer and will publish automatically.`,
    slotsCreated: slotsCreated.length,
    planCreated: true,
    slotIds: slotsCreated,
  };
}

async function executeScheduleVideo(
  parsed: ParsedScheduleCommand,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[] }
): Promise<BotExecutionResult> {
  if (!parsed.scheduledAt) {
    return {
      ok: false,
      action: 'schedule_video',
      message: 'Please specify when to schedule. Example: "schedule "My Video" for tomorrow at 8pm"',
    };
  }

  const scheduledAt = new Date(parsed.scheduledAt);
  if (scheduledAt.getTime() < Date.now()) {
    return {
      ok: false,
      action: 'schedule_video',
      message: 'The scheduled time is in the past. Please choose a future time.',
    };
  }

  // Find the video
  let video: any;
  if (parsed.videoTitle) {
    video = context.libraryVideos.find((v) =>
      v.title.toLowerCase().includes(parsed.videoTitle!.toLowerCase())
    );
    if (!video) {
      return {
        ok: false,
        action: 'schedule_video',
        message: `Couldn't find a video titled "${parsed.videoTitle}" in your library.`,
      };
    }
  } else {
    video = context.libraryVideos[0];
    if (!video) {
      return {
        ok: false,
        action: 'schedule_video',
        message: 'Your library is empty.',
      };
    }
  }

  const accountsToUse = parsed.accountIds
    ? context.accounts.filter((a) => parsed.accountIds!.includes(a.id))
    : [context.accounts[0]];

  const slot = await createSlot({
    accountId: accountsToUse[0].id,
    accountLabel: accountsToUse[0].username,
    scheduledAt: scheduledAt.toISOString(),
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    caption: parsed.caption || video.title,
    hashtags: parsed.hashtags,
    sourceVideoId: video.id,
    source: 'bot',
  });

  return {
    ok: true,
    action: 'schedule_video',
    message: `📅 Scheduled "${video.title}" for ${scheduledAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} on @${accountsToUse[0].username}. It will publish automatically at that time.`,
    slotsCreated: 1,
    slotIds: [slot.id],
  };
}

async function executeBulkSchedule(
  parsed: ParsedScheduleCommand,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[] }
): Promise<BotExecutionResult> {
  const count = Math.min(parsed.videoCount || 3, context.libraryVideos.length);
  if (count === 0) {
    return {
      ok: false,
      action: 'bulk_schedule',
      message: 'Your library is empty. Add some videos first.',
    };
  }

  const videosToSchedule = context.libraryVideos.slice(0, count);
  const accountsToUse = parsed.accountIds
    ? context.accounts.filter((a) => parsed.accountIds!.includes(a.id))
    : [context.accounts[0]];

  const slotIds: string[] = [];
  const now = new Date();

  // Start tomorrow at 6pm, then every 2 hours
  const startTime = new Date(now);
  startTime.setDate(startTime.getDate() + 1);
  startTime.setHours(18, 0, 0, 0);

  for (let i = 0; i < videosToSchedule.length; i++) {
    const scheduledAt = new Date(startTime.getTime() + i * 2 * 60 * 60 * 1000);
    const video = videosToSchedule[i];
    const account = accountsToUse[i % accountsToUse.length];

    const slot = await createSlot({
      accountId: account.id,
      accountLabel: account.username,
      scheduledAt: scheduledAt.toISOString(),
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      caption: parsed.caption || video.title,
      hashtags: parsed.hashtags,
      sourceVideoId: video.id,
      source: 'bot',
    });

    slotIds.push(slot.id);
  }

  return {
    ok: true,
    action: 'bulk_schedule',
    message: `📊 Bulk scheduled ${slotIds.length} videos with 2-hour intervals starting tomorrow at 6pm on @${accountsToUse[0].username}. All posts are queued in PostPeer and will publish automatically.`,
    slotsCreated: slotIds.length,
    slotIds,
  };
}

async function executeReschedule(parsed: ParsedScheduleCommand): Promise<BotExecutionResult> {
  // Simple implementation: reschedule upcoming slots to a new day
  if (!parsed.fromDay || !parsed.toDay) {
    return {
      ok: false,
      action: 'reschedule',
      message: 'Please specify both source and target days. Example: "move Monday\'s posts to Tuesday"',
    };
  }

  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const slots = await getSlots({
    startDate: now.toISOString(),
    endDate: inOneWeek.toISOString(),
    status: 'scheduled',
  });

  const weekdayMap: { [k: string]: number } = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  const fromWd = weekdayMap[parsed.fromDay.toLowerCase()];
  const toWd = weekdayMap[parsed.toDay.toLowerCase()];

  if (fromWd === undefined || toWd === undefined) {
    return {
      ok: false,
      action: 'reschedule',
      message: 'Could not parse the day names. Use full day names like "Monday", "Tuesday".',
    };
  }

  const toMove = slots.filter((s) => new Date(s.scheduledAt).getDay() === fromWd);
  if (toMove.length === 0) {
    return {
      ok: false,
      action: 'reschedule',
      message: `No scheduled slots found on ${parsed.fromDay}.`,
    };
  }

  let moved = 0;
  for (const slot of toMove) {
    const oldDate = new Date(slot.scheduledAt);
    const newDate = new Date(oldDate);
    const dayDiff = (toWd - fromWd + 7) % 7;
    newDate.setDate(newDate.getDate() + dayDiff);

    await updateSlot(slot.id, { scheduledAt: newDate.toISOString() });
    moved++;
  }

  return {
    ok: true,
    action: 'reschedule',
    message: `🔄 Moved ${moved} slot(s) from ${parsed.fromDay} to ${parsed.toDay}. PostPeer scheduled posts have been updated automatically.`,
    slotsModified: moved,
  };
}

async function executeCancelSlot(parsed: ParsedScheduleCommand): Promise<BotExecutionResult> {
  // Cancel the next upcoming slot
  const now = new Date();
  const slots = await getSlots({
    startDate: now.toISOString(),
    status: 'scheduled',
  });

  if (slots.length === 0) {
    return {
      ok: false,
      action: 'cancel_slot',
      message: 'No upcoming scheduled slots to cancel.',
    };
  }

  // Cancel the first one
  const slot = slots[0];
  await deleteSlot(slot.id);

  return {
    ok: true,
    action: 'cancel_slot',
    message: `🗑️ Cancelled the slot scheduled for ${new Date(slot.scheduledAt).toLocaleString()} on @${slot.accountLabel || 'unknown'}. The PostPeer scheduled post has been deleted.`,
    slotsCancelled: 1,
  };
}

async function executeFillGaps(
  parsed: ParsedScheduleCommand,
  context: { libraryVideos: any[]; accounts: ScheduleAccount[] }
): Promise<BotExecutionResult> {
  // Find all "open" slots in the next 7 days and fill them with library videos
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const openSlots = await getSlots({
    startDate: now.toISOString(),
    endDate: inOneWeek.toISOString(),
    status: 'open',
  });

  if (openSlots.length === 0) {
    return {
      ok: false,
      action: 'fill_gaps',
      message: 'No open slots to fill in the next 7 days. Try "plan my week" first to create slots.',
    };
  }

  if (context.libraryVideos.length === 0) {
    return {
      ok: false,
      action: 'fill_gaps',
      message: 'Your video library is empty — nothing to fill with.',
    };
  }

  let filled = 0;
  for (let i = 0; i < openSlots.length; i++) {
    const slot = openSlots[i];
    const video = context.libraryVideos[i % context.libraryVideos.length];
    await updateSlot(slot.id, {
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      caption: video.title,
      sourceVideoId: video.id,
      source: 'bot',
      status: 'scheduled',
    });
    filled++;
  }

  return {
    ok: true,
    action: 'fill_gaps',
    message: `✨ Filled ${filled} open slot(s) with videos from your library. They are now scheduled in PostPeer.`,
    slotsModified: filled,
  };
}

async function executeSetupRecurring(parsed: ParsedScheduleCommand): Promise<BotExecutionResult> {
  if (!parsed.frequency) {
    return {
      ok: false,
      action: 'setup_recurring',
      message: 'Please specify a frequency. Example: "every day at 8pm" or "weekly on Mondays at 6pm"',
    };
  }

  const accountIds = parsed.accountIds || [];
  if (accountIds.length === 0) {
    // Use all accounts
    const accounts = await getScheduleAccounts();
    if (accounts.length === 0) {
      return {
        ok: false,
        action: 'setup_recurring',
        message: 'No TikTok accounts connected.',
      };
    }
    accountIds.push(...accounts.map((a) => a.id));
  }

  const rule = await createRule({
    frequency: parsed.frequency,
    interval: parsed.interval || 1,
    weekdays: parsed.weekdays,
    timeOfDay: parsed.timeOfDay,
    accountIds,
    videoSelectionMode: 'library_recent',
    caption: parsed.caption,
    hashtags: parsed.hashtags,
    startDate: new Date().toISOString(),
  });

  const freqLabel = parsed.frequency === 'weekly' && parsed.weekdays
    ? `weekly on ${parsed.weekdays.map((w) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]).join(', ')}`
    : `${parsed.frequency}${parsed.interval && parsed.interval > 1 ? ` every ${parsed.interval}` : ''}`;

  return {
    ok: true,
    action: 'setup_recurring',
    message: `🔁 Recurring schedule created: ${freqLabel} at ${parsed.timeOfDay || '12:00'} on ${accountIds.length} account(s). New slots will be auto-generated from your library going forward.`,
    ruleCreated: true,
  };
}

async function executeListUpcoming(): Promise<BotExecutionResult> {
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const slots = await getSlots({
    startDate: now.toISOString(),
    endDate: inOneWeek.toISOString(),
  });

  if (slots.length === 0) {
    return {
      ok: true,
      action: 'list_upcoming',
      message: '📭 No upcoming slots in the next 7 days. Try "plan my week" to fill your calendar.',
    };
  }

  const summary = slots
    .slice(0, 10)
    .map((s, i) => {
      const dt = new Date(s.scheduledAt).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const status = s.status === 'scheduled' ? '✅' : s.status === 'open' ? '⚪' : s.status === 'published' ? '🚀' : '❌';
      return `${i + 1}. ${status} ${dt} — @${s.accountLabel || 'unknown'}${s.caption ? ` "${s.caption.slice(0, 30)}${s.caption.length > 30 ? '...' : ''}"` : ''}`;
    })
    .join('\n');

  return {
    ok: true,
    action: 'list_upcoming',
    message: `📋 Upcoming slots (${slots.length} total):\n${summary}`,
  };
}

async function executeSuggestBestTimes(): Promise<BotExecutionResult> {
  const bestTimes = getBestTimeRecommendations(7);

  const today = bestTimes.filter((bt) => bt.date === new Date().toISOString().split('T')[0]);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = bestTimes.filter((bt) => bt.date === tomorrowDate.toISOString().split('T')[0]);

  const formatDay = (label: string, slots: typeof bestTimes) => {
    if (slots.length === 0) return '';
    return `${label}: ${slots.map((s) => `${s.time} (${s.label}, ${s.score}/100)`).join(', ')}`;
  };

  return {
    ok: true,
    action: 'suggest_best_times',
    message: `⏰ Best times to post (based on TikTok engagement data):\n${formatDay('Today', today)}\n${formatDay('Tomorrow', tomorrow)}\n\nThese are general recommendations — your actual best times may vary based on your audience. Want me to schedule posts at these times?`,
    bestTimes,
  };
}

function getHelpText(): string {
  return `🤖 **Schedule Bot — Full Execution Mode**

I execute your commands immediately — no confirmation needed. Here's what I can do:

📅 **Plan & Fill Calendar**
• "plan my week" — auto-fill the next 7 days with 2 posts/day at peak times
• "plan 14 days with 3 posts per day" — custom plan
• "fill empty slots" — fill existing open slots with your best videos

🎬 **Schedule Specific Videos**
• "schedule "My Video" for tomorrow 8pm"
• "schedule 5 videos" — bulk schedule with 2-hour gaps
• "schedule my latest video for Monday at 6pm"

🔄 **Reschedule & Cancel**
• "move Monday's posts to Tuesday"
• "cancel tomorrow's post"

🔁 **Recurring Schedules**
• "every day at 8pm" — daily auto-scheduling
• "weekly on Mondays and Fridays at 6pm"

📊 **Info**
• "what's coming up?" — list upcoming slots
• "best times to post" — show engagement peaks
• "help" — show this help

All scheduled posts go directly to PostPeer and publish automatically at the scheduled time.`;
}
