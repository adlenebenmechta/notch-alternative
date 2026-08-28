"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

/**
 * Hero — dark, video-first. The background video is a real WENOV8-produced
 * asset. On mobile the video is not autoplayed: the poster is shown instead
 * (performance + data-friendly), matching the brand performance guidelines.
 */
export function Hero() {
  const [isDesktop, setIsDesktop] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) videoRef.current?.play().catch(() => {});
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="relative w8-dark w8-grain overflow-hidden min-h-[100svh] flex flex-col">
      {/* background media */}
      <div className="absolute inset-0" aria-hidden>
        <img
          src="/posters/hero-promo.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          fetchPriority="high"
        />
        {isDesktop && (
          <video
            ref={videoRef}
            src="/videos/promo.mp4"
            poster="/posters/hero-promo.jpg"
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
        )}
        {/* cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/70 via-[#0a0a0b]/55 to-[#0a0a0b]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/80 via-transparent to-[#0a0a0b]/40" />
      </div>

      {/* content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-32 pb-16 md:pt-40">
        <div className="w8-shell">
          <p className="w8-eyebrow w8-accent mb-6 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[#C6F135]" aria-hidden />
            WENOV8
          </p>

          <h1 className="w8-h1 max-w-4xl text-balance">
            AI-Powered Video Content for Modern Brands
          </h1>

          <p className="w8-lead w8-muted-hi mt-7 max-w-2xl">
            We create product videos, UGC-style ads, social creatives, and
            AI-powered marketing content that help brands produce more
            creative, faster.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-10">
            <Link href="/contact" className="w8-btn w8-btn-primary">
              Get a Quote
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link href="/work" className="w8-btn w8-btn-ghost-hi">
              View Our Work
            </Link>
          </div>
        </div>
      </div>

      {/* capability marquee */}
      <div className="relative z-10 border-t border-white/10 py-5 overflow-hidden">
        <div className="w8-marquee-track" aria-hidden>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10 pr-10">
              {[
                "AI Video Production",
                "AI Video Ads",
                "UGC-Style Ads",
                "Product Marketing Videos",
                "Creative Strategy",
                "AI Avatars & Spokespeople",
                "Social Media Creative",
              ].map((cap) => (
                <span
                  key={cap + copy}
                  className="flex items-center gap-10 text-sm text-[#9b9ba2] whitespace-nowrap"
                  style={{ fontFamily: "var(--w8-font-display)" }}
                >
                  {cap}
                  <span className="w-1 h-1 rounded-full bg-[#C6F135]/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* scroll cue */}
      <a
        href="#work"
        aria-label="Scroll to selected work"
        className="hidden md:flex absolute bottom-24 right-8 z-10 items-center justify-center w-11 h-11 rounded-full border border-white/15 text-[#9b9ba2] hover:text-[#F5F4EF] hover:border-white/40 transition-colors"
      >
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
