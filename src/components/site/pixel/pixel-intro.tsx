"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  drawPixelText,
  pixelTextCells,
  pixelTextWidth,
} from "@/lib/site/pixel-font";
import { cssVar } from "@/lib/site/theme-colors";

/**
 * PixelIntro — the W8 boot sequence.
 *
 * "W8" — the mark that means *wait* — assembles from scattered
 * pixels (W8 = WAIT), holds for a beat, then the invitation types
 * in beneath it: "TRY WENOV8". The whole film dissolves to reveal
 * the site. ~3s total, click-to-skip, skipped for reduced-motion.
 *
 * Colors resolve from the live theme so the boot film matches the
 * visitor's mode (bone-on-space or ink-on-paper).
 */
export function PixelIntro() {
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDone(true);
      return;
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();

    // timeline (seconds)
    const T_ASSEMBLE = 1.05; // pixels converge into W8
    const T_INVITE = 1.45; // TRY WENOV8 starts typing in
    const T_HOLD = 2.55; // hold complete state
    const T_END = 3.0; // dissolved

    const finish = () => {
      if (!cancelled) setDone(true);
    };

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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

      // theme palette
      const ink = cssVar("--w8-text", "#f2efe6");
      const ember = cssVar("--w8-ember", "#ff6b4a");
      const gold = cssVar("--w8-gold", "#ffc145");
      const muted = cssVar("--w8-muted", "#a7a095");

      // ── assemble targets from the bitmap font "W8" ──
      const cells = pixelTextCells("W8");
      const tw = pixelTextWidth("W8");
      const unit = Math.max(9, Math.min(26, Math.floor(vw / 34)));
      const wW = tw * unit;
      const wH = 7 * unit;
      const ox = (vw - wW) / 2;
      const oy = vh * 0.42 - wH / 2;

      const parts = cells.map((c) => ({
        tx: ox + c.x * unit,
        ty: oy + c.y * unit,
        x0: Math.random() * vw,
        y0: Math.random() * vh,
        d: Math.random() * 0.5,
        accent: Math.random() < 0.08,
        sz: unit * (Math.random() < 0.15 ? 0.82 : 1),
      }));

      // ── the invitation, typed in with the pixel font ──
      const invite = "TRY WENOV8";
      const subCell = Math.max(3, Math.floor(unit * 0.34));
      const subW = pixelTextWidth(invite) * subCell;
      const subX = (vw - subW) / 2;
      const subY = oy + wH + unit * 2.6;

      // footnote
      const note = "W8 MEANS WAIT";
      const noteCell = Math.max(2, Math.floor(subCell * 0.62));
      const noteW = pixelTextWidth(note) * noteCell;
      const noteX = (vw - noteW) / 2;
      const noteY = subY + subCell * 11;

      const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

      const frame = (now: number) => {
        if (cancelled) return;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, vw, vh);

        // ── W8 pixel assembly ──
        for (const p of parts) {
          const appear = Math.min(1, Math.max(0, (t - p.d * 0.3) / 0.28));
          if (appear <= 0) continue;
          const conv = easeOut(
            Math.min(1, Math.max(0, (t - 0.12 - p.d) / (T_ASSEMBLE - 0.12)))
          );
          // dissolve back out at the very end
          const out =
            t > T_HOLD ? 1 - Math.min(1, (t - T_HOLD) / (T_END - T_HOLD)) : 1;
          const x = p.x0 + (p.tx - p.x0) * conv;
          const y = p.y0 + (p.ty - p.y0) * conv;
          ctx.globalAlpha = appear * out * (0.55 + 0.45 * conv);
          ctx.fillStyle = p.accent ? ember : ink;
          const s = p.sz * (1 + (1 - conv) * 0.7);
          ctx.fillRect(x, y, s, s);
        }

        // bright gold frame pulse around the formed W8
        if (t > T_ASSEMBLE && t < T_INVITE + 0.2) {
          const a =
            Math.sin(
              Math.min(1, (t - T_ASSEMBLE) / (T_INVITE + 0.2 - T_ASSEMBLE)) *
                Math.PI
            ) * 0.5;
          ctx.globalAlpha = a;
          ctx.fillStyle = gold;
          ctx.fillRect(ox - unit, oy - unit, wW + unit * 2, unit * 0.5);
          ctx.fillRect(ox - unit, oy + wH + unit * 0.5, wW + unit * 2, unit * 0.5);
        }

        // ── "TRY WENOV8" types in beneath (bitmap font = monospace) ──
        if (t > T_INVITE) {
          const out =
            t > T_HOLD ? 1 - Math.min(1, (t - T_HOLD) / (T_END - T_HOLD)) : 1;
          const reveal = Math.min(
            1,
            (t - T_INVITE) / Math.max(0.15, T_HOLD - T_INVITE - 0.15)
          );
          const nChars = Math.ceil(reveal * invite.length);
          if (nChars > 0) {
            ctx.globalAlpha = out;
            drawPixelText(
              ctx,
              invite.slice(0, nChars),
              subX,
              subY,
              subCell,
              ember
            );
            // caret pixel while typing
            if (reveal < 1) {
              ctx.globalAlpha = out * 0.9;
              ctx.fillStyle = gold;
              ctx.fillRect(
                subX + nChars * 6 * subCell,
                subY,
                subCell,
                subCell * 7
              );
            }
          }

          // "W8 MEANS WAIT" footnote fades in last
          if (t > T_INVITE + 0.5) {
            const fa = Math.min(1, (t - T_INVITE - 0.5) / 0.4);
            ctx.globalAlpha = fa * out * 0.6;
            drawPixelText(ctx, note, noteX, noteY, noteCell, muted);
          }
        }

        ctx.globalAlpha = 1;

        if (t < T_END) {
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
  }, [resolvedTheme]);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center w8-intro-fade"
      style={{ background: "var(--w8-bg)" }}
      data-nosnippet
    >
      <canvas ref={canvasRef} className="block" />
      <span className="sr-only">WENOV8 — loading</span>
    </div>
  );
}
