// Schedule Service - core scheduling logic for the Schedule Machine
// Handles: account sync, slot CRUD, recurring rules, best-time recommendations,
// publishing slots to Blotato, and polling publish status.

import { db } from '@/lib/db';
import { getBlotatoService, type BlotatoAccount } from '@/lib/blotato';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ScheduleAccount {
  id: string;        // blotato account id
  username: string;
  displayName: string;
  platform: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface CreateSlotInput {
  accountId: string;
  accountLabel?: string;
  scheduledAt: string; // ISO datetime
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  caption?: string;
  hashtags?: string[];
  musicTitle?: string;
  aiDescription?: string;
  sourceVideoId?: string;
  source?: string;
  planId?: string;
}

export interface UpdateSlotInput {
  scheduledAt?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  caption?: string;
  hashtags?: string[];
  musicTitle?: string;
  accountId?: string;
  accountLabel?: string;
  status?: string;
}

// ─── Best-time-to-post recommendations ─────────────────────────────────────
// Based on aggregated TikTok engagement research. Time-of-day in user timezone.
// Returns 3 recommended slots per day for the next 7 days.

export interface BestTimeSlot {
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM
  score: number;    // 0-100 engagement score
  label: string;    // "Morning peak", "Lunch break", "Evening prime"
}

const PEAK_TIMES: { time: string; score: number; label: string }[] = [
  { time: '06:00', score: 65, label: 'Early morning' },
  { time: '09:00', score: 78, label: 'Morning peak' },
  { time: '12:00', score: 82, label: 'Lunch break' },
  { time: '15:00', score: 70, label: 'Afternoon' },
  { time: '18:00', score: 88, label: 'Evening prime' },
  { time: '20:00', score: 95, label: 'Prime time' },
  { time: '22:00', score: 80, label: 'Late night' },
];

export function getBestTimeRecommendations(days = 7, timezone = 'UTC'): BestTimeSlot[] {
  const recommendations: BestTimeSlot[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    // Top 3 times per day, weighted slightly differently per weekday
    const weekday = date.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 5 : 0;

    // Pick top 3 by score
    const top3 = [...PEAK_TIMES]
      .map((t) => ({ ...t, score: Math.min(100, t.score + weekendBoost) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const t of top3) {
      recommendations.push({
        date: dateStr,
        time: t.time,
        score: t.score,
        label: t.label,
      });
    }
  }

  return recommendations;
}

// ─── Account sync ──────────────────────────────────────────────────────────

/**
 * Fetch accounts from Blotato and return a normalized list.
 * (We do NOT persist these into TikTokAccount — that table belongs to AutoPublish.)
 */
export async function getScheduleAccounts(): Promise<ScheduleAccount[]> {
  const blotato = getBlotatoService();
  const accounts: BlotatoAccount[] = await blotato.getTikTokAccounts();

  return accounts.map((a) => ({
    id: a.id,
    username: a.username || a.displayName || 'unknown',
    displayName: a.displayName || a.username || 'TikTok Account',
    platform: a.platform,
    avatarUrl: a.avatarUrl,
    isActive: true,
  }));
}

// ─── Slot CRUD ─────────────────────────────────────────────────────────────

export async function createSlot(input: CreateSlotInput) {
  const slot = await db.scheduleSlot.create({
    data: {
      planId: input.planId || null,
      accountId: input.accountId,
      accountLabel: input.accountLabel || null,
      scheduledAt: new Date(input.scheduledAt),
      videoUrl: input.videoUrl || null,
      thumbnailUrl: input.thumbnailUrl || null,
      imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
      caption: input.caption || null,
      hashtags: input.hashtags ? JSON.stringify(input.hashtags) : null,
      musicTitle: input.musicTitle || null,
      aiDescription: input.aiDescription || null,
      sourceVideoId: input.sourceVideoId || null,
      source: input.source || 'manual',
      status: input.videoUrl || input.imageUrls ? 'scheduled' : 'open',
    },
  });

  // If content is assigned, push to Blotato immediately as a scheduled post
  if (input.videoUrl || (input.imageUrls && input.imageUrls.length > 0)) {
    publishSlotToBlotato(slot.id).catch((err) => {
      console.error(`[Schedule] Background Blotato publish failed for slot ${slot.id}:`, err);
    });
  }

  // Update plan stats if linked
  if (input.planId) {
    await updatePlanStats(input.planId);
  }

  return slot;
}

export async function updateSlot(slotId: string, input: UpdateSlotInput) {
  const existing = await db.scheduleSlot.findUnique({ where: { id: slotId } });
  if (!existing) throw new Error('Slot not found');

  const data: any = {};
  if (input.scheduledAt) data.scheduledAt = new Date(input.scheduledAt);
  if (input.videoUrl !== undefined) data.videoUrl = input.videoUrl;
  if (input.thumbnailUrl !== undefined) data.thumbnailUrl = input.thumbnailUrl;
  if (input.imageUrls !== undefined) data.imageUrls = input.imageUrls ? JSON.stringify(input.imageUrls) : null;
  if (input.caption !== undefined) data.caption = input.caption;
  if (input.hashtags !== undefined) data.hashtags = input.hashtags ? JSON.stringify(input.hashtags) : null;
  if (input.musicTitle !== undefined) data.musicTitle = input.musicTitle;
  if (input.accountId !== undefined) data.accountId = input.accountId;
  if (input.accountLabel !== undefined) data.accountLabel = input.accountLabel;
  if (input.status !== undefined) data.status = input.status;

  // If scheduledAt or accountId changed AND slot already has a blotatoPostId, we need to
  // delete the old Blotato post and create a new one
  const needsReschedule =
    (input.scheduledAt || input.accountId) &&
    existing.blotatoPostId &&
    existing.status === 'scheduled';

  if (needsReschedule) {
    const blotato = getBlotatoService();
    await blotato.deletePost(existing.blotatoPostId).catch(() => {});
    data.blotatoPostId = null;
    data.blotatoStatus = null;
  }

  const updated = await db.scheduleSlot.update({
    where: { id: slotId },
    data,
  });

  // If we rescheduled, push the new post to Blotato
  if (needsReschedule && (updated.videoUrl || (updated.imageUrls && JSON.parse(updated.imageUrls).length > 0))) {
    publishSlotToBlotato(updated.id).catch((err) => {
      console.error(`[Schedule] Re-publish to Blotato failed for slot ${updated.id}:`, err);
    });
  }

  if (existing.planId) {
    await updatePlanStats(existing.planId);
  }

  return updated;
}

export async function deleteSlot(slotId: string): Promise<boolean> {
  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } });
  if (!slot) return false;

  // If the slot has a Blotato scheduled post, cancel it
  if (slot.blotatoPostId && slot.status === 'scheduled') {
    const blotato = getBlotatoService();
    await blotato.deletePost(slot.blotatoPostId).catch(() => {});
  }

  await db.scheduleSlot.delete({ where: { id: slotId } });

  if (slot.planId) {
    await updatePlanStats(slot.planId);
  }

  return true;
}

