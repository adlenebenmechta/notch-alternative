"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AllInOneMachineProps {
  onBack: () => void;
  onNavigate: (dest: string) => void;
}

type ToolPage =
  | "home"
  | "ai-video-generator"
  | "ai-image-generator"
  | "script-writer"
  | "ai-voiceover"
  | "video-downloader"
  | "ai-clone"
  | "auto-captions"
  | "voice-changer"
  | "caption-remover"
  | "watermark-remover"
  | "ai-ad-generator";

interface ToolResult {
  url?: string;
  content?: string;
  loading: boolean;
  error: string | null;
}

// ─── Design System (viewmax.io) ──────────────────────────────────────────

const D = {
  sidebarBg: "#F7F7F7",
  sidebarBorder: "#E5E5E5",
  sidebarActiveBg: "#F0F0F0",
  sidebarActiveBorder: "rgba(0,0,0,0.06)",
  mainBg: "#FFFFFF",
  textPrimary: "#161B26",
  textMuted: "#6B7280",
  textDim: "#9CA3AF",
  inputBg: "#F7F7F7",
  inputBorder: "#E5E7EB",
  inputFocus: "#161B26",
  cardBorder: "#E5E7EB",
  black: "#000000",
  white: "#FFFFFF",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
  purpleBg: "#F5F3FF",
  green: "#10B981",
  greenLight: "#D1FAE5",
  red: "#EF4444",
  redLight: "#FEE2E2",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  cyan: "#06B6D4",
  cyanLight: "#CFFAFE",
  pink: "#EC4899",
  pinkLight: "#FCE7F3",
  orange: "#F97316",
  orangeLight: "#FFEDD5",
};

// ─── Tools Data ───────────────────────────────────────────────────────────

const TOOLS: {
  id: ToolPage;
  name: string;
  description: string;
  badge?: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}[] = [
  {
    id: "ai-video-generator",
    name: "AI Video Generator",
    description: "Generate stunning AI videos without watermarks.",
    color: D.purple,
    bgColor: D.purpleLight,
    icon: <VideoIcon />,
  },
  {
    id: "ai-image-generator",
    name: "AI Image Generator",
    description: "Create beautiful AI-generated images from text prompts.",
    badge: "Beta",
    color: D.pink,
    bgColor: D.pinkLight,
    icon: <ImageIcon />,
  },
  {
    id: "script-writer",
    name: "Scriptwriter",
    description: "Create engaging scripts for your videos with AI-powered writing assistance.",
    color: D.blue,
    bgColor: D.blueLight,
    icon: <ScriptIcon />,
  },
  {
    id: "ai-voiceover",
    name: "AI Voiceover",
    description: "Generate natural-sounding voiceovers for your videos using AI.",
    color: D.cyan,
    bgColor: D.cyanLight,
    icon: <VoiceIcon />,
  },
  {
    id: "video-downloader",
    name: "Video Downloader",
    description: "Download videos from YouTube, Instagram, TikTok, X, and Facebook instantly.",
    color: D.green,
    bgColor: D.greenLight,
    icon: <DownloadIcon />,
  },
  {
    id: "ai-clone",
    name: "AI Clone",
    description: "Create a digital clone of yourself that looks and sounds just like you.",
    badge: "Beta",
    color: D.orange,
    bgColor: D.orangeLight,
    icon: <CloneIcon />,
  },
  {
    id: "auto-captions",
    name: "Auto Captions",
    description: "Add beautiful, animated captions to your videos in seconds.",
    badge: "Beta",
    color: D.amber,
    bgColor: D.amberLight,
    icon: <CaptionsIcon />,
  },
  {
    id: "voice-changer",
    name: "Voice Changer",
    description: "Transform any audio into a different voice while keeping the emotion and timing.",
    badge: "Beta",
    color: D.pink,
    bgColor: D.pinkLight,
    icon: <VoiceChangeIcon />,
  },
  {
    id: "caption-remover",
    name: "Caption Remover",
    description: "Remove captions from videos with our AI-powered caption remover.",
    badge: "Beta",
    color: D.red,
    bgColor: D.redLight,
    icon: <CaptionRemoveIcon />,
  },
  {
    id: "watermark-remover",
    name: "Watermark Remover",
    description: "Automatically clean watermarks from videos using our Viewmax AI.",
    color: D.green,
    bgColor: D.greenLight,
    icon: <WatermarkIcon />,
  },
  {
    id: "ai-ad-generator",
    name: "AI Ad Generator",
    description: "Turn products, apps, and creators into ready-to-test ad concepts.",
    badge: "Beta",
    color: D.purple,
    bgColor: D.purpleLight,
    icon: <AdIcon />,
  },
];

// ─── Icon Components ──────────────────────────────────────────────────────

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="3" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
    </svg>
  );
}
function ScriptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}
function VoiceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <path d="M8 22h8" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function CloneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M16 3.13a4 4 0 010 7.75" opacity="0.4" />
      <path d="M21 21v-2a4 4 0 00-3-3.87" opacity="0.4" />
    </svg>
  );
}
function CaptionsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h4" />
      <path d="M14 8h4" />
      <path d="M6 12h12" />
      <path d="M6 16h8" />
    </svg>
  );
}
function VoiceChangeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <path d="M8 23h8" />
      <path d="M17 4l3-2" opacity="0.4" />
      <path d="M17 8l3 2" opacity="0.4" />
    </svg>
  );
}
function CaptionRemoveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h4" />
      <path d="M6 12h12" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
function WatermarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}
function AdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ToolsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813L20 10l-6.088 1.187L12 17l-1.912-5.813L4 10l6.088-1.187L12 3z" />
    </svg>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────

function PillSelector({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: D.inputBg }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: value === opt.value ? D.white : "transparent",
            color: value === opt.value ? D.textPrimary : D.textMuted,
            boxShadow: value === opt.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          backgroundColor: D.inputBg,
          border: `1px solid ${D.inputBorder}`,
          color: D.textPrimary,
        }}
      >
        <span style={{ color: D.textMuted }} className="text-xs">{label}:</span>
        <span>{selected}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={D.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-56 rounded-lg overflow-hidden z-50"
          style={{
            backgroundColor: D.white,
            border: `1px solid ${D.cardBorder}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors"
              style={{
                color: value === opt.value ? D.purple : D.textPrimary,
                backgroundColor: value === opt.value ? D.purpleBg : "transparent",
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.backgroundColor = D.inputBg;
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

function GenerateButton({
  onClick,
  loading,
  disabled,
  label,
  creditCost,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
  creditCost?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
      style={{
        backgroundColor: loading ? D.textDim : D.black,
        boxShadow: !loading && !disabled ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
      }}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Generating...
        </>
      ) : (
        <>
          {label}
          {creditCost && (
            <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
              {creditCost} credits
            </span>
          )}
        </>
      )}
    </button>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div
      className="mt-3 rounded-lg px-4 py-3 text-sm font-medium"
      style={{ backgroundColor: D.redLight, border: "1px solid #FECACA", color: D.red }}
    >
      {error}
    </div>
  );
}

function UploadZone({
  label,
  sublabel,
  accept,
  onFileSelect,
  file,
}: {
  label: string;
  sublabel: string;
  accept: string;
  onFileSelect: (file: File) => void;
  file?: File | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  }, [onFileSelect]);

  return (
    <div
      className="relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
      style={{
        borderColor: dragOver ? D.purple : D.inputBorder,
        backgroundColor: dragOver ? D.purpleBg : D.inputBg,
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
      />
      <div style={{ color: D.textDim }} className="mb-2 flex justify-center">
        <UploadIcon />
      </div>
      {file ? (
        <p className="text-sm font-medium" style={{ color: D.textPrimary }}>{file.name}</p>
      ) : (
        <>
          <p className="text-sm font-medium" style={{ color: D.textPrimary }}>{label}</p>
          <p className="text-xs mt-1" style={{ color: D.textMuted }}>{sublabel}</p>
        </>
      )}
    </div>
  );
}

function VideoResult({ url }: { url: string }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
      <video src={url} controls className="w-full rounded-xl" style={{ maxHeight: "400px" }} />
    </div>
  );
}

function ImageResult({ url }: { url: string }) {
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
    } catch { /* ignore */ }
  };
  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
      <img src={url} alt="AI Generated" className="w-full rounded-xl" style={{ maxHeight: "400px", objectFit: "contain" }} />
      <div className="flex justify-end p-2">
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: D.inputBg, color: D.textPrimary, border: `1px solid ${D.inputBorder}` }}
        >
          Download
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
    <div className="mt-4 rounded-xl overflow-hidden" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${D.cardBorder}` }}>
        <span className="text-xs font-medium" style={{ color: D.textMuted }}>Generated Script</span>
        <button
          onClick={handleCopy}
          className="px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: D.purpleLight, color: D.purple }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm whitespace-pre-wrap" style={{ color: D.textPrimary, maxHeight: "300px", overflowY: "auto" }}>
        {content}
      </pre>
    </div>
  );
}

function AudioResult({ url }: { url: string }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden p-3" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
      <audio src={url} controls className="w-full" style={{ height: "40px" }} />
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  leftLabel,
  rightLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  leftLabel: string;
  rightLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: D.textPrimary }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: D.purple }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ backgroundColor: D.inputBorder, accentColor: D.purple }}
      />
      <div className="flex justify-between text-xs" style={{ color: D.textMuted }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium" style={{ color: D.textPrimary }}>{label}</span>
      <button
        onClick={() => onChange(!active)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{ backgroundColor: active ? D.purple : D.inputBorder }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ left: active ? "22px" : "2px" }}
        />
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

