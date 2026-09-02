"use client";

import { useReducedMotion } from "framer-motion";

/**
 * WordmarkDisplay — the big Y2K chrome statement.
 *
 * The word (STUDIO / WENOV8) rendered in Unbounded, one letter at a
 * time: each glyph rises into place with a slight rotation, then the
 * brand glow behind breathes softly. Pure CSS stagger — zero canvas
 * cost, settles instantly under reduced motion.
 */
export function WordmarkDisplay({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden
      data-nosnippet
    >
      {/* soft brand glow behind the word */}
      <div
        className="absolute inset-0 -z-10 w8-wl-glow"
        style={{
          background:
            "radial-gradient(60% 90% at 50% 50%, var(--w8-accent-soft) 0%, transparent 72%)",
          filter: "blur(24px)",
        }}
      />
      <span
        className="w8-wordmark w8-chrome-text"
        style={{
          filter: "drop-shadow(0 10px 44px rgba(232, 89, 12, 0.2))",
        }}
      >
        {reduce ? (
          text
        ) : (
          <span className="w8-wordmark-letters">
            {Array.from(text).map((ch, i) => (
              <span
                key={i}
                className="w8-wl"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>
  );
}
