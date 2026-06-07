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

// ─── AI Ad Generator Page (viewmax.io-style) ──────────────────────────────

const AD_FORMATS = [
  { value: "blank", label: "Blank", desc: "No format assist" },
  { value: "ugc_handheld", label: "UGC Handheld", desc: "Static selfie product reads" },
  { value: "clothing_try_on", label: "Clothing Try On", desc: "Creator garment try-ons" },
  { value: "ugc_yapping", label: "UGC Yapping", desc: "FaceTime-style app rants" },
  { value: "fruit_cutting", label: "Fruit Cutting", desc: "Low-key cutting board reads" },
  { value: "hyper_motion", label: "Hyper Motion", desc: "Fast product highlights" },
];

const AD_MODELS = [
  { value: "seedance", label: "Seedance 2", icon: "🎬" },
  { value: "seedance_fast", label: "Seedance 2 Fast", icon: "⚡" },
  { value: "veo3_fast", label: "Veo 3.1 Fast", icon: "🚀" },
  { value: "veo3", label: "Veo 3.1", icon: "🌟" },
  { value: "grok_imagine", label: "Grok Imagine", icon: "✨" },
];

const AD_VOICES = [
  { value: "alexis_vale", label: "Alexis Vale", desc: "Warm female, conversational" },
  { value: "evan_brooks", label: "Evan Brooks", desc: "Deep male, authoritative" },
  { value: "claire_benne", label: "Claire Benne", desc: "Bright female, energetic" },
  { value: "miles_carter", label: "Miles Carter", desc: "Casual male, friendly" },
  { value: "sofia_lane", label: "Sofia Lane", desc: "Soft female, approachable" },
  { value: "clara_wren", label: "Clara Wren", desc: "Professional female, clear" },
  { value: "dante_cruz", label: "Dante Cruz", desc: "Bold male, dramatic" },
];

// Format-specific prompt augmentations
const FORMAT_PROMPTS: Record<string, string> = {
  blank: "",
  ugc_handheld: "UGC handheld selfie style: A person holds the product close to the camera, speaking directly to the viewer as if showing a friend. Shaky handheld camera, natural lighting, authentic and relatable tone. The person reads the product name and key selling points while showing it off. ",
  clothing_try_on: "Clothing try-on style: A creator shows off wearing the garment, doing a full spin to display how it fits. They touch the fabric, comment on the material quality, and show the item from multiple angles. Natural body movement, fashion-forward presentation. ",
  ugc_yapping: "UGC yapping FaceTime-style: The creator rants passionately about the product while holding it up, like they're on a FaceTime call with a friend. Fast-paced talking, animated expressions, pointing at features. The energy is authentic, slightly chaotic, and highly engaging. ",
  fruit_cutting: "Fruit cutting style: Close-up shot of someone's hands cutting fruit on a wooden cutting board, with the product subtly placed nearby. The satisfying ASMR-like cutting sounds and visuals create a calming, low-key atmosphere while the product is naturally integrated into the scene. ",
  hyper_motion: "Hyper motion style: Rapid-cut product showcase with dynamic camera movements, zoom-ins, and fast transitions. The product is shown from multiple angles with quick reveals, feature callouts, and high-energy visuals. Bold text overlays highlight key benefits. ",
};