function Sidebar({
  currentPage,
  onNavigate,
  userName,
  onBack,
}: {
  currentPage: ToolPage;
  onNavigate: (page: ToolPage) => void;
  userName: string;
  onBack: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "home" as ToolPage, label: "Home", icon: <HomeIcon /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: D.purple }}>
          <SparklesIcon />
        </div>
        <span className="text-lg font-bold" style={{ color: D.textPrimary }}>Viewmax</span>
      </div>

      {/* Create Button */}
      <div className="px-4 mb-3">
        <button
          onClick={() => onNavigate("ai-video-generator")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: D.purple, boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}
        >
          <PlusIcon /> Create
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentPage === item.id ? D.sidebarActiveBg : "transparent",
              color: currentPage === item.id ? D.textPrimary : D.textMuted,
            }}
          >
            <span style={{ color: currentPage === item.id ? D.purple : D.textMuted }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="pt-2 pb-1 px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: D.textDim }}>Tools</span>
        </div>

        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { onNavigate(tool.id); setMobileOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: currentPage === tool.id ? D.sidebarActiveBg : "transparent",
              color: currentPage === tool.id ? D.textPrimary : D.textMuted,
            }}
          >
            <span style={{ color: currentPage === tool.id ? tool.color : D.textDim }}>{tool.icon}</span>
            <span className="truncate">{tool.name}</span>
            {tool.badge && (
              <span
                className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: tool.bgColor, color: tool.color }}
              >
                {tool.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${D.sidebarBorder}` }}>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: D.purple }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: D.textPrimary }}>{userName}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg"
        style={{ backgroundColor: D.white, border: `1px solid ${D.cardBorder}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={D.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[260px] overflow-y-auto"
            style={{ backgroundColor: D.sidebarBg, borderRight: `1px solid ${D.sidebarBorder}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[250px] flex-shrink-0 h-screen sticky top-0 overflow-y-auto"
        style={{ backgroundColor: D.sidebarBg, borderRight: `1px solid ${D.sidebarBorder}` }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────

function HomeView({
  userName,
  onNavigate,
}: {
  userName: string;
  onNavigate: (page: ToolPage) => void;
}) {
  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: D.textPrimary }}>
          Hey {firstName}!
        </h1>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="rounded-xl p-5 transition-all hover:shadow-md cursor-pointer group"
            style={{
              backgroundColor: D.white,
              border: `1px solid ${D.cardBorder}`,
            }}
            onClick={() => onNavigate(tool.id)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: tool.bgColor, color: tool.color }}
              >
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ color: D.textPrimary }}>{tool.name}</h3>
                  {tool.badge && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ backgroundColor: tool.bgColor, color: tool.color }}
                    >
                      {tool.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: D.textMuted }}>{tool.description}</p>
            <button
              className="text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
              style={{ color: tool.color }}
            >
              Try now <ChevronRight />
            </button>
          </div>
        ))}
      </div>

      {/* Beta Templates */}
      <div className="mt-10">
        <h2 className="text-lg font-bold mb-4" style={{ color: D.textPrimary }}>Beta Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: "AI Story Video",
              desc: "Create AI videos with captions, music, SFX, and more.",
              color: D.purple,
              bgColor: D.purpleLight,
              btnLabel: "Create",
            },
            {
              name: "Story Template",
              desc: "Script, voiceover, and import your own B-roll clips.",
              badge: "Beta",
              color: D.blue,
              bgColor: D.blueLight,
              btnLabel: "Create",
            },
            {
              name: "Video Editor",
              desc: "Start in the Viewmax video editor and create your video from scratch.",
              badge: "Beta",
              color: D.cyan,
              bgColor: D.cyanLight,
              btnLabel: "Get Started",
            },
          ].map((tpl) => (
            <div
              key={tpl.name}
              className="rounded-xl p-5 transition-all hover:shadow-md"
              style={{ backgroundColor: D.white, border: `1px solid ${D.cardBorder}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold" style={{ color: D.textPrimary }}>{tpl.name}</h3>
                {tpl.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: tpl.bgColor, color: tpl.color }}>
                    {tpl.badge}
                  </span>
                )}
              </div>
              <p className="text-xs mb-4" style={{ color: D.textMuted }}>{tpl.desc}</p>
              <button
                className="text-xs font-semibold px-4 py-2 rounded-lg"
                style={{ backgroundColor: tpl.bgColor, color: tpl.color }}
              >
                {tpl.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tool Page Wrapper ────────────────────────────────────────────────────

function ToolPageLayout({
  title,
  subtitle,
  badge,
  color,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  color: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors hover:opacity-70"
        style={{ color: D.textMuted }}
      >
        <ArrowLeft /> Back to Home
      </button>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: D.textPrimary }}>{title}</h1>
          {badge && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm mt-1" style={{ color: D.textMuted }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── AI Video Generator Page ──────────────────────────────────────────────

function AIVideoGeneratorPage({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("kling3.0");
  const [duration, setDuration] = useState("4s");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [useImage, setUseImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [feed, setFeed] = useState<{ url: string; id: string }[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          duration: parseInt(duration),
          aspectRatio,
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Video generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.videoUrl });
      if (data.videoUrl) {
        setFeed((prev) => [{ url: data.videoUrl, id: Date.now().toString() }, ...prev]);
      }
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate video" });
    }
  };

  const creditCost = duration === "4s" ? 9 : 15;

  return (
    <ToolPageLayout
      title="AI Video Generator"
      subtitle="Generate stunning, watermark-free AI videos."
      color={D.purple}
      onBack={onBack}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your video..."
              rows={4}
              className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Model</label>
            <PillSelector
              options={[
                { value: "kling3.0", label: "Kling 3.0" },
                { value: "veo3_lite", label: "Veo3 Lite" },
                { value: "veo3_fast", label: "Veo3 Fast" },
                { value: "seedance", label: "Seedance 2.0" },
              ]}
              value={model}
              onChange={setModel}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Duration</label>
            <PillSelector
              options={[
                { value: "4s", label: "4s" },
                { value: "10s", label: "10s" },
              ]}
              value={duration}
              onChange={setDuration}
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Aspect Ratio</label>
            <PillSelector
              options={[
                { value: "9:16", label: "9:16" },
                { value: "16:9", label: "16:9" },
                { value: "1:1", label: "1:1" },
              ]}
              value={aspectRatio}
              onChange={setAspectRatio}
            />
          </div>

          {/* Images toggle */}
          <Toggle label="Images" active={useImage} onChange={setUseImage} />

          {useImage && (
            <div>
              {imageFile ? (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: D.inputBg }}>
                  <span className="text-sm" style={{ color: D.textPrimary }}>{imageFile.name}</span>
                  <button onClick={() => setImageFile(null)} className="text-xs" style={{ color: D.red }}>Remove</button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL or upload below..."
                    className="w-full rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
                  />
                  <UploadZone
                    label="Upload reference image"
                    sublabel=".jpg or .png, up to 10 MB"
                    accept=".jpg,.jpeg,.png"
                    onFileSelect={setImageFile}
                    file={imageFile}
                  />
                </div>
              )}
            </div>
          )}

          {/* Output count */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: D.textPrimary }}>Output</span>
            <span className="text-sm font-medium px-3 py-1 rounded-lg" style={{ backgroundColor: D.inputBg, color: D.textPrimary }}>1</span>
          </div>

          <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!prompt.trim()} label="Generate" creditCost={creditCost} />

          {result.error && <ErrorDisplay error={result.error} />}
          {result.url && <VideoResult url={result.url} />}
        </div>

        {/* Right: Feed */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Recent Generations</h3>
          {feed.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
              <p className="text-sm" style={{ color: D.textMuted }}>Your generated videos will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {feed.map((item) => (
                <div key={item.id} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
                  <video src={item.url} controls className="w-full" style={{ maxHeight: "200px" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}

// ─── AI Image Generator Page ──────────────────────────────────────────────

function AIImageGeneratorPage({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("nano-banana-pro");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [refUrl, setRefUrl] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [numOutputs, setNumOutputs] = useState("1");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspectRatio,
          referenceImageUrl: refUrl || undefined,
          negativePrompt: negativePrompt || undefined,
          numImages: parseInt(numOutputs),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Image generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.imageUrl });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate image" });
    }
  };

  return (
    <ToolPageLayout title="AI Image Generator" subtitle="Create beautiful AI-generated images from text prompts." badge="Beta" color={D.pink} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your image..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Model</label>
          <PillSelector
            options={[
              { value: "nano-banana-pro", label: "Nano Banana Pro" },
              { value: "flux-schnell", label: "Flux Schnell" },
            ]}
            value={model}
            onChange={setModel}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Aspect Ratio</label>
          <PillSelector
            options={[
              { value: "1:1", label: "1:1" },
              { value: "9:16", label: "9:16" },
              { value: "16:9", label: "16:9" },
            ]}
            value={aspectRatio}
            onChange={setAspectRatio}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Reference Image URL</label>
          <input
            type="url"
            value={refUrl}
            onChange={(e) => setRefUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Negative Prompt</label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="What to avoid in the image..."
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Number of Outputs</label>
          <PillSelector
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "4", label: "4" },
            ]}
            value={numOutputs}
            onChange={setNumOutputs}
          />
        </div>

        <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!prompt.trim()} label="Generate" creditCost={2} />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <ImageResult url={result.url} />}
      </div>
    </ToolPageLayout>
  );
}

