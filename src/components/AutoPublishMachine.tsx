"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import PipelineMonitor from "@/components/PipelineMonitor";

// ─── Colors (matching existing design) ─────────────────────────────────────

const C = {
  pink: "#E461AD",
  gold: "#C9A96E",
  cyan: "#16B1DE",
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
  cardBorder: "rgba(228, 97, 173, 0.25)",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface TikTokAccount {
  id: string;
  blotatoId: string;
  username: string | null;
  displayName: string | null;
  platform: string;
  avatarUrl: string | null;
  isActive: boolean;
  _count: { posts: number };
}

interface Post {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string | null;
  musicTitle: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  tiktokUrl: string | null;
  errorMessage: string | null;
  blotatoPostId: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  externalId: string | null;
  createdAt: string;
  account: {
    username: string | null;
    displayName: string | null;
    platform: string;
  };
}

// Library video from your site's existing video library
interface LibraryVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: string | null;
  scenesCount: number;
  provider: string;
  metadata?: string | null; // JSON string with carousel image URLs
  createdAt: string;
}

// ─── Status Configuration ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  PENDING: { label: "Pending", emoji: "⏳", color: C.warning },
  SCHEDULED: { label: "Scheduled", emoji: "📅", color: "#8B5CF6" },
  PUBLISHING: { label: "Publishing", emoji: "🚀", color: C.cyan },
  PUBLISHED: { label: "Published", emoji: "✅", color: C.success },
  FAILED: { label: "Failed", emoji: "❌", color: C.error },
  CANCELLED: { label: "Cancelled", emoji: "🚫", color: C.textMuted },
};

// ─── Helper Functions ──────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── AutoPublish Machine Component ─────────────────────────────────────────

interface AutoPublishMachineProps {
  onBack: () => void;
  isAdmin?: boolean;
}

