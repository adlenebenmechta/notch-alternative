"use client";

import { useEffect, useRef } from "react";
import { pixelTextCells, pixelTextWidth } from "@/lib/site/pixel-font";

/**
 * ConvergeCanvas — the signature WENOV8 pixel moment.
 * Particles drift across the canvas; as the section scrolls into view
 * they converge and assemble into the given wordmark rendered with the
 * 5×7 bitmap font. Progress is scroll-linked (not time-linked), so the
 * visitor controls the assembly. Reduced-motion: renders formed state.
 */
export function ConvergeCanvas({
  text,
  className = "",
  cell = 5,
  height,
}: {
  text: string;
  className?: string;
  /** glyph cell size in CSS px */
  cell?: number;
  /** canvas height in px (width = parent) */
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    let progress = 0;

    const resize = () => {
      const w = wrap.clientWidth;
      const h = height ?? Math.max(90, Math.min(200, w * 0.22));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ── assemble targets from the bitmap font ──
    const cells = pixelTextCells(text);
    const tw = pixelTextWidth(text);
    const parts = cells.map((c) => ({
      tx: c.x,
      ty: c.y,
      x0: Math.random(),
      y0: Math.random(),
      d: Math.random() * 0.3,
      lime: Math.random() < 0.08,
    }));

    const draw = () => {
      const w = wrap.clientWidth;
      const h = height ?? Math.max(90, Math.min(200, w * 0.22));
      ctx.clearRect(0, 0, w, h);

      const scale = Math.min(cell, (w * 0.92) / tw);
      const ox = (w - tw * scale) / 2;
      const oy = (h - 7 * scale) / 2;
      const t = performance.now() * 0.001;

      for (const p of parts) {
        const conv = reduce
          ? 1
          : Math.min(1, Math.max(0, (progress * 1.35 - p.d) / 0.55));
        const e = conv * conv * (3 - 2 * conv);
        const driftX = Math.sin(t * 0.7 + p.d * 18) * (1 - e) * 24;
        const driftY = Math.cos(t * 0.6 + p.d * 22) * (1 - e) * 16;
        const x =
          ox +
          (p.x0 * w + driftX + (p.tx * scale - p.x0 * w) * e);
        const y =
          oy +
          (p.y0 * h + driftY + (p.ty * scale - p.y0 * h) * e);
        ctx.globalAlpha = 0.35 + 0.65 * e;
        ctx.fillStyle = p.lime ? "#7dd3fc" : "#f4f3ee";
        ctx.fillRect(x, y, scale * 0.92, scale * 0.92);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      if (visible) draw();
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when section top hits 95% of viewport, 1 at 40%
      progress = Math.min(
        1,
        Math.max(0, (vh * 0.95 - r.top) / (vh * 0.55))
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { rootMargin: "120px" }
    );
    io.observe(wrap);
    resize();
    onScroll();
    if (reduce) {
      draw(); // static formed state
    } else {
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", onScroll, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [text, cell, height]);

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