export async function getSlots(filter?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  planId?: string;
  limit?: number;
}) {
  const where: any = {};
  if (filter?.accountId) where.accountId = filter.accountId;
  if (filter?.status) where.status = filter.status;
  if (filter?.planId) where.planId = filter.planId;
  if (filter?.startDate || filter?.endDate) {
    where.scheduledAt = {};
    if (filter?.startDate) where.scheduledAt.gte = new Date(filter.startDate);
    if (filter?.endDate) where.scheduledAt.lte = new Date(filter.endDate);
  }

  return await db.scheduleSlot.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    take: filter?.limit || 500,
  });
}

// ─── Plan CRUD ─────────────────────────────────────────────────────────────

export async function createPlan(input: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  settings?: any;
}) {
  return await db.schedulePlan.create({
    data: {
      name: input.name,
      description: input.description || null,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      settings: input.settings ? JSON.stringify(input.settings) : null,
      status: 'active',
    },
  });
}

export async function getPlans() {
  return await db.schedulePlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { slots: true, rules: true } } },
  });
}

export async function updatePlanStats(planId: string) {
  const slots = await db.scheduleSlot.findMany({
    where: { planId },
    select: { status: true },
  });

  await db.schedulePlan.update({
    where: { id: planId },
    data: {
      totalSlots: slots.length,
      filledSlots: slots.filter((s) => s.status !== 'open').length,
      publishedSlots: slots.filter((s) => s.status === 'published').length,
    },
  });
}

