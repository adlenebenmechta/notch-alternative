"use client";

import { useEffect, useRef, useState } from "react";

/**
 * PixelCursor — desktop-only custom cursor with a pixel soul.
 * Normal: 10px lime-outlined square + center dot.
 * Over [data-cursor] targets: expands and shows a pixel label
 * (VIEW / EXPLORE / OPEN). Disabled on touch + reduced-motion.
 */

const LABELS: Record<string, string> = {
  view: "VIEW",
  explore: "EXPLORE",
  open: "OPEN",
};

export function PixelCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
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
      x += (mx - x) * 0.38;
      y += (my - y) * 0.38;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${mx - 2}px, ${my - 2}px, 0)`;
      }
      if (box.current) {
        const s = label ? 1.7 : 1;
        box.current.style.transform = `translate3d(${x - 14}px, ${y - 14}px, 0) scale(${s})`;
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
      {/* trailing square */}
      <div
        ref={box}
        className="fixed top-0 left-0 w-7 h-7 border transition-colors duration-200"
        style={{
          borderColor: label ? "#c6f135" : "rgba(244,243,238,0.65)",
          background: label ? "rgba(198,241,53,0.12)" : "transparent",
        }}
      >
        {label && (
          <span
            className="absolute left-1/2 -translate-x-1/2 top-[34px] text-[9px] font-bold tracking-[0.18em] whitespace-nowrap"
            style={{ color: "#c6f135", fontFamily: "var(--w8-font-display)" }}
          >
            {label}
          </span>
        )}
      </div>
      {/* exact pointer dot */}
      <div
        ref={dot}
        className="fixed top-0 left-0 w-1 h-1"
        style={{ background: "#c6f135" }}
      />
    </div>
  );
}
