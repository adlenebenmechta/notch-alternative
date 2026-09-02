"use client";

import { useEffect, useState } from "react";

/**
 * Y2KIntro — the WENOV8 boot reveal.
 *
 * "W8" rises in solid ink (Brewok),
 * then the invitation fades in beneath it in Game Paused:
 * "TRY WENOV8". ~3s total, click-to-skip, skipped for
 * reduced-motion. Pure DOM/CSS — no canvas.
 */
export function Y2KIntro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }

    const finish = () => setDone(true);
    const t = window.setTimeout(finish, 3100);
    window.addEventListener("pointerdown", finish, { once: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", finish);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center w8-intro-fade"
      style={{ background: "var(--w8-bg)" }}
      data-nosnippet
    >
      {/* chrome W8 mark */}
      <div
        className="w8-chrome-text"
        style={{
          fontSize: "clamp(4.5rem, 16vw, 11rem)",
          lineHeight: 1,
          animation: "w8-intro-pop 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        W8
      </div>

      {/* invitation */}
      <p
        className="w8-pixel"
        style={{
          color: "var(--w8-ember)",
          fontSize: "clamp(0.9rem, 2.2vw, 1.2rem)",
          marginTop: "1.4rem",
          letterSpacing: "0.42em",
          opacity: 0,
          animation: "w8-intro-note 0.8s cubic-bezier(0.22, 1, 0.36, 1) 1.15s both",
        }}
      >
        TRY&nbsp;WENOV8
      </p>

      {/* soft brand glow under the mark */}
      <div
        style={{
          position: "absolute",
          width: "46vw",
          height: "46vw",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--w8-accent-soft) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <span className="sr-only">WENOV8 — loading</span>

      <style>{`
        @keyframes w8-intro-pop {
          from { opacity: 0; transform: scale(0.82) translateY(14px); filter: blur(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes w8-intro-note {
          from { opacity: 0; transform: translateY(8px); letter-spacing: 0.6em; }
          to { opacity: 1; transform: translateY(0); letter-spacing: 0.42em; }
        }
      `}</style>
    </div>
  );
}