// ─── Rule CRUD ─────────────────────────────────────────────────────────────

export async function createRule(input: {
  planId?: string;
  frequency: string;
  interval?: number;
  weekdays?: number[];
  dayOfMonth?: number;
  timeOfDay?: string;
  timezone?: string;
  accountIds: string[];
  videoSelectionMode?: string;
  caption?: string;
  hashtags?: string[];
  startDate: string;
  endDate?: string;
}) {
  const nextRunAt = computeNextRun(
    input.frequency,
    input.interval || 1,
    input.weekdays,
    input.dayOfMonth,
    input.timeOfDay,
    input.startDate
  );

  return await db.scheduleRule.create({
    data: {
      planId: input.planId || null,
      frequency: input.frequency,
      interval: input.interval || 1,
      weekdays: input.weekdays ? JSON.stringify(input.weekdays) : null,
      dayOfMonth: input.dayOfMonth || null,
      timeOfDay: input.timeOfDay || null,
      timezone: input.timezone || 'UTC',
      accountIds: JSON.stringify(input.accountIds),
      videoSelectionMode: input.videoSelectionMode || 'library_recent',
      caption: input.caption || null,
      hashtags: input.hashtags ? JSON.stringify(input.hashtags) : null,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: true,
      nextRunAt,
    },
  });
}

