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

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const [creatingSlot, setCreatingSlot] = useState(false);

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
    if (!confirm("Cancel this scheduled slot? This will also delete the Blotato scheduled post.")) return;
    try {
      await fetch(`/api/schedule/slots/${slotId}`, { method: "DELETE" });
      setSelectedSlot(null);
      fetchSlots();
    } catch (err) {
      alert("Failed to cancel slot.");
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

  const handleCreateSlot = async () => {
    if (!newSlotDate || !newSlotAccountId) return;
    setCreatingSlot(true);
    try {
      const [hh, mm] = newSlotTime.split(":").map(Number);
      const scheduledAt = new Date(newSlotDate);
      scheduledAt.setHours(hh, mm, 0, 0);

      await fetch("/api/schedule/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: newSlotAccountId,
          accountLabel: accounts.find((a) => a.id === newSlotAccountId)?.username,
          scheduledAt: scheduledAt.toISOString(),
          videoUrl: newSlotVideo?.videoUrl,
          thumbnailUrl: newSlotVideo?.thumbnailUrl,
          caption: newSlotCaption || newSlotVideo?.title,
          hashtags: newSlotHashtags
            ? newSlotHashtags.split(/[,\s]+/).filter(Boolean)
            : undefined,
          sourceVideoId: newSlotVideo?.id,
          source: "manual",
        }),
      });

      setShowNewSlotModal(false);
      setNewSlotVideo(null);
      setNewSlotCaption("");
      setNewSlotHashtags("");
      setNewSlotTime("18:00");
      fetchSlots();
    } catch (err) {
      alert("Failed to create slot.");
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
      const key = formatDateKey(new Date(slot.scheduledAt));
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    }
    // Sort each day's slots by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    return map;
  }, [filteredSlots]);

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
                  {accountsError ? "Could not load Blotato accounts" : "Connect your Blotato account"}
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
                      If the key is present but you still see an auth error, the key may be invalid or your Blotato
                      workspace has no TikTok accounts connected yet. Open the Blotato dashboard and connect a TikTok
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
                        href="https://app.blotato.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        ↗ Open Blotato dashboard
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
                      Your Blotato API key is set, but no TikTok accounts were returned. This usually means you
                      haven't connected a TikTok account to your Blotato workspace yet.
                    </p>
                    <p className="text-xs opacity-90 mb-2">
                      Go to the Blotato dashboard → Connections → connect at least one TikTok account, then come back
                      and click Refresh.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="https://app.blotato.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        ↗ Open Blotato dashboard
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
                  <option key={a.id} value={a.id}>@{a.username}</option>
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
                  <ListView slots={filteredSlots} onSlotClick={setSelectedSlot} />
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
          onClose={() => setSelectedSlot(null)}
          onDelete={() => handleDeleteSlot(selectedSlot.id)}
          onReschedule={(newDate) => {
            handleRescheduleSlot(selectedSlot.id, newDate);
            setSelectedSlot(null);
          }}
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
          libraryVideos={libraryVideos}
          creating={creatingSlot}
          onDateChange={setNewSlotDate}
          onAccountChange={setNewSlotAccountId}
          onTimeChange={setNewSlotTime}
          onVideoChange={setNewSlotVideo}
          onCaptionChange={setNewSlotCaption}
          onHashtagsChange={setNewSlotHashtags}
          onCreate={handleCreateSlot}
          onClose={() => setShowNewSlotModal(false)}
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
              {/* Best-time hint */}
              {dayBestTimes.length > 0 && !isPast && (
                <div className="flex gap-1 flex-wrap mb-1">
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
                return (
                  <div
                    key={slot.id}
                    onClick={() => onSlotClick(slot)}
                    onDragOver={(e) => onSlotDragOver(e, slot)}
                    onDrop={(e) => onSlotDrop(e, slot)}
                    className="rounded-lg p-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md text-xs"
                    style={{
                      backgroundColor: dragOverSlot === slot.id ? C.emeraldLight : sc.bg,
                      border: `1px solid ${dragOverSlot === slot.id ? C.emerald : sc.color + "40"}`,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px]">{sc.icon}</span>
                      <span className="font-bold" style={{ color: C.text }}>
                        {formatTime(new Date(slot.scheduledAt))}
                      </span>
                    </div>
                    <div className="text-[10px] truncate" style={{ color: C.textMuted }}>
                      {slot.caption || (slot.status === "open" ? "Empty slot" : "Scheduled")}
                    </div>
                    {slot.accountLabel && (
                      <div className="text-[10px] mt-0.5 font-semibold" style={{ color: C.emeraldDark }}>
                        @{slot.accountLabel}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add new slot button */}
              {!isPast && (
                <button
                  onClick={() => onNewSlot(day)}
                  className="mt-auto text-[10px] py-1 rounded-lg transition-all hover:scale-[1.02] opacity-50 hover:opacity-100"
                  style={{
                    backgroundColor: "transparent",
                    border: `1px dashed ${C.cardBorder}`,
                    color: C.emerald,
                  }}
                >
                  + Add slot
                </button>
              )}

              {daySlots.length === 0 && !isPast && (
                <div
                  className="flex-1 flex items-center justify-center text-[10px]"
                  style={{ color: C.textMuted, opacity: 0.5 }}
                >
                  Drop video here
                </div>
              )}
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
  onSlotClick: (slot: ScheduleSlot) => void;
  onDayDrop: (e: React.DragEvent, day: Date) => void;
  onNewSlot: (date: Date) => void;
}

function MonthView({ currentDate, slotsByDate, onSlotClick, onDayDrop, onNewSlot }: MonthViewProps) {
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
              className="border-r border-b last:border-r-0 min-h-[110px] p-1.5 transition-colors cursor-default"
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
              onClick={() => inMonth && !isPast && onNewSlot(day)}
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
                {daySlots.length > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: C.emeraldLight, color: C.emeraldDark }}
                  >
                    {daySlots.length}
                  </span>
                )}
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
                      <span className="font-bold">{formatTime(new Date(slot.scheduledAt))}</span>{" "}
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

function ListView({ slots, onSlotClick }: { slots: ScheduleSlot[]; onSlotClick: (s: ScheduleSlot) => void }) {
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
                  <span className="text-[10px] font-bold uppercase">{WEEKDAYS[new Date(slot.scheduledAt).getDay()]}</span>
                  <span className="text-base font-bold leading-none">{new Date(slot.scheduledAt).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: C.text }}>
                      {formatTime(new Date(slot.scheduledAt))}
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
                      @{slot.accountLabel}
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
    "Schedule my latest video for tomorrow 8pm",
    "Best times to post",
    "Bulk schedule 5 videos",
    "Every day at 6pm",
    "What's coming up?",
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
                : "Connect a Blotato account to get started."}
            </p>
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
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: C.emerald, animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: C.cardBorder }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Tell me what to schedule…"
            className="flex-1 px-3 py-2 rounded-xl text-xs border-0 outline-none"
            style={{ backgroundColor: C.cream, color: C.text }}
          />
          <button
            onClick={onSend}
            disabled={thinking || !input.trim()}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
            style={{ backgroundColor: C.emerald, color: C.white }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Detail Modal ────────────────────────────────────────────────────

interface SlotDetailModalProps {
  slot: ScheduleSlot;
  onClose: () => void;
  onDelete: () => void;
  onReschedule: (newDate: Date) => void;
}

function SlotDetailModal({ slot, onClose, onDelete, onReschedule }: SlotDetailModalProps) {
  const sc = statusConfig(slot.status);
  const scheduledDate = new Date(slot.scheduledAt);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(
    scheduledDate.toISOString().slice(0, 10)
  );
  const [newTime, setNewTime] = useState(
    `${String(scheduledDate.getHours()).padStart(2, "0")}:${String(scheduledDate.getMinutes()).padStart(2, "0")}`
  );

  const hashtags = slot.hashtags ? safeJsonParse(slot.hashtags, []) : [];
  const imageUrls = slot.imageUrls ? safeJsonParse(slot.imageUrls, []) : [];

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
              {formatDateTime(slot.scheduledAt)}
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
            <p className="text-sm font-semibold" style={{ color: C.emeraldDark }}>@{slot.accountLabel || slot.accountId}</p>
          </div>

          {/* Video preview */}
          {slot.videoUrl && (
            <div>
              <p className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: C.textMuted }}>Content</p>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.dark }}>
                {slot.thumbnailUrl && (
                  <img src={slot.thumbnailUrl} alt="thumbnail" className="w-full h-32 object-cover" />
                )}
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
                🗑 Cancel slot
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

