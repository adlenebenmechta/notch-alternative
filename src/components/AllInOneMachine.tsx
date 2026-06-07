"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AllInOneMachineProps {
  onBack: () => void;
  onNavigate: (dest: string) => void;
}

type ActiveView = "home" | "tools" | "videos" | "community" | "learn" | "tool-detail";

interface ToolItem {
  id: string;
  name: string;
  description: string;
  beta?: boolean;
  comingSoon?: boolean;
  icon: React.ReactNode;
  gradient: string;
  creditCost?: number;
}

interface GenerationResult {
  id: string;
  type: "video" | "image" | "script" | "audio";
  url?: string;
  content?: string;
  title?: string;
  timestamp: number;
  prompt?: string;
}

// ─── Tools Data ──────────────────────────────────────────────────────────

const tools: ToolItem[] = [
  {
    id: "ai-video-gen",
    name: "AI Video Generator",
    description: "Generate stunning AI videos without watermarks.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <path d="M10 9l5 3-5 3V9z" fill="currentColor" opacity="0.4" />
        <path d="M7 22h10" />
        <path d="M12 18v4" />
      </svg>
    ),
    gradient: "from-purple-900/30 to-violet-950/50",
    creditCost: 10,
  },
  {
    id: "ai-image-gen",
    name: "AI Image Generator",
    description: "Create beautiful AI-generated images from text prompts.",
    beta: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
      </svg>
    ),
    gradient: "from-emerald-900/30 to-green-950/50",
    creditCost: 2,
  },
  {
    id: "scriptwriter",
    name: "Scriptwriter",
    description: "Create engaging scripts for your videos with AI-powered writing assistance.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
        <path d="M8 9h2" />
      </svg>
    ),
    gradient: "from-blue-900/30 to-cyan-950/50",
    creditCost: 1,
  },
  {
    id: "ai-voiceover",
    name: "AI Voiceover",
    description: "Generate natural-sounding voiceovers for your videos using AI.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
    gradient: "from-orange-900/30 to-amber-950/50",
    creditCost: 3,
  },
  {
    id: "video-downloader",
    name: "Video Downloader",
    description: "Download videos from YouTube, Instagram, TikTok, X, and Facebook instantly.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    gradient: "from-red-900/30 to-rose-950/50",
    creditCost: 0,
  },
  {
    id: "ai-clone",
    name: "AI Clone",
    description: "Create a digital clone of yourself that looks and sounds just like you.",
    beta: true,
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    gradient: "from-purple-900/30 to-fuchsia-950/50",
  },
  {
    id: "auto-captions",
    name: "Auto Captions",
    description: "Add beautiful, animated captions to your videos in seconds.",
    beta: true,
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h4" />
        <path d="M14 8h4" />
        <path d="M6 12h12" />
        <path d="M6 16h8" />
      </svg>
    ),
    gradient: "from-cyan-900/30 to-teal-950/50",
  },
  {
    id: "voice-changer",
    name: "Voice Changer",
    description: "Transform any audio into a different voice while keeping the emotion and timing.",
    beta: true,
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <path d="M8 23h8" />
      </svg>
    ),
    gradient: "from-pink-900/30 to-rose-950/50",
  },
  {
    id: "caption-remover",
    name: "Caption Remover",
    description: "Remove captions from videos with our AI-powered caption remover.",
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h4" />
        <path d="M14 8h4" />
        <path d="M6 12h12" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    ),
    gradient: "from-amber-900/30 to-yellow-950/50",
  },
  {
    id: "watermark-remover",
    name: "Watermark Remover",
    description: "Automatically clean watermarks from videos using our Viewmax AI.",
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <line x1="3" y1="3" x2="21" y2="21" />
        <path d="M9 9h.01" />
      </svg>
    ),
    gradient: "from-slate-800/30 to-zinc-950/50",
  },
  {
    id: "ai-ad-gen",
    name: "AI Ad Generator",
    description: "Turn products, apps, and creators into ready-to-test ad concepts.",
    beta: true,
    comingSoon: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    gradient: "from-yellow-900/30 to-orange-950/50",
  },
];