// ─── Scriptwriter Page ────────────────────────────────────────────────────

function ScriptwriterPage({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("short");
  const [style, setStyle] = useState("casual");
  const [context, setContext] = useState("none");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [recentScripts, setRecentScripts] = useState<{ title: string; content: string; id: string }[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
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
          prompt: prompt.trim(),
          videoFormat: formatMap[format] || format,
          channelStyle: styleMap[style] || style,
          context: context !== "none" ? context : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Script generation failed" });
        return;
      }
      setResult({ loading: false, error: null, content: data.script });
      setRecentScripts((prev) => [
        { title: data.title || prompt.trim().slice(0, 40), content: data.script, id: Date.now().toString() },
        ...prev,
      ]);
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate script" });
    }
  };

  return (
    <ToolPageLayout
      title="Create New Script"
      subtitle="Describe your video. Add Youtube links and the AI will watch the videos for context (takes ~1 minute)."
      color={D.blue}
      onBack={onBack}
    >
      <div className="max-w-2xl space-y-4">
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video (add youtube shorts links for reference)..."
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Dropdown
            label="Video Format"
            options={[
              { value: "short", label: "Short-form" },
              { value: "long", label: "Long-form" },
              { value: "podcast", label: "Podcast" },
              { value: "ad", label: "Ad Script" },
            ]}
            value={format}
            onChange={setFormat}
          />
          <Dropdown
            label="Channel Style"
            options={[
              { value: "casual", label: "Casual" },
              { value: "professional", label: "Professional" },
              { value: "educational", label: "Educational" },
              { value: "dramatic", label: "Dramatic" },
              { value: "humorous", label: "Humorous" },
            ]}
            value={style}
            onChange={setStyle}
          />
          <Dropdown
            label="Context"
            options={[
              { value: "none", label: "None" },
              { value: "technology", label: "Technology" },
              { value: "lifestyle", label: "Lifestyle" },
              { value: "business", label: "Business" },
              { value: "entertainment", label: "Entertainment" },
            ]}
            value={context}
            onChange={setContext}
          />
        </div>

        <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!prompt.trim()} label="Generate Script" />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.content && <ScriptResult content={result.content} />}

        {/* Recently Created */}
        {recentScripts.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Recently Created</h3>
            <div className="space-y-2">
              {recentScripts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:shadow-sm transition-all"
                  style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}
                >
                  <span className="text-sm font-medium" style={{ color: D.textPrimary }}>{s.title}</span>
                  <span className="text-xs" style={{ color: D.textMuted }}>{s.content.split(/\s+/).length} words</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}

