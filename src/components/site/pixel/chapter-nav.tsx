"use client";

import { CHAPTER_IDS } from "../scene/scene-state";
import { PixelText } from "./pixel-text";

/**
 * ChapterNav — fixed pixel chapter indicator (desktop ≥lg).
 * Shows the 7 chapters of the journey; active chapter animates.
 * Click jumps to the section.
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
        className="w8-pixel absolute left-full -ml-0 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] tracking-[0.3em] text-[#6d6d74] select-none"
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
            aria-label={`Chapter ${String(i + 1).padStart(2, "0")} — ${id}`}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3 py-0.5"
          >
            <span
              className={`w8-pixel text-[9px] tracking-[0.14em] uppercase transition-all duration-300 ${
                isActive
                  ? "text-[#f4f3ee] opacity-100"
                  : "text-[#9b9ba2] opacity-0 group-hover:opacity-100"
              }`}
            >
              {id.replace("-", " ")}
            </span>
            <PixelText
              text={String(i + 1).padStart(2, "0")}
              cell={isActive ? 3 : 2}
              color={isActive ? "#7dd3fc" : "#6d6d74"}
              className={isActive ? "w8-blink" : ""}
            />
          </button>
        );
      })}
    </nav>
  );
}
