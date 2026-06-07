"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AllInOneMachineProps {
  onBack: () => void;
  onNavigate: (dest: string) => void;
}

// ─── Data ──────────────────────────────────────────────────────────────────

interface ToolItem {
  id: string;
  name: string;
  description: string;
  beta?: boolean;
  navigateTo: string;
  icon: React.ReactNode;
  gradient: string;
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  navigateTo: string;
  icon: React.ReactNode;
  gradient: string;
}

const tools: ToolItem[] = [
  {
    id: "ai-video-gen",
    name: "AI Video Generator",
    description: "Generate stunning AI videos without watermarks.",
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="3" />
        <path d="M10 9l5 3-5 3V9z" fill="currentColor" opacity="0.4" />
        <path d="M7 22h10" />
        <path d="M12 18v4" />
      </svg>
    ),
    gradient: "from-purple-900/30 to-violet-950/50",
  },
  {
    id: "ai-image-gen",
    name: "AI Image Generator",
    description: "Create beautiful AI-generated images from text prompts.",
    beta: true,
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
      </svg>
    ),
    gradient: "from-indigo-900/30 to-blue-950/50",
  },
  {
    id: "scriptwriter",
    name: "Scriptwriter",
    description: "Create engaging scripts for your videos with AI-powered writing assistance.",
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
        <path d="M8 9h2" />
      </svg>
    ),
    gradient: "from-emerald-900/30 to-green-950/50",
  },
  {
    id: "ai-voiceover",
    name: "AI Voiceover",
    description: "Generate natural-sounding voiceovers for your videos using AI.",
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
    gradient: "from-orange-900/30 to-amber-950/50",
  },
  {
    id: "video-downloader",
    name: "Video Downloader",
    description: "Download videos from YouTube, Instagram, TikTok, X, and Facebook instantly.",
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    gradient: "from-red-900/30 to-rose-950/50",
  },
  {
    id: "ai-clone",
    name: "AI Clone",
    description: "Create a digital clone of yourself that looks and sounds just like you.",
    beta: true,
    navigateTo: "ai-avatar-machine",
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
    navigateTo: "ai-avatar-machine",
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
    id: "ai-ad-gen",
    name: "AI Ad Generator",
    description: "Turn products, apps, and creators into ready-to-test ad concepts.",
    beta: true,
    navigateTo: "bof-videos-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    gradient: "from-yellow-900/30 to-orange-950/50",
  },
  {
    id: "claymotion",
    name: "Claymotion Creator",
    description: "Create smooth claymation-style videos with linked scenes.",
    navigateTo: "claymotion-videos-machine",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="8" height="12" rx="2" />
        <rect x="14" y="4" width="8" height="12" rx="2" />
        <path d="M10 10h4" />
        <path d="M12 8l2 2-2 2" />
      </svg>
    ),
    gradient: "from-pink-900/30 to-rose-950/50",
  },
  {
    id: "carousel-maker",
    name: "Carousel Maker",
    description: "Create viral carousels with AI-powered image generation.",
    navigateTo: "ai-viral-carousel",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
        <path d="M15 15l3 3" />
        <circle cx="14" cy="14" r="3" />
      </svg>
    ),
    gradient: "from-amber-900/30 to-yellow-950/50",
  },
];

const templates: TemplateItem[] = [
  {
    id: "ai-story-video",
    name: "AI Story Video",
    description: "Create AI videos with captions, music, SFX, and more.",
    navigateTo: "ai-avatar-machine",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0118 0" />
        <path d="M4 11a9 9 0 0018 0" />
        <circle cx="12" cy="11" r="3" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
      </svg>
    ),
    gradient: "from-violet-600/30 to-purple-800/50",
  },
  {
    id: "product-showcase",
    name: "Product Showcase",
    description: "Turn products into ready-to-test ad concepts.",
    navigateTo: "bof-videos-machine",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    gradient: "from-emerald-600/30 to-green-800/50",
  },
  {
    id: "podcast-clip",
    name: "Podcast Clip",
    description: "Generate podcast clips with AI-powered editing.",
    navigateTo: "ai-podcast-machine",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
    gradient: "from-cyan-600/30 to-teal-800/50",
  },
];

// ─── Sidebar Navigation Items ──────────────────────────────────────────────

