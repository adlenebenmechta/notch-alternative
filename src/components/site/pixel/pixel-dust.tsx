"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cssVar } from "@/lib/site/theme-colors";

/**
 * PixelDust — the refined pixel layer over the video backdrop.
 *
 * Deliberately quiet and premium: a sparse field of small square
 * "pixels" in bone + the three brand hues, drifting slowly upward
 * with gentle twinkle. A few larger accent pixels pulse near the
 * edges. Rendered full-res on a 2D canvas (cheap, no WebGL).
 *
 * Rebuilt on theme change so canvas colors always match the mode.
 * Static single frame for prefers-reduced-motion.
 */

interface Dust {
  x: number;
  y: number;
  s: number; // size px
  ci: number; // color index
  ph: number; // twinkle phase
  sp: number; // twinkle speed
  vy: number; // upward drift px/s
  vx: number; // sway amplitude
  base: number; // base alpha
}

const N_DUST = { mobile: 34, desktop: 64 };

export function PixelDust() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // palette resolved from the live theme
    const COLORS = [
      cssVar("--w8-text", "#f2efe6"),
      cssVar("--w8-text", "#f2efe6"),
      cssVar("--w8-text", "#f2efe6"),
      cssVar("--w8-ember", "#ff6b4a"),
      cssVar("--w8-gold", "#ffc145"),
      cssVar("--w8-aqua", "#2de1c2"),
    ];

    let W = 0;
    let H = 0;
    let dust: Dust[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const build = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = vw;
      H = vh;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = vw < 768 ? N_DUST.mobile : N_DUST.desktop;
      dust = Array.from({ length: count }, () => {
        const big = Math.random() < 0.12;
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          s: big ? 4 + Math.random() * 2 : 1.5 + Math.random() * 2.5,
          ci: Math.floor(Math.random() * COLORS.length),
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 1.4,
          vy: 6 + Math.random() * 14,
          vx: 6 + Math.random() * 18,
          base: big ? 0.5 + Math.random() * 0.3 : 0.18 + Math.random() * 0.4,
        };
      });
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of dust) {
        if (!reduce) {
          p.y -= (p.vy * dt) / 1.6;
          if (p.y < -6) {
            p.y = H + 6;
            p.x = Math.random() * W;
          }
        }
        const sway = Math.sin(t * 0.4 + p.ph) * p.vx * 0.14;
        const tw = 0.55 + 0.45 * Math.sin(t * p.sp + p.ph);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.base * tw));
        ctx.fillStyle = COLORS[p.ci];
        ctx.fillRect(
          Math.round(p.x + sway),
          Math.round(p.y),
          Math.round(p.s),
          Math.round(p.s)
        );
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      draw(dt);
      raf = requestAnimationFrame(frame);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    };

    build();
    if (reduce) {
      draw(0);
    } else {
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-[1] pointer-events-none block w-full h-full"
    />
  );
}
