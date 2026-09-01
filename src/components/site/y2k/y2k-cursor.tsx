"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Y2KCursor — desktop-only custom cursor with a chrome soul.
 * Normal: a glossy chrome ring + small pink dot.
 * Over [data-cursor] targets: the ring expands, gains the brand
 * gradient glow and shows an italic Kabisat label
 * (VIEW / EXPLORE / OPEN). Disabled on touch + reduced-motion.
 */

const LABELS: Record<string, string> = {
  view: "VIEW",
  explore: "EXPLORE",
  open: "OPEN",
};

export function Y2KCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.body.classList.add("w8-pixel-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let x = mx;
    let y = my;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-cursor]");
      const v = el?.getAttribute("data-cursor");
      setLabel(v && LABELS[v] ? LABELS[v] : null);
    };

    const loop = () => {
      x += (mx - x) * 0.34;
      y += (my - y) * 0.34;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0)`;
      }
      if (ring.current) {
        const s = label ? 1.65 : 1;
        ring.current.style.transform = `translate3d(${x - 17}px, ${y - 17}px, 0) scale(${s})`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      document.body.classList.remove("w8-pixel-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [label]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-[90] pointer-events-none hidden md:block">
      {/* trailing chrome ring */}
      <div
        ref={ring}
        className="fixed top-0 left-0 w-[34px] h-[34px] rounded-full transition-colors duration-200"
        style={{
          border: "1.5px solid",
          borderColor: label ? "var(--w8-ember)" : "var(--w8-line-strong)",
          background: label ? "var(--w8-accent-soft)" : "rgba(255,255,255,0.04)",
          boxShadow: label
            ? "0 0 22px -2px rgba(255, 77, 166, 0.55), inset 0 0 12px rgba(255,255,255,0.18)"
            : "inset 0 2px 6px rgba(255,255,255,0.22), inset 0 -3px 8px rgba(157,107,255,0.25)",
          backdropFilter: "blur(2px)",
        }}
      >
        {label && (
          <span
            className="w8-pixel absolute left-1/2 -translate-x-1/2 top-[40px] text-[10px] tracking-[0.16em] whitespace-nowrap"
            style={{ color: "var(--w8-ember)" }}
          >
            {label}
          </span>
        )}
      </div>
      {/* exact pointer dot — a tiny brand orb */}
      <div
        ref={dot}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full"
        style={{
          background: "var(--w8-ember)",
          boxShadow: "0 0 8px rgba(255, 77, 166, 0.8)",
        }}
      />
    </div>
  );
}