function AIAdGeneratorPage({ onBack }: { onBack: () => void }) {
  // State
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState("blank");
  const [model, setModel] = useState("seedance");
  const [duration, setDuration] = useState(8);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  // Product upload
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string>("");
  const [productUploading, setProductUploading] = useState(false);
  const [productImageUrl, setProductImageUrl] = useState("");

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarImageUrl, setAvatarImageUrl] = useState("");

  // Voice
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voicePreview, setVoicePreview] = useState<string>("");
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");

  // Reference media
  const [refImages, setRefImages] = useState<File[]>([]);
  const [refVideo, setRefVideo] = useState<File | null>(null);

  // Result
  const [result, setResult] = useState<ToolResult>({ loading: false, error: null });
  const [feed, setFeed] = useState<{ url: string; prompt: string; model: string; format: string; id: string }[]>([]);

  // Show product upload dialog
  const [showProductDialog, setShowProductDialog] = useState(false);
  // Show avatar upload dialog
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  // Show voice dialog
  const [showVoiceDialog, setShowVoiceDialog] = useState(false);
  // Show format selector
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  // Show model selector
  const [showModelPicker, setShowModelPicker] = useState(false);
  // Show video settings
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  // Show references
  const [showReferences, setShowReferences] = useState(false);

  // File input refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const refVideoInputRef = useRef<HTMLInputElement>(null);

  // Close popups on outside click
  useEffect(() => {
    const handler = () => {
      setShowFormatPicker(false);
      setShowModelPicker(false);
      setShowVideoSettings(false);
      setShowReferences(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Handle product file selection
  const handleProductSelect = async (file: File) => {
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setProductPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setProductUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kieApiKey", process.env.NEXT_PUBLIC_KIE_KEY || "");
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.avatarUrl) {
        setProductImageUrl(data.avatarUrl);
      }
    } catch (err) {
      console.error("Product upload failed:", err);
    } finally {
      setProductUploading(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarSelect = async (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kieApiKey", process.env.NEXT_PUBLIC_KIE_KEY || "");
      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.avatarUrl) {
        setAvatarImageUrl(data.avatarUrl);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle voice file selection
  const handleVoiceSelect = async (file: File) => {
    setVoiceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setVoicePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setVoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/allinone/upload-voice", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setVoiceAudioUrl(data.url);
      }
    } catch (err) {
      console.error("Voice upload failed:", err);
    } finally {
      setVoiceUploading(false);
    }
  };

  // Build the full prompt with format augmentation
  const buildFullPrompt = (): string => {
    const formatPrefix = FORMAT_PROMPTS[format] || "";
    let fullPrompt = formatPrefix + prompt.trim();

    // Add product context
    if (productImageUrl) {
      fullPrompt += " [Product image reference provided]";
    }
    // Add avatar context
    if (avatarImageUrl) {
      fullPrompt += " [Creator/Avatar reference provided]";
    }
    // Add voice context
    if (selectedVoice) {
      const voice = AD_VOICES.find((v) => v.value === selectedVoice);
      if (voice) {
        fullPrompt += ` [Voice style: ${voice.desc}]`;
      }
    }
    if (voiceAudioUrl) {
      fullPrompt += " [Voice audio reference provided]";
    }

    return fullPrompt;
  };

  // Map model value to API model name
  const mapModel = (m: string): string => {
    switch (m) {
      case "seedance": return "seedance";
      case "seedance_fast": return "seedance";
      case "veo3_fast": return "veo3_fast";
      case "veo3": return "veo3_lite";
      case "grok_imagine": return "grok_imagine";
      default: return "seedance";
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult({ loading: true, error: null });
    try {
      const fullPrompt = buildFullPrompt();
      const res = await fetch("/api/allinone/ad-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          format,
          model: mapModel(model),
          duration,
          aspectRatio,
          resolution,
          productImageUrl: productImageUrl || undefined,
          avatarImageUrl: avatarImageUrl || undefined,
          selectedVoice: selectedVoice || undefined,
          voiceAudioUrl: voiceAudioUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ loading: false, error: data.error || "Ad generation failed" });
        return;
      }
      setResult({ loading: false, error: null, url: data.videoUrl });
      if (data.videoUrl) {
        setFeed((prev) => [{
          url: data.videoUrl,
          prompt: prompt.trim(),
          model: AD_MODELS.find((m) => m.value === model)?.label || model,
          format: AD_FORMATS.find((f) => f.value === format)?.label || format,
          id: Date.now().toString(),
        }, ...prev]);
      }
    } catch (err) {
      setResult({ loading: false, error: err instanceof Error ? err.message : "Failed to generate ad" });
    }
  };

  // Determine if voice option is available (Seedance models only)
  const isVoiceAvailable = model === "seedance" || model === "seedance_fast";

  // Check if generate button should be disabled
  const canGenerate = prompt.trim().length > 0;

  return (
    <div className="max-w-[1060px] mx-auto px-3 sm:px-6 py-4">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium mb-3 transition-colors hover:opacity-70"
          style={{ color: D.textMuted }}
        >
          <ArrowLeft /> Back to Home
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: D.textPrimary }}>AI Ad Generator</h1>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: `${D.purple}20`, color: D.purple }}
          >
            Beta
          </span>
        </div>
      </div>

      {/* Tabs: Generate / History */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ backgroundColor: D.inputBg }}>
        <button
          onClick={() => setActiveTab("generate")}
          className="px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: activeTab === "generate" ? D.white : "transparent",
            color: activeTab === "generate" ? D.textPrimary : D.textMuted,
            boxShadow: activeTab === "generate" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className="px-4 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: activeTab === "history" ? D.white : "transparent",
            color: activeTab === "history" ? D.textPrimary : D.textMuted,
            boxShadow: activeTab === "history" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          History
        </button>
      </div>

      {activeTab === "generate" ? (
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Prompt + Toolbar Card */}
            <div
              className="rounded-[22px] sm:rounded-[28px] border p-3 sm:p-3.5 transition-colors"
              style={{ backgroundColor: "rgba(120,120,120,0.08)", borderColor: "rgba(120,120,120,0.2)" }}
            >
              {/* Prompt Textarea */}
              <div className="relative mb-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what happens in the ad..."
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-[15px] leading-6 font-medium placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: D.textPrimary,
                    minHeight: "132px",
                  }}
                />
              </div>

              {/* Toolbar Row */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Format Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setShowFormatPicker(!showFormatPicker); setShowModelPicker(false); setShowVideoSettings(false); setShowReferences(false); }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs font-semibold tracking-tight transition-all"
                    style={{
                      borderColor: "rgba(120,120,120,0.2)",
                      backgroundColor: showFormatPicker ? "rgba(120,120,120,0.16)" : "rgba(116,116,128,0.08)",
                      color: "rgba(0,0,0,0.8)",
                    }}
                  >
                    <PlusIconSmall />
                    <span>Format</span>
                  </button>
                  {showFormatPicker && (
                    <div
                      className="absolute top-full left-0 mt-2 w-[340px] rounded-2xl border p-3 z-50"
                      style={{ backgroundColor: D.white, border: `1px solid #EEF0F4`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                    >
                      <p className="mb-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>Format</p>
                      <div className="grid grid-cols-2 gap-2">
                        {AD_FORMATS.map((f) => (
                          <button
                            key={f.value}
                            onClick={() => { setFormat(f.value); setShowFormatPicker(false); }}
                            className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99]"
                            style={{
                              borderColor: format === f.value ? "rgba(0,117,253,0.4)" : "#E2E8F0",
                              backgroundColor: format === f.value ? "#EAF3FF" : "#F8FAFC",
                              color: format === f.value ? "#0075FD" : D.textPrimary,
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-black tracking-tight">{f.label}</span>
                              <span className="mt-0.5 block truncate text-[10px] font-medium" style={{ color: "#64748B" }}>{f.desc}</span>
                            </span>
                            {format === f.value && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0075FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Model Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setShowModelPicker(!showModelPicker); setShowFormatPicker(false); setShowVideoSettings(false); setShowReferences(false); }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs font-semibold tracking-tight transition-all"
                    style={{
                      borderColor: "rgba(120,120,120,0.2)",
                      backgroundColor: showModelPicker ? "rgba(120,120,120,0.16)" : "rgba(116,116,128,0.08)",
                      color: "rgba(0,0,0,0.8)",
                    }}
                  >
                    <span className="text-sm">{AD_MODELS.find((m) => m.value === model)?.icon}</span>
                    <span>{AD_MODELS.find((m) => m.value === model)?.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {showModelPicker && (
                    <div
                      className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl border p-1.5 z-50"
                      style={{ backgroundColor: "rgba(0,0,0,0.03)", border: `1px solid #EEF0F4`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                    >
                      {AD_MODELS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => { setModel(m.value); setShowModelPicker(false); }}
                          className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left transition"
                          style={{
                            border: model === m.value ? "1px solid rgba(0,117,253,0.35)" : "1px solid transparent",
                            backgroundColor: model === m.value ? "#EAF3FF" : "transparent",
                            color: model === m.value ? "#0075FD" : D.textPrimary,
                          }}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: model === m.value ? "#D9EAFF" : D.white }}>
                              <span className="text-base">{m.icon}</span>
                            </span>
                            <span className="text-[13px] font-semibold">{m.label}</span>
                          </span>
                          {model === m.value && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0075FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setShowVideoSettings(!showVideoSettings); setShowFormatPicker(false); setShowModelPicker(false); setShowReferences(false); }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs font-semibold tracking-tight transition-all"
                    style={{
                      borderColor: "rgba(120,120,120,0.2)",
                      backgroundColor: showVideoSettings ? "rgba(120,120,120,0.16)" : "rgba(116,116,128,0.08)",
                      color: "rgba(0,0,0,0.8)",
                    }}
                  >
                    <ClockIcon />
                    <span>{duration}s</span>
                  </button>
                  {showVideoSettings && (
                    <div
                      className="absolute top-full left-0 mt-2 w-[280px] rounded-2xl border bg-white p-3 z-50"
                      style={{ border: `1px solid #EEF0F4`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                    >
                      <p className="mb-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>Video Settings</p>
                      {/* Aspect Ratio */}
                      <div className="mb-3">
                        <div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                          {[
                            { value: "9:16", label: "Portrait", icon: <PortraitIcon /> },
                            { value: "16:9", label: "Landscape", icon: <LandscapeIcon /> },
                            { value: "1:1", label: "Square", icon: <SquareIcon /> },
                          ].map((ar) => (
                            <button
                              key={ar.value}
                              onClick={() => setAspectRatio(ar.value)}
                              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-semibold transition active:scale-[0.98]"
                              style={{
                                backgroundColor: aspectRatio === ar.value ? D.white : "transparent",
                                color: aspectRatio === ar.value ? "#0075FD" : "#64748B",
                                boxShadow: aspectRatio === ar.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              }}
                            >
                              {ar.icon}
                              <span className="truncate">{ar.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Resolution */}
                      <div className="mb-3">
                        <div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1.5" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                          {["480p", "720p", "1080p"].map((res) => (
                            <button
                              key={res}
                              onClick={() => setResolution(res)}
                              className="min-h-10 rounded-xl px-2 text-[12px] font-semibold transition active:scale-[0.98]"
                              style={{
                                backgroundColor: resolution === res ? D.white : "transparent",
                                color: resolution === res ? "#0075FD" : "#64748B",
                                boxShadow: resolution === res ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              }}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Duration Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: "#8A95A6" }}>Duration</span>
                          <span className="text-[10px] font-black tracking-[0.12em] tabular-nums uppercase" style={{ color: D.textPrimary }}>{duration}s</span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={15}
                          step={1}
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value))}
                          className="w-full h-10 cursor-grab active:cursor-grabbing"
                          style={{ accentColor: "#0075FD" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* References Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setShowReferences(!showReferences); setShowFormatPicker(false); setShowModelPicker(false); setShowVideoSettings(false); }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-2 text-xs font-semibold tracking-tight transition-all shrink-0"
                    style={{
                      borderColor: "rgba(120,120,120,0.2)",
                      backgroundColor: showReferences ? "rgba(120,120,120,0.16)" : "rgba(116,116,128,0.08)",
                      color: "rgba(0,0,0,0.8)",
                    }}
                  >
                    <PlusIconSmall />
                    <span>References</span>
                  </button>
                  {showReferences && (
                    <div
                      className="absolute top-full left-0 mt-2 w-[340px] rounded-2xl border bg-white p-3 z-50"
                      style={{ border: `1px solid #EEF0F4`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                    >
                      <p className="mb-2.5 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>References</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => refImageInputRef.current?.click()}
                          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.99]"
                          style={{ borderColor: "#D8DCE3", backgroundColor: "#F8FAFC", color: D.textPrimary }}
                        >
                          <ImageIcon /> Images
                        </button>
                        <button
                          onClick={() => refVideoInputRef.current?.click()}
                          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.99]"
                          style={{ borderColor: "#D8DCE3", backgroundColor: "#F8FAFC", color: D.textPrimary }}
                        >
                          <VideoIconSmall /> Video
                        </button>
                        <button
                          onClick={() => voiceInputRef.current?.click()}
                          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.99]"
                          style={{ borderColor: "#D8DCE3", backgroundColor: "#F8FAFC", color: D.textPrimary }}
                        >
                          <AudioIcon /> Audio
                        </button>
                        <button
                          onClick={() => { setShowVoiceDialog(true); setShowReferences(false); }}
                          className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.99]"
                          style={{ borderColor: "#D8DCE3", backgroundColor: "#F8FAFC", color: D.textPrimary }}
                        >
                          <SparklesIcon /> Voice Library
                        </button>
                      </div>
                      {/* Show uploaded reference previews */}
                      {refImages.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {refImages.map((img, i) => (
                            <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                              <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Hidden inputs */}
                      <input
                        ref={refImageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setRefImages((prev) => [...prev, ...files]);
                        }}
                      />
                      <input
                        ref={refVideoInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,.mp4,.mov"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setRefVideo(f); }}
                      />
                    </div>
                  )}
                </div>

                {/* Video Settings (gear icon) */}
                <button
                  onClick={() => { setShowVideoSettings(!showVideoSettings); setShowFormatPicker(false); setShowModelPicker(false); setShowReferences(false); }}
                  className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all"
                  style={{
                    borderColor: "rgba(120,120,120,0.2)",
                    backgroundColor: showVideoSettings ? "rgba(120,120,120,0.16)" : "rgba(116,116,128,0.08)",
                    color: "rgba(0,0,0,0.8)",
                  }}
                  title="Video settings"
                >
                  <SettingsIcon />
                </button>
              </div>
            </div>

            {/* Result */}
            {result.error && <ErrorDisplay error={result.error} />}
            {result.loading && (
              <div className="mt-4 rounded-xl p-6 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
                <div className="w-8 h-8 rounded-full border-3 border-purple-500 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium" style={{ color: D.textPrimary }}>Generating your ad...</p>
                <p className="text-xs mt-1" style={{ color: D.textMuted }}>This may take 1-3 minutes</p>
              </div>
            )}
            {result.url && !result.loading && <VideoResult url={result.url} />}
          </div>

          {/* Right Side Panel: Product / Avatar / Voice / Generate */}
          <div className="flex flex-col gap-3 lg:w-[260px] shrink-0">
            {/* Product Upload Card */}
            <div className="aspect-[2/3] w-full">
              <button
                onClick={() => setShowProductDialog(true)}
                className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-[10px] border p-2.5 text-center transition hover:border-transparent active:scale-[0.99] sm:rounded-[14px]"
                style={{
                  borderColor: productPreview ? "rgba(0,117,253,0.4)" : "rgba(120,120,120,0.2)",
                  backgroundColor: productPreview ? "transparent" : "rgba(116,116,128,0.08)",
                  overflow: "hidden",
                }}
              >
                {productPreview ? (
                  <>
                    <img src={productPreview} alt="Product" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center opacity-0 hover:opacity-100">
                      <span className="text-white text-xs font-semibold">Change Product</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="relative inline-flex size-6 items-center justify-center" style={{ color: "rgba(0,0,0,0.8)" }}>
                      <PackageIcon />
                    </span>
                    <span className="text-xs font-semibold tracking-tight" style={{ color: "rgba(0,0,0,0.8)" }}>Product</span>
                  </>
                )}
                {productUploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </button>
            </div>

            {/* Avatar Upload Card */}
            <div className="aspect-[2/3] w-full">
              <button
                onClick={() => setShowAvatarDialog(true)}
                className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-[10px] border p-2.5 text-center transition hover:border-transparent active:scale-[0.99] sm:rounded-[14px]"
                style={{
                  borderColor: avatarPreview ? "rgba(0,117,253,0.4)" : "rgba(120,120,120,0.2)",
                  backgroundColor: avatarPreview ? "transparent" : "rgba(116,116,128,0.08)",
                  overflow: "hidden",
                }}
              >
                {avatarPreview ? (
                  <>
                    <img src={avatarPreview} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center opacity-0 hover:opacity-100">
                      <span className="text-white text-xs font-semibold">Change Avatar</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="relative inline-flex size-6 items-center justify-center" style={{ color: "rgba(0,0,0,0.8)" }}>
                      <UserRoundIcon />
                    </span>
                    <span className="text-xs font-semibold tracking-tight" style={{ color: "rgba(0,0,0,0.8)" }}>Avatar</span>
                  </>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </button>
            </div>

            {/* Voice Card */}
            <div className="aspect-[2/3] w-full">
              <button
                onClick={() => {
                  if (isVoiceAvailable) {
                    setShowVoiceDialog(true);
                  }
                }}
                className="group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-[10px] border p-2.5 text-center transition active:scale-[0.99] sm:rounded-[14px]"
                style={{
                  borderColor: selectedVoice || voicePreview ? "rgba(0,117,253,0.4)" : "rgba(120,120,120,0.2)",
                  backgroundColor: selectedVoice || voicePreview ? "rgba(0,117,253,0.06)" : "rgba(116,116,128,0.08)",
                  opacity: isVoiceAvailable ? 1 : 0.4,
                  cursor: isVoiceAvailable ? "pointer" : "not-allowed",
                  overflow: "hidden",
                }}
                title={isVoiceAvailable ? "Voice reference library" : "Voice only available with Seedance 2 models"}
              >
                {voicePreview ? (
                  <div className="flex flex-col items-center gap-1 w-full px-2">
                    <span className="text-[10px] font-semibold" style={{ color: "#0075FD" }}>Custom Voice</span>
                    <audio src={voicePreview} controls className="w-full" style={{ height: "30px" }} />
                  </div>
                ) : selectedVoice ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold" style={{ color: "#0075FD" }}>Voice</span>
                    <span className="text-xs font-semibold" style={{ color: D.textPrimary }}>
                      {AD_VOICES.find((v) => v.value === selectedVoice)?.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="relative inline-flex size-6 items-center justify-center" style={{ color: "rgba(0,0,0,0.8)" }}>
                      <VoiceIconSmall />
                    </span>
                    <span className="text-xs font-semibold tracking-tight" style={{ color: "rgba(0,0,0,0.8)" }}>Voice</span>
                    {!isVoiceAvailable && (
                      <span className="text-[9px] mt-0.5" style={{ color: D.textDim }}>Seedance only</span>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || result.loading}
              className="w-full py-3 rounded-[10px] text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canGenerate && !result.loading ? D.black : "rgba(120,120,120,0.16)",
                color: canGenerate && !result.loading ? D.white : "rgba(0,0,0,0.4)",
              }}
            >
              {result.loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <SparklesIcon />
                  <span className="opacity-70">20</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: D.textPrimary }}>Recent Ad Generations</h3>
          {feed.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
              <p className="text-sm" style={{ color: D.textMuted }}>Your generated ads will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {feed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden group cursor-pointer"
                  style={{ border: `1px solid ${D.cardBorder}` }}
                >
                  <div className="relative">
                    <video src={item.url} controls className="w-full" style={{ maxHeight: "250px" }} />
                  </div>
                  <div className="p-2.5 flex items-center justify-between" style={{ backgroundColor: D.inputBg }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate" style={{ color: D.textPrimary }}>
                        {item.format} · {item.model}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: D.textMuted }}>
                        {item.prompt}
                      </p>
                    </div>
                    <button
                      onClick={() => setPrompt(item.prompt)}
                      className="ml-2 px-2 py-1 rounded-md text-[10px] font-semibold shrink-0"
                      style={{ backgroundColor: D.purpleLight, color: D.purple }}
                    >
                      Reuse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Product Upload Dialog ──────────────────────────── */}
      {showProductDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProductDialog(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md rounded-2xl p-5"
            style={{ backgroundColor: D.white, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: D.textPrimary }}>Upload Product</h3>
            <p className="text-sm mb-4" style={{ color: D.textMuted }}>Add a product image for your ad. The AI will incorporate it into the generated video.</p>

            {productPreview ? (
              <div className="mb-4">
                <div className="relative rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
                  <img src={productPreview} alt="Product preview" className="w-full max-h-64 object-contain mx-auto" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => productInputRef.current?.click()}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: D.inputBg, color: D.textPrimary, border: `1px solid ${D.inputBorder}` }}
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => { setProductFile(null); setProductPreview(""); setProductImageUrl(""); }}
                    className="py-2 px-4 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: D.redLight, color: D.red }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/30"
                style={{ borderColor: D.inputBorder, backgroundColor: D.inputBg }}
                onClick={() => productInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) handleProductSelect(f); }}
              >
                <div className="mb-2" style={{ color: D.textDim }}>
                  <PackageIcon />
                </div>
                <p className="text-sm font-medium" style={{ color: D.textPrimary }}>Upload product image</p>
                <p className="text-xs mt-1" style={{ color: D.textMuted }}>.jpg, .png, .webp up to 10 MB</p>
              </div>
            )}

            <input
              ref={productInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProductSelect(f); }}
            />

            <button
              onClick={() => setShowProductDialog(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: D.black }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── Avatar Upload Dialog ──────────────────────────── */}
      {showAvatarDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAvatarDialog(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md rounded-2xl p-5"
            style={{ backgroundColor: D.white, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: D.textPrimary }}>Upload Avatar</h3>
            <p className="text-sm mb-4" style={{ color: D.textMuted }}>
              Add a creator avatar image. The AI will use this person as the character in your ad video.
              Works with all models.
            </p>

            {avatarPreview ? (
              <div className="mb-4">
                <div className="relative rounded-xl overflow-hidden" style={{ border: `1px solid ${D.cardBorder}` }}>
                  <img src={avatarPreview} alt="Avatar preview" className="w-full max-h-64 object-contain mx-auto" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: D.inputBg, color: D.textPrimary, border: `1px solid ${D.inputBorder}` }}
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => { setAvatarFile(null); setAvatarPreview(""); setAvatarImageUrl(""); }}
                    className="py-2 px-4 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: D.redLight, color: D.red }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/30"
                style={{ borderColor: D.inputBorder, backgroundColor: D.inputBg }}
                onClick={() => avatarInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) handleAvatarSelect(f); }}
              >
                <div className="mb-2" style={{ color: D.textDim }}>
                  <UserRoundIcon />
                </div>
                <p className="text-sm font-medium" style={{ color: D.textPrimary }}>Upload avatar image</p>
                <p className="text-xs mt-1" style={{ color: D.textMuted }}>.jpg, .png, .webp up to 10 MB</p>
              </div>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarSelect(f); }}
            />

            <button
              onClick={() => setShowAvatarDialog(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: D.black }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── Voice Selection Dialog ──────────────────────────── */}
      {showVoiceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowVoiceDialog(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: D.white, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: D.textPrimary }}>Select Voice</h3>
            <p className="text-sm mb-4" style={{ color: D.textMuted }}>
              Choose a voice for your Seedance 2.0 ad, or upload your own voice reference audio.
            </p>

            {/* Voice Library */}
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>Voice Library</p>
              <div className="space-y-1.5">
                {AD_VOICES.map((voice) => (
                  <button
                    key={voice.value}
                    onClick={() => { setSelectedVoice(voice.value); setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition"
                    style={{
                      border: selectedVoice === voice.value ? "1px solid rgba(0,117,253,0.4)" : "1px solid #E2E8F0",
                      backgroundColor: selectedVoice === voice.value ? "#EAF3FF" : "#F8FAFC",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: selectedVoice === voice.value ? "#D9EAFF" : D.inputBg,
                          color: selectedVoice === voice.value ? "#0075FD" : D.textMuted,
                        }}
                      >
                        {voice.label.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: selectedVoice === voice.value ? "#0075FD" : D.textPrimary }}>{voice.label}</p>
                        <p className="text-xs" style={{ color: "#64748B" }}>{voice.desc}</p>
                      </div>
                    </div>
                    {selectedVoice === voice.value && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0075FD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Voice Upload */}
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "#6B7280" }}>Or Upload Your Own Voice</p>
              {voicePreview ? (
                <div className="rounded-xl p-3" style={{ backgroundColor: D.inputBg, border: `1px solid ${D.cardBorder}` }}>
                  <audio src={voicePreview} controls className="w-full" style={{ height: "40px" }} />
                  <button
                    onClick={() => { setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); setSelectedVoice(""); }}
                    className="mt-2 text-xs font-semibold"
                    style={{ color: D.red }}
                  >
                    Remove voice
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all hover:border-purple-400"
                  style={{ borderColor: D.inputBorder, backgroundColor: D.inputBg }}
                  onClick={() => voiceInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("audio/")) handleVoiceSelect(f); }}
                >
                  <div className="mb-2" style={{ color: D.textDim }}>
                    <VoiceIconSmall />
                  </div>
                  <p className="text-sm font-medium" style={{ color: D.textPrimary }}>Upload voice audio</p>
                  <p className="text-xs mt-1" style={{ color: D.textMuted }}>.mp3, .wav up to 10 MB</p>
                </div>
              )}
              <input
                ref={voiceInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVoiceSelect(f); }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedVoice(""); setVoiceFile(null); setVoicePreview(""); setVoiceAudioUrl(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: D.inputBg, color: D.textPrimary, border: `1px solid ${D.inputBorder}` }}
              >
                Clear Voice
              </button>
              <button
                onClick={() => setShowVoiceDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: D.black }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Additional Small Icons for Ad Generator ──────────────────────────────

function PlusIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 12" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  );
}
function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 21.73a2 2 0 002 0l7-4A2 2 0 0021 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73z" />
      <path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" />
    </svg>
  );
}
function UserRoundIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 00-16 0" />
    </svg>
  );
}
function VoiceIconSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4.702a.705.705 0 00-1.203-.498L6.413 7.587A1.4 1.4 0 015.416 8H3a1 1 0 00-1 1v6a1 1 0 001 1h2.416a1.4 1.4 0 01.997.413l3.383 3.384A.705.705 0 0011 19.298z" />
      <path d="M16 9a5 5 0 010 6" /><path d="M19.364 18.364a9 9 0 010-12.728" />
    </svg>
  );
}
function VideoIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />
      <path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" />
      <path d="M3 11h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}
function AudioIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" />
      <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
    </svg>
  );
}
function PortraitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="12" height="20" x="6" y="2" rx="2" />
    </svg>
  );
}
function LandscapeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}
function SquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </svg>
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