interface NewSlotModalProps {
  date: Date | null;
  accountId: string;
  accounts: ScheduleAccount[];
  time: string;
  video: LibraryVideo | null;
  caption: string;
  hashtags: string;
  libraryVideos: LibraryVideo[];
  creating: boolean;
  onDateChange: (d: Date) => void;
  onAccountChange: (id: string) => void;
  onTimeChange: (t: string) => void;
  onVideoChange: (v: LibraryVideo | null) => void;
  onCaptionChange: (s: string) => void;
  onHashtagsChange: (s: string) => void;
  onCreate: () => void;
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
  libraryVideos,
  creating,
  onDateChange,
  onAccountChange,
  onTimeChange,
  onVideoChange,
  onCaptionChange,
  onHashtagsChange,
  onCreate,
  onClose,
}: NewSlotModalProps) {
  if (!date) return null;
  const dateStr = date.toISOString().slice(0, 10);

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
                <option key={a.id} value={a.id}>@{a.username}</option>
              ))}
            </select>
          </div>

          {/* Video picker */}
          <div>
            <label className="text-[10px] uppercase tracking-wide font-bold mb-1 block" style={{ color: C.textMuted }}>
              Video from library (optional — leave empty to create an open slot)
            </label>
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
                  onClick={() => onVideoChange(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                  style={{ backgroundColor: C.white, color: C.textMuted }}
                >✕</button>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-xl" style={{ border: `1px solid ${C.cardBorder}` }}>
                {libraryVideos.length === 0 ? (
                  <p className="text-xs italic p-3 text-center" style={{ color: C.textMuted }}>
                    Your library is empty. Create videos in other machines first.
                  </p>
                ) : (
                  libraryVideos.slice(0, 20).map((v) => (
                    <button
                      key={v.id}
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
        </div>

        <div className="p-5 border-t flex gap-2" style={{ borderColor: C.cardBorder }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: C.cream, color: C.text, border: `1.5px solid ${C.cardBorder}` }}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={creating || !accountId}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
            style={{ backgroundColor: C.emerald, color: C.white }}
          >
            {creating ? "Creating…" : video ? "📅 Schedule post" : "➕ Create open slot"}
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
