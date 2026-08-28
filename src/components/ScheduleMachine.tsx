"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Colors (emerald accent for Schedule Machine, matching project palette) ──

const C = {
  emerald: "#10B981",
  emeraldDark: "#059669",
  emeraldLight: "#D1FAE5",
  emeraldSoft: "#ECFDF5",
  pink: "#E461AD",
  cyan: "#16B1DE",
  gold: "#C9A96E",
  lime: "#9AFF01",
  dark: "#0A0A0A",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  white: "#FFFFFF",
  cream: "#FFF8F0",
  beige: "#F5E6D3",
  warmGray: "#B8A99A",
  softPink: "#FDE8F0",
  lightPink: "#F9E4EE",
  cardBg: "rgba(255, 255, 255, 0.95)",
  cardBorder: "rgba(16, 185, 129, 0.25)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface ScheduleAccount {
  id: string;
  username: string;
  displayName: string;
  platform: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface ScheduleSlot {
  id: string;
  planId: string | null;
  accountId: string;
  accountLabel: string | null;
  scheduledAt: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  imageUrls: string | null;
  caption: string | null;
  hashtags: string | null;
  musicTitle: string | null;
  aiDescription: string | null;
  sourceVideoId: string | null;
  source: string;
  blotatoPostId: string | null;
  blotatoStatus: string | null;
  status: string;
  errorMessage: string | null;
  tiktokUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

interface LibraryVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  captionUrl?: string;
  duration?: string;
  scenesCount: number;
  provider: string;
  metadata?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
  createdAt: string;
}

interface BestTimeSlot {
  date: string;
  time: string;
  score: number;
  label: string;
}

type ViewMode = "week" | "month" | "list";

// ─── Date helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Format a Date as YYYY-MM-DD using LOCAL time (NOT UTC).
// Critical: toISOString().slice(0,10) shifts the day backwards in timezones
// behind UTC (e.g. Africa/Algiers UTC+1 — picking "27" would display as "26").
function toLocalDateStr(d: Date): string {
  return formatDateKey(d);
}

// ─── Timezone support ─────────────────────────────────────────────────────
// Default to US Eastern (America/New_York) so the calendar/slots display in
// US time regardless of the user's browser timezone. The user can switch TZ
// in the header.

const US_TIMEZONES = [
  { value: "America/New_York",    label: "US Eastern (NYC, Miami)", abbr: "ET" },
  { value: "America/Chicago",     label: "US Central (Chicago, Dallas)", abbr: "CT" },
  { value: "America/Denver",      label: "US Mountain (Denver, Phoenix)", abbr: "MT" },
  { value: "America/Los_Angeles", label: "US Pacific (LA, SF)", abbr: "PT" },
  { value: "Africa/Algiers",      label: "Algeria (local)", abbr: "CET" },
  { value: "UTC",                 label: "UTC", abbr: "UTC" },
] as const;

const DEFAULT_TIMEZONE = "America/New_York";

function loadTimezone(): string {
  if (typeof window === "undefined") return DEFAULT_TIMEZONE;
  try {
    const saved = window.localStorage.getItem("schedule_timezone");
    if (saved && US_TIMEZONES.some((tz) => tz.value === saved)) return saved;
  } catch {}
  return DEFAULT_TIMEZONE;
}

function saveTimezone(tz: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem("schedule_timezone", tz); } catch {}
}

// Format a Date's TIME in the selected timezone (NOT browser local).
function formatTimeTZ(d: Date, tz: string): string {
  try {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
}

// Format a Date's full date+time in the selected timezone.
function formatDateTimeTZ(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  }
}

// Get the YYYY-MM-DD key for a Date as it appears in the selected timezone.
// Used to group slots by calendar day correctly when the user has switched TZ.
function formatDateKeyTZ(d: Date, tz: string): string {
  try {
    // Use en-CA which gives YYYY-MM-DD natively
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz,
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value || "";
    const m = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";
    return `${y}-${m}-${day}`;
  } catch {
    return formatDateKey(d);
  }
}

function isToday(d: Date): boolean {
  return sameDay(d, new Date());
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

// ─── Status helpers ────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "scheduled":
      return { color: C.info, bg: "#DBEAFE", label: "Scheduled", icon: "📅" };
    case "published":
      return { color: C.success, bg: C.emeraldLight, label: "Published", icon: "🚀" };
    case "failed":
      return { color: C.error, bg: "#FEE2E2", label: "Failed", icon: "❌" };
    case "cancelled":
      return { color: C.textMuted, bg: "#F3F4F6", label: "Cancelled", icon: "🚫" };
    case "open":
      return { color: C.warmGray, bg: "#FEF3C7", label: "Open slot", icon: "➕" };
    default:
      return { color: C.textMuted, bg: "#F3F4F6", label: status, icon: "•" };
  }
}

// ─── Component Props ───────────────────────────────────────────────────────

interface ScheduleMachineProps {
  onBack: () => void;
  isAdmin?: boolean;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ScheduleMachine({ onBack }: ScheduleMachineProps) {
  const { user } = useAuth();

  // State
  const [accounts, setAccounts] = useState<ScheduleAccount[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsDebug, setAccountsDebug] = useState<any>(null);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [showBot, setShowBot] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [draggedVideo, setDraggedVideo] = useState<LibraryVideo | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [showNewSlotModal, setShowNewSlotModal] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState<Date | null>(null);
  const [newSlotAccountId, setNewSlotAccountId] = useState<string>("");
  const [newSlotTime, setNewSlotTime] = useState("18:00");
  const [newSlotVideo, setNewSlotVideo] = useState<LibraryVideo | null>(null);
  const [newSlotCaption, setNewSlotCaption] = useState("");
  const [newSlotHashtags, setNewSlotHashtags] = useState("");
  const [newSlotMusic, setNewSlotMusic] = useState("");
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Timezone display (defaults to US Eastern; persisted to localStorage)
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);

  // Publish-now tracking
  const [publishingNow, setPublishingNow] = useState(false);

  // New slot: video upload state (separate from library pick)
  const [newSlotSource, setNewSlotSource] = useState<"upload" | "library">("upload");
  const [newSlotUploadedVideo, setNewSlotUploadedVideo] = useState<{
    videoUrl: string;
    title: string;
    fileName: string;
    sizeMB: number;
    mimeType: string;
  } | null>(null);
  const [newSlotUploading, setNewSlotUploading] = useState(false);
  const [newSlotUploadError, setNewSlotUploadError] = useState<string | null>(null);

  // Google Drive Import modal state
  const [showGDriveModal, setShowGDriveModal] = useState(false);

  // ─── Post Immediately modal state ────────────────────────────────────────
  // "Post Immediately" = create a slot AND publish to TikTok in one shot,
  // bypassing the calendar entirely. Distinct from "Publish Now" (which
  // retries an existing slot from inside SlotDetailModal).
  const [showPostNowModal, setShowPostNowModal] = useState(false);
  const [postNowAccountId, setPostNowAccountId] = useState<string>("");
  const [postNowVideo, setPostNowVideo] = useState<LibraryVideo | null>(null);
  const [postNowCaption, setPostNowCaption] = useState("");
  const [postNowHashtags, setPostNowHashtags] = useState("");
  const [postNowMusic, setPostNowMusic] = useState("");
  const [postNowSource, setPostNowSource] = useState<"upload" | "library">("upload");
  const [postNowUploadedVideo, setPostNowUploadedVideo] = useState<{
    videoUrl: string;
    title: string;
    fileName: string;
    sizeMB: number;
    mimeType: string;
  } | null>(null);
  const [postNowUploading, setPostNowUploading] = useState(false);
  const [postNowUploadError, setPostNowUploadError] = useState<string | null>(null);
  const [postNowPublishing, setPostNowPublishing] = useState(false);
  const [postNowResult, setPostNowResult] = useState<{
    ok: boolean;
    error?: string;
    tiktokUrl?: string;
  } | null>(null);

  // Chat state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [botThinking, setBotThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userEmail = user?.email || "";

