"use client";

import { useRef, useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import type { PortfolioItem } from "@/lib/site/portfolio";

/**
 * Portfolio tile — poster image by default, video preview on hover/tap.
 * Falls back to the poster when video can't play.
 */
export function WorkCard({
  item,
  className = "",
  onOpen,
}: {
  item: PortfolioItem;
  className?: string;
  onOpen?: (item: PortfolioItem) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const start = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };
  const stop = () => {
    const v = videoRef.current;
    if (v) v.pause();
  };

  const aspectClass =
    item.aspect === "9/16" ? "aspect-[9/16]" : "aspect-video";

  return (
    <button
      type="button"
      onClick={() => (onOpen ? onOpen(item) : start())}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className={`group relative overflow-hidden rounded-2xl bg-[#0d0d12] text-left w-full ${aspectClass} ${className}`}
      aria-label={`${item.title} — ${item.category}. Play preview.`}
    >
      {/* poster */}
      <img
        src={item.poster}
        alt={`${item.title} — ${item.category} preview`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />

      {/* Y2K gloss sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[110%] group-hover:opacity-100"
      />

      {/* video layer (only for video items) */}
      {item.kind === "video" && (
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            ready ? "opacity-0 group-hover:opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* gradient + meta */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/25" />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className="w8-pixel text-[11px] sm:text-[12px] uppercase tracking-[0.18em] text-[var(--w8-ember)] mb-1.5"
          >
            {item.category}
          </p>
          <p
            className="text-sm sm:text-base font-semibold text-white leading-snug truncate"
          >
            {item.title}
          </p>
        </div>
        <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 group-hover:bg-[var(--w8-ember)] group-hover:text-[var(--w8-on-accent)] group-hover:scale-110">
          <Play size={13} className="ml-0.5" fill="currentColor" />
        </span>
      </div>
    </button>
  );
}

/** Compact link row used under rails. */
export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold w8-accent w8-link"
      style={{ fontFamily: "var(--w8-font-display)" }}
    >
      {label}
      <ArrowUpRight size={15} strokeWidth={2.2} />
    </a>
  );
}
