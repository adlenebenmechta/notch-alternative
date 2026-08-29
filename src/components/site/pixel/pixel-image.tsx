"use client";

import { useEffect, useRef } from "react";

/**
 * PixelImage — an image that materializes from pixel blocks as it
 * scrolls into view (block size animates from ~26px down to 0).
 * The real <img> always loads (SEO + accessibility); the canvas only
 * overlays the reveal animation. Reduced-motion: no overlay.
 */
export function PixelImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (reduce || !canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let progress = 0;
    let visible = false;

    const draw = () => {
      const w = img.clientWidth;
      const h = img.clientHeight;
      if (!w || !h || !img.complete || img.naturalWidth === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // pixelation level 26px → 0px driven by scroll progress
      const block = 26 * (1 - progress);
      if (block < 1) return; // fully resolved — nothing to draw
      const bw = Math.max(1, Math.floor(block));
      ctx.imageSmoothingEnabled = false;
      for (let y = 0; y < h; y += bw) {
        for (let x = 0; x < w; x += bw) {
          ctx.drawImage(img, x, y, bw, bw, x, y, bw, bw);
        }
      }
      // darken the unresolved blocks so text stays readable above
      ctx.fillStyle = `rgba(10,10,11,${0.45 * (1 - progress)})`;
      ctx.fillRect(0, 0, w, h);
    };

    const loop = () => {
      if (visible) draw();
      raf = requestAnimationFrame(loop);
    };
    const onScroll = () => {
      const r = img.getBoundingClientRect();
      const vh = window.innerHeight;
      progress = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.55)));
    };

    const io = new IntersectionObserver(
      (e) => {
        visible = e.some((x) => x.isIntersecting);
      },
      { rootMargin: "80px" }
    );
    io.observe(img);
    onScroll();
    raf = requestAnimationFrame(loop);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [src]);

  return (
    <span className={`relative block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt={alt} loading="lazy" decoding="async" className="block w-full h-full object-cover" />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 pointer-events-none" />
    </span>
  );
}
