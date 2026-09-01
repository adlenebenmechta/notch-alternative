"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { drawPixelText, pixelTextWidth } from "@/lib/site/pixel-font";
import { resolveColor } from "@/lib/site/theme-colors";

/**
 * PixelText — renders a short string using the WENOV8 5×7 bitmap font
 * on a crisp canvas. Used for labels, micro-copy and the "How It Works"
 * storyboard numbers. A visually-hidden span keeps the text accessible.
 *
 * `color` accepts a raw hex or a var(--w8-*) token — tokens are
 * resolved at draw time and re-resolved when the theme flips.
 */
export function PixelText({
  text,
  cell = 3,
  color = "var(--w8-text)",
  className = "",
  label,
}: {
  text: string;
  /** CSS pixels per glyph cell */
  cell?: number;
  color?: string;
  className?: string;
  /** accessible label override (defaults to text) */
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, pixelTextWidth(text) * cell);
    const h = 7 * cell;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawPixelText(ctx, text, 0, 0, cell, resolveColor(color));
  }, [text, cell, color, resolvedTheme]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <canvas ref={ref} aria-hidden className="block" />
      <span className="sr-only">{label ?? text}</span>
    </span>
  );
}
