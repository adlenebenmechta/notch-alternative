"use client";

import { useEffect, useRef } from "react";
import { cssVar } from "@/lib/site/theme-colors";

/**
 * PixelDissolve — canvas overlay that plays a blocky pixel dissolve
 * when the parent enters the viewport: ink-colored blocks scatter away
 * to reveal the content beneath. One-shot, self-terminating, cheap.
 * Parent must be `relative` + `overflow-hidden` (WorkCard qualifies).
 * Skipped for reduced-motion.
 */
export function PixelDissolve() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let blocks: { x: number; y: number; s: number; d: number }[] = [];

    const build = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (!w || !h) return false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cell = Math.max(12, Math.round(Math.min(w, h) / 9));
      blocks = [];
      for (let y = 0; y < h; y += cell)
        for (let x = 0; x < w; x += cell)
          blocks.push({
            x,
            y,
            s: cell + 1,
            d: Math.random() * 420 + Math.random() * 220,
          });
      return true;
    };

    const play = () => {
      if (!build()) return;
      const start = performance.now();
      const DUR = 900;
      const draw = (now: number) => {
        const t = now - start;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const b of blocks) {
          const p = Math.min(1, Math.max(0, (t - b.d) / 260));
          if (p < 1) alive = true;
          const ease = 1 - Math.pow(1 - p, 2);
          const s = b.s * (1 - ease);
          if (s <= 0.4) continue;
          ctx.fillStyle = cssVar("--w8-bg-2", "#131022");
          ctx.fillRect(b.x + (b.s - s) / 2, b.y + (b.s - s) / 2, s, s);
        }
        if (alive) {
          raf = requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      // initial fill so the poster is hidden until the reveal starts
      ctx.fillStyle = cssVar("--w8-bg-2", "#131022");
      ctx.fillRect(0, 0, parent.clientWidth, parent.clientHeight);
      raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(parent);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 z-20 pointer-events-none"
    />
  );
}