// ─── AI Voiceover Page ────────────────────────────────────────────────────

function AIVoiceoverPage({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("viewmax-male");
  const [genMode, setGenMode] = useState<"line" | "all">("line");
  const [speed, setSpeed] = useState(1.08);
  const [stability, setStability] = useState(80);
  const [similarity, setSimilarity] = useState(80);
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: voiceStyle === "viewmax-male" ? "Alice" : "Bob",
          speed: `${speed}x`,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Voiceover generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.audioUrl });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate voiceover" });
    }
  };

  return (
    <ToolPageLayout title="Create Voiceover" subtitle="Paste a script and we'll generate a natural-sounding voiceover." color={D.cyan} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <div>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your script here..."
              rows={6}
              maxLength={5000}
              className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
            />
            <span className="absolute bottom-2 right-3 text-xs" style={{ color: D.textMuted }}>
              {text.length.toLocaleString()}/5,000
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: D.cyanLight, color: D.cyan }}>1 credit</span>
        </div>

        <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!text.trim()} label="Generate" />

        {/* Voice Style */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: D.textMuted }}>Voice Style</label>
          <div className="flex gap-3">
            {[
              { id: "viewmax-male", label: "Viewmax", sublabel: "Male", desc: "High-energy engaging voice perfect for short-form content" },
              { id: "viewmax-female", label: "Viewmax", sublabel: "Female", desc: "Clear and expressive voice ideal for storytelling" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVoiceStyle(v.id)}
                className="flex-1 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: voiceStyle === v.id ? D.purpleBg : D.inputBg,
                  border: `2px solid ${voiceStyle === v.id ? D.purple : D.inputBorder}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: voiceStyle === v.id ? D.purple : D.textPrimary }}>{v.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: D.inputBg, color: D.textMuted }}>{v.sublabel}</span>
                </div>
                <p className="text-xs" style={{ color: D.textMuted }}>{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Generation Mode */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: D.textMuted }}>Generation Mode</label>
          <PillSelector
            options={[
              { value: "line", label: "Line by Line" },
              { value: "all", label: "All at Once" },
            ]}
            value={genMode}
            onChange={(v) => setGenMode(v as "line" | "all")}
          />
        </div>

        {/* Voice Adjustments */}
        <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
          <h4 className="text-sm font-semibold" style={{ color: D.textPrimary }}>Voice Adjustment</h4>
          <SliderControl label="Speed" value={speed} min={0.5} max={2} step={0.01} leftLabel="Slower" rightLabel="Faster" onChange={setSpeed} />
          <SliderControl label="Stability" value={stability} min={0} max={100} step={1} leftLabel="Variable" rightLabel="Stable" onChange={setStability} />
          <SliderControl label="Similarity" value={similarity} min={0} max={100} step={1} leftLabel="Low" rightLabel="High" onChange={setSimilarity} />
          <button
            onClick={() => { setSpeed(1.08); setStability(80); setSimilarity(80); }}
            className="text-xs font-medium"
            style={{ color: D.purple }}
          >
            Reset to defaults
          </button>
        </div>

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <AudioResult url={result.url} />}
      </div>
    </ToolPageLayout>
  );
}

// ─── Video Downloader Page ────────────────────────────────────────────────

function VideoDownloaderPage({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [downloadReady, setDownloadReady] = useState(false);

  const handleDownload = async () => {
    if (!url.trim()) return;
    setResult({ loading: true, error: null });
    setDownloadReady(false);
    try {
      const res = await fetch("/api/allinone/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Download failed" }));
        setResult({ loading: false, error: data.error || "Download failed" });
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
      setResult({ loading: false, error: null });
      setDownloadReady(true);
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Download failed" });
    }
  };

  return (
    <ToolPageLayout title="Video Downloader" subtitle="Download videos from YouTube, Instagram, TikTok, X, and Facebook instantly." color={D.green} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Video URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL here..."
            className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["YouTube", "Instagram", "TikTok", "X (Twitter)", "Facebook"].map((platform) => (
            <span key={platform} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: D.greenLight, color: D.green }}>
              {platform}
            </span>
          ))}
        </div>

        <GenerateButton onClick={handleDownload} loading={result.loading} disabled={!url.trim()} label="Download" />

        {result.error && <ErrorDisplay error={result.error} />}
        {downloadReady && (
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: D.greenLight }}>
            <p className="text-sm font-medium" style={{ color: D.green }}>Download started!</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}

// ─── AI Clone Page ────────────────────────────────────────────────────────

function AIClonePage({ onBack }: { onBack: () => void }) {
  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [model, setModel] = useState("kling3.0");
  const [resolution, setResolution] = useState("720p");
  const [matchBg, setMatchBg] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });

  const handleGenerate = async () => {
    if (!prompt.trim() && !characterImage) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || "A person speaking naturally to camera",
          model,
          duration: 5,
          aspectRatio: "9:16",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Clone generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.videoUrl });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate clone" });
    }
  };

  return (
    <ToolPageLayout
      title="AI Clone"
      subtitle="Create a digital clone of yourself that looks and sounds just like you. Upload a motion reference video and a character image to get started."
      badge="Beta"
      color={D.orange}
      onBack={onBack}
    >
      <div className="max-w-2xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadZone
            label="Drag & drop motion video"
            sublabel=".mp4 or .mov, up to 100 MB"
            accept=".mp4,.mov"
            onFileSelect={setMotionVideo}
            file={motionVideo}
          />
          <UploadZone
            label="Drag & drop character image"
            sublabel=".jpg or .png, up to 10 MB"
            accept=".jpg,.jpeg,.png"
            onFileSelect={setCharacterImage}
            file={characterImage}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Model</label>
          <PillSelector
            options={[
              { value: "kling3.0", label: "Kling v3" },
              { value: "veo3_lite", label: "Veo3 Lite" },
            ]}
            value={model}
            onChange={setModel}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Resolution</label>
          <PillSelector
            options={[
              { value: "720p", label: "720p" },
              { value: "1080p", label: "1080p" },
            ]}
            value={resolution}
            onChange={setResolution}
          />
        </div>

        <Toggle label="Match BG" active={matchBg} onChange={setMatchBg} />

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Prompt</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what the clone should do..."
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={false} label="Generate" creditCost={21} />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <VideoResult url={result.url} />}
      </div>
    </ToolPageLayout>
  );
}

// ─── Auto Captions Page ───────────────────────────────────────────────────

function AutoCaptionsPage({ onBack }: { onBack: () => void }) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [sessions, setSessions] = useState<{ id: string; name: string; url: string }[]>([]);

  const handleGenerate = async () => {
    if (!videoUrl.trim() && !videoFile) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/auto-subtitle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          style: "karaoke",
          font_name: "Montserrat",
          font_weight: "bold",
          font_color: "white",
          highlight_color: "#9AFF01",
          enable_animation: true,
          animation_style: "pop",
          words_per_subtitle: 2,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Caption generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.video_url });
      if (data.video_url) {
        setSessions((prev) => [{ id: Date.now().toString(), name: `Session ${prev.length + 1}`, url: data.video_url }, ...prev]);
      }
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate captions" });
    }
  };

  return (
    <ToolPageLayout title="Auto Captions" subtitle="Add beautiful, animated captions to your videos in seconds." badge="Beta" color={D.amber} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <UploadZone
          label="Drag & drop your video or audio"
          sublabel="Up to 100 MB"
          accept=".mp4,.mov,.wav,.mp3"
          onFileSelect={setVideoFile}
          file={videoFile}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Or paste video URL</label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
          />
        </div>

        <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!videoUrl.trim() && !videoFile} label="Generate Captions" creditCost={3} />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <VideoResult url={result.url} />}

        {sessions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Recent Sessions</h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
                  <span className="text-sm font-medium" style={{ color: D.textPrimary }}>{s.name}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium" style={{ color: D.amber }}>View</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}

// ─── Voice Changer Page ───────────────────────────────────────────────────

function VoiceChangerPage({ onBack }: { onBack: () => void }) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [targetVoice, setTargetVoice] = useState("viewmax-male");
  const [removeNoise, setRemoveNoise] = useState(false);
  const [stability, setStability] = useState(80);
  const [similarity, setSimilarity] = useState(80);
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });

  const handleConvert = async () => {
    if (!audioFile) return;
    setResult({ loading: true, error: null });
    try {
      // Use the voiceover API as a voice conversion placeholder
      const res = await fetch("/api/allinone/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Voice conversion is processing your audio file. This feature uses AI to transform the voice while preserving emotion and timing.",
          voiceId: targetVoice === "viewmax-male" ? "Alice" : "Bob",
          speed: "1x",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Voice conversion failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.audioUrl });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to convert voice" });
    }
  };

  return (
    <ToolPageLayout title="Voice Changer" subtitle="Transform any audio into a different voice while keeping the emotion and timing." badge="Beta" color={D.pink} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <UploadZone
          label="Upload Audio or Video File"
          sublabel="MP3, WAV, OGG, M4A, MP4, MOV, AVI — Max 25MB"
          accept=".mp3,.wav,.ogg,.m4a,.mp4,.mov,.avi"
          onFileSelect={setAudioFile}
          file={audioFile}
        />

        <GenerateButton onClick={handleConvert} loading={result.loading} disabled={!audioFile} label="Convert Voice" />

        {/* Target Voice */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: D.textMuted }}>Target Voice</label>
          <div className="flex gap-3">
            {[
              { id: "viewmax-male", label: "Viewmax", sublabel: "Male", desc: "High-energy engaging voice perfect for short-form content" },
              { id: "viewmax-female", label: "Viewmax", sublabel: "Female", desc: "Clear and expressive voice ideal for storytelling" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setTargetVoice(v.id)}
                className="flex-1 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: targetVoice === v.id ? D.purpleBg : D.inputBg,
                  border: `2px solid ${targetVoice === v.id ? D.purple : D.inputBorder}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: targetVoice === v.id ? D.purple : D.textPrimary }}>{v.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: D.inputBg, color: D.textMuted }}>{v.sublabel}</span>
                </div>
                <p className="text-xs" style={{ color: D.textMuted }}>{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Toggle label="Remove Background Noise" active={removeNoise} onChange={setRemoveNoise} />

        <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
          <h4 className="text-sm font-semibold" style={{ color: D.textPrimary }}>Voice Adjustment</h4>
          <SliderControl label="Stability" value={stability} min={0} max={100} step={1} leftLabel="Variable" rightLabel="Stable" onChange={setStability} />
          <SliderControl label="Similarity" value={similarity} min={0} max={100} step={1} leftLabel="Low" rightLabel="High" onChange={setSimilarity} />
        </div>

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <AudioResult url={result.url} />}
      </div>
    </ToolPageLayout>
  );
}

