"use client";

import React from "react";
import { useAppLang } from "@/lib/i18n";

// ─── Colors (matching the app design) ────────────────────────────────────────

const C = {
  pink: "#E461AD",
  dark: "#0A0A0A",
  text: "#1A1A2E",
  white: "#FFFFFF",
  cream: "#FFF8F0",
  warmGray: "#B8A99A",
  violet: "#593dfa",
};

const NOTCH_URL = "https://armoray-studio.vercel.app/?studio=1";

/**
 * Notch Alternative window — embeds the AI Ad Cloning platform
 * (Reference X-Ray → Brand Brain → Script Rewriter → Scene Engine → Speech QA)
 * inside the Avatar Machine as a full-screen app window, like the other machines.
 */
export default function NotchAltView({ onBack }: { onBack: () => void }) {
  const { t, rtl } = useAppLang();
  const [loading, setLoading] = React.useState(true);

  return (
    <div
      className="min-h-screen flex flex-col"
      dir={rtl ? "rtl" : "ltr"}
      style={{ backgroundColor: C.cream, fontFamily: "var(--font-etna), 'Etna', sans-serif" }}
    >
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 md:px-6 py-3 border-b shrink-0"
        style={{ backgroundColor: C.white, borderColor: "rgba(228, 97, 173, 0.2)" }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: "rgba(228, 97, 173, 0.1)", color: C.pink }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: rtl ? "scaleX(-1)" : "none" }}
          >
            <path d="M19 12H5m0 0l6-6m-6 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("notchWindow.back")}
        </button>

        {/* Title + badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #593dfa, #c026d3)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span className="text-sm md:text-base font-bold truncate" style={{ color: C.text }}>
            {t("notchWindow.title")}
          </span>
        </div>

        {/* Open in new tab */}
        <a
          href={NOTCH_URL}
          target="_blank"
          rel="noreferrer"
          className="ms-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-80 shrink-0"
          style={{ backgroundColor: C.dark, color: C.white }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">{t("notchWindow.openTab")}</span>
        </a>
      </header>

      {/* ─── Embedded platform ──────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: C.cream }}>
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: "rgba(89, 61, 250, 0.25)", borderTopColor: C.violet }}
            />
            <p className="text-sm font-medium" style={{ color: C.warmGray }}>
              {t("notchWindow.loading")}
            </p>
          </div>
        )}
        <iframe
          src={NOTCH_URL}
          title={t("notchWindow.title")}
          className="w-full border-0" style={{ height: "calc(100vh - 57px)", display: "block" }}
          allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
