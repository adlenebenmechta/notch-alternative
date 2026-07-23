import { NextRequest, NextResponse } from 'next/server';
import { processScheduleCommand } from '@/lib/scheduleBot';
import { getScheduleAccounts } from '@/lib/scheduleService';
import { getSlots } from '@/lib/scheduleService';
import { addMessage, createConversation, getConversations, getConversationMessages } from '@/lib/scheduleService';
import { loadVideosFromStorage } from '@/lib/video-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/schedule/bot?conversationId=... — get conversation messages
//     /api/schedule/bot?list=1            — list all conversations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('list')) {
      const conversations = await getConversations(30);
      return NextResponse.json({ conversations });
    }

    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const messages = await getConversationMessages(conversationId, 200);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error('[API /schedule/bot GET] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/schedule/bot — send a message to the bot and get a response (full execution mode)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, conversationId, userEmail } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await createConversation(
        command.length > 40 ? command.slice(0, 40) + '...' : command,
        undefined
      );
      convId = conv.id;
    }

    // Save user message
    await addMessage(convId, 'user', command);

    // Gather context: library videos, accounts, existing slots
    let libraryVideos: any[] = [];
    if (userEmail) {
      try {
        libraryVideos = await loadVideosFromStorage(userEmail);
      } catch (err) {
        console.warn('[ScheduleBot] Failed to load library videos:', err);
      }
    }

    const accounts = await getScheduleAccounts().catch(() => []);

    const now = new Date();
    const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const existingSlots = await getSlots({
      startDate: now.toISOString(),
      endDate: inOneWeek.toISOString(),
    }).catch(() => []);

    // Process the command (full execution — no confirmation)
    const result = await processScheduleCommand(command, {
      libraryVideos,
      accounts,
      existingSlots,
      conversationId: convId,
    });

    // Save assistant response
    await addMessage(convId, 'assistant', result.message, {
      action: result.action,
      ok: result.ok,
      slotsCreated: result.slotsCreated,
      slotsModified: result.slotsModified,
      slotsCancelled: result.slotsCancelled,
      planCreated: result.planCreated,
      ruleCreated: result.ruleCreated,
      slotIds: result.slotIds,
    });

    return NextResponse.json({
      conversationId: convId,
      result,
    });
  } catch (err: any) {
    console.error('[API /schedule/bot POST] Error:', err);
    return NextResponse.json(
      {
        error: err.message,
        result: {
          ok: false,
          action: 'unknown',
          message: `❌ Internal error: ${err.message}`,
        },
      },
      { status: 500 }
    );
  }
}