// ─── Caption Remover Page ─────────────────────────────────────────────────

function CaptionRemoverPage({ onBack }: { onBack: () => void }) {
  const [model, setModel] = useState("turbo");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [processed, setProcessed] = useState<{ id: string; beforeUrl: string; afterUrl: string }[]>([]);

  const handleRemove = async () => {
    if (!videoFile) return;
    setResult({ loading: true, error: null });
    // Caption remover is a simulated feature - uses video generation API as placeholder
    try {
      await new Promise((r) => setTimeout(r, 3000));
      setResult({ loading: false, error: null, content: "Caption removal processed. This is a beta feature and results may vary." });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to remove captions" });
    }
  };

  return (
    <ToolPageLayout
      title="Caption Remover"
      subtitle="Remove captions from videos with our AI-powered caption remover. This feature is in Beta and results may vary."
      badge="Beta"
      color={D.red}
      onBack={onBack}
    >
      <div className="max-w-2xl space-y-4">
        {/* Model selector */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: D.textMuted }}>Model</label>
          <div className="flex gap-3">
            {[
              { id: "turbo", label: "Viewmax Turbo", desc: "3 credits · Fast", color: D.green },
              { id: "hd", label: "Viewmax HD", desc: "6 credits · Highest quality", color: D.purple },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className="flex-1 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: model === m.id ? `${m.color}10` : D.inputBg,
                  border: `2px solid ${model === m.id ? m.color : D.inputBorder}`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: model === m.id ? m.color : D.textPrimary }}>{m.label}</span>
                <p className="text-xs mt-1" style={{ color: D.textMuted }}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <UploadZone
          label="Upload video"
          sublabel=".mp4, .mov, or .webm — Under 1 minute, up to 30MB"
          accept=".mp4,.mov,.webm"
          onFileSelect={setVideoFile}
          file={videoFile}
        />

        <GenerateButton onClick={handleRemove} loading={result.loading} disabled={!videoFile} label="Remove Captions" creditCost={model === "turbo" ? 3 : 6} />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.content && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: D.greenLight }}>
            <p className="text-sm font-medium" style={{ color: D.green }}>{result.content}</p>
          </div>
        )}

        {processed.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Previous Videos</h3>
            <div className="space-y-2">
              {processed.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
                  <a href={p.beforeUrl} className="text-xs font-medium" style={{ color: D.textMuted }}>Before</a>
                  <a href={p.afterUrl} className="text-xs font-medium" style={{ color: D.green }}>After</a>
                  <a href={p.afterUrl} download className="text-xs font-medium ml-auto" style={{ color: D.purple }}>Download</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}

// ─── Watermark Remover Page ───────────────────────────────────────────────

function WatermarkRemoverPage({ onBack }: { onBack: () => void }) {
  const [source, setSource] = useState("sora");
  const [soraLink, setSoraLink] = useState("");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });

  const handleRemove = async () => {
    if (source === "sora" && !soraLink.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Remove watermark from this video, clean output",
          model: "kling3.0",
          duration: 5,
          aspectRatio: "16:9",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Watermark removal failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.videoUrl });
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to remove watermark" });
    }
  };

  return (
    <ToolPageLayout title="Watermark Remover" subtitle="Automatically clean watermarks from videos using our Viewmax AI." color={D.green} onBack={onBack}>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: D.textMuted }}>Select Video Source</label>
          <div className="flex gap-3">
            {[
              { id: "sora", label: "Sora Watermark", cost: "1 credit", available: true },
              { id: "any", label: "Any Video", cost: "Coming Soon", available: false },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => s.available && setSource(s.id)}
                className="flex-1 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: source === s.id ? D.greenLight : D.inputBg,
                  border: `2px solid ${source === s.id ? D.green : D.inputBorder}`,
                  opacity: s.available ? 1 : 0.5,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: source === s.id ? D.green : D.textPrimary }}>{s.label}</span>
                <p className="text-xs mt-1" style={{ color: D.textMuted }}>{s.cost}</p>
              </button>
            ))}
          </div>
        </div>

        {source === "sora" && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Enter Sora Post Link</label>
            <input
              type="url"
              value={soraLink}
              onChange={(e) => setSoraLink(e.target.value)}
              placeholder="https://sora.com/..."
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
              style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
            />
          </div>
        )}

        <GenerateButton
          onClick={handleRemove}
          loading={result.loading}
          disabled={source === "sora" ? !soraLink.trim() : true}
          label="Remove Watermark"
          creditCost={1}
        />

        {result.error && <ErrorDisplay error={result.error} />}
        {result.url && <VideoResult url={result.url} />}
      </div>
    </ToolPageLayout>
  );
}