const sidebarNavItems = [
  { id: "home", label: "Home", icon: "home" },
  { id: "tools", label: "Tools", icon: "grid" },
  { id: "videos", label: "Videos", icon: "play" },
  { id: "community", label: "Community", icon: "users" },
  { id: "learn", label: "Learn", icon: "book" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function AllInOneMachine({ onBack, onNavigate }: AllInOneMachineProps) {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, label: "Create your first AI video", done: false },
    { id: 2, label: "Try the Scriptwriter tool", done: false },
    { id: 3, label: "Generate an AI voiceover", done: false },
    { id: 4, label: "Download a video from YouTube", done: false },
  ]);
  const [showChecklist, setShowChecklist] = useState(true);

  const userName = user?.name || "there";
  const firstName = userName.split(" ")[0] || "there";

  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToolClick = (tool: ToolItem) => {
    onNavigate(tool.navigateTo);
  };

  const handleTemplateClick = (template: TemplateItem) => {
    onNavigate(template.navigateTo);
  };

  const toggleChecklist = (id: number) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const completedCount = checklistItems.filter((i) => i.done).length;

  // ─── Sidebar Icon Renderer ───────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0a0a0a" }}>
      {/* ─── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300"
        style={{
          width: sidebarExpanded ? 240 : 64,
          backgroundColor: "#111111",
          borderRight: "1px solid rgba(255,255,255,0.05)",
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
          {/* Logo Icon */}
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
            <span className="font-bold text-white text-sm tracking-wide whitespace-nowrap">
              ViewMax AI
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {sidebarNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="w-full flex items-center gap-3 rounded-lg transition-all duration-200"
              style={{
                padding: sidebarExpanded ? "10px 12px" : "10px 14px",
                justifyContent: sidebarExpanded ? "flex-start" : "center",
                backgroundColor: activeNav === item.id ? "rgba(139,92,246,0.1)" : "transparent",
                color: activeNav === item.id ? "#8B5CF6" : "#71717A",
              }}
              onMouseEnter={(e) => {
                if (activeNav !== item.id) {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeNav !== item.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
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
            onClick={() => onNavigate("ai-avatar-machine")}
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
          className="flex items-center px-3 py-3"
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

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main
        className="flex-1 transition-all duration-300 min-h-screen"
        style={{
          marginLeft: sidebarExpanded ? 240 : 64,
        }}
      >
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{
            backgroundColor: "rgba(10,10,10,0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Back button */}
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

        {/* Content Scroll Area */}
        <div className="px-6 py-8 max-w-7xl mx-auto">
          {/* ─── Welcome Header ─────────────────────────────────────────── */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Hey {firstName}! 👋
            </h1>
            <p className="text-zinc-400 text-base">
              What would you like to create today? Pick a tool to get started.
            </p>
          </div>

          {/* ─── Tools Section ──────────────────────────────────────────── */}
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

          {/* ─── Templates Section ──────────────────────────────────────── */}
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: "linear-gradient(180deg, #8B5CF6, transparent)" }}
              />
              <h2 className="text-xl font-bold text-white">Templates</h2>
              <span className="text-zinc-500 text-sm font-medium ml-2">Quick start</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ─── Onboarding Checklist (Floating) ────────────────────────────── */}
      {showChecklist && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">Getting Started</span>
            </div>
            <button
              onClick={() => setShowChecklist(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Progress */}
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-medium">
                {completedCount} of {checklistItems.length} completed
              </span>
              <span className="text-xs font-bold" style={{ color: "#8B5CF6" }}>
                {Math.round((completedCount / checklistItems.length) * 100)}%
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / checklistItems.length) * 100}%`,
                  background: "linear-gradient(90deg, #8B5CF6, #7C3AED)",
                }}
              />
            </div>
          </div>

          {/* Items */}
          <div className="px-5 py-4 space-y-2.5">
            {checklistItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className="w-full flex items-center gap-3 text-left transition-colors duration-200 group"
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                  style={{
                    backgroundColor: item.done ? "#8B5CF6" : "rgba(255,255,255,0.05)",
                    border: item.done ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm transition-all duration-200"
                  style={{
                    color: item.done ? "#52525B" : "#A1A1AA",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Dismissed Checklist Re-open Button ──────────────────────────── */}
      {!showChecklist && (
        <button
          onClick={() => setShowChecklist(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </button>
      )}

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
      `}</style>
    </div>
  );
}

// ─── Tool Card Sub-Component ───────────────────────────────────────────────

function ToolCard({ tool, onClick }: { tool: ToolItem; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

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
      onClick={onClick}
    >
      {/* Video Preview Area */}
      <div
        className={`relative w-full aspect-video bg-gradient-to-br ${tool.gradient} flex items-center justify-center overflow-hidden`}
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
          {/* Pulse ring on hover */}
          {isHovered && (
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
        {isHovered && (
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
          style={{ color: "#8B5CF6" }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
        >
          Try now
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
        </button>
      </div>
    </div>
  );
}

// ─── Template Card Sub-Component ───────────────────────────────────────────

function TemplateCard({ template, onClick }: { template: TemplateItem; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        backgroundColor: isHovered ? "#222222" : "#1a1a1a",
        border: `1px solid ${isHovered ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)"}`,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isHovered ? "0 8px 24px rgba(139,92,246,0.1)" : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Template Preview */}
      <div
        className={`relative w-full aspect-[2/1] bg-gradient-to-br ${template.gradient} flex items-center justify-center overflow-hidden`}
        style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.12), rgba(0,0,0,0.7))` }}
      >
        <div
          className="flex items-center justify-center rounded-xl transition-all duration-300"
          style={{
            width: 44,
            height: 44,
            backgroundColor: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.2)",
            transform: isHovered ? "scale(1.08)" : "scale(1)",
            color: "#8B5CF6",
          }}
        >
          {template.icon}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1">{template.name}</h3>
        <p className="text-zinc-400 text-xs leading-relaxed mb-3">{template.description}</p>
        <button
          className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-200"
          style={{ color: "#8B5CF6" }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#A78BFA"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
        >
          Use template
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
