import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseCommand, executeCommand } from '@/lib/botService';

/**
 * POST /api/autopublish/bot/command
 * 
 * Send a natural language command to the bot
 * Body: { command: "publish 2 videos" }
 * 
 * The bot will:
 * 1. Parse the command with AI
 * 2. Execute the action
 * 3. Return the result
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    // Fetch library videos (for the bot to know what's available)
    let libraryVideos: any[] = [];
    try {
      libraryVideos = await db.generatedVideo.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (err) {
      console.warn('[Bot] Could not fetch library videos:', err);
    }

    // Fetch connected TikTok accounts
    let accounts: any[] = [];
    try {
      accounts = await db.tikTokAccount.findMany({
        where: { isActive: true },
      });
    } catch (err) {
      console.warn('[Bot] Could not fetch accounts:', err);
    }

    // Parse the command with AI
    const parsed = await parseCommand(command, libraryVideos);

    // Execute the command
    const result = await executeCommand(parsed, libraryVideos, accounts);

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      parsed,
      postsCreated: result.postsCreated || 0,
      postIds: result.postIds || [],
    });
  } catch (err: any) {
    console.error('[Bot Command] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
