// Bot Service - AI-powered automation for AutoPublish Machine
// Interprets natural language commands and executes them

import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export interface ParsedCommand {
  action: 'publish_now' | 'schedule' | 'bulk_publish' | 'auto_publish_new' | 'list' | 'help' | 'unknown';
  count?: number; // number of videos to publish
  videoTitle?: string; // specific video title to publish
  scheduledAt?: string; // ISO date for scheduling
  recurring?: 'daily' | 'weekly' | 'hourly';
  recurringTime?: string; // e.g. "20:00"
  caption?: string;
  hashtags?: string[];
  accountId?: string;
  rawCommand: string;
  explanation: string; // human-readable explanation of what the bot will do
}

export interface BotTaskResult {
  ok: boolean;
  message: string;
  postsCreated?: number;
  postIds?: string[];
}

/**
 * Simple keyword-based parser (fallback when AI is unavailable)
 */
function simpleParse(command: string): ParsedCommand {
  const cmd = command.toLowerCase().trim();
  
  // Help
  if (cmd === 'help' || cmd.includes('what can you')) {
    return {
      action: 'help',
      rawCommand: command,
      explanation: 'Showing help information.',
    };
  }
  
  // List
  if (cmd === 'list' || cmd.includes('show tasks') || cmd.includes('my tasks')) {
    return {
      action: 'list',
      rawCommand: command,
      explanation: 'Listing your recent bot tasks.',
    };
  }
  
  // Auto-publish new
  if (cmd.includes('auto publish') || cmd.includes('auto-publish') || cmd.includes('automate')) {
    let recurring: 'daily' | 'weekly' | 'hourly' | undefined;
    let time: string | undefined;
    if (cmd.includes('daily') || cmd.includes('every day')) { recurring = 'daily'; }
    if (cmd.includes('weekly') || cmd.includes('every week')) { recurring = 'weekly'; }
    if (cmd.includes('hourly') || cmd.includes('every hour')) { recurring = 'hourly'; }
    
    // Extract time (e.g., "8pm", "20:00", "at 8")
    const timeMatch = cmd.match(/(\d{1,2})\s*(am|pm)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[2]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (timeMatch[2]?.toLowerCase() === 'am' && hour === 12) hour = 0;
      time = `${hour.toString().padStart(2, '0')}:00`;
    }
    
    return {
      action: 'auto_publish_new',
      recurring,
      recurringTime: time || '12:00',
      rawCommand: command,
      explanation: `Setting up auto-publish automation${recurring ? ` ${recurring} at ${time || '12:00'}` : ' for new content'}.`,
    };
  }
  
  // Bulk publish
  if (cmd.includes('bulk') || cmd.includes('batch')) {
    const countMatch = cmd.match(/(\d+)\s*video/);
    const count = countMatch ? parseInt(countMatch[1]) : 3;
    return {
      action: 'bulk_publish',
      count,
      rawCommand: command,
      explanation: `Bulk publishing ${count} videos with 2-hour intervals.`,
    };
  }
  
  // Schedule
  if (cmd.includes('schedule') || cmd.includes('tomorrow') || cmd.includes('next week') || cmd.includes('monday') || cmd.includes('tuesday') || cmd.includes('friday')) {
    let scheduledAt: string | undefined;
    const now = new Date();
    
    if (cmd.includes('tomorrow')) {
      scheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    } else if (cmd.includes('next week')) {
      scheduledAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (cmd.includes('in ') && cmd.includes('hour')) {
      const hourMatch = cmd.match(/in\s+(\d+)\s*hour/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 2;
      scheduledAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    } else {
      // Default: 2 hours from now
      scheduledAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }
    
    // Try to extract time (e.g., "8pm")
    const timeMatch = cmd.match(/(\d{1,2})\s*(am|pm)/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[2]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (timeMatch[2]?.toLowerCase() === 'am' && hour === 12) hour = 0;
      const date = new Date(scheduledAt);
      date.setHours(hour, 0, 0, 0);
      scheduledAt = date.toISOString();
    }
    
    const countMatch = cmd.match(/(\d+)\s*video/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;
    
    return {
      action: 'schedule',
      count,
      scheduledAt,
      rawCommand: command,
      explanation: `Scheduling ${count} video(s) for ${new Date(scheduledAt).toLocaleString()}.`,
    };
  }
  
  // Publish now
  if (cmd.includes('publish') || cmd.includes('post') || cmd.includes('share')) {
    const countMatch = cmd.match(/(\d+)\s*video/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;
    
    // Check for specific title (in quotes)
    const titleMatch = command.match(/[""']([^""']+)[""']/);
    const videoTitle = titleMatch ? titleMatch[1] : undefined;
    
    // Check for "all"
    if (cmd.includes('all')) {
      return {
        action: 'publish_now',
        count: 99, // publish all
        videoTitle,
        rawCommand: command,
        explanation: `Publishing all videos from your library to TikTok now.`,
      };
    }
    
    return {
      action: 'publish_now',
      count,
      videoTitle,
      rawCommand: command,
      explanation: `Publishing ${count} video(s) to TikTok now.`,
    };
  }
  
  return {
    action: 'unknown',
    rawCommand: command,
    explanation: 'Sorry, I could not understand that command. Type "help" for available commands.',
  };
}

/**
 * Parse a natural language command using AI (with fallback to simple parser)
 */
export async function parseCommand(command: string, libraryVideos: any[]): Promise<ParsedCommand> {
  try {
    const zai = await ZAI.create();

    const videoList = libraryVideos
      .slice(0, 20)
      .map((v, i) => `${i + 1}. "${v.title}" (${v.provider}, ${v.scenesCount} scenes)`)
      .join('\n');

    const systemPrompt = `You are a TikTok automation bot command parser. Parse the user's natural language command into a JSON action.

Available library videos:
${videoList || "No videos in library"}

Current time: ${new Date().toISOString()}

Supported actions:
- "publish_now": Publish video(s) immediately
- "schedule": Schedule video(s) for a specific time
- "bulk_publish": Publish multiple videos with delays
- "auto_publish_new": Set up recurring auto-publish for new content
- "list": List current tasks/automations
- "help": Show help
- "unknown": Cannot parse

Output JSON ONLY:
{
  "action": "publish_now|schedule|bulk_publish|auto_publish_new|list|help|unknown",
  "count": <number or null>,
  "videoTitle": "<exact title from library or null>",
  "scheduledAt": "<ISO 8601 datetime or null>",
  "recurring": "daily|weekly|hourly|null",
  "recurringTime": "HH:MM or null",
  "caption": "<custom caption or null>",
  "hashtags": ["tag1", "tag2"] or [],
  "explanation": "<human-readable explanation of what you'll do>"
}

Rules:
- For "publish X videos" → count = X
- For "publish [title]" → videoTitle = exact title
- For "every day at 8pm" → recurring = "daily", recurringTime = "20:00"
- For "tomorrow" → scheduledAt = tomorrow's date
- For "in 2 hours" → scheduledAt = 2 hours from now
- If no count specified, default to 1
- Always provide a clear explanation`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      action: parsed.action || 'unknown',
      count: parsed.count || undefined,
      videoTitle: parsed.videoTitle || undefined,
      scheduledAt: parsed.scheduledAt || undefined,
      recurring: parsed.recurring || undefined,
      recurringTime: parsed.recurringTime || undefined,
      caption: parsed.caption || undefined,
      hashtags: parsed.hashtags || [],
      explanation: parsed.explanation || 'I could not understand that command.',
      rawCommand: command,
    };
  } catch (err: any) {
    console.error('[Bot] AI parse error, falling back to simple parser:', err.message);
    // Fallback to simple keyword-based parser
    return simpleParse(command);
  }
}

/**
 * Execute a parsed command
 */
export async function executeCommand(
  parsed: ParsedCommand,
  libraryVideos: any[],
  accounts: any[]
): Promise<BotTaskResult> {
  try {
    // Get first active account
    const account = accounts[0];
    if (!account) {
      return {
        ok: false,
        message: 'No TikTok account connected. Go to Accounts tab and sync first.',
      };
    }

    switch (parsed.action) {
      case 'publish_now':
        return await executePublishNow(parsed, libraryVideos, account);

      case 'schedule':
        return await executeSchedule(parsed, libraryVideos, account);

      case 'bulk_publish':
        return await executeBulkPublish(parsed, libraryVideos, account);

      case 'auto_publish_new':
        return await executeAutoPublishNew(parsed, account);

      case 'list':
        return await executeList();

      case 'help':
        return {
          ok: true,
          message: getHelpText(),
        };

      default:
        return {
          ok: false,
          message: parsed.explanation || 'Unknown command. Type "help" for available commands.',
        };
    }
  } catch (err: any) {
    console.error('[Bot] Execute error:', err);
    return {
      ok: false,
      message: `Error: ${err.message}`,
    };
  }
}

/**
 * Publish video(s) immediately
 */
async function executePublishNow(parsed: ParsedCommand, videos: any[], account: any): Promise<BotTaskResult> {
  let videosToPublish: any[] = [];

  // If specific title requested
  if (parsed.videoTitle) {
    videosToPublish = videos.filter((v) =>
      v.title.toLowerCase().includes(parsed.videoTitle!.toLowerCase())
    );
  } else {
    // Publish N most recent videos
    const count = parsed.count || 1;
    videosToPublish = videos.slice(0, count);
  }

  if (videosToPublish.length === 0) {
    return { ok: false, message: 'No matching videos found in your library.' };
  }

  const postIds: string[] = [];

  for (const video of videosToPublish) {
    const isImage = video.provider === 'carousel' || video.videoUrl.match(/\.(jpg|jpeg|png|webp)$/i);
    
    // Extract all image URLs from metadata if carousel
    let imageUrls = [video.videoUrl];
    if (isImage && video.metadata) {
      try {
        const meta = JSON.parse(video.metadata);
        if (meta.imageUrls && Array.isArray(meta.imageUrls)) {
          imageUrls = meta.imageUrls;
        }
      } catch {}
    }

    // Create post in DB
    const post = await db.post.create({
      data: {
        accountId: account.id,
        source: 'bot',
        externalId: `bot_${Date.now()}`,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || video.videoUrl,
        caption: parsed.caption || video.title,
        hashtags: parsed.hashtags?.length ? JSON.stringify(parsed.hashtags) : JSON.stringify(['fyp', 'viral', 'ai']),
        status: 'PENDING',
      },
    });

    // Trigger publish
    const { publishImageCarousel, publishPost } = await import('@/lib/autoPublish');
    if (isImage) {
      publishImageCarousel(post.id, imageUrls).catch(() => {});
    } else {
      publishPost(post.id).catch(() => {});
    }

    postIds.push(post.id);

    // Delay between publishes
    if (videosToPublish.length > 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Create bot task record
  await db.botTask.create({
    data: {
      command: parsed.rawCommand,
      parsedAction: 'publish_now',
      parsedData: JSON.stringify(parsed),
      status: 'completed',
      result: JSON.stringify({ postIds, count: postIds.length }),
    },
  });

  return {
    ok: true,
    message: `🚀 Publishing ${postIds.length} video(s) to TikTok now! Check the pipeline monitor for status.`,
    postsCreated: postIds.length,
    postIds,
  };
}

/**
 * Schedule video(s) for a specific time
 */
async function executeSchedule(parsed: ParsedCommand, videos: any[], account: any): Promise<BotTaskResult> {
  if (!parsed.scheduledAt) {
    return { ok: false, message: 'Please specify a time. Example: "schedule my carousel for tomorrow 8pm"' };
  }

  const scheduledAt = new Date(parsed.scheduledAt);
  if (scheduledAt.getTime() < Date.now()) {
    return { ok: false, message: 'The scheduled time is in the past. Please choose a future time.' };
  }

  let videosToPublish: any[] = [];
  if (parsed.videoTitle) {
    videosToPublish = videos.filter((v) =>
      v.title.toLowerCase().includes(parsed.videoTitle!.toLowerCase())
    );
  } else {
    videosToPublish = videos.slice(0, parsed.count || 1);
  }

  if (videosToPublish.length === 0) {
    return { ok: false, message: 'No matching videos found in your library.' };
  }

  const postIds: string[] = [];

  for (const video of videosToPublish) {
    const post = await db.post.create({
      data: {
        accountId: account.id,
        source: 'bot',
        externalId: `bot_sched_${Date.now()}`,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || video.videoUrl,
        caption: parsed.caption || video.title,
        hashtags: parsed.hashtags?.length ? JSON.stringify(parsed.hashtags) : JSON.stringify(['fyp', 'viral', 'ai']),
        status: 'SCHEDULED',
        scheduledAt,
      },
    });
    postIds.push(post.id);
  }

  await db.botTask.create({
    data: {
      command: parsed.rawCommand,
      parsedAction: 'schedule',
      parsedData: JSON.stringify(parsed),
      status: 'completed',
      result: JSON.stringify({ postIds, scheduledAt: scheduledAt.toISOString() }),
    },
  });

  return {
    ok: true,
    message: `📅 Scheduled ${postIds.length} video(s) for ${scheduledAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}. The scheduler will publish them automatically.`,
    postsCreated: postIds.length,
    postIds,
  };
}

/**
 * Bulk publish with delays
 */
async function executeBulkPublish(parsed: ParsedCommand, videos: any[], account: any): Promise<BotTaskResult> {
  const count = parsed.count || 3;
  const videosToPublish = videos.slice(0, count);

  if (videosToPublish.length === 0) {
    return { ok: false, message: 'No videos in library to bulk publish.' };
  }

  // Schedule them with 2-hour intervals starting now
  const postIds: string[] = [];
  const now = new Date();

  for (let i = 0; i < videosToPublish.length; i++) {
    const scheduledAt = new Date(now.getTime() + i * 2 * 60 * 60 * 1000); // every 2 hours
    const video = videosToPublish[i];

    const post = await db.post.create({
      data: {
        accountId: account.id,
        source: 'bot',
        externalId: `bot_bulk_${Date.now()}_${i}`,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || video.videoUrl,
        caption: parsed.caption || video.title,
        hashtags: parsed.hashtags?.length ? JSON.stringify(parsed.hashtags) : JSON.stringify(['fyp', 'viral', 'ai']),
        status: 'SCHEDULED',
        scheduledAt,
      },
    });
    postIds.push(post.id);
  }

  await db.botTask.create({
    data: {
      command: parsed.rawCommand,
      parsedAction: 'bulk_publish',
      parsedData: JSON.stringify(parsed),
      status: 'completed',
      result: JSON.stringify({ postIds, count: postIds.length }),
    },
  });

  return {
    ok: true,
    message: `📊 Bulk scheduled ${postIds.length} video(s) with 2-hour intervals starting now. The scheduler will publish them automatically.`,
    postsCreated: postIds.length,
    postIds,
  };
}

/**
 * Set up auto-publish for new content (recurring)
 */
async function executeAutoPublishNew(parsed: ParsedCommand, account: any): Promise<BotTaskResult> {
  const isRecurring = !!parsed.recurring;
  
  await db.botTask.create({
    data: {
      command: parsed.rawCommand,
      parsedAction: 'auto_publish_new',
      parsedData: JSON.stringify(parsed),
      status: 'active',
      isRecurring,
      cronSchedule: parsed.recurring ? `${parsed.recurringTime || '12:00'}` : null,
      nextRunAt: parsed.recurring ? getNextRunTime(parsed.recurring, parsed.recurringTime) : null,
    },
  });

  return {
    ok: true,
    message: `🤖 Auto-publish automation activated! ${parsed.recurring ? `Will run ${parsed.recurring} at ${parsed.recurringTime || '12:00'}.` : 'New carousels you create will be auto-published to TikTok.'}`,
  };
}

/**
 * List current bot tasks
 */
async function executeList(): Promise<BotTaskResult> {
  const tasks = await db.botTask.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (tasks.length === 0) {
    return { ok: true, message: 'No bot tasks yet. Try: "publish 2 videos"' };
  }

  const taskList = tasks
    .map((t, i) => `${i + 1}. [${t.status}] ${t.command.substring(0, 60)}`)
    .join('\n');

  return {
    ok: true,
    message: `📋 Your bot tasks:\n${taskList}`,
  };
}

/**
 * Get help text
 */
function getHelpText(): string {
  return `🤖 Bot Commands:

Publish:
• "publish 2 videos" - Publish 2 most recent videos
• "publish [title]" - Publish a specific video by title
• "publish all carousels" - Publish all carousels

Schedule:
• "schedule my carousel for tomorrow 8pm"
• "schedule 3 videos for next Monday"

Bulk:
• "bulk publish 5 videos" - Schedule 5 videos with 2-hour gaps

Automation:
• "auto publish every day at 8pm" - Daily auto-publish
• "auto publish new carousels" - Auto-publish new content

Other:
• "list" - Show recent tasks
• "help" - Show this help`;
}

/**
 * Calculate next run time for recurring tasks
 */
function getNextRunTime(recurring: string, time?: string): Date {
  const now = new Date();
  const [hours, minutes] = (time || '12:00').split(':').map(Number);

  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  if (next <= now) {
    switch (recurring) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
    }
  }

  return next;
}
