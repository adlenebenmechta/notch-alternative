"use client";

import { useEffect, useRef } from "react";

/**
 * PixelImage — an image that lands with a Y2K gloss reveal:
 * it scales down from 1.07 with a blur that resolves into focus,
 * while a diagonal chrome sheen sweeps across it once.
 * The real <img> always loads (SEO + accessibility); the reveal
 * is pure CSS driven by an IntersectionObserver. Reduced-motion:
 * the image simply renders. (Name kept for import compatibility.)
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
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          wrap.classList.add("is-in");
          io.disconnect();
        }
      },
      { rootMargin: "60px" }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [src]);

  return (
    <span ref={wrapRef} className={`w8-gloss-reveal block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block w-full h-full object-cover"
      />
    </span>
  );
}
