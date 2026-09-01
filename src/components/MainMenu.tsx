"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import UserProfilePanel from "@/components/UserProfilePanel";
import { useAppLang, APP_LOCALES } from "@/lib/i18n";

// ─── Colors (restrained: one accent + neutrals) ─────────────────────────────

const C = {
  accent: "#FF2E88",
  dark: "#0A0A0B",
  white: "#FFFFFF",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  softPink: "#FDE8F0",
  lightPink: "#F9E4EE",
};

// ─── Machine icons (clean, consistent 24px strokes) ─────────────────────────

function MachineIcon({ id }: { id: string }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "ai-avatar-machine": // talking-head videos
      return (
        <svg {...common}>
          <rect x="2" y="6" width="13" height="12" rx="2" />
          <path d="m22 8-7 4 7 4V8Z" />
        </svg>
      );
    case "ai-viral-carousel": // three vertical panels
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
      );
    case "ai-podcast-machine": // microphone
      return (
        <svg {...common}>
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
        </svg>
      );
    case "bof-videos-machine": // package / bulk products
      return (
        <svg {...common}>
          <path d="M21 8v12H3V8" />
          <path d="m1.5 3.5 10.5 5 10.5-5" />
          <path d="M12 8.5V21" />
        </svg>
      );
    case "claymotion-videos-machine": // film strip
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
        </svg>
      );
    case "allinone-machine": // dashboard grid
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "autopublish-machine": // paper plane
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4 20-7Z" />
          <path d="m22 2-11 11" />
        </svg>
      );
    case "schedule-machine": // calendar
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "notch-alternative": // clone / copy
      return (
        <svg {...common}>
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

// ─── Auth Modal ─────────────────────────────────────────────────────────────

function AuthModal({ isOpen, onClose, defaultMode }: {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}) {
  const { t } = useAppLang();
  const { signIn, signUp, signInGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(defaultMode !== "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLogin(defaultMode !== "signup");
      setName("");
      setEmail("");
      setPassword("");
      setError("");
      setLoading(false);
      setGoogleLoading(false);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await signIn(email.toLowerCase().trim(), password);
      } else {
        result = await signUp(email.toLowerCase().trim(), password, name.trim());
      }

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || "Unknown error");
      setError(`Sign-in error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await signInGoogle();
      if (result.error && result.error.length > 0) {
        setError(result.error);
      } else {
        onClose();
      }
    } catch {
      setError("Google sign-in failed. Please try email sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          animation: "authModalIn 0.3s ease-out",
          backgroundColor: C.white,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "#F3F4F6", color: C.dark }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Top accent bar */}
        <div className="w-full h-1" style={{ backgroundColor: C.accent }} />

        <div className="p-7 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
              style={{ backgroundColor: C.softPink }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: C.dark }}>
              {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
            </h2>
          </div>

          {/* ─── Google Button ───────────────────────────────── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 mb-4"
            style={{
              backgroundColor: "#F3F4F6",
              color: C.dark,
              border: "1.5px solid #E5E7EB",
            }}
          >
            {googleLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
            <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
          </div>

          {/* Tab Toggle */}
          <div
            className="flex rounded-xl p-1 mb-5"
            style={{ backgroundColor: "#F3F4F6" }}
          >
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(""); }}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                backgroundColor: isLogin ? C.white : "transparent",
                color: isLogin ? C.dark : C.textMuted,
                boxShadow: isLogin ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(""); }}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                backgroundColor: !isLogin ? C.white : "transparent",
                color: !isLogin ? C.dark : C.textMuted,
                boxShadow: !isLogin ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
              style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.text }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  required={!isLogin}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "#FAFAFA",
                    border: "1.5px solid #E5E7EB",
                    color: C.text,
                  }}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.text }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: "#FAFAFA",
                  border: "1.5px solid #E5E7EB",
                  color: C.text,
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.text }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "#FAFAFA",
                    border: "1.5px solid #E5E7EB",
                    color: C.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#9CA3AF" }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: C.accent, color: C.white }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {isLogin ? "Signing in..." : "Creating..."}
                </span>
              ) : (
                isLogin ? t("auth.signIn") : t("auth.signUp")
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes authModalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ─── MainMenu — one clean screen, no scroll ──────────────────────────────────

interface MainMenuProps {
  onNavigate: (destination: string) => void;
  onOpenLibrary?: () => void;
}

const MACHINES = [
  "ai-avatar-machine",
  "ai-viral-carousel",
  "ai-podcast-machine",
  "bof-videos-machine",
  "claymotion-videos-machine",
  "allinone-machine",
  "autopublish-machine",
  "schedule-machine",
  "notch-alternative",
];

export default function MainMenu({
  onNavigate,
  onOpenLibrary,
}: MainMenuProps) {
  const { user, loading, signOut } = useAuth();
  const { locale, setLocale, t, rtl } = useAppLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [hovered, setHovered] = useState<string | null>(null);

  const isAuthenticated = !!user;
  const userName = user?.name || "User";
  const userPlan = user?.plan || "free";
  const creditsUsed = user?.creditsUsed || 0;
  const creditsLimit = user?.creditsLimit || 3;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fallback: if the video doesn't fire canplaythrough within 4s, reveal anyway
  useEffect(() => {
    const timer = setTimeout(() => setVideoLoaded(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleVideoCanPlay = () => {
    setVideoLoaded(true);
    videoRef.current?.play().catch(() => {});
  };

  const handleCardClick = (id: string) => {
    if (!isAuthenticated) {
      setAuthMode("signup");
      setShowAuth(true);
      return;
    }
    onNavigate(id);
  };

  const openSignIn = () => {
    setAuthMode("login");
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  // Show loading screen while auth session is being restored
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: C.dark }}>
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: C.accent }}
          />
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen overflow-hidden relative"
      dir={rtl ? "rtl" : "ltr"}
      style={{ fontFamily: "var(--font-etna), 'Etna', sans-serif" }}
    >
      {/* ─── Video Background ─────────────────────────────────── */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: C.dark }} />
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onCanPlayThrough={handleVideoCanPlay}
        onLoadedData={handleVideoCanPlay}
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
      >
        <source src="/videos/menu-bg.mp4" type="video/mp4" />
      </video>
      {/* readable scrim — keeps text legible on any frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,8,10,0.62) 0%, rgba(8,8,10,0.52) 45%, rgba(8,8,10,0.82) 100%)",
        }}
      />

      {/* ─── Content (fits one screen, no scroll) ─────────────── */}
      <div className="relative z-10 h-full flex flex-col px-5 sm:px-8 py-4 sm:py-6">

        {/* Top Bar */}
        <header className="flex items-center justify-between shrink-0">
          {/* Wordmark */}
          <div
            className="flex items-center gap-2.5 transition-all duration-500"
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-8px)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black tracking-tight"
              style={{ backgroundColor: C.accent, color: C.white }}
            >
              W8
            </div>
            <div className="leading-none">
              <div className="text-[15px] font-bold tracking-tight" style={{ color: C.white }}>
                WENOV8
              </div>
              <div className="text-[9px] font-medium tracking-[0.22em] uppercase mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                Studio
              </div>
            </div>
          </div>

          {/* Right: language + auth / user */}
          <div
            className="flex items-center gap-2 sm:gap-3 transition-all duration-500 delay-100"
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-8px)" }}
          >
            {/* Language switcher */}
            <div
              className="flex items-center rounded-full p-0.5"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {APP_LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: locale === l.code ? C.accent : "transparent",
                    color: locale === l.code ? C.white : "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                  aria-pressed={locale === l.code}
                >
                  {l.short}
                </button>
              ))}
            </div>

            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onOpenLibrary?.()}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: C.white,
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5.5C3 4.67 3.67 4 4.5 4h2.6c.7 0 1.3.46 1.48 1.13l.6 2.2c.15.55-.04 1.14-.48 1.5L7.4 10.4a13.5 13.5 0 0 0 6.2 6.2l1.57-1.3c.36-.44.95-.63 1.5-.48l2.2.6c.67.18 1.13.78 1.13 1.48v2.6c0 .83-.67 1.5-1.5 1.5C9.9 21 3 14.1 3 5.5Z" />
                  </svg>
                  {t("menu.library")}
                </button>
                <UserProfilePanel
                  name={userName}
                  email={user?.email || ""}
                  role={user?.role || "user"}
                  plan={userPlan}
                  creditsUsed={creditsUsed}
                  creditsLimit={creditsLimit}
                  variant="dark"
                  onSignOut={() => { signOut(); }}
                />
              </>
            ) : (
              <>
                <button
                  onClick={openSignIn}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                  style={{ color: C.white, border: "1px solid rgba(255,255,255,0.22)" }}
                >
                  {t("auth.signIn")}
                </button>
                <button
                  onClick={openSignUp}
                  className="px-4 sm:px-5 py-2 rounded-full text-xs font-semibold transition-colors"
                  style={{ backgroundColor: C.accent, color: C.white }}
                >
                  {t("auth.signUp")}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Main — compact heading + machine grid */}
        <main className="flex-1 min-h-0 flex flex-col justify-center max-w-5xl w-full mx-auto">
          {/* Heading */}
          <div
            className="text-center mb-5 sm:mb-7 transition-all duration-500 delay-150"
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)" }}
          >
            <h2
              className="text-xl sm:text-2xl lg:text-[28px] font-bold tracking-tight leading-tight"
              style={{ color: C.white, textShadow: "0 1px 12px rgba(0,0,0,0.45)" }}
            >
              {isAuthenticated
                ? t("header.welcomeBackName", { name: userName.split(" ")[0] })
                : t("menu.title")}
            </h2>
            <p
              className="mt-1.5 text-[13px] sm:text-sm max-w-md mx-auto leading-relaxed"
              style={{ color: "rgba(255,255,255,0.68)" }}
            >
              {isAuthenticated ? t("header.subAuth") : t("header.subGuest")}
            </p>
          </div>

          {/* Machine grid — 9 tools, always visible on one screen */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
            {MACHINES.map((id, index) => {
              const isHovered = hovered === id;
              const isLast = index === MACHINES.length - 1;
              return (
                <button
                  key={id}
                  onClick={() => handleCardClick(id)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group text-left rounded-xl sm:rounded-2xl px-3.5 sm:px-5 py-3.5 sm:py-4 flex items-center gap-3.5 sm:gap-4 transition-all duration-200 ${isLast ? "col-span-2 md:col-span-1" : ""}`}
                  style={{
                    backgroundColor: "rgba(15,15,19,0.78)",
                    border: `1px solid ${isHovered ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.10)"}`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                    opacity: mounted ? 1 : 0,
                    transitionDelay: mounted ? `${200 + index * 50}ms` : "0ms",
                  }}
                >
                  {/* Icon */}
                  <span
                    className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors duration-200"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.07)",
                      color: isHovered ? C.white : "rgba(255,255,255,0.62)",
                    }}
                  >
                    <MachineIcon id={id} />
                  </span>

                  {/* Text */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] sm:text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: C.white }}>
                      {t(`menu.${id}.title`)}
                    </span>
                    <span className="block text-[11px] sm:text-xs leading-snug line-clamp-2 sm:line-clamp-1 mt-0.5" style={{ color: "rgba(255,255,255,0.48)" }}>
                      {t(`menu.${id}.subtitle`)}
                    </span>
                  </span>

                  {/* Arrow — appears on hover (desktop only), RTL-aware */}
                  <span
                    className="shrink-0 hidden sm:block transition-all duration-200"
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? `translateX(${rtl ? -4 : 4}px)` : "translateX(0)",
                      color: C.accent,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ transform: rtl ? "scaleX(-1)" : "none" }}>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        {/* Footer — one quiet line */}
        <footer
          className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-1.5 pt-2 transition-all duration-500 delay-500"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            &copy; {new Date().getFullYear()} WENOV8
          </p>
          <div className="flex items-center gap-4">
            {[
              { label: t("footer.privacy"), href: "/privacy-policy" },
              { label: t("footer.terms"), href: "/terms-of-service" },
              { label: "Support", href: "/support" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[11px] font-medium transition-colors hover:opacity-80"
                style={{ color: "rgba(255,255,255,0.62)" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </footer>
      </div>

      {/* ─── Auth Modal ───────────────────────────────────────── */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