  // ─── Data fetching ─────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setAccountsError(data.ok === false ? (data.error || "Failed to load accounts") : null);
      setAccountsDebug(data.diagnostics || null);
      if (data.accounts?.length > 0 && !newSlotAccountId) {
        setNewSlotAccountId(data.accounts[0].id);
      }
    } catch (err: any) {
      console.error("Failed to fetch accounts:", err);
      setAccounts([]);
      setAccountsError(err.message || "Network error while loading accounts");
    }
  }, [newSlotAccountId]);

  const fetchSlots = useCallback(async () => {
    try {
      // Always fetch a wide range so all view modes have data
      const start = addMonths(new Date(), -1).toISOString();
      const end = addMonths(new Date(), 3).toISOString();
      const res = await fetch(`/api/schedule/slots?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err: any) {
      console.error("Failed to fetch slots:", err);
      setSlots([]);
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!userEmail) return;
    try {
      const res = await fetch(`/api/schedule/library?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setLibraryVideos(data.videos || []);
    } catch (err: any) {
      console.error("Failed to fetch library:", err);
      setLibraryVideos([]);
    }
  }, [userEmail]);

  const fetchBestTimes = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule/best-times?days=14");
      const data = await res.json();
      setBestTimes(data.recommendations || []);
    } catch (err: any) {
      console.error("Failed to fetch best times:", err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchAccounts(), fetchSlots(), fetchLibrary(), fetchBestTimes()]);
    setLoading(false);
  }, [fetchAccounts, fetchSlots, fetchLibrary, fetchBestTimes]);

  useEffect(() => {
    // Load saved timezone on mount (defaults to US Eastern)
    setTimezone(loadTimezone());
    fetchAll();
    // Auto-sync slot statuses every 60 seconds
    const syncInterval = setInterval(async () => {
      try {
        await fetch("/api/schedule/sync", { method: "POST" });
        fetchSlots();
      } catch (err) {
        console.warn("Auto-sync failed:", err);
      }
    }, 60000);
    return () => clearInterval(syncInterval);
  }, [fetchAll, fetchSlots]);

  const changeTimezone = (tz: string) => {
    setTimezone(tz);
    saveTimezone(tz);
  };

  // ─── Chat ──────────────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, botThinking]);

  const sendChatMessage = async () => {
    const cmd = chatInput.trim();
    if (!cmd || botThinking) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: cmd,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setBotThinking(true);

    try {
      const res = await fetch("/api/schedule/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          conversationId,
          userEmail,
        }),
      });
      const data = await res.json();

      if (data.conversationId) setConversationId(data.conversationId);

      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        role: "assistant",
        content: data.result?.message || "I encountered an error processing your request.",
        metadata: data.result,
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, botMsg]);

      // Refresh slots if the bot made changes
      if (data.result?.ok && (data.result.slotsCreated || data.result.slotsModified || data.result.slotsCancelled)) {
        setTimeout(() => fetchSlots(), 500);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: `❌ Network error: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBotThinking(false);
    }
  };

  // ─── Drag & drop ───────────────────────────────────────────────────────

  const handleVideoDragStart = (video: LibraryVideo) => {
    setDraggedVideo(video);
  };

  const handleSlotDragOver = (e: React.DragEvent, slot: ScheduleSlot) => {
    e.preventDefault();
    setDragOverSlot(slot.id);
  };

  const handleSlotDrop = async (e: React.DragEvent, slot: ScheduleSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedVideo) return;

    try {
      await fetch(`/api/schedule/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: draggedVideo.videoUrl,
          thumbnailUrl: draggedVideo.thumbnailUrl,
          caption: draggedVideo.title,
          sourceVideoId: draggedVideo.id,
          source: "manual",
          status: "scheduled",
        }),
      });
      setDraggedVideo(null);
      fetchSlots();
    } catch (err) {
      console.error("Failed to assign video to slot:", err);
      alert("Failed to assign video to slot. Please try again.");
    }
  };

  // Create a new slot on drop to an empty day cell
  const handleDayDrop = async (e: React.DragEvent, day: Date, accountId?: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedVideo || accounts.length === 0) return;

    const targetAccount = accountId
      ? accounts.find((a) => a.id === accountId)
      : accounts[0];
    if (!targetAccount) return;

    // Default to next 6pm if afternoon, else 6pm today
    const scheduledAt = new Date(day);
    scheduledAt.setHours(18, 0, 0, 0);
    if (scheduledAt.getTime() <= Date.now() + 60000) {
      scheduledAt.setHours(scheduledAt.getHours() + 2);
    }

    try {
      await fetch("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: targetAccount.id,
          accountLabel: targetAccount.username,
          scheduledAt: scheduledAt.toISOString(),
          videoUrl: draggedVideo.videoUrl,
          thumbnailUrl: draggedVideo.thumbnailUrl,
          caption: draggedVideo.title,
          sourceVideoId: draggedVideo.id,
          source: "manual",
        }),
      });
      setDraggedVideo(null);
      fetchSlots();
    } catch (err) {
      console.error("Failed to create slot:", err);
      alert("Failed to schedule. Please try again.");
    }
  };

  // ─── Slot actions ──────────────────────────────────────────────────────

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Cancel this scheduled slot? This will also delete the PostPeer scheduled post.")) return;
    try {
      await fetch(`/api/schedule/slots/${slotId}`, { method: "DELETE" });
      setSelectedSlot(null);
      fetchSlots();
    } catch (err) {
      alert("Failed to cancel slot.");
    }
  };

  // Publish a slot IMMEDIATELY to TikTok via PostPeer — bypasses scheduledAt.
  // Used by the "Publish Now" button in the SlotDetailModal.
  const handlePublishNow = async (slotId: string): Promise<{ ok: boolean; error?: string; tiktokUrl?: string }> => {
    setPublishingNow(true);
    try {
      const res = await fetch(`/api/schedule/slots/${slotId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.ok) {
        return { ok: false, error: data.error || "Publish failed" };
      }
      // Refresh slots + update the selected slot in-place to "published"
      await fetchSlots();
      setSelectedSlot((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              blotatoStatus: "published",
              tiktokUrl: data.tiktokUrl || prev.tiktokUrl,
              errorMessage: null,
            }
          : prev
      );
      return { ok: true, tiktokUrl: data.tiktokUrl };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error" };
    } finally {
      setPublishingNow(false);
    }
  };

  // Update music title for an existing slot (PATCH)
  const handleUpdateSlotMusic = async (slotId: string, musicTitle: string): Promise<void> => {
    try {
      await fetch(`/api/schedule/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicTitle }),
      });
      setSelectedSlot((prev) => (prev ? { ...prev, musicTitle } : prev));
      fetchSlots();
    } catch (err) {
      console.error("Failed to update music title:", err);
    }
  };

  // Upload a video file from the user's computer and assign it to an existing open slot.
  // Used by SlotDetailModal when the user clicks "Upload Video" on an open slot.
  const handleUploadVideoToSlot = async (slotId: string, file: File): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Step 1: upload the file to hosting (kie.ai)
      const formData = new FormData();
      formData.append("video", file);
      const uploadRes = await fetch("/api/schedule/upload-video", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        return { ok: false, error: uploadData.error || "Upload failed" };
      }

      // Step 2: update the slot with the new video URL, caption, and status
      const derivedCaption = uploadData.title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
      await fetch(`/api/schedule/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: uploadData.videoUrl,
          caption: derivedCaption,
          status: "scheduled",
          source: "manual_upload",
        }),
      });

      // Refresh and update the selected slot in-place
      await fetchSlots();
      const updated = slots.find((s) => s.id === slotId);
      if (updated) {
        setSelectedSlot({
          ...updated,
          videoUrl: uploadData.videoUrl,
          caption: derivedCaption,
          status: "scheduled",
          source: "manual_upload",
        });
      }
      return { ok: true };
    } catch (err: any) {
      console.error("Upload video to slot failed:", err);
      return { ok: false, error: err.message || "Network error" };
    }
  };

  const handleRescheduleSlot = async (slotId: string, newDate: Date) => {
    try {
      const current = slots.find((s) => s.id === slotId);
      if (!current) return;
      const newDateTime = new Date(newDate);
      const oldDate = new Date(current.scheduledAt);
      newDateTime.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

      await fetch(`/api/schedule/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newDateTime.toISOString() }),
      });
      fetchSlots();
    } catch (err) {
      alert("Failed to reschedule.");
    }
  };

  // Upload a video file from the user's computer, to be attached to the new
  // slot being created via the NewSlotModal. Stores the returned hosted URL
  // in `newSlotUploadedVideo` so it gets sent to /api/schedule/slots on create.
  const handleUploadVideoForNewSlot = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    setNewSlotUploadError(null);
    setNewSlotUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const uploadRes = await fetch("/api/schedule/upload-video", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        const msg = uploadData.error || "Upload failed";
        setNewSlotUploadError(msg);
        return { ok: false, error: msg };
      }
      setNewSlotUploadedVideo({
        videoUrl: uploadData.videoUrl,
        title: uploadData.title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim(),
        fileName: uploadData.fileName || file.name,
        sizeMB: uploadData.sizeMB ?? Math.round(file.size / 1024 / 1024 * 10) / 10,
        mimeType: uploadData.mimeType || file.type || "video/mp4",
      });
      // Pre-fill caption with the friendly filename if user hasn't typed one yet
      if (!newSlotCaption) {
        setNewSlotCaption(uploadData.title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim());
      }
      // Selecting an upload should clear any library pick
      setNewSlotVideo(null);
      return { ok: true };
    } catch (err: any) {
      const msg = err.message || "Network error during upload";
      setNewSlotUploadError(msg);
      return { ok: false, error: msg };
    } finally {
      setNewSlotUploading(false);
    }
  };

  // Reset all new-slot state when the modal closes
  const resetNewSlotState = () => {
    setNewSlotVideo(null);
    setNewSlotUploadedVideo(null);
    setNewSlotCaption("");
    setNewSlotHashtags("");
    setNewSlotMusic("");
    setNewSlotTime("18:00");
    setNewSlotSource("upload");
    setNewSlotUploading(false);
    setNewSlotUploadError(null);
  };

  // ─── Post Immediately handlers ────────────────────────────────────────────

  // Upload a video file from the user's computer for the Post Immediately modal.
  // Mirrors handleUploadVideoForNewSlot but uses postNow* state instead of newSlot*.
  const handleUploadVideoForPostNow = async (file: File): Promise<{ ok: boolean; error?: string }> => {
    setPostNowUploadError(null);
    setPostNowUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const uploadRes = await fetch("/api/schedule/upload-video", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        const msg = uploadData.error || "Upload failed";
        setPostNowUploadError(msg);
        return { ok: false, error: msg };
      }
      setPostNowUploadedVideo({
        videoUrl: uploadData.videoUrl,
        title: uploadData.title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim(),
        fileName: uploadData.fileName || file.name,
        sizeMB: uploadData.sizeMB ?? Math.round(file.size / 1024 / 1024 * 10) / 10,
        mimeType: uploadData.mimeType || file.type || "video/mp4",
      });
      // Pre-fill caption with the friendly filename if user hasn't typed one yet
      if (!postNowCaption) {
        setPostNowCaption(uploadData.title || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim());
      }
      // Selecting an upload should clear any library pick
      setPostNowVideo(null);
      return { ok: true };
    } catch (err: any) {
      const msg = err.message || "Network error during upload";
      setPostNowUploadError(msg);
      return { ok: false, error: msg };
    } finally {
      setPostNowUploading(false);
    }
  };

  // Reset all Post-Immediately state when the modal closes
  const resetPostNowState = () => {
    setPostNowVideo(null);
    setPostNowUploadedVideo(null);
    setPostNowCaption("");
    setPostNowHashtags("");
    setPostNowMusic("");
    setPostNowSource("upload");
    setPostNowUploading(false);
    setPostNowUploadError(null);
    setPostNowPublishing(false);
    setPostNowResult(null);
  };

  // Create a slot AND publish it to TikTok right now (no scheduling).
  // Calls POST /api/schedule/slots with publishNow: true → the server
  // creates the slot row and immediately pushes it to PostPeer.
  const handlePostNow = async (): Promise<void> => {
    if (!postNowAccountId) {
      alert("Please pick a TikTok account first.");
      return;
    }
    const hasUpload = !!postNowUploadedVideo;
    const hasLibrary = !!postNowVideo;
    if (!hasUpload && !hasLibrary) {
      alert("Please upload or pick a video first.");
      return;
    }

    setPostNowPublishing(true);
    setPostNowResult(null);
    try {
      const videoUrl = hasUpload ? postNowUploadedVideo!.videoUrl : postNowVideo!.videoUrl;
      const thumbnailUrl = hasUpload ? undefined : postNowVideo?.thumbnailUrl;
      const caption =
        postNowCaption ||
        (hasUpload ? postNowUploadedVideo!.title : postNowVideo?.title) ||
        "";
      const sourceVideoId = hasLibrary ? postNowVideo?.id : undefined;
      const source = hasUpload ? "manual_upload" : "manual";

      const res = await fetch("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: postNowAccountId,
          accountLabel: accounts.find((a) => a.id === postNowAccountId)?.username,
          videoUrl,
          thumbnailUrl,
          caption,
          hashtags: postNowHashtags
            ? postNowHashtags.split(/[,\s]+/).filter(Boolean)
            : undefined,
          musicTitle: postNowMusic.trim() || undefined,
          sourceVideoId,
          source,
          publishNow: true, // ← key flag: tells the API to publish immediately
        }),
      });
      const data = await res.json();
      if (!data.ok && res.status !== 200) {
        setPostNowResult({ ok: false, error: data.error || "Publish failed" });
        return;
      }
      // Server returns { ok, slotId, tiktokUrl } for publishNow branch
      if (data.ok === false) {
        setPostNowResult({ ok: false, error: data.error || "Publish failed" });
        return;
      }
      setPostNowResult({ ok: true, tiktokUrl: data.tiktokUrl });
      fetchSlots(); // refresh calendar so the new published slot appears
    } catch (err: any) {
      setPostNowResult({ ok: false, error: err.message || "Network error" });
    } finally {
      setPostNowPublishing(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!newSlotDate || !newSlotAccountId) return;
    setCreatingSlot(true);
    try {
      const [hh, mm] = newSlotTime.split(":").map(Number);
      const scheduledAt = new Date(newSlotDate);
      scheduledAt.setHours(hh, mm, 0, 0);

      // Resolve the video source: upload takes priority, then library pick, then open slot.
      const hasUpload = !!newSlotUploadedVideo;
      const hasLibrary = !!newSlotVideo;
      const videoUrl = hasUpload ? newSlotUploadedVideo!.videoUrl : newSlotVideo?.videoUrl;
      const thumbnailUrl = hasUpload ? undefined : newSlotVideo?.thumbnailUrl;
      const caption = newSlotCaption || (hasUpload ? newSlotUploadedVideo!.title : newSlotVideo?.title) || "";
      const sourceVideoId = hasLibrary ? newSlotVideo?.id : undefined;
      const source = hasUpload ? "manual_upload" : hasLibrary ? "manual" : "manual";

      await fetch("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: newSlotAccountId,
          accountLabel: accounts.find((a) => a.id === newSlotAccountId)?.username,
          scheduledAt: scheduledAt.toISOString(),
          videoUrl,
          thumbnailUrl,
          caption,
          hashtags: newSlotHashtags
            ? newSlotHashtags.split(/[,\s]+/).filter(Boolean)
            : undefined,
          musicTitle: newSlotMusic.trim() || undefined,
          sourceVideoId,
          source,
        }),
      });

      setShowNewSlotModal(false);
      resetNewSlotState();
      fetchSlots();
    } catch (err) {
      alert("Failed to create slot.");
    } finally {
      setCreatingSlot(false);
    }
  };

  // Create the current slot but KEEP the modal open with per-slot fields
  // cleared (date + account + time preserved). Lets the user chain-create
  // multiple slots without reopening the modal each time.
  // Returns true on success so the modal knows the save worked.
  const handleCreateSlotAndKeepOpen = async (): Promise<boolean> => {
    if (!newSlotDate || !newSlotAccountId) return false;
    setCreatingSlot(true);
    try {
      const [hh, mm] = newSlotTime.split(":").map(Number);
      const scheduledAt = new Date(newSlotDate);
      scheduledAt.setHours(hh, mm, 0, 0);

      const hasUpload = !!newSlotUploadedVideo;
      const hasLibrary = !!newSlotVideo;
      const videoUrl = hasUpload ? newSlotUploadedVideo!.videoUrl : newSlotVideo?.videoUrl;
      const thumbnailUrl = hasUpload ? undefined : newSlotVideo?.thumbnailUrl;
      const caption = newSlotCaption || (hasUpload ? newSlotUploadedVideo!.title : newSlotVideo?.title) || "";
      const sourceVideoId = hasLibrary ? newSlotVideo?.id : undefined;
      const source = hasUpload ? "manual_upload" : hasLibrary ? "manual" : "manual";

      const res = await fetch("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: newSlotAccountId,
          accountLabel: accounts.find((a) => a.id === newSlotAccountId)?.username,
          scheduledAt: scheduledAt.toISOString(),
          videoUrl,
          thumbnailUrl,
          caption,
          hashtags: newSlotHashtags
            ? newSlotHashtags.split(/[,\s]+/).filter(Boolean)
            : undefined,
          musicTitle: newSlotMusic.trim() || undefined,
          sourceVideoId,
          source,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to create slot: ${data.error || res.statusText}`);
        return false;
      }

      // Clear per-slot fields but KEEP date + account + time so the user
      // can immediately add another slot to the same day.
      setNewSlotVideo(null);
      setNewSlotUploadedVideo(null);
      setNewSlotCaption("");
      setNewSlotHashtags("");
      setNewSlotMusic("");
      setNewSlotSource("upload");
      setNewSlotUploadError(null);
      // Bump the time by 30 minutes so the next slot is auto-set to a
      // reasonable non-conflicting time. The user can still override it.
      try {
        const [h, m] = newSlotTime.split(":").map(Number);
        const next = new Date();
        next.setHours(h, m + 30, 0, 0);
        const nh = String(next.getHours()).padStart(2, "0");
        const nm = String(next.getMinutes()).padStart(2, "0");
        setNewSlotTime(`${nh}:${nm}`);
      } catch {
        // keep current time if parsing fails
      }
      fetchSlots();
      return true;
    } catch (err) {
      alert("Failed to create slot.");
      return false;
    } finally {
      setCreatingSlot(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────

  const filteredSlots = useMemo(() => {
    if (selectedAccountId === "all") return slots;
    return slots.filter((s) => s.accountId === selectedAccountId);
  }, [slots, selectedAccountId]);

  // Group slots by date for week/month views
  const slotsByDate = useMemo(() => {
    const map: { [dateKey: string]: ScheduleSlot[] } = {};
    for (const slot of filteredSlots) {
      // Group by calendar day in the SELECTED timezone (default US Eastern),
      // not the browser's local timezone. This makes the calendar show each
      // slot on the day the user expects when they're working in US time.
      const key = formatDateKeyTZ(new Date(slot.scheduledAt), timezone);
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    }
    // Sort each day's slots by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    return map;
  }, [filteredSlots, timezone]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const upcoming = filteredSlots.filter((s) => new Date(s.scheduledAt) > now);
    return {
      total: filteredSlots.length,
      scheduled: filteredSlots.filter((s) => s.status === "scheduled").length,
      published: filteredSlots.filter((s) => s.status === "published").length,
      failed: filteredSlots.filter((s) => s.status === "failed").length,
      upcoming: upcoming.length,
      totalViews: filteredSlots.reduce((sum, s) => sum + (s.views || 0), 0),
      totalLikes: filteredSlots.reduce((sum, s) => sum + (s.likes || 0), 0),
    };
  }, [filteredSlots]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: C.cream }}
    >
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(236, 253, 245, 0.9)",
          borderColor: C.cardBorder,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: C.emerald, boxShadow: `0 4px 14px ${C.emerald}40` }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke={C.white} strokeWidth="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke={C.white} strokeWidth="2" strokeLinecap="round" />
                  <path d="M9 16l2 2 4-4" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: C.text }}>
                  Schedule Machine
                </h1>
                <p className="text-xs" style={{ color: C.textMuted }}>
                  Plan, drag & drop, automate your TikTok publishing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* ⚡ Post Immediately — opens a modal that creates a slot AND
                  publishes to TikTok in one shot. No date/time picker, no
                  scheduling — for spontaneous same-instant publishing. */}
              <button
                onClick={() => {
                  setPostNowAccountId(accounts[0]?.id || "");
                  setPostNowResult(null);
                  setShowPostNowModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(90deg, ${C.emerald}, ${C.emeraldDark})`,
                  color: C.white,
                  boxShadow: `0 4px 14px ${C.emerald}40`,
                }}
                title="Pick a video and publish to TikTok right now — no scheduling"
              >
                ⚡ Post Immediately
              </button>
              <button
                onClick={() => setShowGDriveModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: C.emerald,
                  color: C.white,
                  border: `1.5px solid ${C.emerald}`,
                  boxShadow: `0 4px 14px ${C.emerald}40`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 3h6l4 6-3 5H4L9 3z" fill="#FFC107" stroke="#FFC107" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M9 3L4 14l4 7h6l-3-7 3-4-5-7z" fill="#1976D2" stroke="#1976D2" strokeWidth="1" strokeLinejoin="round"/>
                  <path d="M9 3l3 4h8l-3-4H9z" fill="#4CAF50" stroke="#4CAF50" strokeWidth="1" strokeLinejoin="round"/>
                </svg>
                Google Drive Import
              </button>
              <button
                onClick={() => setShowBot(!showBot)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: showBot ? C.emerald : C.white,
                  color: showBot ? C.white : C.text,
                  border: `1.5px solid ${showBot ? C.emerald : C.cardBorder}`,
                }}
              >
                🤖 Bot
              </button>
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: showLibrary ? C.emerald : C.white,
                  color: showLibrary ? C.white : C.text,
                  border: `1.5px solid ${showLibrary ? C.emerald : C.cardBorder}`,
                }}
              >
                📚 Library
              </button>
              <button
                onClick={() => fetchAll()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: C.white,
                  border: `1.5px solid ${C.cardBorder}`,
                  color: C.text,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={loading ? "animate-spin" : ""}>
                  <path d="M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0114-3M20 14a8 8 0 01-14 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── Setup banner ─────────────────────────────────────────────── */}
        {accounts.length === 0 && !loading && (
          <div
            className="rounded-2xl p-5 shadow-lg mb-5"
            style={{
              background: accountsError
                ? `linear-gradient(135deg, #EF4444, #B91C1C)`
                : `linear-gradient(135deg, ${C.emerald}, ${C.emeraldDark})`,
            }}
          >
            <div className="flex items-start gap-3 text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                {accountsError ? (
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <>
                    <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
                    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold mb-1">
                  {accountsError ? "Could not load PostPeer accounts" : "Connect your PostPeer account"}
                </h2>

                {accountsError ? (
                  <div className="space-y-2">
                    <p className="text-sm opacity-95 break-words">
                      <span className="font-semibold">Error:</span>{" "}
                      <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs break-all">{accountsError}</code>
                    </p>
                    {accountsDebug && (
                      <p className="text-xs opacity-90">
                        API key:{" "}
                        <code className="bg-white/20 px-1 rounded">{accountsDebug.keyPresent ? `present (${accountsDebug.keyPrefix})` : "NOT SET"}</code>
                        {" · "}
                        NODE_ENV: <code className="bg-white/20 px-1 rounded">{accountsDebug.nodeEnv || "unknown"}</code>
                      </p>
                    )}
                    <p className="text-xs opacity-90">
                      If the key is present but you still see an auth error, the key may be invalid or your PostPeer
                      workspace has no TikTok accounts connected yet. Open the PostPeer dashboard and connect a TikTok
                      account, then click Refresh.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href="/api/schedule/debug"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        🔍 Open debug report
                      </a>
                      <a
                        href="https://app.postpeer.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        ↗ Open PostPeer dashboard
                      </a>
                      <button
                        onClick={() => fetchAll()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        ↻ Refresh now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm opacity-95 mb-1">
                      Your PostPeer API key is set, but no TikTok accounts were returned. This usually means you
                      haven't connected a TikTok account to your PostPeer workspace yet.
                    </p>
                    <p className="text-xs opacity-90 mb-2">
                      Go to the PostPeer dashboard → Connections → connect at least one TikTok account, then come back
                      and click Refresh.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://app.postpeer.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        ↗ Open PostPeer dashboard
                      </a>
                      <a
                        href="/api/schedule/debug"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        🔍 Debug connection
                      </a>
                      <button
                        onClick={() => fetchAll()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        ↻ Refresh
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Stats Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, color: C.text, bg: C.beige },
            { label: "Scheduled", value: stats.scheduled, color: C.info, bg: "#DBEAFE" },
            { label: "Published", value: stats.published, color: C.emerald, bg: C.emeraldLight },
            { label: "Failed", value: stats.failed, color: C.error, bg: "#FEE2E2" },
            { label: "Upcoming", value: stats.upcoming, color: C.warning, bg: "#FEF3C7" },
            { label: "Views", value: formatNumber(stats.totalViews), color: C.cyan, bg: "#CFFAFE" },
            { label: "Likes", value: formatNumber(stats.totalLikes), color: C.pink, bg: C.softPink },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-3 shadow-sm"
              style={{ backgroundColor: C.white, border: `1px solid ${C.cardBorder}` }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 text-xs font-bold"
                style={{ backgroundColor: card.bg, color: card.color }}
              >
                ●
              </div>
              <div className="text-lg font-bold" style={{ color: C.text }}>{card.value}</div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: C.textMuted }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* ─── Main layout: calendar + side panels ─────────────────────── */}
        <div className="flex gap-5">
          {/* Calendar area */}
          <div className="flex-1 min-w-0">
            {/* View mode toggle + navigation */}
            <div
              className="flex items-center justify-between gap-3 flex-wrap mb-4 p-3 rounded-2xl"
              style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
            >
              {/* View mode toggle */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: C.cream }}>
                {(["week", "month", "list"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
                    style={{
                      backgroundColor: viewMode === mode ? C.emerald : "transparent",
                      color: viewMode === mode ? C.white : C.text,
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Date navigation */}
              {viewMode !== "list" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                    style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark, border: `1.5px solid ${C.cardBorder}` }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(viewMode === "week" ? addDays(currentDate, -7) : addMonths(currentDate, -1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ backgroundColor: C.cream, border: `1.5px solid ${C.cardBorder}` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="text-sm font-bold min-w-[140px] text-center" style={{ color: C.text }}>
                    {viewMode === "week"
                      ? `${MONTHS[currentDate.getMonth()].slice(0, 3)} ${startOfWeek(currentDate).getDate()} – ${addDays(startOfWeek(currentDate), 6).getDate()}, ${currentDate.getFullYear()}`
                      : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                  </span>
                  <button
                    onClick={() => setCurrentDate(viewMode === "week" ? addDays(currentDate, 7) : addMonths(currentDate, 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ backgroundColor: C.cream, border: `1.5px solid ${C.cardBorder}` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6l6 6-6 6" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Account filter */}
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border-0 outline-none cursor-pointer"
                style={{
                  backgroundColor: C.cream,
                  color: C.text,
                  border: `1.5px solid ${C.cardBorder}`,
                }}
              >
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>@{(a.username || '').replace(/^@/, '')}</option>
                ))}
              </select>

              {/* Timezone selector — default US Eastern */}
              <select
                value={timezone}
                onChange={(e) => changeTimezone(e.target.value)}
                title="Display timezone"
                className="px-3 py-2 rounded-xl text-xs font-semibold border-0 outline-none cursor-pointer"
                style={{
                  backgroundColor: C.cream,
                  color: C.text,
                  border: `1.5px solid ${C.cardBorder}`,
                }}
              >
                {US_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    🕐 {tz.abbr} — {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}>
                <div
                  className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-3"
                  style={{ borderColor: `${C.emerald}33`, borderTopColor: C.emerald }}
                />
                <p className="text-sm" style={{ color: C.textMuted }}>Loading your calendar…</p>
              </div>
            ) : (
              <>
                {viewMode === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    slotsByDate={slotsByDate}
                    accounts={accounts}
                    bestTimes={bestTimes}
                    timezone={timezone}
                    onSlotClick={setSelectedSlot}
                    onDayDrop={handleDayDrop}
                    onSlotDragOver={handleSlotDragOver}
                    onSlotDrop={handleSlotDrop}
                    dragOverSlot={dragOverSlot}
                    onNewSlot={(date, accountId) => {
                      setNewSlotDate(date);
                      setNewSlotAccountId(accountId || accounts[0]?.id || "");
                      setShowNewSlotModal(true);
                    }}
                  />
                )}
                {viewMode === "month" && (
                  <MonthView
                    currentDate={currentDate}
                    slotsByDate={slotsByDate}
                    timezone={timezone}
                    onSlotClick={setSelectedSlot}
                    onDayDrop={handleDayDrop}
                    onNewSlot={(date) => {
                      setNewSlotDate(date);
                      setNewSlotAccountId(accounts[0]?.id || "");
                      setShowNewSlotModal(true);
                    }}
                  />
                )}
                {viewMode === "list" && (
                  <ListView slots={filteredSlots} timezone={timezone} onSlotClick={setSelectedSlot} />
                )}
              </>
            )}
          </div>

          {/* Right side panels */}
          <div className="hidden lg:flex flex-col gap-4 w-80 flex-shrink-0">
            {showLibrary && (
              <LibraryPanel
                videos={libraryVideos}
                onDragStart={handleVideoDragStart}
                onClose={() => setShowLibrary(false)}
              />
            )}
            {showBot && (
              <BotPanel
                messages={chatMessages}
                input={chatInput}
                setInput={setChatInput}
                onSend={sendChatMessage}
                thinking={botThinking}
                chatEndRef={chatEndRef}
                onClose={() => setShowBot(false)}
                accountsCount={accounts.length}
                libraryCount={libraryVideos.length}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile panels (slide-up) */}
      {(showBot || showLibrary) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl shadow-2xl"
          style={{ backgroundColor: C.white, borderTop: `2px solid ${C.emerald}` }}
        >
          <div className="sticky top-0 flex justify-between items-center p-3 border-b" style={{ backgroundColor: C.white, borderColor: C.cardBorder }}>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBot(true); setShowLibrary(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: showBot && !showLibrary ? C.emerald : C.cream, color: showBot && !showLibrary ? C.white : C.text }}
              >🤖 Bot</button>
              <button
                onClick={() => { setShowLibrary(true); setShowBot(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: showLibrary && !showBot ? C.emerald : C.cream, color: showLibrary && !showBot ? C.white : C.text }}
              >📚 Library</button>
            </div>
            <button
              onClick={() => { setShowBot(false); setShowLibrary(false); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: C.cream }}
            >✕</button>
          </div>
          {showBot && (
            <BotPanel
              messages={chatMessages}
              input={chatInput}
              setInput={setChatInput}
              onSend={sendChatMessage}
              thinking={botThinking}
              chatEndRef={chatEndRef}
              onClose={() => setShowBot(false)}
              accountsCount={accounts.length}
              libraryCount={libraryVideos.length}
              embedded
            />
          )}
          {showLibrary && (
            <LibraryPanel
              videos={libraryVideos}
              onDragStart={handleVideoDragStart}
              onClose={() => setShowLibrary(false)}
              embedded
            />
          )}
        </div>
      )}

      {/* Slot detail modal */}
      {selectedSlot && (
        <SlotDetailModal
          slot={selectedSlot}
          timezone={timezone}
          publishingNow={publishingNow}
          onClose={() => setSelectedSlot(null)}
          onDelete={() => handleDeleteSlot(selectedSlot.id)}
          onReschedule={(newDate) => {
            handleRescheduleSlot(selectedSlot.id, newDate);
            setSelectedSlot(null);
          }}
          onUploadVideo={(file) => handleUploadVideoToSlot(selectedSlot.id, file)}
          onPublishNow={() => handlePublishNow(selectedSlot.id)}
          onUpdateMusic={(music) => handleUpdateSlotMusic(selectedSlot.id, music)}
        />
      )}

      {/* New slot modal */}
      {showNewSlotModal && (
        <NewSlotModal
          date={newSlotDate}
          accountId={newSlotAccountId}
          accounts={accounts}
          time={newSlotTime}
          video={newSlotVideo}
          caption={newSlotCaption}
          hashtags={newSlotHashtags}
          music={newSlotMusic}
          libraryVideos={libraryVideos}
          creating={creatingSlot}
          source={newSlotSource}
          uploadedVideo={newSlotUploadedVideo}
          uploading={newSlotUploading}
          uploadError={newSlotUploadError}
          onDateChange={setNewSlotDate}
          onAccountChange={setNewSlotAccountId}
          onTimeChange={setNewSlotTime}
          onVideoChange={(v) => {
            setNewSlotVideo(v);
            // Picking from library clears any upload
            if (v) setNewSlotUploadedVideo(null);
          }}
          onCaptionChange={setNewSlotCaption}
          onHashtagsChange={setNewSlotHashtags}
          onMusicChange={setNewSlotMusic}
          onSourceChange={setNewSlotSource}
          onUploadFile={handleUploadVideoForNewSlot}
          onClearUpload={() => setNewSlotUploadedVideo(null)}
          onClearUploadError={() => setNewSlotUploadError(null)}
          onCreate={handleCreateSlot}
          onCreateAnother={handleCreateSlotAndKeepOpen}
          onClose={() => {
            setShowNewSlotModal(false);
            resetNewSlotState();
          }}
        />
      )}

      {/* Post Immediately modal — create a slot AND publish to TikTok in one shot */}
      {showPostNowModal && (
        <PostNowModal
          accountId={postNowAccountId}
          accounts={accounts}
          video={postNowVideo}
          caption={postNowCaption}
          hashtags={postNowHashtags}
          music={postNowMusic}
          libraryVideos={libraryVideos}
          publishing={postNowPublishing}
          source={postNowSource}
          uploadedVideo={postNowUploadedVideo}
          uploading={postNowUploading}
          uploadError={postNowUploadError}
          result={postNowResult}
          onAccountChange={setPostNowAccountId}
          onVideoChange={(v) => {
            setPostNowVideo(v);
            if (v) setPostNowUploadedVideo(null);
          }}
          onCaptionChange={setPostNowCaption}
          onHashtagsChange={setPostNowHashtags}
          onMusicChange={setPostNowMusic}
          onSourceChange={setPostNowSource}
          onUploadFile={handleUploadVideoForPostNow}
          onClearUpload={() => setPostNowUploadedVideo(null)}
          onClearUploadError={() => setPostNowUploadError(null)}
          onPublish={handlePostNow}
          onClose={() => {
            setShowPostNowModal(false);
            resetPostNowState();
          }}
        />
      )}

      {/* Google Drive Import modal */}
      {showGDriveModal && (
        <GoogleDriveImportModal
          accounts={accounts}
          userEmail={userEmail}
          onSlotsCreated={() => {
            fetchSlots();
          }}
          onClose={() => setShowGDriveModal(false)}
        />
      )}
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────

interface CalendarViewProps {
  currentDate: Date;
  slotsByDate: { [dateKey: string]: ScheduleSlot[] };
  accounts: ScheduleAccount[];
  bestTimes: BestTimeSlot[];
  timezone: string;
  onSlotClick: (slot: ScheduleSlot) => void;
  onDayDrop: (e: React.DragEvent, day: Date, accountId?: string) => void;
  onSlotDragOver: (e: React.DragEvent, slot: ScheduleSlot) => void;
  onSlotDrop: (e: React.DragEvent, slot: ScheduleSlot) => void;
  dragOverSlot: string | null;
  onNewSlot: (date: Date, accountId?: string) => void;
}

function WeekView({
  currentDate,
  slotsByDate,
  accounts,
  bestTimes,
  timezone,
  onSlotClick,
  onDayDrop,
  onSlotDragOver,
  onSlotDrop,
  dragOverSlot,
  onNewSlot,
}: CalendarViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
    >
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: C.cardBorder }}>
        {days.map((day, i) => {
          const isTodayFlag = isToday(day);
          return (
            <div
              key={i}
              className="p-3 text-center border-r last:border-r-0"
              style={{ borderColor: C.cardBorder, backgroundColor: isTodayFlag ? C.emeraldSoft : "transparent" }}
            >
              <div className="text-xs uppercase tracking-wide font-bold" style={{ color: C.textMuted }}>
                {WEEKDAYS[day.getDay()]}
              </div>
              <div
                className="text-lg font-bold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full"
                style={{
                  color: isTodayFlag ? C.white : C.text,
                  backgroundColor: isTodayFlag ? C.emerald : "transparent",
                }}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {days.map((day, i) => {
          const dateKey = formatDateKey(day);
          const daySlots = slotsByDate[dateKey] || [];
          const dayBestTimes = bestTimes.filter((bt) => bt.date === dateKey);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={i}
              className="border-r last:border-r-0 p-2 min-h-[500px] flex flex-col gap-1.5 transition-colors"
              style={{
                borderColor: C.cardBorder,
                backgroundColor: isPast ? "rgba(245, 230, 211, 0.2)" : "transparent",
                opacity: isPast ? 0.7 : 1,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDayDrop(e, day)}
            >
              {/* Quick + button — always visible at the top of EVERY day cell.
                  Lets the user add as many slots as they want, on any day
                  (past days included). Clicking opens the New Slot modal. */}
              <button
                onClick={() => onNewSlot(day)}
                title={isPast ? "Add slot on this past day" : "Add new slot on this day"}
                className="self-end w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: C.emerald,
                  color: C.white,
                  boxShadow: `0 2px 8px ${C.emerald}40`,
                }}
              >
                +
              </button>

              {/* Best-time hint */}
              {dayBestTimes.length > 0 && !isPast && (
                <div className="flex gap-1 flex-wrap">
                  {dayBestTimes.slice(0, 3).map((bt, j) => (
                    <span
                      key={j}
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
                      title={`${bt.label} — score ${bt.score}/100`}
                    >
                      ⏰ {bt.time}
                    </span>
                  ))}
                </div>
              )}

              {/* Slots */}
              {daySlots.map((slot) => {
                const sc = statusConfig(slot.status);
                const isSlotOpen = slot.status === "open";
                return (
                  <div
                    key={slot.id}
                    onClick={() => onSlotClick(slot)}
                    onDragOver={(e) => onSlotDragOver(e, slot)}
                    onDrop={(e) => onSlotDrop(e, slot)}
                    className="rounded-lg p-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md text-xs"
                    style={{
                      backgroundColor: dragOverSlot === slot.id ? C.emeraldLight : sc.bg,
                      border: `1px ${isSlotOpen ? "dashed" : "solid"} ${dragOverSlot === slot.id ? C.emerald : sc.color + "40"}`,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px]">{sc.icon}</span>
                      <span className="font-bold" style={{ color: C.text }}>
                        {formatTimeTZ(new Date(slot.scheduledAt), timezone)}
                      </span>
                    </div>
                    <div className="text-[10px] truncate" style={{ color: C.textMuted }}>
                      {isSlotOpen
                        ? "Open — click to upload video"
                        : (slot.caption || "Scheduled")}
                    </div>
                    {slot.accountLabel && (
                      <div className="text-[10px] mt-0.5 font-semibold" style={{ color: C.emeraldDark }}>
                        @{(slot.accountLabel || '').replace(/^@/, '')}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add new slot button — always visible (even on past days).
                  mt-auto pushes it to the bottom; clicking opens the New Slot modal. */}
              <button
                onClick={() => onNewSlot(day)}
                className="mt-auto text-[10px] py-1 rounded-lg transition-all hover:scale-[1.02] opacity-70 hover:opacity-100"
                style={{
                  backgroundColor: "transparent",
                  border: `1px dashed ${C.cardBorder}`,
                  color: C.emerald,
                }}
              >
                + Add slot
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date;
  slotsByDate: { [dateKey: string]: ScheduleSlot[] };
  timezone: string;
  onSlotClick: (slot: ScheduleSlot) => void;
  onDayDrop: (e: React.DragEvent, day: Date) => void;
  onNewSlot: (date: Date) => void;
}

function MonthView({ currentDate, slotsByDate, timezone, onSlotClick, onDayDrop, onNewSlot }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(calendarStart, i));

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm"
      style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: C.cardBorder }}>
        {WEEKDAYS.map((wd, i) => (
          <div
            key={i}
            className="p-2 text-center text-xs uppercase tracking-wide font-bold border-r last:border-r-0"
            style={{ borderColor: C.cardBorder, color: C.textMuted, backgroundColor: C.cream }}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateKey = formatDateKey(day);
          const daySlots = slotsByDate[dateKey] || [];
          const inMonth = day.getMonth() === currentDate.getMonth();
          const isTodayFlag = isToday(day);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={i}
              className="border-r border-b last:border-r-0 min-h-[110px] p-1.5 transition-colors cursor-default relative"
              style={{
                borderColor: C.cardBorder,
                backgroundColor: isTodayFlag
                  ? C.emeraldSoft
                  : inMonth
                    ? "transparent"
                    : "rgba(245, 230, 211, 0.15)",
                opacity: !inMonth || isPast ? 0.6 : 1,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDayDrop(e, day)}
              onClick={() => inMonth && onNewSlot(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full"
                  style={{
                    color: isTodayFlag ? C.white : C.text,
                    backgroundColor: isTodayFlag ? C.emerald : "transparent",
                  }}
                >
                  {day.getDate()}
                </span>

                <div className="flex items-center gap-1">
                  {daySlots.length > 0 && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
                    >
                      {daySlots.length}
                    </span>
                  )}
                  {/* Quick + button — visible on EVERY day in the month grid.
                      Lets the user add as many slots as they want, on any day
                      (past days included, even days outside the current month
                      if they want to back-plan). Clicking opens the New Slot modal. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewSlot(day);
                    }}
                    title="Add new slot on this day"
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: C.emerald,
                      color: C.white,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-0.5">
                {daySlots.slice(0, 3).map((slot) => {
                  const sc = statusConfig(slot.status);
                  return (
                    <div
                      key={slot.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSlotClick(slot);
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] cursor-pointer transition-all hover:scale-[1.02] truncate"
                      style={{
                        backgroundColor: sc.bg,
                        color: sc.color,
                        border: `1px solid ${sc.color}30`,
                      }}
                    >
                      <span className="font-bold">{formatTimeTZ(new Date(slot.scheduledAt), timezone)}</span>{" "}
                      <span className="truncate">{slot.caption || sc.label}</span>
                    </div>
                  );
                })}
                {daySlots.length > 3 && (
                  <div className="text-[9px] px-1" style={{ color: C.textMuted }}>
                    +{daySlots.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────

function ListView({ slots, timezone, onSlotClick }: { slots: ScheduleSlot[]; timezone: string; onSlotClick: (s: ScheduleSlot) => void }) {
  const now = new Date();
  const upcoming = slots
    .filter((s) => new Date(s.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = slots
    .filter((s) => new Date(s.scheduledAt) < now)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const renderGroup = (title: string, list: ScheduleSlot[], accentColor: string) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: C.text }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
        {title} ({list.length})
      </h3>
      {list.length === 0 ? (
        <p className="text-xs italic px-4 py-3" style={{ color: C.textMuted }}>No slots</p>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
        >
          {list.map((slot, i) => {
            const sc = statusConfig(slot.status);
            return (
              <div
                key={slot.id}
                onClick={() => onSlotClick(slot)}
                className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-emerald-50"
                style={{ borderBottom: i < list.length - 1 ? `1px solid ${C.cardBorder}` : "none" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: sc.bg, color: sc.color }}
                >
                  <span className="text-[10px] font-bold uppercase">
                    {new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(new Date(slot.scheduledAt))}
                  </span>
                  <span className="text-base font-bold leading-none">
                    {new Intl.DateTimeFormat("en-CA", { day: "numeric", timeZone: timezone }).format(new Date(slot.scheduledAt))}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: C.text }}>
                      {formatTimeTZ(new Date(slot.scheduledAt), timezone)}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: sc.bg, color: sc.color }}
                    >
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                  <div className="text-xs truncate" style={{ color: C.textMuted }}>
                    {slot.caption || "No caption"}
                  </div>
                  {slot.accountLabel && (
                    <div className="text-[10px] mt-0.5 font-semibold" style={{ color: C.emeraldDark }}>
                      @{(slot.accountLabel || '').replace(/^@/, '')}
                      {slot.views > 0 && (
                        <span className="ml-2" style={{ color: C.textMuted }}>
                          👁 {formatNumber(slot.views)} · ❤ {formatNumber(slot.likes)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: C.textMuted }}>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {renderGroup("Upcoming", upcoming, C.emerald)}
      {renderGroup("Past", past, C.warmGray)}
    </div>
  );
}

// ─── Library Panel ─────────────────────────────────────────────────────────

interface LibraryPanelProps {
  videos: LibraryVideo[];
  onDragStart: (video: LibraryVideo) => void;
  onClose: () => void;
  embedded?: boolean;
}

function LibraryPanel({ videos, onDragStart, onClose, embedded }: LibraryPanelProps) {
  return (
    <div
      className={`rounded-2xl shadow-sm flex flex-col ${embedded ? "" : "max-h-[calc(100vh-200px)]"}`}
      style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
    >
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: C.cardBorder }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: C.text }}>
          📚 Library
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}>
            {videos.length}
          </span>
        </h3>
        {!embedded && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
            style={{ backgroundColor: C.cream, color: C.textMuted }}
          >✕</button>
        )}
      </div>

      <div className="overflow-y-auto p-2 flex-1" style={{ maxHeight: embedded ? "60vh" : "calc(100vh-260px)" }}>
        {videos.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs" style={{ color: C.textMuted }}>
              Your video library is empty. Create videos in other machines, or upload from Google Drive.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                draggable
                onDragStart={() => onDragStart(video)}
                className="flex gap-2 p-2 rounded-xl cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:scale-[1.02]"
                style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
              >
                <div
                  className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: C.dark }}
                >
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={C.white}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: C.text }}>{video.title}</p>
                  <p className="text-[10px]" style={{ color: C.textMuted }}>
                    {video.provider} · {video.scenesCount} scenes
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}>
                      ⟶ drag to calendar
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bot Panel ─────────────────────────────────────────────────────────────

interface BotPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  thinking: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  accountsCount: number;
  libraryCount: number;
  embedded?: boolean;
}

function BotPanel({
  messages,
  input,
  setInput,
  onSend,
  thinking,
  chatEndRef,
  onClose,
  accountsCount,
  libraryCount,
  embedded,
}: BotPanelProps) {
  const suggestions = [
    "Plan my week with 2 posts per day",
    "What's in my library?",
    "Best times to post",
    "What's coming up?",
    "Fill empty slots",
    "Every day at 8pm",
  ];

  return (
    <div
      className={`rounded-2xl shadow-sm flex flex-col ${embedded ? "flex-1" : "max-h-[calc(100vh-200px)]"}`}
      style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
    >
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: C.cardBorder }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: C.text }}>
          🤖 Schedule Bot
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
          >
            FULL EXEC
          </span>
        </h3>
        {!embedded && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
            style={{ backgroundColor: C.cream, color: C.textMuted }}
          >✕</button>
        )}
      </div>

      {/* Messages */}
      <div
        className="overflow-y-auto p-3 space-y-3 flex-1"
        style={{ maxHeight: embedded ? "50vh" : "calc(100vh-360px)", minHeight: "200px" }}
      >
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: C.emeraldSoft }}
            >
              🤖
            </div>
            <p className="text-xs font-bold mb-1" style={{ color: C.text }}>Hi! I'm your Schedule Bot</p>
            <p className="text-[10px] mb-3" style={{ color: C.textMuted }}>
              {accountsCount > 0
                ? `Connected to ${accountsCount} account(s), ${libraryCount} videos in library.`
                : "Connect a PostPeer account to get started."}
            </p>
            <div
              className="rounded-xl p-2.5 text-left mb-3"
              style={{ backgroundColor: C.emeraldSoft, border: `1px solid ${C.cardBorder}` }}
            >
              <p className="text-[10px] font-bold mb-1" style={{ color: C.emeraldDark }}>
                💡 Smart tip
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: C.text }}>
                Paste a Google Drive folder URL + your scheduling instructions, and I'll list every video, write unique captions & hashtags, and schedule them all automatically.
              </p>
            </div>
            <p className="text-[10px] mb-2 font-semibold" style={{ color: C.emeraldDark }}>Try:</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-[10px] px-2 py-1 rounded-full font-semibold transition-all hover:scale-105"
                  style={{
                    backgroundColor: C.emeraldSoft,
                    color: C.emeraldDark,
                    border: `1px solid ${C.cardBorder}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-3 italic" style={{ color: C.warning }}>
              ⚠️ I execute commands immediately — no confirmation needed.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap"
              style={{
                backgroundColor: msg.role === "user" ? C.emerald : C.cream,
                color: msg.role === "user" ? C.white : C.text,
                border: msg.role === "user" ? "none" : `1px solid ${C.cardBorder}`,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-3 py-2 text-xs"
              style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "300ms" }} />
                </span>
                <span className="text-[10px]" style={{ color: C.textMuted }}>
                  {chatInput.match(/drive\.google\.com/i) ? "Importing videos from Google Drive…" : "Working on it…"}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: C.cardBorder }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Tell me what to schedule…  (Tip: paste a Google Drive link + your instructions)"
            rows={2}
            className="flex-1 px-3 py-2 rounded-xl text-xs border-0 outline-none resize-none"
            style={{ backgroundColor: C.cream, color: C.text, minHeight: "44px", maxHeight: "120px" }}
          />
          <button
            onClick={onSend}
            disabled={thinking || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 flex-shrink-0"
            style={{ backgroundColor: C.emerald, color: C.white }}
          >
            {thinking ? (
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Detail Modal ────────────────────────────────────────────────────

interface SlotDetailModalProps {
  slot: ScheduleSlot;
  timezone: string;
  publishingNow: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReschedule: (newDate: Date) => void;
  onUploadVideo: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onPublishNow: () => Promise<{ ok: boolean; error?: string; tiktokUrl?: string }>;
  onUpdateMusic: (music: string) => void;
}

function SlotDetailModal({
  slot,
  timezone,
  publishingNow,
  onClose,
  onDelete,
  onReschedule,
  onUploadVideo,
  onPublishNow,
  onUpdateMusic,
}: SlotDetailModalProps) {
  const sc = statusConfig(slot.status);
  const scheduledDate = new Date(slot.scheduledAt);
  const [showReschedule, setShowReschedule] = useState(false);
  // IMPORTANT: use date in the SELECTED timezone so reschedule input shows
  // the same day the user sees in the calendar (defaults to US Eastern).
  const [newDate, setNewDate] = useState(formatDateKeyTZ(scheduledDate, timezone));
  const [newTime, setNewTime] = useState(
    // Time shown in the selected timezone
    (() => {
      try {
        const parts = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone,
        }).formatToParts(scheduledDate);
        const h = parts.find((p) => p.type === "hour")?.value || "18";
        const m = parts.find((p) => p.type === "minute")?.value || "00";
        return `${h}:${m}`;
      } catch {
        return "18:00";
      }
    })()
  );
  // Upload state (for open slots)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Music title editable state — synced with slot.musicTitle, saved on blur
  const [musicDraft, setMusicDraft] = useState(slot.musicTitle || "");
  const [musicDirty, setMusicDirty] = useState(false);
  // Sync when slot changes (e.g. after publish-now updates parent state)
  useEffect(() => {
    setMusicDraft(slot.musicTitle || "");
    setMusicDirty(false);
  }, [slot.id, slot.musicTitle]);

  const [publishResult, setPublishResult] = useState<{ ok: boolean; error?: string; tiktokUrl?: string } | null>(null);

  const hashtags = slot.hashtags ? safeJsonParse(slot.hashtags, []) : [];
  const imageUrls = slot.imageUrls ? safeJsonParse(slot.imageUrls, []) : [];
  const isOpen = slot.status === "open";

  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setUploadError("Please select a video file (MP4, MOV, WebM, etc.)");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setUploadError("Video is too large (max 200MB)");
      return;
    }
    setUploadError(null);
    setUploading(true);
    setUploadProgress(`Uploading "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB)…`);
    try {
      const result = await onUploadVideo(file);
      if (!result.ok) {
        setUploadError(result.error || "Upload failed");
      } else {
        setUploadProgress("✅ Video uploaded and scheduled in PostPeer!");
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,10,10,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between" style={{ borderColor: C.cardBorder }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                {sc.icon} {sc.label}
              </span>
              {slot.source === "bot" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}>
                  🤖 Bot
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold" style={{ color: C.text }}>
              {slot.caption || "Untitled slot"}
            </h2>
            <p className="text-xs" style={{ color: C.textMuted }}>
              {formatDateTimeTZ(slot.scheduledAt, timezone)}
              <span className="ml-1 text-[10px] opacity-70">
                ({US_TIMEZONES.find((tz) => tz.value === timezone)?.abbr || timezone})
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: C.cream }}
          >✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Account */}
          <div>
            <p className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: C.textMuted }}>Account</p>
            <p className="text-sm font-semibold" style={{ color: C.emeraldDark }}>@{(slot.accountLabel || slot.accountId || '').replace(/^@/, '')}</p>
          </div>

          {/* ─── Video upload zone (for OPEN slots — no video yet) ─── */}
          {isOpen && !slot.videoUrl && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: C.textMuted }}>
                Upload a video to fill this slot
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.webm,.avi,.mkv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleFileSelected(file);
                  // Reset so the same file can be selected again later
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploading) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (uploading) return;
                  const file = e.dataTransfer.files?.[0];
                  handleFileSelected(file);
                }}
                className="rounded-2xl p-6 text-center cursor-pointer transition-all"
                style={{
                  backgroundColor: isDragOver ? C.emeraldSoft : C.cream,
                  border: `2px dashed ${isDragOver ? C.emerald : C.cardBorder}`,
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
                      style={{ borderColor: `${C.emerald}33`, borderTopColor: C.emerald }}
                    />
                    <p className="text-xs font-semibold" style={{ color: C.text }}>{uploadProgress}</p>
                  </div>
                ) : (
                  <>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: C.emerald, boxShadow: `0 6px 20px ${C.emerald}40` }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: C.text }}>
                      {isDragOver ? "Drop your video here" : "Click to upload or drag & drop"}
                    </p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>
                      MP4, MOV, WebM, AVI · max 200MB
                    </p>
                  </>
                )}
              </div>
              {uploadError && (
                <div className="mt-2 rounded-xl p-2.5 text-xs" style={{ backgroundColor: "#FEE2E2", color: C.error }}>
                  ⚠️ {uploadError}
                </div>
              )}
              {uploadProgress.startsWith("✅") && (
                <div className="mt-2 rounded-xl p-2.5 text-xs font-semibold" style={{ backgroundColor: C.emeraldSoft, color: C.emeraldDark }}>
                  {uploadProgress}
                </div>
              )}
            </div>
          )}

          {/* ─── Video preview (for slots that already have a video) ─── */}
          {slot.videoUrl && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: C.textMuted }}>Content</p>
              <div className="rounded-xl overflow-hidden relative" style={{ backgroundColor: C.dark }}>
                {slot.thumbnailUrl && (
                  <img src={slot.thumbnailUrl} alt="thumbnail" className="w-full h-32 object-cover" />
                )}
                {!slot.thumbnailUrl && (
                  <div className="w-full h-32 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill={C.white}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <a
                  href={slot.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)", color: C.white }}
                >
                  Open video ↗
                </a>
              </div>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: C.textMuted }}>Hashtags</p>
              <div className="flex flex-wrap gap-1">
                {hashtags.map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: C.softPink, color: C.pink }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Music title — editable */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              🎵 Music title (TikTok sound)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={musicDraft}
                onChange={(e) => { setMusicDraft(e.target.value); setMusicDirty(true); }}
                onBlur={() => {
                  if (musicDirty) {
                    onUpdateMusic(musicDraft.trim());
                    setMusicDirty(false);
                  }
                }}
                placeholder="Leave empty to let TikTok pick a sound"
                className="flex-1 px-3 py-2 rounded-xl text-sm border-0 outline-none"
                style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
              />
              {musicDirty && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMusic(musicDraft.trim());
                    setMusicDirty(false);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ backgroundColor: C.emerald, color: C.white }}
                >
                  Save
                </button>
              )}
            </div>
            <p className="text-[10px] mt-1 italic" style={{ color: C.textMuted }}>
              Added as a 🎵 line at the end of the caption when published to TikTok.
            </p>
          </div>

          {/* Analytics (if published) */}
          {slot.status === "published" && (slot.views > 0 || slot.likes > 0) && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-bold mb-2" style={{ color: C.textMuted }}>Analytics</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Views", value: slot.views, icon: "👁" },
                  { label: "Likes", value: slot.likes, icon: "❤" },
                  { label: "Comments", value: slot.comments, icon: "💬" },
                  { label: "Shares", value: slot.shares, icon: "↗" },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: C.cream }}>
                    <div className="text-sm">{stat.icon}</div>
                    <div className="text-sm font-bold" style={{ color: C.text }}>{formatNumber(stat.value)}</div>
                    <div className="text-[9px]" style={{ color: C.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {slot.errorMessage && (
            <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: "#FEE2E2", color: C.error }}>
              <strong>Error:</strong> {slot.errorMessage}
            </div>
          )}

          {/* Reschedule */}
          {showReschedule && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: C.cream }}>
              <p className="text-xs font-bold mb-2" style={{ color: C.text }}>Reschedule to:</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs border-0 outline-none"
                  style={{ backgroundColor: C.white, border: `1px solid ${C.cardBorder}` }}
                />
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-2 py-1.5 rounded-lg text-xs border-0 outline-none"
                  style={{ backgroundColor: C.white, border: `1px solid ${C.cardBorder}` }}
                />
              </div>
              <button
                onClick={() => {
                  const [hh, mm] = newTime.split(":").map(Number);
                  const d = new Date(newDate);
                  d.setHours(hh, mm, 0, 0);
                  onReschedule(d);
                }}
                className="w-full py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: C.emerald, color: C.white }}
              >
                Confirm reschedule
              </button>
            </div>
          )}

          {/* TikTok URL */}
          {slot.tiktokUrl && (
            <a
              href={slot.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs font-semibold py-2 rounded-xl"
              style={{ backgroundColor: C.dark, color: C.white }}
            >
              View on TikTok ↗
            </a>
          )}

          {/* Publish Now — bypass scheduledAt and publish immediately */}
          {slot.videoUrl && slot.status !== "published" && slot.status !== "cancelled" && (
            <div>
              <button
                onClick={async () => {
                  if (!confirm("Publish this slot to TikTok RIGHT NOW? This bypasses the scheduled time.")) return;
                  setPublishResult(null);
                  const res = await onPublishNow();
                  setPublishResult(res);
                }}
                disabled={publishingNow}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{
                  background: publishingNow
                    ? `linear-gradient(90deg, ${C.emeraldDark}, ${C.emerald})`
                    : `linear-gradient(90deg, ${C.emerald}, ${C.emeraldDark})`,
                  color: C.white,
                  boxShadow: `0 4px 14px ${C.emerald}40`,
                }}
              >
                {publishingNow ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 rounded-full animate-spin"
                      style={{ border: `2px solid ${C.emeraldLight}`, borderTopColor: C.white }}
                    />
                    Publishing to TikTok…
                  </>
                ) : (
                  <>🚀 Publish Now</>
                )}
              </button>
              {publishResult && (() => {
                // Detect TikTok's "reached_active_user_cap" quota error and
                // show a friendly bilingual (English + Arabic) message so the
                // user understands this is TikTok's daily quota limit, not a
                // bug in our app. The video itself did NOT make it to TikTok.
                const err = (publishResult.error || "").toLowerCase();
                const isQuotaCap =
                  !publishResult.ok &&
                  (err.includes("reached_active_user_cap") ||
                    err.includes("active_user_cap") ||
                    err.includes("rate_limit") ||
                    err.includes("quota"));

                if (publishResult.ok) {
                  return (
                    <div
                      className="mt-2 rounded-xl p-2.5 text-xs"
                      style={{ backgroundColor: C.emeraldSoft, color: C.emeraldDark }}
                    >
                      {`✅ Published!${publishResult.tiktokUrl ? " View on TikTok ↗" : ""}`}
                    </div>
                  );
                }

                if (isQuotaCap) {
                  return (
                    <div
                      className="mt-2 rounded-xl p-3 text-xs space-y-1.5"
                      style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                    >
                      <div className="font-bold">
                        ⚠️ TikTok daily publish limit reached
                      </div>
                      <div>
                        TikTok rejected the publish because the connected app
                        has hit its <code>reached_active_user_cap</code> quota.
                        This is a TikTok-side limit — no video was posted to
                        your account. Please wait (usually resets within 24h)
                        and try again.
                      </div>
                      <div dir="rtl" style={{ color: "#92400E" }}>
                        وصل التطبيق إلى الحد اليومي المسموح به من تيك توك
                        للنشر (reached_active_user_cap). لم يُنشر أي فيديو على
                        حسابك. الرجاء المحاولة لاحقًا (عادةً خلال 24 ساعة).
                      </div>
                    </div>
                  );
                }

                // Generic failure
                return (
                  <div
                    className="mt-2 rounded-xl p-2.5 text-xs"
                    style={{ backgroundColor: "#FEE2E2", color: C.error }}
                  >
                    {`⚠️ ${publishResult.error || "Publish failed"}`}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t flex gap-2" style={{ borderColor: C.cardBorder }}>
          {slot.status !== "published" && slot.status !== "cancelled" && (
            <>
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
              >
                🔄 Reschedule
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "#FEE2E2", color: C.error }}
              >
                {isOpen ? "🗑 Delete slot" : "🗑 Cancel slot"}
              </button>
            </>
          )}
          {slot.status === "published" && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: C.emerald, color: C.white }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Slot Modal ────────────────────────────────────────────────────────

interface NewSlotUploadedVideo {
  videoUrl: string;
  title: string;
  fileName: string;
  sizeMB: number;
  mimeType: string;
}

interface NewSlotModalProps {
  date: Date | null;
  accountId: string;
  accounts: ScheduleAccount[];
  time: string;
  video: LibraryVideo | null;
  caption: string;
  hashtags: string;
  music: string;
  libraryVideos: LibraryVideo[];
  creating: boolean;
  // New: upload-related props
  source: "upload" | "library";
  uploadedVideo: NewSlotUploadedVideo | null;
  uploading: boolean;
  uploadError: string | null;
  onDateChange: (d: Date) => void;
  onAccountChange: (id: string) => void;
  onTimeChange: (t: string) => void;
  onVideoChange: (v: LibraryVideo | null) => void;
  onCaptionChange: (s: string) => void;
  onHashtagsChange: (s: string) => void;
  onMusicChange: (s: string) => void;
  onSourceChange: (s: "upload" | "library") => void;
  onUploadFile: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onClearUpload: () => void;
  onClearUploadError: () => void;
  onCreate: () => void;
  // New: create current slot, then keep the modal open with per-slot fields
  // cleared (date + account + time preserved) so the user can immediately
  // add another slot to the same day. Lets the user chain-create as many
  // slots as they want without reopening the modal each time.
  onCreateAnother: () => Promise<boolean>;
  onClose: () => void;
}

function NewSlotModal({
  date,
  accountId,
  accounts,
  time,
  video,
  caption,
  hashtags,
  music,
  libraryVideos,
  creating,
  source,
  uploadedVideo,
  uploading,
  uploadError,
  onDateChange,
  onAccountChange,
  onTimeChange,
  onVideoChange,
  onCaptionChange,
  onHashtagsChange,
  onMusicChange,
  onSourceChange,
  onUploadFile,
  onClearUpload,
  onClearUploadError,
  onCreate,
  onCreateAnother,
  onClose,
}: NewSlotModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  if (!date) return null;
  // IMPORTANT: use LOCAL date (not toISOString) so picking "27" shows "27"
  // regardless of timezone. toISOString().slice(0,10) would shift the day back.
  const dateStr = toLocalDateStr(date);

  const pickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onClearUploadError();
    await onUploadFile(file);
    // Reset input value so the same file can be re-selected later
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      onClearUploadError();
      // Surface a friendly inline error via the same uploadError channel
      await onUploadFile(file); // server will reject with "File must be a video"
      return;
    }
    onClearUploadError();
    await onUploadFile(file);
  };

  const hasVideo = !!uploadedVideo || !!video;
  const createBtnLabel = creating
    ? "Creating…"
    : hasVideo
      ? "📅 Schedule post"
      : "➕ Create open slot";

  // Save & add another: same label logic but suffixed so the user knows the
  // modal stays open. Disabled while creating/uploading or if no account.
  const createAnotherBtnLabel = creating
    ? "Saving…"
    : hasVideo
      ? "📅 Save & add another"
      : "➕ Save & add another";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,10,10,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: C.cardBorder }}>
          <h2 className="text-lg font-bold" style={{ color: C.text }}>➕ New scheduled slot</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: C.cream }}
          >✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => onDateChange(new Date(e.target.value + "T00:00:00"))}
                className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none"
                style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none"
                style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>TikTok account</label>
            <select
              value={accountId}
              onChange={(e) => onAccountChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none cursor-pointer"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>@{(a.username || '').replace(/^@/, '')}</option>
              ))}
            </select>
          </div>

          {/* Video picker — tabbed: Upload from device / Pick from library */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1.5 block" style={{ color: C.textMuted }}>
              Video source
            </label>

            {/* Tab switch */}
            <div
              className="grid grid-cols-2 p-1 rounded-xl mb-2.5"
              style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
            >
              <button
                type="button"
                onClick={() => onSourceChange("upload")}
                className="py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: source === "upload" ? C.emerald : "transparent",
                  color: source === "upload" ? C.white : C.textMuted,
                }}
              >
                ⬆️ Upload from device
              </button>
              <button
                type="button"
                onClick={() => onSourceChange("library")}
                className="py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: source === "library" ? C.emerald : "transparent",
                  color: source === "library" ? C.white : C.textMuted,
                }}
              >
                🎬 Pick from library
              </button>
            </div>

            {/* Hidden file input shared by click-to-browse */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.webm,.avi,.mkv"
              onChange={handleFileSelected}
              className="hidden"
            />

            {/* === UPLOAD TAB === */}
            {source === "upload" && (
              <div>
                {uploadedVideo ? (
                  // Uploaded video preview
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: C.emeraldSoft, border: `1.5px solid ${C.emerald}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xl"
                        style={{ backgroundColor: C.emerald, color: C.white }}
                      >
                        ▶
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: C.text }}>
                          {uploadedVideo.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                          {uploadedVideo.fileName} · {uploadedVideo.sizeMB} MB · {(uploadedVideo.mimeType || "video/mp4").replace("video/", "").toUpperCase()}
                        </p>
                        <p className="text-[10px] mt-0.5 font-semibold flex items-center gap-1" style={{ color: C.emeraldDark }}>
                          ✓ Uploaded & ready to schedule
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClearUpload}
                        disabled={uploading}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: C.white, color: C.textMuted, border: `1px solid ${C.cardBorder}` }}
                        title="Remove uploaded video"
                      >
                        ✕
                      </button>
                    </div>
                    {/* Replace with another file */}
                    <button
                      type="button"
                      onClick={pickFile}
                      disabled={uploading}
                      className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.01] disabled:opacity-50"
                      style={{ backgroundColor: C.white, color: C.emeraldDark, border: `1px solid ${C.cardBorder}` }}
                    >
                      Replace with a different file
                    </button>
                  </div>
                ) : uploading ? (
                  // Uploading state
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ backgroundColor: C.cream, border: `2px dashed ${C.emerald}` }}
                  >
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: `2px solid ${C.emeraldLight}`, borderTopColor: C.emerald }}
                      />
                      <p className="text-xs font-bold" style={{ color: C.text }}>Uploading…</p>
                    </div>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>
                      Large videos may take 30–60 seconds. Please keep this window open.
                    </p>
                  </div>
                ) : (
                  // Drop zone (initial state)
                  <button
                    type="button"
                    onClick={pickFile}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="w-full rounded-xl p-6 text-center transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: dragOver ? C.emeraldSoft : C.cream,
                      border: `2px dashed ${dragOver ? C.emerald : C.cardBorder}`,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 text-xl"
                      style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
                    >
                      ⬆️
                    </div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: C.text }}>
                      Click to browse or drop a video here
                    </p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>
                      MP4, MOV, WebM, AVI, MKV · up to 200 MB
                    </p>
                  </button>
                )}

                {/* Error message */}
                {uploadError && (
                  <div
                    className="mt-2 rounded-lg p-2 flex items-start gap-2"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", border: `1px solid ${C.error}` }}
                  >
                    <span className="text-xs" style={{ color: C.error }}>⚠️</span>
                    <p className="text-[11px] flex-1" style={{ color: C.error }}>{uploadError}</p>
                    <button
                      type="button"
                      onClick={onClearUploadError}
                      className="text-[11px] font-bold"
                      style={{ color: C.error }}
                    >✕</button>
                  </div>
                )}
              </div>
            )}

            {/* === LIBRARY TAB === */}
            {source === "library" && (
              <div>
                {video ? (
                  <div
                    className="flex items-center gap-2 p-2 rounded-xl"
                    style={{ backgroundColor: C.emeraldSoft, border: `1px solid ${C.cardBorder}` }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: C.dark }}
                    >
                      {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: C.text }}>{video.title}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{video.provider} · {video.scenesCount} scenes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onVideoChange(null)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: C.white, color: C.textMuted }}
                    >✕</button>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl" style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white }}>
                    {libraryVideos.length === 0 ? (
                      <p className="text-xs italic p-3 text-center" style={{ color: C.textMuted }}>
                        Your library is empty. Switch to “Upload from device” to add a video directly.
                      </p>
                    ) : (
                      libraryVideos.slice(0, 20).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            onVideoChange(v);
                            if (!caption) onCaptionChange(v.title);
                          }}
                          className="w-full flex items-center gap-2 p-2 text-left hover:bg-emerald-50 transition-colors"
                          style={{ borderBottom: `1px solid ${C.cardBorder}` }}
                        >
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: C.dark }}>
                            {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{v.title}</p>
                            <p className="text-[10px]" style={{ color: C.textMuted }}>{v.provider}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Helper note when no video is selected */}
            {!uploadedVideo && !video && !uploading && (
              <p className="text-[10px] mt-1.5 italic" style={{ color: C.textMuted }}>
                💡 Leave empty to create an open slot you can fill later.
              </p>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Write a catchy caption…"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              Hashtags (comma-separated)
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => onHashtagsChange(e.target.value)}
              placeholder="fyp, viral, ai"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
          </div>

          {/* Music title (optional) */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              🎵 Music title (optional)
            </label>
            <input
              type="text"
              value={music}
              onChange={(e) => onMusicChange(e.target.value)}
              placeholder="e.g. Original Sound - Artist"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
            <p className="text-[10px] mt-1 italic" style={{ color: C.textMuted }}>
              Added as a 🎵 line at the end of the caption.
            </p>
          </div>
        </div>

        <div className="p-5 border-t flex flex-col gap-2" style={{ borderColor: C.cardBorder }}>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={creating || uploading || !accountId}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ backgroundColor: C.emerald, color: C.white }}
            >
              {createBtnLabel}
            </button>
          </div>
          {/* Save & add another — keeps the modal open with per-slot fields
              cleared (date + account + time preserved) so the user can
              immediately add another slot. Useful when adding many slots
              in a row to the same day/account. */}
          <button
            onClick={async () => {
              await onCreateAnother();
            }}
            disabled={creating || uploading || !accountId}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: "transparent",
              color: C.emeraldDark,
              border: `1.5px dashed ${C.emerald}`,
            }}
          >
            {createAnotherBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Immediately Modal ────────────────────────────────────────────────
// Distinct from NewSlotModal: no date/time picker, no "schedule" — just pick
// a video, write caption + hashtags + music, and click one button to publish
// to TikTok right now. The slot is created AND published in a single API call.

interface PostNowModalProps {
  accountId: string;
  accounts: ScheduleAccount[];
  video: LibraryVideo | null;
  caption: string;
  hashtags: string;
  music: string;
  libraryVideos: LibraryVideo[];
  publishing: boolean;
  source: "upload" | "library";
  uploadedVideo: NewSlotUploadedVideo | null;
  uploading: boolean;
  uploadError: string | null;
  result: { ok: boolean; error?: string; tiktokUrl?: string } | null;
  onAccountChange: (id: string) => void;
  onVideoChange: (v: LibraryVideo | null) => void;
  onCaptionChange: (s: string) => void;
  onHashtagsChange: (s: string) => void;
  onMusicChange: (s: string) => void;
  onSourceChange: (s: "upload" | "library") => void;
  onUploadFile: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onClearUpload: () => void;
  onClearUploadError: () => void;
  onPublish: () => void;
  onClose: () => void;
}

function PostNowModal({
  accountId,
  accounts,
  video,
  caption,
  hashtags,
  music,
  libraryVideos,
  publishing,
  source,
  uploadedVideo,
  uploading,
  uploadError,
  result,
  onAccountChange,
  onVideoChange,
  onCaptionChange,
  onHashtagsChange,
  onMusicChange,
  onSourceChange,
  onUploadFile,
  onClearUpload,
  onClearUploadError,
  onPublish,
  onClose,
}: PostNowModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onClearUploadError();
    await onUploadFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      onClearUploadError();
      await onUploadFile(file); // server will reject with "File must be a video"
      return;
    }
    onClearUploadError();
    await onUploadFile(file);
  };

  const hasVideo = !!uploadedVideo || !!video;

  // Detect TikTok quota errors so we can show a friendly bilingual message.
  const err = result?.error ? result.error.toLowerCase() : "";
  const isQuotaCap =
    !result?.ok &&
    !!result?.error &&
    (err.includes("reached_active_user_cap") ||
      err.includes("active_user_cap") ||
      err.includes("rate_limit") ||
      err.includes("quota"));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,10,10,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: C.cardBorder }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: C.text }}>⚡ Post Immediately to TikTok</h2>
            <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
              No scheduling — the video is published the moment you click the button.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={publishing}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40"
            style={{ backgroundColor: C.cream }}
          >✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Account */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>TikTok account</label>
            <select
              value={accountId}
              onChange={(e) => onAccountChange(e.target.value)}
              disabled={publishing}
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>@{(a.username || '').replace(/^@/, '')}</option>
              ))}
            </select>
          </div>

          {/* Video picker — tabbed: Upload from device / Pick from library */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1.5 block" style={{ color: C.textMuted }}>
              Video source
            </label>

            <div
              className="grid grid-cols-2 p-1 rounded-xl mb-2.5"
              style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
            >
              <button
                type="button"
                onClick={() => onSourceChange("upload")}
                disabled={publishing}
                className="py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: source === "upload" ? C.emerald : "transparent",
                  color: source === "upload" ? C.white : C.textMuted,
                }}
              >
                ⬆️ Upload from device
              </button>
              <button
                type="button"
                onClick={() => onSourceChange("library")}
                disabled={publishing}
                className="py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: source === "library" ? C.emerald : "transparent",
                  color: source === "library" ? C.white : C.textMuted,
                }}
              >
                🎬 Pick from library
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.webm,.avi,.mkv"
              onChange={handleFileSelected}
              className="hidden"
            />

            {/* UPLOAD TAB */}
            {source === "upload" && (
              <div>
                {uploadedVideo ? (
                  <div
                    className="rounded-xl p-3"
                    style={{ backgroundColor: C.emeraldSoft, border: `1.5px solid ${C.emerald}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xl"
                        style={{ backgroundColor: C.emerald, color: C.white }}
                      >
                        ▶
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: C.text }}>
                          {uploadedVideo.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                          {uploadedVideo.fileName} · {uploadedVideo.sizeMB} MB · {(uploadedVideo.mimeType || "video/mp4").replace("video/", "").toUpperCase()}
                        </p>
                        <p className="text-[10px] mt-0.5 font-semibold flex items-center gap-1" style={{ color: C.emeraldDark }}>
                          ✓ Uploaded & ready to publish
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClearUpload}
                        disabled={uploading || publishing}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: C.white, color: C.textMuted, border: `1px solid ${C.cardBorder}` }}
                        title="Remove uploaded video"
                      >
                        ✕
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={pickFile}
                      disabled={uploading || publishing}
                      className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.01] disabled:opacity-50"
                      style={{ backgroundColor: C.white, color: C.emeraldDark, border: `1px solid ${C.cardBorder}` }}
                    >
                      Replace with a different file
                    </button>
                  </div>
                ) : uploading ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ backgroundColor: C.cream, border: `2px dashed ${C.emerald}` }}
                  >
                    <div className="inline-flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: `2px solid ${C.emeraldLight}`, borderTopColor: C.emerald }}
                      />
                      <p className="text-xs font-bold" style={{ color: C.text }}>Uploading…</p>
                    </div>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>
                      Large videos may take 30–60 seconds. Please keep this window open.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={pickFile}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="w-full rounded-xl p-6 text-center transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: dragOver ? C.emeraldSoft : C.cream,
                      border: `2px dashed ${dragOver ? C.emerald : C.cardBorder}`,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 text-xl"
                      style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
                    >
                      ⬆️
                    </div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: C.text }}>
                      Click to browse or drop a video here
                    </p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>
                      MP4, MOV, WebM, AVI, MKV · up to 200 MB
                    </p>
                  </button>
                )}

                {uploadError && (
                  <div
                    className="mt-2 rounded-lg p-2 flex items-start gap-2"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", border: `1px solid ${C.error}` }}
                  >
                    <span className="text-xs" style={{ color: C.error }}>⚠️</span>
                    <p className="text-[11px] flex-1" style={{ color: C.error }}>{uploadError}</p>
                    <button
                      type="button"
                      onClick={onClearUploadError}
                      className="text-[11px] font-bold"
                      style={{ color: C.error }}
                    >✕</button>
                  </div>
                )}
              </div>
            )}

            {/* LIBRARY TAB */}
            {source === "library" && (
              <div>
                {video ? (
                  <div
                    className="flex items-center gap-2 p-2 rounded-xl"
                    style={{ backgroundColor: C.emeraldSoft, border: `1px solid ${C.cardBorder}` }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: C.dark }}
                    >
                      {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: C.text }}>{video.title}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{video.provider} · {video.scenesCount} scenes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onVideoChange(null)}
                      disabled={publishing}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs disabled:opacity-40"
                      style={{ backgroundColor: C.white, color: C.textMuted }}
                    >✕</button>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl" style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white }}>
                    {libraryVideos.length === 0 ? (
                      <p className="text-xs italic p-3 text-center" style={{ color: C.textMuted }}>
                        Your library is empty. Switch to “Upload from device” to add a video directly.
                      </p>
                    ) : (
                      libraryVideos.slice(0, 20).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            onVideoChange(v);
                            if (!caption) onCaptionChange(v.title);
                          }}
                          disabled={publishing}
                          className="w-full flex items-center gap-2 p-2 text-left hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          style={{ borderBottom: `1px solid ${C.cardBorder}` }}
                        >
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: C.dark }}>
                            {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{v.title}</p>
                            <p className="text-[10px]" style={{ color: C.textMuted }}>{v.provider}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {!uploadedVideo && !video && !uploading && (
              <p className="text-[10px] mt-1.5 italic" style={{ color: C.textMuted }}>
                💡 A video is required to publish immediately.
              </p>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>Caption</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              disabled={publishing}
              placeholder="Write a catchy caption…"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none disabled:opacity-60"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              Hashtags (comma-separated)
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => onHashtagsChange(e.target.value)}
              disabled={publishing}
              placeholder="fyp, viral, ai"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none disabled:opacity-60"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
          </div>

          {/* Music title */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              🎵 Music title (optional)
            </label>
            <input
              type="text"
              value={music}
              onChange={(e) => onMusicChange(e.target.value)}
              disabled={publishing}
              placeholder="e.g. Original Sound - Artist"
              className="w-full px-3 py-2 rounded-xl text-sm border-0 outline-none disabled:opacity-60"
              style={{ backgroundColor: C.cream, color: C.text, border: `1px solid ${C.cardBorder}` }}
            />
            <p className="text-[10px] mt-1 italic" style={{ color: C.textMuted }}>
              Added as a 🎵 line at the end of the caption.
            </p>
          </div>

          {/* Result feedback */}
          {result && (
            <>
              {result.ok ? (
                <div
                  className="rounded-xl p-3 text-xs space-y-1.5"
                  style={{ backgroundColor: C.emeraldSoft, color: C.emeraldDark }}
                >
                  <div className="font-bold">✅ Posted to TikTok!</div>
                  {result.tiktokUrl && (
                    <a
                      href={result.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold"
                    >
                      View on TikTok ↗
                    </a>
                  )}
                  <div dir="rtl" style={{ color: C.emeraldDark }}>
                    تم النشر بنجاح على تيك توك.
                  </div>
                </div>
              ) : isQuotaCap ? (
                <div
                  className="rounded-xl p-3 text-xs space-y-1.5"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  <div className="font-bold">
                    ⚠️ TikTok daily publish limit reached
                  </div>
                  <div>
                    TikTok rejected the publish because the connected app has
                    hit its <code>reached_active_user_cap</code> quota. This is
                    a TikTok-side limit — no video was posted to your account.
                    Please wait (usually resets within 24h) and try again.
                  </div>
                  <div dir="rtl" style={{ color: "#92400E" }}>
                    وصل التطبيق إلى الحد اليومي المسموح به من تيك توك للنشر
                    (reached_active_user_cap). لم يُنشر أي فيديو على حسابك.
                    الرجاء المحاولة لاحقًا (عادةً خلال 24 ساعة).
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ backgroundColor: "#FEE2E2", color: C.error }}
                >
                  ⚠️ {result.error || "Publish failed"}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-2" style={{ borderColor: C.cardBorder }}>
          <button
            onClick={onClose}
            disabled={publishing}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
            style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
          >
            {result?.ok ? "Done" : "Cancel"}
          </button>
          <button
            onClick={onPublish}
            disabled={publishing || uploading || !accountId || !hasVideo}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            style={{
              background: publishing
                ? `linear-gradient(90deg, ${C.emeraldDark}, ${C.emerald})`
                : `linear-gradient(90deg, ${C.emerald}, ${C.emeraldDark})`,
              color: C.white,
              boxShadow: `0 4px 14px ${C.emerald}40`,
            }}
          >
            {publishing ? (
              <>
                <div
                  className="w-3.5 h-3.5 rounded-full animate-spin"
                  style={{ border: `2px solid ${C.emeraldLight}`, borderTopColor: C.white }}
                />
                Posting to TikTok…
              </>
            ) : (
              <>⚡ Post to TikTok now</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeJsonParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// ─── Google Drive Import Modal ─────────────────────────────────────────────

interface GDrivePreviewFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface GDriveImportResult {
  ok: boolean;
  plan?: {
    postsPerDay: number;
    timesOfDay: string[];
    daysAhead: number;
    captionTone: string;
    hashtagsFocus: string[];
    explanation: string;
  };
  videosFound?: number;
  slotsCreated?: number;
  slots?: Array<{
    slotId: string;
    filename: string;
    scheduledAt: string;
    account: string;
    caption: string;
    hashtags: string[];
  }>;
  errors?: string[];
  error?: string;
}

interface GoogleDriveImportModalProps {
  accounts: ScheduleAccount[];
  userEmail: string;
  onSlotsCreated: () => void;
  onClose: () => void;
}

const GDRIVE_INSTRUCTION_PRESETS = [
  "2 posts per day at 12pm and 8pm for the next 7 days. Use funny captions about outdoor gear deals.",
  "1 post per day at 6pm for 14 days. Casual tone, viral hashtags.",
  "3 posts per day at 9am, 1pm, and 8pm for 5 days. Hype tone, focus on deals and discounts.",
  "Post every day at 8pm for 10 days. Educational tone, include hashtags about products.",
];

function GoogleDriveImportModal({
  accounts,
  userEmail,
  onSlotsCreated,
  onClose,
}: GoogleDriveImportModalProps) {
  const [folderUrl, setFolderUrl] = useState("");
  const [instructions, setInstructions] = useState(GDRIVE_INSTRUCTION_PRESETS[0]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<GDrivePreviewFile[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GDriveImportResult | null>(null);

  // Default: select all accounts
  useEffect(() => {
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds(accounts.map((a) => a.id));
    }
  }, [accounts, selectedAccountIds.length]);

  const previewFolder = async () => {
    if (!folderUrl.trim()) {
      setPreviewError("Please paste your Google Drive folder URL first.");
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    setPreviewFiles([]);
    setImportResult(null);
    try {
      const res = await fetch(`/api/schedule/gdrive-import?folderUrl=${encodeURIComponent(folderUrl.trim())}`);
      const data = await res.json();
      if (data.ok) {
        setPreviewFiles(data.files || []);
        if ((data.files || []).length === 0) {
          setPreviewError("No video files found in this folder.");
        }
      } else {
        setPreviewError(data.error || "Failed to preview folder.");
      }
    } catch (err: any) {
      setPreviewError(err.message || "Network error while previewing folder.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!folderUrl.trim()) {
      setPreviewError("Please paste your Google Drive folder URL first.");
      return;
    }
    if (!instructions.trim()) {
      setPreviewError("Please tell the bot how to schedule your videos.");
      return;
    }
    if (selectedAccountIds.length === 0) {
      setPreviewError("Please select at least one TikTok account.");
      return;
    }
    if (accounts.length === 0) {
      setPreviewError("No TikTok accounts connected. Connect an account in PostPeer first.");
      return;
    }

    setImporting(true);
    setPreviewError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/schedule/gdrive-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderUrl: folderUrl.trim(),
          instructions: instructions.trim(),
          accountIds: selectedAccountIds,
          userEmail,
        }),
      });
      const data: GDriveImportResult = await res.json();
      setImportResult(data);
      if (data.ok && (data.slotsCreated || 0) > 0) {
        onSlotsCreated();
      }
    } catch (err: any) {
      setImportResult({
        ok: false,
        error: err.message || "Network error while importing.",
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalSizeLabel = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10, 10, 10, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div
        className="rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: C.white, border: `2px solid ${C.emerald}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{
            background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldDark})`,
            color: C.white,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 3h6l4 6-3 5H4L9 3z" fill="#FFC107"/>
                <path d="M9 3L4 14l4 7h6l-3-7 3-4-5-7z" fill="#1976D2"/>
                <path d="M9 3l3 4h8l-3-4H9z" fill="#4CAF50"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Google Drive → TikTok Scheduler</h2>
              <p className="text-xs opacity-90">Paste a folder link, give the bot instructions, and it schedules everything with captions & hashtags.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Step 1: Folder URL */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: C.textMuted }}>
              ① Google Drive folder URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/XXXXXXX..."
                disabled={importing}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm border-0 outline-none disabled:opacity-60"
                style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
              />
              <button
                onClick={previewFolder}
                disabled={previewing || importing || !folderUrl.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
              >
                {previewing ? "Checking…" : "🔍 Preview"}
              </button>
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: C.textMuted }}>
              ⚠️ The folder must be shared as <strong>“Anyone with the link can view”</strong>. Right-click the folder in Google Drive → <em>Share</em> → change to “Anyone with the link”. Only video files (MP4, MOV, etc.) will be imported.
            </p>
            <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
              💡 Tip: open the folder URL in an <strong>incognito window</strong> first. If Google asks you to sign in, sharing is not public yet.
            </p>
          </div>

          {/* Preview results */}
          {previewFiles.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: C.emeraldSoft, border: `1.5px solid ${C.cardBorder}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold" style={{ color: C.emeraldDark }}>
                  ✓ Found {previewFiles.length} video{previewFiles.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px]" style={{ color: C.textMuted }}>
                  {previewFiles.reduce((s, f) => s + (f.size || 0), 0) > 0
                    ? totalSizeLabel(previewFiles.reduce((s, f) => s + (f.size || 0), 0)) + " total"
                    : ""}
                </p>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {previewFiles.slice(0, 50).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs">
                    <span style={{ color: C.emerald }}>🎬</span>
                    <span className="font-mono truncate flex-1" style={{ color: C.text }}>{f.name}</span>
                    <span className="text-[10px]" style={{ color: C.textMuted }}>{totalSizeLabel(f.size)}</span>
                  </div>
                ))}
                {previewFiles.length > 50 && (
                  <p className="text-[10px] italic" style={{ color: C.textMuted }}>
                    … and {previewFiles.length - 50} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Instructions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: C.textMuted }}>
              ② Instructions for the bot
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={importing}
              rows={3}
              placeholder="e.g. 2 posts per day at 12pm and 8pm for 7 days. Funny captions about outdoor gear deals. Include hashtags #fyp #viral #outdoor."
              className="w-full px-3 py-2.5 rounded-xl text-sm border-0 outline-none resize-none disabled:opacity-60"
              style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-semibold" style={{ color: C.textMuted }}>Try:</span>
              {GDRIVE_INSTRUCTION_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setInstructions(preset)}
                  disabled={importing}
                  className="text-[10px] px-2 py-1 rounded-full font-semibold transition-all hover:scale-105 disabled:opacity-40"
                  style={{
                    backgroundColor: instructions === preset ? C.emerald : C.emeraldSoft,
                    color: instructions === preset ? C.white : C.emeraldDark,
                    border: `1px solid ${C.cardBorder}`,
                  }}
                >
                  Preset {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Account selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: C.textMuted }}>
              ③ Publish to ({selectedAccountIds.length} selected)
            </label>
            {accounts.length === 0 ? (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#FEE2E2", color: C.error }}>
                ⚠️ No TikTok accounts connected. Connect one in PostPeer first, then refresh this page.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => {
                  const selected = selectedAccountIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAccount(a.id)}
                      disabled={importing}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-60"
                      style={{
                        backgroundColor: selected ? C.emerald : C.white,
                        color: selected ? C.white : C.text,
                        border: `1.5px solid ${selected ? C.emerald : C.cardBorder}`,
                      }}
                    >
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style={{ backgroundColor: selected ? "rgba(255,255,255,0.3)" : C.emeraldSoft }}>
                          @{(a.username || '').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      @{(a.username || '').replace(/^@/, '')}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] mt-1.5" style={{ color: C.textMuted }}>
              Videos rotate across selected accounts. If you select 5 accounts and have 10 videos, each account gets ~2 posts.
            </p>
          </div>

          {/* Error */}
          {previewError && (
            <div
              className="rounded-xl p-3 text-xs whitespace-pre-line"
              style={{ backgroundColor: "#FEE2E2", color: C.error }}
            >
              ⚠️ {previewError}
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: importResult.ok ? C.emeraldSoft : "#FEE2E2",
                border: `1.5px solid ${importResult.ok ? C.emerald : C.error}`,
              }}
            >
              {importResult.ok ? (
                <>
                  <p className="text-sm font-bold mb-2" style={{ color: C.emeraldDark }}>
                    ✓ Scheduled {importResult.slotsCreated} of {importResult.videosFound} videos!
                  </p>
                  {importResult.plan && (
                    <p className="text-xs mb-3" style={{ color: C.text }}>
                      <strong>Plan:</strong> {importResult.plan.postsPerDay} posts/day at{" "}
                      {importResult.plan.timesOfDay.join(", ")} for {importResult.plan.daysAhead} days · Tone:{" "}
                      {importResult.plan.captionTone}
                      {importResult.plan.hashtagsFocus.length > 0
                        ? ` · Focus: ${importResult.plan.hashtagsFocus.join(", ")}`
                        : ""}
                    </p>
                  )}
                  {importResult.slots && importResult.slots.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
                      {importResult.slots.map((s) => (
                        <div
                          key={s.slotId}
                          className="rounded-xl p-2.5 text-xs"
                          style={{ backgroundColor: C.white, border: `1px solid ${C.cardBorder}` }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-mono font-bold truncate flex-1" style={{ color: C.text }}>
                              🎬 {s.filename}
                            </span>
                            <span className="text-[10px] whitespace-nowrap font-semibold" style={{ color: C.emeraldDark }}>
                              {new Date(s.scheduledAt).toLocaleString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] mb-1" style={{ color: C.textMuted }}>
                            → @{(s.account || '').replace(/^@/, '')}
                          </p>
                          <p className="text-[11px] italic" style={{ color: C.text }}>
                            “{s.caption}”
                          </p>
                          {s.hashtags.length > 0 && (
                            <p className="text-[10px] mt-1 font-semibold" style={{ color: C.emeraldDark }}>
                              {s.hashtags.map((h) => `#${h}`).join(" ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <p className="text-[10px] mt-2" style={{ color: C.warning }}>
                      ⚠️ {importResult.errors.length} video(s) failed to schedule. Check console for details.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs" style={{ color: C.error }}>
                  ⚠️ {importResult.error || "Import failed."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 p-4 border-t"
          style={{ borderColor: C.cardBorder, backgroundColor: C.cream }}
        >
          <p className="text-[10px]" style={{ color: C.textMuted }}>
            {importing ? "🤖 Bot is generating captions and scheduling…" : "The bot will generate unique captions and hashtags for each video based on your instructions."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-40"
              style={{ backgroundColor: C.white, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
            >
              {importResult?.ok ? "Done" : "Cancel"}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || accounts.length === 0 || !folderUrl.trim() || !instructions.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-2"
              style={{
                backgroundColor: C.emerald,
                color: C.white,
                boxShadow: `0 4px 14px ${C.emerald}40`,
              }}
            >
              {importing ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Scheduling…
                </>
              ) : (
                <>🚀 Schedule All Videos</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