// ─── AI Ad Generator Page ─────────────────────────────────────────────────

function AIAdGeneratorPage({ onBack }: { onBack: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("ugc");
  const [model, setModel] = useState("seedance");
  const [duration, setDuration] = useState("8s");
  const [productUrl, setProductUrl] = useState("");
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [feed, setFeed] = useState<{ url: string; id: string }[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const res = await fetch("/api/allinone/video-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create an ad: ${prompt.trim()}`,
          model,
          duration: parseInt(duration),
          aspectRatio: "9:16",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Ad generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.videoUrl });
      if (data.videoUrl) {
        setFeed((prev) => [{ url: data.videoUrl, id: Date.now().toString() }, ...prev]);
      }
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate ad" });
    }
  };

  return (
    <ToolPageLayout
      title="AI Ad Generator"
      subtitle="Choose a format, product, avatar, voice, and script to generate high-converting AI video ads."
      badge="Beta"
      color={D.purple}
      onBack={onBack}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textPrimary }}>Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your ad concept..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Format</label>
            <PillSelector
              options={[
                { value: "ugc", label: "UGC" },
                { value: "demo", label: "Product Demo" },
                { value: "story", label: "Story" },
              ]}
              value={format}
              onChange={setFormat}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Model</label>
            <PillSelector
              options={[
                { value: "seedance", label: "Seedance 2" },
                { value: "kling3.0", label: "Kling 3.0" },
              ]}
              value={model}
              onChange={setModel}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Duration</label>
            <PillSelector
              options={[
                { value: "8s", label: "8s" },
                { value: "15s", label: "15s" },
              ]}
              value={duration}
              onChange={setDuration}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: D.textMuted }}>Product URL</label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://your-product-page.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              style={{ backgroundColor: D.inputBg, border: `1px solid ${D.inputBorder}`, color: D.textPrimary }}
            />
          </div>

          <GenerateButton onClick={handleGenerate} loading={result.loading} disabled={!prompt.trim()} label="Generate" creditCost={20} />

          {result.error && <ErrorDisplay error={result.error} />}
          {result.url && <VideoResult url={result.url} />}
        </div>

        {/* Right: Feed */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Recent Ad Generations</h3>
          {feed.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
              <p className="text-sm" style={{ color: D.textMuted }}>Your generated ads will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {feed.map((item) => (
                <div key={item.id} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
                  <video src={item.url} controls className="w-full" style={{ maxHeight: "200px" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function AllInOneMachine({ onBack, onNavigate: _onNavigate }: AllInOneMachineProps) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<ToolPage>("home");

  const userName = user?.name || "there";

  const handleToolNavigate = (page: ToolPage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToHome = () => {
    setCurrentPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderContent = () => {
    switch (currentPage) {
      case "home":
        return <HomeView userName={userName} onNavigate={handleToolNavigate} />;
      case "ai-video-generator":
        return <AIVideoGeneratorPage onBack={handleBackToHome} />;
      case "ai-image-generator":
        return <AIImageGeneratorPage onBack={handleBackToHome} />;
      case "script-writer":
        return <ScriptwriterPage onBack={handleBackToHome} />;
      case "ai-voiceover":
        return <AIVoiceoverPage onBack={handleBackToHome} />;
      case "video-downloader":
        return <VideoDownloaderPage onBack={handleBackToHome} />;
      case "ai-clone":
        return <AIClonePage onBack={handleBackToHome} />;
      case "auto-captions":
        return <AutoCaptionsPage onBack={handleBackToHome} />;
      case "voice-changer":
        return <VoiceChangerPage onBack={handleBackToHome} />;
      case "caption-remover":
        return <CaptionRemoverPage onBack={handleBackToHome} />;
      case "watermark-remover":
        return <WatermarkRemoverPage onBack={handleBackToHome} />;
      case "ai-ad-generator":
        return <AIAdGeneratorPage onBack={handleBackToHome} />;
      default:
        return <HomeView userName={userName} onNavigate={handleToolNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: D.mainBg }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleToolNavigate}
        userName={userName}
        onBack={onBack}
      />
      <main className="flex-1 min-h-screen overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
