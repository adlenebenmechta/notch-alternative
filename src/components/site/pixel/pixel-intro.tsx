"use client";

import { useEffect, useRef, useState } from "react";
import { drawPixelText, pixelTextWidth } from "@/lib/site/pixel-font";

/**
 * PixelIntro — the boot sequence. Scattered pixels assemble into the
 * WENOV8 wordmark, hold for a beat, then dissolve to reveal the site.
 * Fast by design (~2.6s), click-to-skip, skipped entirely for
 * prefers-reduced-motion.
 */
export function PixelIntro() {
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const DURATION = 2600;

    const finish = () => {
      if (!cancelled) setDone(true);
    };

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // wait for the display font so the sampled wordmark is on-brand
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = vw * dpr;
      canvas.height = vh * dpr;
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ── sample the wordmark at low resolution ──
      const off = document.createElement("canvas");
      off.width = 150;
      off.height = 34;
      const octx = off.getContext("2d")!;
      octx.fillStyle = "#fff";
      octx.font = '800 26px Sora, "Arial Black", Arial, sans-serif';
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText("WENOV8", 75, 18);
      const img = octx.getImageData(0, 0, 150, 34).data;

      const unit = Math.max(4, Math.min(9, Math.floor(vw / 150)));
      const targets: { x: number; y: number }[] = [];
      for (let y = 0; y < 34; y += 2) {
        for (let x = 0; x < 150; x += 2) {
          if (img[(y * 150 + x) * 4 + 3] > 128) {
            targets.push({ x, y });
          }
        }
      }
      const wW = 150 * unit;
      const wH = 34 * unit;
      const ox = (vw - wW) / 2;
      const oy = vh * 0.42 - wH / 2;

      // ── particle states ──
      const parts = targets.map((t) => ({
        tx: ox + t.x * unit,
        ty: oy + t.y * unit,
        x0: Math.random() * vw,
        y0: Math.random() * vh,
        d: Math.random() * 0.5,
        lime: Math.random() < 0.07,
        sz: unit * (Math.random() < 0.15 ? 0.85 : 1),
      }));

      const sub = "THE CREATIVE MACHINE";
      const subCell = Math.max(2, Math.floor(unit * 0.42));
      const subW = pixelTextWidth(sub) * subCell;

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      const frame = (now: number) => {
        if (cancelled) return;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, vw, vh);

        // pixels
        for (const p of parts) {
          const appear = Math.min(1, Math.max(0, (t - p.d * 0.35) / 0.3));
          if (appear <= 0) continue;
          const conv = easeOut(
            Math.min(1, Math.max(0, (t - 0.55 - p.d) / 1.1))
          );
          const x = p.x0 + (p.tx - p.x0) * conv;
          const y = p.y0 + (p.ty - p.y0) * conv;
          ctx.globalAlpha = appear * (0.55 + 0.45 * conv);
          ctx.fillStyle = p.lime ? "#7dd3fc" : "#f4f3ee";
          const s = p.sz * (1 + (1 - conv) * 0.8);
          ctx.fillRect(x, y, s, s);
        }

        // sub-label materializes once the wordmark is formed
        if (t > 1.75) {
          const a = Math.min(1, (t - 1.75) / 0.45);
          ctx.globalAlpha = a * 0.9;
          drawPixelText(
            ctx,
            sub,
            (vw - subW) / 2,
            oy + wH + unit * 4,
            subCell,
            "#9b9ba2"
          );
        }

        ctx.globalAlpha = 1;

        if (t * 1000 < DURATION) {
          raf = requestAnimationFrame(frame);
        } else {
          finish();
        }
      };
      raf = requestAnimationFrame(frame);
    };

    run();

    const skip = () => finish();
    window.addEventListener("pointerdown", skip, { once: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] bg-[#0a0a0b] flex items-center justify-center w8-intro-fade"
      data-nosnippet
    >
      <canvas ref={canvasRef} className="block" />
      <span className="sr-only">WENOV8 — loading</span>
    </div>
  );
}
