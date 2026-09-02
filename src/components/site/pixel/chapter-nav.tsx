"use client";

import { CHAPTER_IDS } from "../scene/scene-state";

/**
 * ChapterNav — fixed Y2K chapter indicator (desktop ≥lg).
 * Each chapter is a chrome orb; the active orb grows, glows
 * pink and pulses like a heartbeat. Click jumps to the section.
 * (Orbs instead of numbers — numbering lives only in
 * "How It Works".)
 */
export function ChapterNav({
  active,
  onJump,
}: {
  active: number;
  onJump?: (i: number) => void;
}) {
  return (
    <nav
      aria-label="Chapters"
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end gap-3.5"
    >
      <span
        aria-hidden
        className="w8-pixel absolute left-full -ml-0 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] tracking-[0.3em] w8-muted-hi select-none"
        style={{ color: "var(--w8-muted)" }}
      >
        JOURNEY
      </span>
      {CHAPTER_IDS.map((id, i) => {
        const isActive = i === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onJump?.(i)}
            data-cursor="open"
            aria-label={`Chapter — ${id.replace("-", " ")}`}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3 py-0.5"
          >
            <span
              className={`w8-pixel text-[9px] tracking-[0.14em] uppercase transition-all duration-300 ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              style={{ color: "var(--w8-text)" }}
            >
              {id.replace("-", " ")}
            </span>
            <span
              aria-hidden
              className={`block rounded-full transition-all duration-300 ${
                isActive ? "w8-blink" : ""
              }`}
              style={{
                width: isActive ? 14 : 8,
                height: isActive ? 14 : 8,
                background: isActive
                  ? "radial-gradient(circle at 32% 30%, #ffffff 0%, var(--w8-ember) 60%)"
                  : "var(--w8-line-strong)",
                boxShadow: isActive
                  ? "0 0 14px 1px rgba(232, 89, 12, 0.45)"
                  : "none",
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