export default function AutoPublishMachine({ onBack, isAdmin }: AutoPublishMachineProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"publish" | "posts" | "library" | "accounts" | "setup">("publish");

  // Publish form state
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoCaption, setAutoCaption] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Library state
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryVideo, setSelectedLibraryVideo] = useState<LibraryVideo | null>(null);
  const [libraryPublishCaption, setLibraryPublishCaption] = useState("");
  const [libraryPublishHashtags, setLibraryPublishHashtags] = useState("fyp, viral, ai");
  const [libraryPublishing, setLibraryPublishing] = useState<string | null>(null);
  const [monitoringPostId, setMonitoringPostId] = useState<string | null>(null);
  const [libraryAccountId, setLibraryAccountId] = useState("");
  // Library publish form state
  const [libSelectedVideo, setLibSelectedVideo] = useState<LibraryVideo | null>(null);
  const [libCaption, setLibCaption] = useState("");
  const [libHashtags, setLibHashtags] = useState("fyp, viral, ai");
  const [libMusicTitle, setLibMusicTitle] = useState("");
  const [libAutoCaption, setLibAutoCaption] = useState(false);
  const [libScheduledAt, setLibScheduledAt] = useState("");
  const [libPublishing, setLibPublishing] = useState(false);

  // ─── Fetch Library Videos ──────────────────────────────────────────────────
  const { authFetch } = useAuth();
  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const res = await authFetch("/api/videos");
      const data = await res.json();
      setLibraryVideos(data.videos || []);
    } catch (err) {
      console.error("Library fetch error:", err);
    } finally {
      setLibraryLoading(false);
    }
  }, [authFetch]);

  // ─── Publish from Library Form ─────────────────────────────────────────────
  const handlePublishFromLibraryForm = async () => {
    if (!libSelectedVideo) {
      alert("Please select a video from your library first");
      return;
    }
    setLibPublishing(true);
    try {
      const isImage = libSelectedVideo.provider === "carousel" || libSelectedVideo.videoUrl.match(/\.(jpg|jpeg|png|webp)$/i);
      const endpoint = isImage ? "/api/autopublish/publish-carousel" : "/api/autopublish/publish";
      const hashtags = libHashtags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      // For carousels, extract ALL image URLs from metadata
      let imageUrls = [libSelectedVideo.videoUrl];
      if (isImage && libSelectedVideo.metadata) {
        try {
          const meta = JSON.parse(libSelectedVideo.metadata);
          if (meta.imageUrls && Array.isArray(meta.imageUrls) && meta.imageUrls.length > 0) {
            imageUrls = meta.imageUrls;
          }
        } catch {
          // metadata is not valid JSON, use single image
        }
      }

      const body = isImage
        ? {
            imageUrls,
            caption: libAutoCaption ? undefined : (libCaption || libSelectedVideo.title),
            hashtags,
            musicTitle: libMusicTitle || undefined,
            aiDescription: libSelectedVideo.title,
            externalId: `library_form_${libSelectedVideo.id}`,
            accountId: libraryAccountId || undefined,
            scheduledAt: libScheduledAt || undefined,
            autoCaption: libAutoCaption,
          }
        : {
            videoUrl: libSelectedVideo.videoUrl,
            caption: libAutoCaption ? undefined : (libCaption || libSelectedVideo.title),
            hashtags,
            musicTitle: libMusicTitle || undefined,
            aiDescription: libSelectedVideo.title,
            externalId: `library_form_${libSelectedVideo.id}`,
            accountId: libraryAccountId || undefined,
            scheduledAt: libScheduledAt || undefined,
            autoCaption: libAutoCaption,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setLibCaption("");
        setLibMusicTitle("");
        setLibScheduledAt("");
        setLibAutoCaption(false);
        setMonitoringPostId(data.postId);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLibPublishing(false);
    }
  };

  // ─── Publish Library Video (quick publish from card) ──────────────────────
  const handlePublishLibraryVideo = async (video: LibraryVideo) => {
    setLibraryPublishing(video.id);
    try {
      const hashtags = libraryPublishHashtags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      // Determine if it's a video or image carousel based on provider/URL
      const isImage = video.provider === "carousel" || video.videoUrl.match(/\.(jpg|jpeg|png|webp)$/i);
      
      const endpoint = isImage
        ? "/api/autopublish/publish-carousel"
        : "/api/autopublish/publish";
      
      // For carousels, extract ALL image URLs from metadata
      let imageUrls = [video.videoUrl];
      if (isImage && video.metadata) {
        try {
          const meta = JSON.parse(video.metadata);
          if (meta.imageUrls && Array.isArray(meta.imageUrls) && meta.imageUrls.length > 0) {
            imageUrls = meta.imageUrls;
          }
        } catch {
          // metadata is not valid JSON, use single image
        }
      }
      
      const body = isImage
        ? {
            imageUrls,
            caption: libraryPublishCaption || video.title,
            hashtags,
            aiDescription: video.title,
            externalId: `library_${video.id}`,
            accountId: libraryAccountId || undefined,
            autoCaption: !libraryPublishCaption,
          }
        : {
            videoUrl: video.videoUrl,
            caption: libraryPublishCaption || video.title,
            hashtags,
            aiDescription: video.title,
            externalId: `library_${video.id}`,
            accountId: libraryAccountId || undefined,
            autoCaption: !libraryPublishCaption,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setLibraryPublishCaption("");
        // Open pipeline monitor
        setMonitoringPostId(data.postId);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLibraryPublishing(null);
    }
  };

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, accountsRes] = await Promise.all([
        fetch("/api/autopublish/posts"),
        fetch("/api/autopublish/accounts"),
      ]);
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch library when Library tab is opened
  useEffect(() => {
    if (activeTab === "library") {
      fetchLibrary();
    }
  }, [activeTab, fetchLibrary]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!videoUrl) {
      alert("Please enter a video URL");
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch("/api/autopublish/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          caption: autoCaption ? undefined : caption,
          hashtags: hashtags
            ? hashtags
                .split(",")
                .map((t) => t.trim().replace(/^#/, ""))
                .filter(Boolean)
            : [],
          musicTitle: musicTitle || undefined,
          accountId: selectedAccountId || undefined,
          scheduledAt: scheduledAt || undefined,
          autoCaption,
        }),
      });
      const data = await response.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        alert(
          data.status === "SCHEDULED"
            ? `Scheduled for ${formatDate(data.post?.scheduledAt)}`
            : "Publishing started!"
        );
        // Reset form
        setVideoUrl("");
        setCaption("");
        setHashtags("");
        setMusicTitle("");
        setScheduledAt("");
        setAutoCaption(false);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleSyncAccounts = async () => {
    try {
      const res = await fetch("/api/autopublish/accounts", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        alert(`Synced ${data.synced} account(s)`);
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handlePublishExisting = async (postId: string) => {
    try {
      await fetch("/api/autopublish/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", postId }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetry = async (postId: string) => {
    try {
      await fetch("/api/autopublish/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", postId }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (postId: string) => {
    try {
      await fetch("/api/autopublish/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", postId }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    try {
      await fetch(`/api/autopublish/posts/${postId}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────────────

  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "PUBLISHED").length,
    scheduled: posts.filter((p) => p.status === "SCHEDULED").length,
    pending: posts.filter((p) => p.status === "PENDING" || p.status === "PUBLISHING").length,
    failed: posts.filter((p) => p.status === "FAILED").length,
    totalViews: posts.reduce((s, p) => s + (p.views || 0), 0),
    totalLikes: posts.reduce((s, p) => s + (p.likes || 0), 0),
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: C.cream }}
    >
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(255, 248, 240, 0.85)",
          borderColor: C.cardBorder,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.pink }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M19 7.5c-1.5 0-3-1-3-3 0-.5.1-1 .3-1.4-2.7-.4-5.5-.1-8 1C4 6 1.5 10.5 1.5 15.5c0 4 3 7.5 7 7.5 4.5 0 7-3.5 7-7 0-1.5-.5-3-1.5-4 .8.3 1.7.5 2.5.5 1.5 0 3-.5 4-1.5-.5-2-1.5-3.5-3.5-3.5z" stroke={C.white} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
                  <circle cx="6.5" cy="11.5" r="1.5" fill={C.white} />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: C.text }}>
                  Auto-Publish Machine
                </h1>
                <p className="text-xs" style={{ color: C.textMuted }}>
                  Schedule & publish AI videos to TikTok automatically
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
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
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ─── Setup Banner (shown if no accounts) ─────────────────────── */}
        {accounts.length === 0 && (
          <div
            className="rounded-2xl p-5 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${C.pink}, ${C.gold})` }}
          >
            <div className="flex items-start gap-3 text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex-1">
                <h2 className="text-base font-bold mb-1">Setup Required - Connect Blotato</h2>
                <p className="text-sm opacity-95 mb-3">
                  To publish videos automatically to TikTok, you need to connect Blotato API.
                </p>
                <ol className="text-xs space-y-1 opacity-95 mb-3">
                  <li>1. Sign up at blotato.com ($29/mo, 7-day free trial)</li>
                  <li>2. Connect your TikTok accounts in Blotato dashboard</li>
                  <li>3. Get API Key from Settings → API</li>
                  <li>4. Add <code className="bg-white/20 px-1 rounded">BLOTATO_API_KEY</code> to Railway env vars</li>
                  <li>5. Click "Sync Accounts" below</li>
                </ol>
                <button
                  onClick={handleSyncAccounts}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-pink-600 hover:scale-105 transition-transform"
                >
                  Sync Accounts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Stats Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.total, color: C.text, bg: C.beige },
            { label: "Published", value: stats.published, color: C.success, bg: "#D1FAE5" },
            { label: "Scheduled", value: stats.scheduled, color: "#8B5CF6", bg: "#EDE9FE" },
            { label: "Pending", value: stats.pending, color: C.warning, bg: "#FEF3C7" },
            { label: "Failed", value: stats.failed, color: C.error, bg: "#FEE2E2" },
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

        {/* ─── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "publish", label: "Publish New", icon: "🚀" },
            { id: "posts", label: "All Posts", icon: "📋" },
            { id: "library", label: "Library", icon: "📚" },
            { id: "accounts", label: "Accounts", icon: "👥" },
            { id: "setup", label: "Setup", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? C.pink : C.white,
                color: activeTab === tab.id ? C.white : C.text,
                border: `1.5px solid ${activeTab === tab.id ? C.pink : C.cardBorder}`,
              }}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Publish Tab ─────────────────────────────────────────────── */}
        {activeTab === "publish" && (
          <div
            className="rounded-2xl p-6 shadow-sm"
            style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
          >
            <h2 className="text-base font-bold mb-4" style={{ color: C.text }}>
              🚀 Publish to TikTok
            </h2>

            {/* Video URL */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                Video URL *
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://your-cdn.com/video.mp4"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{
                  border: `1.5px solid ${C.cardBorder}`,
                  backgroundColor: C.cream,
                  color: C.text,
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                Paste a public video URL (MP4 recommended)
              </p>
            </div>

            {/* Account Selection */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                TikTok Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{
                  border: `1.5px solid ${C.cardBorder}`,
                  backgroundColor: C.cream,
                  color: C.text,
                }}
              >
                <option value="">Auto (first active account)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.blotatoId}>
                    @{acc.username || acc.displayName || "unknown"} ({acc._count.posts} posts)
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Caption Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCaption}
                  onChange={(e) => setAutoCaption(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-semibold" style={{ color: C.text }}>
                  ✨ Auto-generate caption with AI
                </span>
              </label>
              <p className="text-[10px] mt-1 ml-6" style={{ color: C.textMuted }}>
                Uses AI to write an engaging caption + hashtags automatically
              </p>
            </div>

            {/* Caption (if not auto) */}
            {!autoCaption && (
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write an engaging caption..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
                  style={{
                    border: `1.5px solid ${C.cardBorder}`,
                    backgroundColor: C.cream,
                    color: C.text,
                  }}
                />
              </div>
            )}

            {/* Hashtags */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                Hashtags (comma-separated)
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="fyp, viral, ai, trending"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{
                  border: `1.5px solid ${C.cardBorder}`,
                  backgroundColor: C.cream,
                  color: C.text,
                }}
              />
            </div>

            {/* Music Title */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                Music Title (optional)
              </label>
              <input
                type="text"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                placeholder="Trending Song Name"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{
                  border: `1.5px solid ${C.cardBorder}`,
                  backgroundColor: C.cream,
                  color: C.text,
                }}
              />
            </div>

            {/* Scheduled At */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                Schedule (optional - leave empty to publish now)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{
                  border: `1.5px solid ${C.cardBorder}`,
                  backgroundColor: C.cream,
                  color: C.text,
                }}
              />
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              disabled={publishing || !videoUrl}
              className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                color: C.white,
              }}
            >
              {publishing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Processing...
                </span>
              ) : scheduledAt ? (
                "📅 Schedule Post"
              ) : (
                "🚀 Publish Now"
              )}
            </button>
          </div>
        )}

        {/* ─── Posts Tab ──────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: C.text }}>
                📋 All Posts ({posts.length})
              </h2>
            </div>

            {posts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-semibold" style={{ color: C.text }}>No posts yet</p>
                <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                  Go to "Publish New" tab to create your first post
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {posts.map((post) => {
                  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.PENDING;
                  return (
                    <div
                      key={post.id}
                      className="p-3 rounded-xl border"
                      style={{ borderColor: C.cardBorder, backgroundColor: C.cream }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                          style={{ backgroundColor: `${cfg.color}20` }}
                        >
                          {cfg.emoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                            {post.account.username && (
                              <span className="text-[10px]" style={{ color: C.textMuted }}>
                                @{post.account.username}
                              </span>
                            )}
                          </div>

                          {post.caption && (
                            <p className="text-xs mb-1 line-clamp-2" style={{ color: C.text }}>
                              {post.caption}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: C.textMuted }}>
                            <a
                              href={post.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              style={{ color: C.cyan }}
                            >
                              🎬 Video
                            </a>
                            <span>{formatDate(post.createdAt)}</span>
                            {post.scheduledAt && (
                              <span style={{ color: "#8B5CF6" }}>📅 {formatDate(post.scheduledAt)}</span>
                            )}
                            {post.publishedAt && (
                              <span style={{ color: C.success }}>✅ {formatDate(post.publishedAt)}</span>
                            )}
                          </div>

                          {/* Analytics for published */}
                          {post.status === "PUBLISHED" && (
                            <div className="flex items-center gap-3 mt-1 text-[10px]">
                              <span style={{ color: C.cyan }}>👁 {formatNumber(post.views)}</span>
                              <span style={{ color: C.pink }}>❤ {formatNumber(post.likes)}</span>
                              <span style={{ color: C.textMuted }}>💬 {formatNumber(post.comments)}</span>
                              <span style={{ color: C.success }}>↗ {formatNumber(post.shares)}</span>
                              {post.tiktokUrl && (
                                <a
                                  href={post.tiktokUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  style={{ color: C.success }}
                                >
                                  Open ↗
                                </a>
                              )}
                            </div>
                          )}

                          {post.errorMessage && (
                            <p className="text-[10px] mt-1 p-1.5 rounded" style={{ color: C.error, backgroundColor: "#FEE2E2" }}>
                              ⚠ {post.errorMessage}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          {post.status === "PENDING" && (
                            <button
                              onClick={() => handlePublishExisting(post.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${C.success}20`, color: C.success }}
                              title="Publish now"
                            >
                              🚀
                            </button>
                          )}
                          {post.status === "FAILED" && (
                            <button
                              onClick={() => handleRetry(post.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${C.cyan}20`, color: C.cyan }}
                              title="Retry"
                            >
                              🔄
                            </button>
                          )}
                          {post.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleCancel(post.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${C.warning}20`, color: C.warning }}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                            style={{ backgroundColor: `${C.error}20`, color: C.error }}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Library Tab ────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-bold" style={{ color: C.text }}>
                📚 Your Library ({libraryVideos.length})
              </h2>
              <button
                onClick={fetchLibrary}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}`, color: C.text }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* ─── Publish New from Library ────────────────────────────── */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                backgroundColor: C.cream,
                border: `1.5px solid ${C.pink}40`,
              }}
            >
              <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>
                🚀 Publish New to TikTok
              </h3>

              {/* Step 1: Select video from library */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Step 1: Select Video from Library *
                </label>
                {libraryVideos.length === 0 ? (
                  <p className="text-xs italic" style={{ color: C.textMuted }}>
                    No videos in library. Generate AI videos or carousels first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {libraryVideos.map((v) => {
                      const isSelected = libSelectedVideo?.id === v.id;
                      const isImg = v.provider === "carousel" || v.videoUrl.match(/\.(jpg|jpeg|png|webp)$/i);
                      return (
                        <button
                          key={v.id}
                          onClick={() => setLibSelectedVideo(v)}
                          className="p-2 rounded-lg text-left transition-all"
                          style={{
                            backgroundColor: isSelected ? `${C.pink}20` : C.white,
                            border: `1.5px solid ${isSelected ? C.pink : C.cardBorder}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-200">
                              {(v.thumbnailUrl || (isImg ? v.videoUrl : null)) ? (
                                <img src={v.thumbnailUrl || v.videoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-base">🎬</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-semibold truncate" style={{ color: C.text }}>
                                {v.title}
                              </div>
                              <div className="text-[8px]" style={{ color: C.textMuted }}>
                                {isImg ? "🖼 Photo" : "🎬 Video"} · {v.provider}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Account selection */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Step 2: TikTok Account
                </label>
                <select
                  value={libraryAccountId}
                  onChange={(e) => setLibraryAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                  style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                >
                  <option value="">Auto (first active account)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.blotatoId}>
                      @{acc.username || acc.displayName || "unknown"} ({acc._count.posts} posts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Auto caption toggle */}
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={libAutoCaption}
                    onChange={(e) => setLibAutoCaption(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-xs font-semibold" style={{ color: C.text }}>
                    ✨ Auto-generate caption with AI
                  </span>
                </label>
                <p className="text-[10px] mt-1 ml-6" style={{ color: C.textMuted }}>
                  Uses AI to write an engaging caption automatically based on video title
                </p>
              </div>

              {/* Step 4: Caption (if not auto) */}
              {!libAutoCaption && (
                <div className="mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                    Step 4: Caption
                  </label>
                  <textarea
                    value={libCaption}
                    onChange={(e) => setLibCaption(e.target.value)}
                    placeholder={libSelectedVideo ? `Default: ${libSelectedVideo.title}` : "Write an engaging caption..."}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none resize-none"
                    style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                  />
                </div>
              )}

              {/* Step 5: Hashtags */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Step 5: Hashtags (comma-separated)
                </label>
                <input
                  type="text"
                  value={libHashtags}
                  onChange={(e) => setLibHashtags(e.target.value)}
                  placeholder="fyp, viral, ai, trending"
                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                  style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                />
              </div>

              {/* Step 6: Music title */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Step 6: Music Title (optional)
                </label>
                <input
                  type="text"
                  value={libMusicTitle}
                  onChange={(e) => setLibMusicTitle(e.target.value)}
                  placeholder="Trending Song Name"
                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                  style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                />
              </div>

              {/* Step 7: Schedule */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                  Step 7: Schedule (optional - leave empty to publish now)
                </label>
                <input
                  type="datetime-local"
                  value={libScheduledAt}
                  onChange={(e) => setLibScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                  style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                />
              </div>

              {/* Publish button */}
              <button
                onClick={handlePublishFromLibraryForm}
                disabled={libPublishing || !libSelectedVideo}
                className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                  color: C.white,
                }}
              >
                {libPublishing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Processing...
                  </span>
                ) : libScheduledAt ? (
                  "📅 Schedule Post"
                ) : (
                  "🚀 Publish Now"
                )}
              </button>
            </div>

            {/* ─── Quick Publish Section ───────────────────────────────── */}
            <div className="mb-2">
              <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>
                ⚡ Quick Publish (one click per video)
              </h3>
            </div>

            {libraryLoading ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
                  style={{ borderColor: `${C.pink}30`, borderTopColor: C.pink }} />
                <p className="text-sm" style={{ color: C.textMuted }}>Loading library...</p>
              </div>
            ) : libraryVideos.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-semibold" style={{ color: C.text }}>No videos in library yet</p>
                <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                  Generate AI videos or carousels first - they will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Account selector for library publishing */}
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                    TikTok Account (optional - default: first active)
                  </label>
                  <select
                    value={libraryAccountId}
                    onChange={(e) => setLibraryAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                  >
                    <option value="">Auto (first active account)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.blotatoId}>
                        @{acc.username || acc.displayName || "unknown"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Videos list */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {libraryVideos.map((video) => {
                    const isImage = video.provider === "carousel" || video.videoUrl.match(/\.(jpg|jpeg|png|webp)$/i);
                    const isPublishing = libraryPublishing === video.id;
                    return (
                      <div
                        key={video.id}
                        className="p-3 rounded-xl border"
                        style={{ borderColor: C.cardBorder, backgroundColor: C.cream }}
                      >
                        <div className="flex items-start gap-3 flex-wrap">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : isImage ? (
                              <img
                                src={video.videoUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🎬
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: C.text }}>
                                {video.title}
                              </span>
                              <span
                                className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: isImage ? `${C.pink}20` : `${C.cyan}20`,
                                  color: isImage ? C.pink : C.cyan,
                                }}
                              >
                                {isImage ? "🖼 Photo" : "🎬 Video"}
                              </span>
                              {isImage && (() => {
                                let imgCount = 1;
                                try {
                                  const meta = JSON.parse(video.metadata || "{}");
                                  if (meta.imageUrls) imgCount = meta.imageUrls.length;
                                } catch {}
                                return imgCount > 1 ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.gold}20`, color: C.gold }}>
                                    {imgCount} images
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <div className="text-[10px] flex items-center gap-3" style={{ color: C.textMuted }}>
                              <span>{video.provider}</span>
                              {video.scenesCount > 1 && <span>{video.scenesCount} scenes</span>}
                              <span>{new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>

                            {/* Edit caption for publish */}
                            <div className="mt-2">
                              <input
                                type="text"
                                value={libraryPublishCaption}
                                onChange={(e) => setLibraryPublishCaption(e.target.value)}
                                placeholder={`Custom caption (default: ${video.title})`}
                                className="w-full px-2 py-1 rounded text-[10px] focus:outline-none"
                                style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                              />
                            </div>
                          </div>

                          {/* Publish button */}
                          <button
                            onClick={() => handlePublishLibraryVideo(video)}
                            disabled={isPublishing}
                            className="px-3 py-2 rounded-lg text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                            style={{
                              background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                              color: C.white,
                            }}
                          >
                            {isPublishing ? (
                              <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Publishing...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                🚀 Publish to TikTok
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hashtags input (applies to all library publishes) */}
                <div
                  className="p-3 rounded-xl mt-3"
                  style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: C.textMuted }}>
                    Hashtags (applies to all library publishes, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={libraryPublishHashtags}
                    onChange={(e) => setLibraryPublishHashtags(e.target.value)}
                    placeholder="fyp, viral, ai, trending"
                    className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
                    style={{ border: `1px solid ${C.cardBorder}`, backgroundColor: C.white, color: C.text }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Accounts Tab ───────────────────────────────────────────── */}
        {activeTab === "accounts" && (
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: C.text }}>
                👥 Connected Accounts ({accounts.length})
              </h2>
              <button
                onClick={handleSyncAccounts}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ backgroundColor: C.pink, color: C.white }}
              >
                Sync
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">🔗</div>
                <p className="text-sm font-semibold" style={{ color: C.text }}>No accounts connected</p>
                <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                  Click "Sync" to fetch your Blotato accounts
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: C.cream, border: `1px solid ${C.cardBorder}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: C.pink }}
                      >
                        {(acc.displayName || acc.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: C.text }}>
                          {acc.displayName || acc.username || "Unknown"}
                        </div>
                        <div className="text-[10px]" style={{ color: C.textMuted }}>
                          @{acc.username || "unknown"} · {acc._count.posts} posts
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: acc.isActive ? `${C.success}20` : `${C.textMuted}20`,
                        color: acc.isActive ? C.success : C.textMuted,
                      }}
                    >
                      {acc.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Setup Tab ──────────────────────────────────────────────── */}
        {activeTab === "setup" && (
          <div
            className="rounded-2xl p-6 shadow-sm space-y-4"
            style={{ backgroundColor: C.white, border: `1.5px solid ${C.cardBorder}` }}
          >
            <h2 className="text-base font-bold" style={{ color: C.text }}>⚙️ Setup Guide</h2>

            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>Step 1: Get Blotato API Key</h3>
              <ol className="text-xs space-y-1 ml-4 list-decimal" style={{ color: C.textMuted }}>
                <li>Sign up at <a href="https://www.blotato.com" target="_blank" rel="noopener" className="underline" style={{ color: C.pink }}>blotato.com</a> ($29/mo, 7-day free trial)</li>
                <li>Connect your TikTok accounts in Blotato dashboard</li>
                <li>Go to Settings → API → Generate API Key</li>
                <li>Copy the API key</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>Step 2: Add Environment Variables in Railway</h3>
              <p className="text-xs mb-2" style={{ color: C.textMuted }}>
                Go to your Railway project → Variables → add:
              </p>
              <pre
                className="text-[10px] p-3 rounded-lg overflow-x-auto font-mono"
                style={{ backgroundColor: C.dark, color: C.lime }}
              >
{`BLOTATO_API_KEY=your_api_key_here
WEBHOOK_SECRET=random_secret_string`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>Step 3: Sync Accounts</h3>
              <p className="text-xs" style={{ color: C.textMuted }}>
                After adding the API key, go to "Accounts" tab and click "Sync" to fetch your TikTok accounts from Blotato.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>Step 4: Start Publishing!</h3>
              <p className="text-xs" style={{ color: C.textMuted }}>
                Go to "Publish New" tab, paste a video URL, and publish or schedule your post.
              </p>
            </div>

            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: C.softPink }}
            >
              <p className="text-xs font-semibold" style={{ color: C.pink }}>
                💡 Tip: You can also publish programmatically from your other tools using the webhook endpoint:
              </p>
              <code className="text-[10px] mt-1 block font-mono" style={{ color: C.text }}>
                POST /api/autopublish/publish
              </code>
            </div>
          </div>
        )}
      </main>
      {/* Pipeline Monitor Modal */}
      {monitoringPostId && (
        <PipelineMonitor
          postId={monitoringPostId}
          onClose={() => setMonitoringPostId(null)}
        />
      )}
    </div>
  );
}
