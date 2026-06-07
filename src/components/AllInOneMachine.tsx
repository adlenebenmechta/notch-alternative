"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AllInOneMachineProps {
  onBack: () => void;
  onNavigate: (dest: string) => void;
}

interface ToolResult {
  url?: string;
  content?: string;
  loading: boolean;
  error: string | null;
}

// ─── Color Palette ─────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0A0A0A",
  card: "#111111",
  cardBorder: "rgba(255,255,255,0.06)",
  inputBg: "#1a1a1a",
  inputBorder: "rgba(255,255,255,0.08)",
  purple: "#8B5CF6",
  purpleDark: "#7C3AED",
  pink: "#E461AD",
  cyan: "#16B1DE",
  lime: "#9AFF01",
  orange: "#F97316",
  emerald: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  textPrimary: "#E4E4E7",
  textMuted: "#A1A1AA",
  textDim: "#71717A",
};

// ─── Dropdown Selector ─────────────────────────────────────────────────────

function Dropdown({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value)?.label || label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:border-white/20 ${compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2"}`}
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: COLORS.textPrimary,
        }}
      >
        <span style={{ color: COLORS.textDim }} className="text-xs">{label}:</span>
        <span>{selected}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-52 rounded-lg overflow-hidden z-50"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm transition-colors duration-150"
              style={{
                color: value === opt.value ? COLORS.purple : COLORS.textMuted,
                backgroundColor: value === opt.value ? "rgba(139,92,246,0.12)" : "transparent",
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

// ─── Tool Card Wrapper ─────────────────────────────────────────────────────

function ToolCard({
  title,
  icon,
  accentColor,
  children,
  defaultExpanded = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors duration-200 hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span style={{ color: accentColor }}>{icon}</span>
          <h3 className="text-base font-semibold" style={{ color: COLORS.textPrimary }}>{title}</h3>
          {badge && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.textDim}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Coming Soon Card ──────────────────────────────────────────────────────

function ComingSoonCard({
  title,
  icon,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <div className="px-5 py-6 flex flex-col items-center justify-center text-center relative">
        {/* Frosted glass overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "rgba(10,10,10,0.5)",
            backdropFilter: "blur(4px)",
          }}
        />
        <div className="relative z-10">
          <span style={{ color: accentColor }} className="mb-2 block">{icon}</span>
          <h4 className="text-sm font-semibold mb-2" style={{ color: COLORS.textPrimary }}>{title}</h4>
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: COLORS.textMuted, border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Result Display Components ─────────────────────────────────────────────

function VideoResult({ url }: { url: string }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
      <video src={url} controls className="w-full rounded-xl" style={{ maxHeight: "400px" }} />
    </div>
  );
}

function ImageResult({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "ai-image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.cardBorder}` }}>
      <img src={url} alt="AI Generated" className="w-full rounded-xl" style={{ maxHeight: "400px", objectFit: "contain" }} />
      <div className="flex justify-end p-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", color: COLORS.textMuted, border: `1px solid ${COLORS.inputBorder}` }}
        >
          {copied ? "Copied!" : "Download"}
        </button>
      </div>
    </div>
  );
}

function ScriptResult({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.cardBorder}` }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
        <span className="text-xs font-medium" style={{ color: COLORS.textDim }}>Generated Script</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
          style={{ backgroundColor: "rgba(139,92,246,0.12)", color: COLORS.purple }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm whitespace-pre-wrap" style={{ color: COLORS.textPrimary, maxHeight: "300px", overflowY: "auto" }}>
        {content}
      </pre>
    </div>
  );
}

function AudioResult({ url }: { url: string }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden p-3" style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.cardBorder}` }}>
      <audio src={url} controls className="w-full" style={{ height: "40px" }} />
    </div>
  );
}

// ─── Error Display ─────────────────────────────────────────────────────────

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div
      className="mt-3 rounded-lg px-4 py-2.5 text-xs font-medium"
      style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}
    >
      {error}
    </div>
  );
}

// ─── Generate Button ───────────────────────────────────────────────────────

function GenerateButton({
  onClick,
  loading,
  disabled,
  label,
  gradient = true,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
  gradient?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
      style={{
        background: loading ? "#52525B" : gradient ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.purpleDark})` : COLORS.purple,
        boxShadow: !loading && gradient ? `0 4px 20px ${COLORS.purple}40` : "none",
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Generating...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ─── Input / Textarea Helpers ──────────────────────────────────────────────

function TextInput({
  value,
  onChange,
  placeholder,
  label,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: COLORS.textMuted }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all"
        style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, color: "#fff" }}
      />
    </div>
  );
}

function PromptArea({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: COLORS.textMuted }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl px-4 py-2.5 text-sm placeholder-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all"
        style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.inputBorder}`, color: "#fff" }}
      />
    </div>
  );
}

// ─── Toggle Button ─────────────────────────────────────────────────────────

function ToggleButton({
  active,
  onClick,
  label,
  iconActive,
  iconInactive,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  iconActive: React.ReactNode;
  iconInactive: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
      style={{
        backgroundColor: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.1)"}`,
        color: active ? COLORS.purple : COLORS.textPrimary,
      }}
    >
      {active ? iconActive : iconInactive}
      {label}
    </button>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const Icons = {
  video: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="3" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" opacity="0.4" />
      <path d="M7 22h10" />
      <path d="M12 18v4" />
    </svg>
  ),
  image: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
    </svg>
  ),
  script: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
      <path d="M8 9h2" />
    </svg>
  ),
  voice: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <path d="M8 22h8" />
    </svg>
  ),
  ad: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  captions: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h4" />
      <path d="M14 8h4" />
      <path d="M6 12h12" />
      <path d="M6 16h8" />
    </svg>
  ),
  download: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  captionRemove: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h4" />
      <path d="M14 8h4" />
      <path d="M6 12h12" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  watermark: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
      <path d="M9 9h.01" />
    </svg>
  ),
  voiceChange: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <path d="M8 23h8" />
    </svg>
  ),
  upscale: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  back: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  soundOn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  ),
  soundOff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

// ─── Main Component ────────────────────────────────────────────────────────

export default function AllInOneMachine({ onBack }: AllInOneMachineProps) {
  const { user } = useAuth();

  // ─── Video Generator State ───────────────────────────────────────────
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState("kling3.0");
  const [videoDuration, setVideoDuration] = useState("5");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoImageUrl, setVideoImageUrl] = useState("");
  const [videoMuteAudio, setVideoMuteAudio] = useState(false);
  const [videoSeed, setVideoSeed] = useState("");
  const [videoResult, setVideoResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Image Generator State ───────────────────────────────────────────
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("nano-banana-pro");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageRefUrl, setImageRefUrl] = useState("");
  const [imageNegativePrompt, setImageNegativePrompt] = useState("");
  const [imageCount, setImageCount] = useState("1");
  const [imageResult, setImageResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Scriptwriter State ──────────────────────────────────────────────
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [scriptFormat, setScriptFormat] = useState("short");
  const [scriptStyle, setScriptStyle] = useState("casual");
  const [scriptContext, setScriptContext] = useState("");
  const [scriptResult, setScriptResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Voiceover State ─────────────────────────────────────────────────
  const [voiceText, setVoiceText] = useState("");
  const [voiceId, setVoiceId] = useState("Alice");
  const [voiceSpeed, setVoiceSpeed] = useState("1x");
  const [voiceResult, setVoiceResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Ad Generator State ──────────────────────────────────────────────
  const [adProductUrl, setAdProductUrl] = useState("");
  const [adPlatform, setAdPlatform] = useState("meta");
  const [adStyle, setAdStyle] = useState("ugc");
  const [adTone, setAdTone] = useState("energetic");
  const [adResult, setAdResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Auto Captions State ─────────────────────────────────────────────
  const [captionVideoUrl, setCaptionVideoUrl] = useState("");
  const [captionStyle, setCaptionStyle] = useState("karaoke");
  const [captionFont, setCaptionFont] = useState("bold");
  const [captionColor, setCaptionColor] = useState("white");
  const [captionAnimation, setCaptionAnimation] = useState("pop");
  const [captionResult, setCaptionResult] = useState<ToolResult>({ loading: false, error: null });

  // ─── Video Downloader State ──────────────────────────────────────────
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadResult, setDownloadResult] = useState<ToolResult>({ loading: false, error: null });

  const userName = user?.name || "there";
  const firstName = userName.split(" ")[0] || "there";

  // ─── Video Generate Handler ──────────────────────────────────────────
  const handleVideoGenerate = async () => {
    if (!videoPrompt.trim()) return;
    setVideoResult({ loading: true, error: null });
    try {
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
          seed: videoSeed ? parseInt(videoSeed) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setVideoResult({ loading: false, error: data.error || "Video generation failed" });
        return;
      }
      setVideoResult({ loading: false, error: null, url: data.videoUrl });
    } catch (err) {
      setVideoResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate video" });
    }
  };

  // ─── Image Generate Handler ──────────────────────────────────────────
  const handleImageGenerate = async () => {
    if (!imagePrompt.trim()) return;
    setImageResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          model: imageModel,
          aspectRatio: imageAspectRatio,
          referenceImageUrl: imageRefUrl || undefined,
          negativePrompt: imageNegativePrompt || undefined,
          numImages: parseInt(imageCount),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setImageResult({ loading: false, error: data.error || "Image generation failed" });
        return;
      }
      setImageResult({ loading: false, error: null, url: data.imageUrl });
    } catch (err) {
      setImageResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate image" });
    }
  };

  // ─── Script Generate Handler ─────────────────────────────────────────
  const handleScriptGenerate = async () => {
    if (!scriptPrompt.trim()) return;
    setScriptResult({ loading: true, error: null });
    try {
      const formatMap: Record<string, string> = {
        short: "Short-form video (TikTok/Reels/Shorts)",
        long: "Long-form video (YouTube)",
        podcast: "Podcast episode",
        ad: "Ad Script",
      };
      const styleMap: Record<string, string> = {
        casual: "Casual & conversational",
        professional: "Professional & authoritative",
        educational: "Educational & informative",
        dramatic: "Dramatic & cinematic",
        humorous: "Humorous & witty",
      };
      const res = await fetch("/api/allinone/script-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scriptPrompt.trim(),
          videoFormat: formatMap[scriptFormat] || scriptFormat,
          channelStyle: styleMap[scriptStyle] || scriptStyle,
          context: scriptContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setScriptResult({ loading: false, error: data.error || "Script generation failed" });
        return;
      }
      setScriptResult({ loading: false, error: null, content: data.script });
    } catch (err) {
      setScriptResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate script" });
    }
  };

  // ─── Voiceover Generate Handler ──────────────────────────────────────
  const handleVoiceoverGenerate = async () => {
    if (!voiceText.trim()) return;
    setVoiceResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceText.trim(),
          voiceId,
          speed: voiceSpeed,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setVoiceResult({ loading: false, error: data.error || "Voiceover generation failed" });
        return;
      }
      setVoiceResult({ loading: false, error: null, url: data.audioUrl });
    } catch (err) {
      setVoiceResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate voiceover" });
    }
  };

  // ─── Ad Generate Handler ─────────────────────────────────────────────
  const handleAdGenerate = async () => {
    if (!adProductUrl.trim()) return;
    setAdResult({ loading: true, error: null });
    try {
      const platformMap: Record<string, string> = {
        meta: "Meta (Facebook/Instagram)",
        tiktok: "TikTok",
        youtube: "YouTube",
        google: "Google Ads",
      };
      const styleMap: Record<string, string> = {
        ugc: "UGC Testimonial",
        demo: "Product Demo",
        problem: "Problem-Solution",
        beforeafter: "Before-After",
      };
      const toneMap: Record<string, string> = {
        energetic: "Energetic",
        professional: "Professional",
        casual: "Casual",
        luxury: "Luxury",
      };
      const adPrompt = `Create an ad script for the following product/page: ${adProductUrl.trim()}\n\nPlatform: ${platformMap[adPlatform]}\nAd Style: ${styleMap[adStyle]}\nTone: ${toneMap[adTone]}\n\nWrite a compelling, high-converting ad script with hook, body, and CTA.`;
      const res = await fetch("/api/allinone/script-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: adPrompt,
          videoFormat: "Ad Script",
          channelStyle: toneMap[adTone],
          context: `Platform: ${platformMap[adPlatform]}, Style: ${styleMap[adStyle]}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAdResult({ loading: false, error: data.error || "Ad generation failed" });
        return;
      }
      setAdResult({ loading: false, error: null, content: data.script });
    } catch (err) {
      setAdResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate ad" });
    }
  };

  // ─── Auto Captions Handler ───────────────────────────────────────────
  const handleCaptionGenerate = async () => {
    if (!captionVideoUrl.trim()) return;
    setCaptionResult({ loading: true, error: null });
    try {
      const fontWeightMap: Record<string, string> = {
        bold: "bold",
        regular: "normal",
        handwriting: "normal",
      };
      const fontMap: Record<string, string> = {
        bold: "Montserrat",
        regular: "Cairo",
        handwriting: "Dancing Script",
      };
      const colorMap: Record<string, string> = {
        white: "white",
        yellow: "yellow",
        custom: "white",
      };
      const animationMap: Record<string, string> = {
        pop: "pop",
        fade: "fade",
        slide: "slide",
      };
      const res = await fetch("/api/auto-subtitle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: captionVideoUrl.trim(),
          style: captionStyle,
          font_name: fontMap[captionFont] || "Cairo",
          font_weight: fontWeightMap[captionFont] || "bold",
          font_color: colorMap[captionColor] || "white",
          highlight_color: captionStyle === "karaoke" ? "#9AFF01" : "yellow",
          enable_animation: true,
          animation_style: animationMap[captionAnimation] || "pop",
          words_per_subtitle: captionStyle === "karaoke" ? 2 : 5,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setCaptionResult({ loading: false, error: data.error || "Caption generation failed" });
        return;
      }
      setCaptionResult({ loading: false, error: null, url: data.video_url });
    } catch (err) {
      setCaptionResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate captions" });
    }
  };

  // ─── Video Download Handler ──────────────────────────────────────────
  const handleVideoDownload = async () => {
    if (!downloadUrl.trim()) return;
    setDownloadResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Download failed" }));
        setDownloadResult({ loading: false, error: data.error || "Download failed" });
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      setDownloadResult({ loading: false, error: null });
    } catch (err) {
      setDownloadResult({ loading: false, error: err instanceof Error ? err.message : "Download failed" });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      {/* ─── Top Header Bar ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{
          backgroundColor: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.cardBorder}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:shadow-lg"
            style={{
              backgroundColor: "rgba(255,255,255,0.05)",
              color: COLORS.textPrimary,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {Icons.back}
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: COLORS.textPrimary }}>
              <span style={{ color: COLORS.purple }}>All-in-One</span> Machine
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: COLORS.purple }}>{Icons.user}</span>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: COLORS.textMuted }}>{firstName}</span>
              {user.plan !== "free" && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                  style={{ backgroundColor: `${COLORS.purple}20`, color: COLORS.purple }}
                >
                  {user.plan}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Welcome Banner ──────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-2">
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          Welcome back, <span style={{ color: COLORS.purple }}>{firstName}</span>. All your AI tools in one place.
        </p>
      </div>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-12 space-y-4">

        {/* ═══ 1. AI VIDEO GENERATOR (Full Width) ═══ */}
        <ToolCard
          title="AI Video Generator"
          icon={Icons.video}
          accentColor={COLORS.purple}
          defaultExpanded={true}
          badge="10 credits"
        >
          <div className="space-y-4">
            <PromptArea
              value={videoPrompt}
              onChange={setVideoPrompt}
              placeholder="Describe your video... e.g., 'A golden retriever running on the beach at sunset, cinematic slow motion'"
              label="Describe your video"
              rows={3}
            />

            <div className="flex flex-wrap gap-2">
              <Dropdown
                label="Model"
                options={[
                  { value: "kling3.0", label: "Kling 3.0" },
                  { value: "veo3_lite", label: "Veo3 Lite" },
                  { value: "veo3_fast", label: "Veo3 Fast" },
                  { value: "seedance", label: "Seedance 2.0" },
                ]}
                value={videoModel}
                onChange={setVideoModel}
              />
              <Dropdown
                label="Duration"
                options={[
                  { value: "4", label: "4s" },
                  { value: "5", label: "5s" },
                  { value: "8", label: "8s" },
                  { value: "10", label: "10s" },
                  { value: "12", label: "12s" },
                  { value: "16", label: "16s" },
                  { value: "20", label: "20s" },
                ]}
                value={videoDuration}
                onChange={setVideoDuration}
              />
              <Dropdown
                label="Ratio"
                options={[
                  { value: "16:9", label: "16:9 Landscape" },
                  { value: "9:16", label: "9:16 Portrait" },
                  { value: "1:1", label: "1:1 Square" },
                ]}
                value={videoAspectRatio}
                onChange={setVideoAspectRatio}
              />
              <ToggleButton
                active={videoMuteAudio}
                onClick={() => setVideoMuteAudio(!videoMuteAudio)}
                label="Mute Audio"
                iconActive={Icons.soundOff}
                iconInactive={Icons.soundOn}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextInput
                value={videoImageUrl}
                onChange={setVideoImageUrl}
                placeholder="https://example.com/image.jpg"
                label="Reference Image URL (optional)"
                type="url"
              />
              <TextInput
                value={videoSeed}
                onChange={setVideoSeed}
                placeholder="Random seed for reproducibility"
                label="Seed (optional)"
                type="number"
              />
            </div>

            <GenerateButton
              onClick={handleVideoGenerate}
              loading={videoResult.loading}
              disabled={!videoPrompt.trim()}
              label="Generate Video — 10 credits"
            />

            {videoResult.error && <ErrorDisplay error={videoResult.error} />}
            {videoResult.url && <VideoResult url={videoResult.url} />}
          </div>
        </ToolCard>

        {/* ═══ 2-Column Grid: Image Gen + Scriptwriter ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 2. AI IMAGE GENERATOR */}
          <ToolCard
            title="AI Image Generator"
            icon={Icons.image}
            accentColor={COLORS.emerald}
            badge="2 credits"
          >
            <div className="space-y-4">
              <PromptArea
                value={imagePrompt}
                onChange={setImagePrompt}
                placeholder="e.g., 'A photorealistic cat wearing an astronaut helmet, sitting on the moon'"
                label="Describe your image"
                rows={2}
              />

              <div className="flex flex-wrap gap-2">
                <Dropdown
                  label="Model"
                  options={[
                    { value: "nano-banana-pro", label: "Nano Banana Pro" },
                    { value: "flux-pro", label: "FLUX Pro" },
                    { value: "sdxl", label: "Stable Diffusion XL" },
                  ]}
                  value={imageModel}
                  onChange={setImageModel}
                />
                <Dropdown
                  label="Ratio"
                  options={[
                    { value: "1:1", label: "1:1 Square" },
                    { value: "16:9", label: "16:9 Landscape" },
                    { value: "9:16", label: "9:16 Portrait" },
                    { value: "4:3", label: "4:3" },
                    { value: "3:4", label: "3:4" },
                  ]}
                  value={imageAspectRatio}
                  onChange={setImageAspectRatio}
                />
                <Dropdown
                  label="Images"
                  options={[
                    { value: "1", label: "1 Image" },
                    { value: "2", label: "2 Images" },
                    { value: "4", label: "4 Images" },
                  ]}
                  value={imageCount}
                  onChange={setImageCount}
                />
              </div>

              <TextInput
                value={imageRefUrl}
                onChange={setImageRefUrl}
                placeholder="https://example.com/reference.jpg"
                label="Reference Image URL (optional)"
                type="url"
              />
              <TextInput
                value={imageNegativePrompt}
                onChange={setImageNegativePrompt}
                placeholder="blurry, low quality, watermark, text"
                label="Negative Prompt (optional)"
              />

              <GenerateButton
                onClick={handleImageGenerate}
                loading={imageResult.loading}
                disabled={!imagePrompt.trim()}
                label="Generate Image — 2 credits"
              />

              {imageResult.error && <ErrorDisplay error={imageResult.error} />}
              {imageResult.url && <ImageResult url={imageResult.url} />}
            </div>
          </ToolCard>

          {/* 3. AI SCRIPTWRITER */}
          <ToolCard
            title="AI Scriptwriter"
            icon={Icons.script}
            accentColor={COLORS.cyan}
            badge="1 credit"
          >
            <div className="space-y-4">
              <PromptArea
                value={scriptPrompt}
                onChange={setScriptPrompt}
                placeholder="What's your video about? e.g., '5 AI tools that will replace your job in 2025'"
                label="What's your video about?"
                rows={2}
              />

              <div className="flex flex-wrap gap-2">
                <Dropdown
                  label="Format"
                  options={[
                    { value: "short", label: "Short-form (TikTok/Reels)" },
                    { value: "long", label: "Long-form (YouTube)" },
                    { value: "podcast", label: "Podcast" },
                    { value: "ad", label: "Ad Script" },
                  ]}
                  value={scriptFormat}
                  onChange={setScriptFormat}
                />
                <Dropdown
                  label="Style"
                  options={[
                    { value: "casual", label: "Casual & Conversational" },
                    { value: "professional", label: "Professional" },
                    { value: "educational", label: "Educational" },
                    { value: "dramatic", label: "Dramatic" },
                    { value: "humorous", label: "Humorous" },
                  ]}
                  value={scriptStyle}
                  onChange={setScriptStyle}
                />
              </div>

              <TextInput
                value={scriptContext}
                onChange={setScriptContext}
                placeholder="Any additional info, target audience, key points..."
                label="Additional Context (optional)"
              />

              <GenerateButton
                onClick={handleScriptGenerate}
                loading={scriptResult.loading}
                disabled={!scriptPrompt.trim()}
                label="Generate Script — 1 credit"
              />

              {scriptResult.error && <ErrorDisplay error={scriptResult.error} />}
              {scriptResult.content && <ScriptResult content={scriptResult.content} />}
            </div>
          </ToolCard>
        </div>

        {/* ═══ 2-Column Grid: Voiceover + Ad Generator ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 4. AI VOICEOVER */}
          <ToolCard
            title="AI Voiceover"
            icon={Icons.voice}
            accentColor={COLORS.orange}
            badge="3 credits"
          >
            <div className="space-y-4">
              <PromptArea
                value={voiceText}
                onChange={setVoiceText}
                placeholder="Type or paste the text you want to convert to speech..."
                label="Enter your text"
                rows={3}
              />

              <div className="flex flex-wrap gap-2">
                <Dropdown
                  label="Voice"
                  options={[
                    { value: "Alice", label: "Alice (Female)" },
                    { value: "Bob", label: "Bob (Male)" },
                    { value: "Emily", label: "Emily (Female)" },
                    { value: "Jack", label: "Jack (Male)" },
                    { value: "Sarah", label: "Sarah (Female)" },
                    { value: "Mike", label: "Mike (Male)" },
                  ]}
                  value={voiceId}
                  onChange={setVoiceId}
                />
                <Dropdown
                  label="Speed"
                  options={[
                    { value: "0.5x", label: "0.5x" },
                    { value: "0.75x", label: "0.75x" },
                    { value: "1x", label: "1x (Normal)" },
                    { value: "1.25x", label: "1.25x" },
                    { value: "1.5x", label: "1.5x" },
                    { value: "2x", label: "2x" },
                  ]}
                  value={voiceSpeed}
                  onChange={setVoiceSpeed}
                />
              </div>

              <GenerateButton
                onClick={handleVoiceoverGenerate}
                loading={voiceResult.loading}
                disabled={!voiceText.trim()}
                label="Generate Voiceover — 3 credits"
              />

              {voiceResult.error && <ErrorDisplay error={voiceResult.error} />}
              {voiceResult.url && <AudioResult url={voiceResult.url} />}
            </div>
          </ToolCard>

          {/* 5. AI AD GENERATOR */}
          <ToolCard
            title="AI Ad Generator"
            icon={Icons.ad}
            accentColor={COLORS.pink}
            badge="NEW"
          >
            <div className="space-y-4">
              <TextInput
                value={adProductUrl}
                onChange={setAdProductUrl}
                placeholder="https://your-product-page.com"
                label="Product URL"
                type="url"
              />

              <div className="flex flex-wrap gap-2">
                <Dropdown
                  label="Platform"
                  options={[
                    { value: "meta", label: "Meta (FB/IG)" },
                    { value: "tiktok", label: "TikTok" },
                    { value: "youtube", label: "YouTube" },
                    { value: "google", label: "Google" },
                  ]}
                  value={adPlatform}
                  onChange={setAdPlatform}
                />
                <Dropdown
                  label="Style"
                  options={[
                    { value: "ugc", label: "UGC Testimonial" },
                    { value: "demo", label: "Product Demo" },
                    { value: "problem", label: "Problem-Solution" },
                    { value: "beforeafter", label: "Before-After" },
                  ]}
                  value={adStyle}
                  onChange={setAdStyle}
                />
                <Dropdown
                  label="Tone"
                  options={[
                    { value: "energetic", label: "Energetic" },
                    { value: "professional", label: "Professional" },
                    { value: "casual", label: "Casual" },
                    { value: "luxury", label: "Luxury" },
                  ]}
                  value={adTone}
                  onChange={setAdTone}
                />
              </div>

              <GenerateButton
                onClick={handleAdGenerate}
                loading={adResult.loading}
                disabled={!adProductUrl.trim()}
                label="Generate Ad Script — 1 credit"
              />

              {adResult.error && <ErrorDisplay error={adResult.error} />}
              {adResult.content && <ScriptResult content={adResult.content} />}
            </div>
          </ToolCard>
        </div>

        {/* ═══ 2-Column Grid: Auto Captions + Video Downloader ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 6. AUTO CAPTIONS */}
          <ToolCard
            title="Auto Captions"
            icon={Icons.captions}
            accentColor={COLORS.lime}
            badge="BETA"
          >
            <div className="space-y-4">
              <TextInput
                value={captionVideoUrl}
                onChange={setCaptionVideoUrl}
                placeholder="Paste video URL..."
                label="Video URL"
                type="url"
              />

              <div className="flex flex-wrap gap-2">
                <Dropdown
                  label="Style"
                  options={[
                    { value: "karaoke", label: "Karaoke (word-by-word)" },
                    { value: "classic", label: "Classic (full sentence)" },
                    { value: "minimal", label: "Minimal" },
                  ]}
                  value={captionStyle}
                  onChange={setCaptionStyle}
                />
                <Dropdown
                  label="Font"
                  options={[
                    { value: "bold", label: "Bold" },
                    { value: "regular", label: "Regular" },
                    { value: "handwriting", label: "Handwriting" },
                  ]}
                  value={captionFont}
                  onChange={setCaptionFont}
                />
                <Dropdown
                  label="Color"
                  options={[
                    { value: "white", label: "White" },
                    { value: "yellow", label: "Yellow" },
                  ]}
                  value={captionColor}
                  onChange={setCaptionColor}
                />
                <Dropdown
                  label="Animation"
                  options={[
                    { value: "pop", label: "Pop" },
                    { value: "fade", label: "Fade" },
                    { value: "slide", label: "Slide" },
                  ]}
                  value={captionAnimation}
                  onChange={setCaptionAnimation}
                />
              </div>

              <GenerateButton
                onClick={handleCaptionGenerate}
                loading={captionResult.loading}
                disabled={!captionVideoUrl.trim()}
                label="Generate Captions — 5 credits"
              />

              {captionResult.error && <ErrorDisplay error={captionResult.error} />}
              {captionResult.url && <VideoResult url={captionResult.url} />}
            </div>
          </ToolCard>

          {/* 7. VIDEO DOWNLOADER */}
          <ToolCard
            title="Video Downloader"
            icon={Icons.download}
            accentColor={COLORS.red}
            badge="FREE"
          >
            <div className="space-y-4">
              <TextInput
                value={downloadUrl}
                onChange={setDownloadUrl}
                placeholder="Paste YouTube, Instagram, TikTok, X, or Facebook URL"
                label="Video URL"
                type="url"
              />

              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(139,92,246,0.06)",
                  border: "1px solid rgba(139,92,246,0.12)",
                }}
              >
                <p className="text-xs" style={{ color: COLORS.textMuted }}>
                  Supported: YouTube, Instagram, TikTok, X (Twitter), Facebook
                </p>
              </div>

              <GenerateButton
                onClick={handleVideoDownload}
                loading={downloadResult.loading}
                disabled={!downloadUrl.trim()}
                label="Download Video — Free"
              />

              {downloadResult.error && <ErrorDisplay error={downloadResult.error} />}
              {downloadResult.loading && (
                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: COLORS.textMuted }}>
                  <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  Downloading video...
                </div>
              )}
            </div>
          </ToolCard>
        </div>

        {/* ═══ Coming Soon Section ═══ */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1" style={{ backgroundColor: COLORS.cardBorder }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.textDim }}>Coming Soon</span>
            <div className="h-px flex-1" style={{ backgroundColor: COLORS.cardBorder }} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ComingSoonCard title="Caption Remover" icon={Icons.captionRemove} accentColor={COLORS.amber} />
            <ComingSoonCard title="Watermark Remover" icon={Icons.watermark} accentColor={COLORS.textDim} />
            <ComingSoonCard title="Voice Changer" icon={Icons.voiceChange} accentColor={COLORS.pink} />
            <ComingSoonCard title="AI Upscaler" icon={Icons.upscale} accentColor={COLORS.cyan} />
          </div>
        </div>
      </div>
    </div>
  );
}