// ─── Sidebar Navigation Items ──────────────────────────────────────────────

const sidebarNavItems = [
  { id: "home" as ActiveView, label: "Home", icon: "home" },
  { id: "tools" as ActiveView, label: "Tools", icon: "grid" },
  { id: "videos" as ActiveView, label: "Videos", icon: "play" },
  { id: "community" as ActiveView, label: "Community", icon: "users" },
  { id: "learn" as ActiveView, label: "Learn", icon: "book" },
];

// ─── Dropdown Selector Component ───────────────────────────────────────────

function DropdownSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#E4E4E7",
        }}
      >
        <span className="text-zinc-500 text-xs">{label}:</span>
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-48 rounded-lg overflow-hidden z-50"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm transition-colors duration-150"
              style={{
                color: value === opt.value ? "#8B5CF6" : "#A1A1AA",
                backgroundColor: value === opt.value ? "rgba(139,92,246,0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function AllInOneMachine({ onBack, onNavigate }: AllInOneMachineProps) {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeNav, setActiveNav] = useState<ActiveView>("home");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Tool-specific states
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState("kling3.0");
  const [videoDuration, setVideoDuration] = useState("5");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoMuteAudio, setVideoMuteAudio] = useState(false);
  const [videoImageUrl, setVideoImageUrl] = useState("");

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("nano-banana-pro");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageRefUrl, setImageRefUrl] = useState("");
  const [imageNegativePrompt, setImageNegativePrompt] = useState("");

  const [scriptPrompt, setScriptPrompt] = useState("");
  const [scriptFormat, setScriptFormat] = useState("short");
  const [scriptStyle, setScriptStyle] = useState("casual");
  const [scriptContext, setScriptContext] = useState("");

  const [voiceText, setVoiceText] = useState("");
  const [voiceId, setVoiceId] = useState("Alice");

  const [downloadUrl, setDownloadUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.name || "there";
  const firstName = userName.split(" ")[0] || "there";

  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarExpanded(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToolClick = (tool: ToolItem) => {
    if (tool.comingSoon) return;
    setActiveTool(tool.id);
    setActiveNav("tool-detail");
    setError(null);
  };

  const handleBackFromTool = () => {
    setActiveTool(null);
    setActiveNav("home");
    setError(null);
  };

  const addResult = useCallback((result: GenerationResult) => {
    setResults((prev) => [result, ...prev]);
  }, []);

  // ─── Generation Handlers ─────────────────────────────────────────────

  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) return;
    setLoading(true);
    setError(null);
    const resultId = `video-${Date.now()}`;
    try {
      addResult({ id: resultId, type: "video", title: "Generating video...", timestamp: Date.now(), prompt: videoPrompt });
      const res = await fetch("/api/allinone/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt.trim(),
          model: videoModel,
          duration: parseInt(videoDuration),
          aspectRatio: videoAspectRatio,
          imageUrl: videoImageUrl || undefined,
          muteAudio: videoMuteAudio,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Video generation failed");
        setResults((prev) => prev.filter((r) => r.id !== resultId));
        return;
      }
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, url: data.videoUrl, title: "AI Video" } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
      setResults((prev) => prev.filter((r) => r.id !== resultId));
    } finally {
      setLoading(false);
    }
  };

  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) return;
    setLoading(true);
    setError(null);
    const resultId = `image-${Date.now()}`;
    try {
      addResult({ id: resultId, type: "image", title: "Generating image...", timestamp: Date.now(), prompt: imagePrompt });
      const res = await fetch("/api/allinone/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          model: imageModel,
          aspectRatio: imageAspectRatio,
          referenceImageUrl: imageRefUrl || undefined,
          negativePrompt: imageNegativePrompt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Image generation failed");
        setResults((prev) => prev.filter((r) => r.id !== resultId));
        return;
      }
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, url: data.imageUrl, title: "AI Image" } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
      setResults((prev) => prev.filter((r) => r.id !== resultId));
    } finally {
      setLoading(false);
    }
  };

  const handleScriptGenerate = async () => {
    if (!scriptPrompt.trim()) return;
    setLoading(true);
    setError(null);
    const resultId = `script-${Date.now()}`;
    try {
      addResult({ id: resultId, type: "script", title: "Generating script...", timestamp: Date.now(), prompt: scriptPrompt });
      const res = await fetch("/api/allinone/script-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scriptPrompt.trim(),
          videoFormat: scriptFormat === "short" ? "Short-form video (TikTok/Reels/Shorts)" : scriptFormat === "long" ? "Long-form video (YouTube)" : "Podcast episode",
          channelStyle: scriptStyle === "casual" ? "Casual & conversational" : scriptStyle === "professional" ? "Professional & authoritative" : "Educational & informative",
          context: scriptContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Script generation failed");
        setResults((prev) => prev.filter((r) => r.id !== resultId));
        return;
      }
      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId
            ? { ...r, content: data.script, title: data.title || "AI Script", url: undefined }
            : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate script");
      setResults((prev) => prev.filter((r) => r.id !== resultId));
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceoverGenerate = async () => {
    if (!voiceText.trim()) return;
    setLoading(true);
    setError(null);
    const resultId = `audio-${Date.now()}`;
    try {
      addResult({ id: resultId, type: "audio", title: "Generating voiceover...", timestamp: Date.now(), prompt: voiceText });
      const res = await fetch("/api/allinone/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceText.trim(),
          voiceId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Voiceover generation failed");
        setResults((prev) => prev.filter((r) => r.id !== resultId));
        return;
      }
      setResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, url: data.audioUrl, title: "AI Voiceover" } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate voiceover");
      setResults((prev) => prev.filter((r) => r.id !== resultId));
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDownload = async () => {
    if (!downloadUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/allinone/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Download failed" }));
        setError(data.error || "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  // ─── Sidebar Icon Renderer ───────────────────────────────────────────

  const renderNavIcon = (iconType: string, isActive: boolean) => {
    const color = isActive ? "#8B5CF6" : "#71717A";
    switch (iconType) {
      case "home":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case "grid":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        );
      case "play":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M10 9l5 3-5 3V9z" fill={color} opacity="0.3" />
          </svg>
        );
      case "users":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        );
      case "book":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // ─── Render Tool Interface ────────────────────────────────────────────

  const renderToolInterface = () => {
    const tool = tools.find((t) => t.id === activeTool);
    if (!tool) return null;

    switch (activeTool) {
      case "ai-video-gen":
        return (
          <div className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Describe your video</label>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Describe a new video... e.g., 'A golden retriever running on the beach at sunset, cinematic slow motion'"
                  className="w-full bg-transparent text-white placeholder-zinc-600 px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={4}
                  style={{ border: "none" }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <DropdownSelector
                label="Model"
                options={[
                  { value: "kling3.0", label: "Kling 3.0" },
                ]}
                value={videoModel}
                onChange={setVideoModel}
              />
              <DropdownSelector
                label="Duration"
                options={[
                  { value: "5", label: "5 seconds" },
                  { value: "10", label: "10 seconds" },
                ]}
                value={videoDuration}
                onChange={setVideoDuration}
              />
              <DropdownSelector
                label="Ratio"
                options={[
                  { value: "16:9", label: "16:9 Landscape" },
                  { value: "9:16", label: "9:16 Portrait" },
                  { value: "1:1", label: "1:1 Square" },
                ]}
                value={videoAspectRatio}
                onChange={setVideoAspectRatio}
              />
              <button
                onClick={() => setVideoMuteAudio(!videoMuteAudio)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  backgroundColor: videoMuteAudio ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${videoMuteAudio ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: videoMuteAudio ? "#8B5CF6" : "#E4E4E7",
                }}
              >
                {videoMuteAudio ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                )}
                Mute Audio
              </button>
            </div>

            {/* Reference Image URL */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Reference image URL (optional)</label>
              <input
                type="url"
                value={videoImageUrl}
                onChange={(e) => setVideoImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleVideoGenerate}
              disabled={loading || !videoPrompt.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                background: loading ? "#52525B" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: !loading ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate Video — ${tool.creditCost} credits`
              )}
            </button>
          </div>
        );

      case "ai-image-gen":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Describe your image</label>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="e.g., 'A photorealistic cat wearing a tiny astronaut helmet, sitting on the moon'"
                  className="w-full bg-transparent text-white placeholder-zinc-600 px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={4}
                  style={{ border: "none" }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <DropdownSelector
                label="Model"
                options={[
                  { value: "nano-banana-pro", label: "Nano Banana Pro" },
                ]}
                value={imageModel}
                onChange={setImageModel}
              />
              <DropdownSelector
                label="Ratio"
                options={[
                  { value: "1:1", label: "1:1 Square" },
                  { value: "16:9", label: "16:9 Landscape" },
                  { value: "9:16", label: "9:16 Portrait" },
                ]}
                value={imageAspectRatio}
                onChange={setImageAspectRatio}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Reference image URL (optional)</label>
              <input
                type="url"
                value={imageRefUrl}
                onChange={(e) => setImageRefUrl(e.target.value)}
                placeholder="https://example.com/reference.jpg"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Negative prompt (optional)</label>
              <input
                type="text"
                value={imageNegativePrompt}
                onChange={(e) => setImageNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, watermark, text"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>

            <button
              onClick={handleImageGenerate}
              disabled={loading || !imagePrompt.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                background: loading ? "#52525B" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: !loading ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate Image — ${tool.creditCost} credits`
              )}
            </button>
          </div>
        );

      case "scriptwriter":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">What's your video about?</label>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <textarea
                  value={scriptPrompt}
                  onChange={(e) => setScriptPrompt(e.target.value)}
                  placeholder="e.g., '5 AI tools that will replace your job in 2025'"
                  className="w-full bg-transparent text-white placeholder-zinc-600 px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={4}
                  style={{ border: "none" }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <DropdownSelector
                label="Format"
                options={[
                  { value: "short", label: "Short-form (TikTok/Reels)" },
                  { value: "long", label: "Long-form (YouTube)" },
                  { value: "podcast", label: "Podcast" },
                ]}
                value={scriptFormat}
                onChange={setScriptFormat}
              />
              <DropdownSelector
                label="Style"
                options={[
                  { value: "casual", label: "Casual & Conversational" },
                  { value: "professional", label: "Professional" },
                  { value: "educational", label: "Educational" },
                ]}
                value={scriptStyle}
                onChange={setScriptStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Additional context (optional)</label>
              <input
                type="text"
                value={scriptContext}
                onChange={(e) => setScriptContext(e.target.value)}
                placeholder="Any additional info, target audience, key points..."
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </div>

            <button
              onClick={handleScriptGenerate}
              disabled={loading || !scriptPrompt.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                background: loading ? "#52525B" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: !loading ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate Script — ${tool.creditCost} credit`
              )}
            </button>
          </div>
        );

      case "ai-voiceover":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Enter your text</label>
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <textarea
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="Type or paste the text you want to convert to speech..."
                  className="w-full bg-transparent text-white placeholder-zinc-600 px-4 py-3 text-sm resize-none focus:outline-none"
                  rows={6}
                  style={{ border: "none" }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <DropdownSelector
                label="Voice"
                options={[
                  { value: "Alice", label: "Alice (Female)" },
                  { value: "Bob", label: "Bob (Male)" },
                  { value: "Emily", label: "Emily (Female)" },
                  { value: "Jack", label: "Jack (Male)" },
                ]}
                value={voiceId}
                onChange={setVoiceId}
              />
            </div>

            <button
              onClick={handleVoiceoverGenerate}
              disabled={loading || !voiceText.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                background: loading ? "#52525B" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: !loading ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate Voiceover — ${tool.creditCost} credits`
              )}
            </button>
          </div>
        );

      case "video-downloader":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Video URL</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="Paste YouTube, Instagram, TikTok, X, or Facebook URL"
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.15)",
              }}
            >
              <p className="text-sm text-zinc-300">
                Supported platforms: YouTube, Instagram, TikTok, X (Twitter), Facebook
              </p>
            </div>

            <button
              onClick={handleVideoDownload}
              disabled={loading || !downloadUrl.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
              style={{
                background: loading ? "#52525B" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: !loading ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Downloading...
                </span>
              ) : (
                "Download Video — Free"
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Render Results ───────────────────────────────────────────────────

  const renderResults = () => {
    const toolResults = results.filter((r) => {
      if (!activeTool) return false;
      const prefix = activeTool === "ai-video-gen" ? "video" : activeTool === "ai-image-gen" ? "image" : activeTool === "scriptwriter" ? "script" : activeTool === "ai-voiceover" ? "audio" : "";
      return r.id.startsWith(prefix);
    });

    if (toolResults.length === 0) return null;

    return (
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-bold text-white">Results</h3>
        {toolResults.map((result) => (
          <div
            key={result.id}
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Result Content */}
            <div className="p-4">
              {result.type === "video" && result.url && (
                <div>
                  <video
                    src={result.url}
                    controls
                    className="w-full rounded-lg"
                    style={{ maxHeight: 400 }}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <a
                      href={result.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: "#A78BFA",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              )}
              {result.type === "image" && result.url && (
                <div>
                  <img
                    src={result.url}
                    alt={result.title || "Generated image"}
                    className="w-full rounded-lg"
                    style={{ maxHeight: 400, objectFit: "contain" }}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <a
                      href={result.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: "#A78BFA",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              )}
              {result.type === "script" && result.content && (
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">{result.title}</h4>
                  <div
                    className="rounded-lg p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    {result.content}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.content || "");
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: "#A78BFA",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              )}
              {result.type === "audio" && result.url && (
                <div>
                  <audio controls src={result.url} className="w-full" />
                  <div className="flex items-center gap-3 mt-3">
                    <a
                      href={result.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.15)",
                        color: "#A78BFA",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              )}
              {/* Generating state */}
              {!result.url && !result.content && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <span className="text-sm text-zinc-400">Generating...</span>
                </div>
              )}
            </div>
            {/* Prompt used */}
            {result.prompt && (
              <div
                className="px-4 py-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-xs text-zinc-600 truncate">Prompt: {result.prompt}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0a0a0a" }}>
      {/* ─── Mobile Overlay ────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ${
          mobileMenuOpen ? "translate-x-0" : ""
        } md:translate-x-0`}
        style={{
          width: sidebarExpanded ? 240 : 64,
          backgroundColor: "#111111",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          transform: mobileMenuOpen
            ? "translateX(0)"
            : undefined,
        }}
      >
        {/* Logo Area */}
        <div
          className="flex items-center gap-3 px-4 transition-all duration-300"
          style={{
            height: 64,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          {sidebarExpanded && (
            <span className="font-bold text-white text-sm tracking-wide whitespace-nowrap">ViewMax AI</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {sidebarNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                setActiveTool(null);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg transition-all duration-200"
              style={{
                padding: sidebarExpanded ? "10px 12px" : "10px 14px",
                justifyContent: sidebarExpanded ? "flex-start" : "center",
                backgroundColor: activeNav === item.id ? "rgba(139,92,246,0.1)" : "transparent",
                color: activeNav === item.id ? "#8B5CF6" : "#71717A",
              }}
              onMouseEnter={(e) => {
                if (activeNav !== item.id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (activeNav !== item.id) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {renderNavIcon(item.icon, activeNav === item.id)}
              {sidebarExpanded && (
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: activeNav === item.id ? "#8B5CF6" : "#A1A1AA" }}
                >
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Create Button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              setActiveNav("tool-detail");
              setActiveTool("ai-video-gen");
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-white text-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
            style={{
              padding: sidebarExpanded ? "12px 16px" : "12px",
              background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {sidebarExpanded && <span className="whitespace-nowrap">Create</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <div
          className="hidden md:flex items-center px-3 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 transition-colors duration-200"
            style={{ color: "#71717A" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#A1A1AA"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#71717A"; }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: sidebarExpanded ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.3s ease",
              }}
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
            {sidebarExpanded && <span className="text-xs font-medium text-zinc-500">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main
        className="flex-1 transition-all duration-300 min-h-screen"
        style={{
          marginLeft: isMobile ? 0 : (sidebarExpanded ? 240 : 64),
        }}
      >
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-4"
          style={{
            backgroundColor: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#A1A1AA",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Back button (desktop) or menu button */}
            {activeNav === "tool-detail" ? (
              <button
                onClick={handleBackFromTool}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: "#A1A1AA",
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tools
              </button>
            ) : (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                style={{
                  color: "#A1A1AA",
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Menu
              </button>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                color: "white",
              }}
            >
              {firstName[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* ─── Content Area ──────────────────────────────────────────────── */}
        <div className="px-4 md:px-6 py-6 md:py-8 max-w-7xl mx-auto">
          {/* ─── Tool Detail View ─────────────────────────────────────── */}
          {activeNav === "tool-detail" && activeTool && (
            <div>
              {/* Tool Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {tools.find((t) => t.id === activeTool)?.name}
                  </h1>
                  {tools.find((t) => t.id === activeTool)?.beta && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(139,92,246,0.2)",
                        color: "#A78BFA",
                      }}
                    >
                      Beta
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-sm">
                  {tools.find((t) => t.id === activeTool)?.description}
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div
                  className="mb-6 rounded-xl px-4 py-3 text-sm font-medium"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#F87171",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* Tool Interface */}
              <div
                className="rounded-2xl p-6"
                style={{
                  backgroundColor: "#141414",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {renderToolInterface()}
              </div>

              {/* Results */}
              {renderResults()}
            </div>
          )}

          {/* ─── Home / Tools Grid View ─────────────────────────────────── */}
          {(activeNav === "home" || activeNav === "tools") && (
            <>
              {/* Welcome Header */}
              <div className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Hey {firstName}!
                </h1>
                <p className="text-zinc-400 text-base">
                  What would you like to create today? Pick a tool to get started.
                </p>
              </div>

              {/* Tools Section */}
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ background: "linear-gradient(180deg, #8B5CF6, transparent)" }}
                  />
                  <h2 className="text-xl font-bold text-white">AI Tools</h2>
                  <span className="text-zinc-500 text-sm font-medium ml-2">{tools.length} tools</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      onClick={() => handleToolClick(tool)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ─── Videos View ──────────────────────────────────────────────── */}
          {activeNav === "videos" && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Your Videos</h2>
                <p className="text-zinc-400 text-sm">Videos you've generated will appear here.</p>
              </div>
              {results.filter((r) => r.type === "video" && r.url).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results
                    .filter((r) => r.type === "video" && r.url)
                    .map((result) => (
                      <div
                        key={result.id}
                        className="rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <video src={result.url} controls className="w-full" />
                      </div>
                    ))}
                </div>
              ) : (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{
                    backgroundColor: "#141414",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      backgroundColor: "rgba(139,92,246,0.1)",
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="14" rx="3" />
                      <path d="M10 9l5 3-5 3V9z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-1">No videos yet</h3>
                  <p className="text-zinc-500 text-sm">Generate your first video to see it here.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Community View ────────────────────────────────────────────── */}
          {activeNav === "community" && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                backgroundColor: "#141414",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "rgba(139,92,246,0.1)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Community</h3>
              <p className="text-zinc-500 text-sm">Join the ViewMax community to share your creations and get inspired.</p>
            </div>
          )}

          {/* ─── Learn View ────────────────────────────────────────────────── */}
          {activeNav === "learn" && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                backgroundColor: "#141414",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "rgba(139,92,246,0.1)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Learn</h3>
              <p className="text-zinc-500 text-sm">Tutorials and guides to help you master AI video creation.</p>
            </div>
          )}
        </div>
      </main>

      {/* ─── Animations ───────────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes toolPulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes floatParticle {
          0%, 100% {
            transform: translateY(0px);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-8px);
            opacity: 0.8;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Tool Card Sub-Component ───────────────────────────────────────────────

function ToolCard({ tool, onClick }: { tool: ToolItem; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleClick = () => {
    if (tool.comingSoon) {
      setShowComingSoon(true);
      setTimeout(() => setShowComingSoon(false), 3000);
    } else {
      onClick();
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        backgroundColor: isHovered ? "#222222" : "#1a1a1a",
        border: `1px solid ${isHovered ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)"}`,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isHovered ? "0 8px 32px rgba(139,92,246,0.15)" : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Video Preview Area */}
      <div
        className={`relative w-full aspect-video flex items-center justify-center overflow-hidden`}
        style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,0,0,0.8))` }}
      >
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139,92,246,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,92,246,0.1) 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Centered Icon with Pulse */}
        <div
          className="relative z-10 flex items-center justify-center rounded-2xl transition-all duration-300"
          style={{
            width: 56,
            height: 56,
            backgroundColor: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.25)",
            transform: isHovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          <div style={{ color: "#8B5CF6" }}>{tool.icon}</div>
          {isHovered && !tool.comingSoon && (
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                border: "1px solid rgba(139,92,246,0.3)",
                animation: "toolPulse 1.5s ease-out infinite",
              }}
            />
          )}
        </div>

        {/* Floating particles on hover */}
        {isHovered && !tool.comingSoon && (
          <>
            <div
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                backgroundColor: "#8B5CF6",
                top: "20%",
                left: "25%",
                opacity: 0.6,
                animation: "floatParticle 3s ease-in-out infinite",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 3,
                height: 3,
                backgroundColor: "#A78BFA",
                bottom: "25%",
                right: "30%",
                opacity: 0.5,
                animation: "floatParticle 2.5s ease-in-out infinite 0.5s",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: 5,
                height: 5,
                backgroundColor: "#7C3AED",
                top: "40%",
                right: "20%",
                opacity: 0.4,
                animation: "floatParticle 4s ease-in-out infinite 1s",
              }}
            />
          </>
        )}

        {/* Coming Soon Overlay */}
        {tool.comingSoon && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="px-4 py-2 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.3))",
                border: "1px solid rgba(139,92,246,0.4)",
              }}
            >
              <span className="text-sm font-bold text-white">Coming Soon</span>
            </div>
          </div>
        )}

        {/* Temporary coming soon notification */}
        {showComingSoon && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
            }}
          >
            This tool is coming soon!
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="font-bold text-white text-sm">{tool.name}</h3>
          {tool.beta && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(139,92,246,0.2)",
                color: "#A78BFA",
              }}
            >
              Beta
            </span>
          )}
        </div>
        <p className="text-zinc-400 text-xs leading-relaxed mb-4">{tool.description}</p>

        {/* Try Now Button */}
        <button
          className="flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 group"
          style={{ color: tool.comingSoon ? "#52525B" : "#8B5CF6" }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {tool.comingSoon ? "Coming Soon" : "Try now"}
          {!tool.comingSoon && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-1"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