export async function getRules(filter?: { isActive?: boolean; planId?: string }) {
  const where: any = {};
  if (filter?.isActive !== undefined) where.isActive = filter.isActive;
  if (filter?.planId) where.planId = filter.planId;
  return await db.scheduleRule.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function deleteRule(ruleId: string): Promise<boolean> {
  try {
    await db.scheduleRule.delete({ where: { id: ruleId } });
    return true;
  } catch {
    return false;
  }
}

// ─── Blotato publishing ────────────────────────────────────────────────────

/**
 * Push a scheduled slot to Blotato as a scheduled post.
 * Updates the slot with the returned blotatoPostId.
 */
export async function publishSlotToBlotato(slotId: string): Promise<boolean> {
  const slot = await db.scheduleSlot.findUnique({ where: { id: slotId } });
  if (!slot) {
    console.error(`[Schedule] Slot ${slotId} not found`);
    return false;
  }

  if (slot.status === 'published') {
    console.log(`[Schedule] Slot ${slotId} already published`);
    return true;
  }

  if (slot.blotatoPostId) {
    console.log(`[Schedule] Slot ${slotId} already has Blotato post ${slot.blotatoPostId}`);
    return true;
  }

  if (!slot.videoUrl && !slot.imageUrls) {
    console.warn(`[Schedule] Slot ${slotId} has no content to publish`);
    return false;
  }

  // Scheduled time must be in the future for Blotato
  const scheduledAt = new Date(slot.scheduledAt);
  const now = new Date();
  if (scheduledAt.getTime() <= now.getTime() + 60000) {
    // Blotato requires scheduledAt > now (with buffer) — bump to 5 min from now
    scheduledAt.setMinutes(now.getMinutes() + 5);
  }

  await db.scheduleSlot.update({
    where: { id: slotId },
    data: { blotatoStatus: 'publishing' },
  });

  try {
    const blotato = getBlotatoService();
    const hashtags = slot.hashtags ? JSON.parse(slot.hashtags) : [];
    const imageUrls = slot.imageUrls ? JSON.parse(slot.imageUrls) : [];

    const result = await blotato.createPost({
      accountId: slot.accountId,
      videoUrl: slot.videoUrl || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      caption: slot.caption || '',
      hashtags,
      musicTitle: slot.musicTitle || undefined,
      scheduledAt,
      platforms: ['tiktok'],
    });

    await db.scheduleSlot.update({
      where: { id: slotId },
      data: {
        blotatoPostId: result.id,
        blotatoStatus: result.status || 'scheduled',
        status: 'scheduled',
        tiktokUrl: result.url || null,
        errorMessage: result.error || null,
      },
    });

    console.log(`[Schedule] Slot ${slotId} pushed to Blotato as post ${result.id}`);
    return true;
  } catch (err: any) {
    console.error(`[Schedule] Blotato publish failed for slot ${slotId}:`, err.message);
    await db.scheduleSlot.update({
      where: { id: slotId },
      data: {
        blotatoStatus: 'failed',
        status: 'failed',
        errorMessage: err.message,
      },
    });
    return false;
  }
}

/**
 * Sync the status of scheduled slots from Blotato.
 * Called periodically (or on-demand) to detect when posts have been published.
 */
export async function syncSlotStatuses(): Promise<{ checked: number; published: number }> {
  // Find all slots that are scheduled in Blotato but not yet marked as published
  const slots = await db.scheduleSlot.findMany({
    where: {
      blotatoPostId: { not: null },
      status: { in: ['scheduled', 'failed'] },
    },
    take: 50,
  });

  let published = 0;
  const blotato = getBlotatoService();

  for (const slot of slots) {
    if (!slot.blotatoPostId) continue;
    try {
      const status = await blotato.getPost(slot.blotatoPostId);

      if (status.status === 'published') {
        await db.scheduleSlot.update({
          where: { id: slot.id },
          data: {
            status: 'published',
            blotatoStatus: 'published',
            tiktokUrl: status.url || slot.tiktokUrl,
          },
        });
        published++;

        // Fetch analytics in the background
        blotato.getPostAnalytics(slot.blotatoPostId).then(async (analytics) => {
          if (analytics.views > 0 || analytics.likes > 0) {
            await db.scheduleSlot.update({
              where: { id: slot.id },
              data: analytics,
            });
          }
        }).catch(() => {});
      } else if (status.status === 'failed') {
        await db.scheduleSlot.update({
          where: { id: slot.id },
          data: {
            blotatoStatus: 'failed',
            errorMessage: status.error || 'Blotato reported failure',
          },
        });
      }
    } catch (err: any) {
      console.warn(`[Schedule] Failed to sync slot ${slot.id}:`, err.message);
    }
  }

  return { checked: slots.length, published };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeNextRun(
  frequency: string,
  interval: number,
  weekdays?: number[],
  dayOfMonth?: number,
  timeOfDay?: string,
  startDate?: string
): Date {
  const now = new Date();
  const start = startDate ? new Date(startDate) : now;
  const base = start > now ? start : now;

  const [hours, minutes] = (timeOfDay || '12:00').split(':').map(Number);

  switch (frequency) {
    case 'daily': {
      const next = new Date(base);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) next.setDate(next.getDate() + interval);
      return next;
    }
    case 'weekly': {
      if (!weekdays || weekdays.length === 0) {
        const next = new Date(base);
        next.setDate(next.getDate() + 7 * interval);
        next.setHours(hours, minutes, 0, 0);
        return next;
      }
      // Find next matching weekday
      const next = new Date(base);
      next.setHours(hours, minutes, 0, 0);
      for (let i = 0; i < 14; i++) {
        const wd = next.getDay();
        if (weekdays.includes(wd) && next > now) return next;
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case 'monthly': {
      const next = new Date(base);
      next.setDate(dayOfMonth || 1);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) next.setMonth(next.getMonth() + interval);
      return next;
    }
    case 'interval': {
      const next = new Date(now.getTime() + interval * 60 * 60 * 1000);
      return next;
    }
    default:
      return base;
  }
}

// ─── Conversation CRUD ────────────────────────────────────────────────────

export async function createConversation(title?: string, userId?: string) {
  return await db.scheduleConversation.create({
    data: {
      title: title || 'New conversation',
      userId: userId || null,
    },
  });
}

export async function getConversations(limit = 20) {
  return await db.scheduleConversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: { _count: { select: { messages: true } } },
  });
}

export async function getConversationMessages(conversationId: string, limit = 100) {
  return await db.scheduleMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string,
  metadata?: any
) {
  const message = await db.scheduleMessage.create({
    data: {
      conversationId,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  await db.scheduleConversation.update({
    where: { id: conversationId },
    data: {
      messageCount: { increment: 1 },
      updatedAt: new Date(),
      ...(role === 'assistant' && metadata?.action ? { actionsTaken: { increment: 1 } } : {}),
    },
  });

  return message;
}
