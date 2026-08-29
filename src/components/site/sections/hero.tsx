"use client";

import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { PixelText } from "../pixel/pixel-text";

/**
 * Chapter 01 — INTRO / THE CREATIVE MACHINE AWAKENS.
 * The hero sits over the persistent 3D scene (voxel camera, floating
 * frames, pixel particles). Text remains fully readable thanks to a
 * left-weighted scrim. H1 matches the SEO brief exactly.
 */
export function Hero() {
  return (
    <section
      data-chapter="intro"
      id="intro"
      className="relative min-h-[105svh] flex flex-col overflow-hidden bg-transparent text-[#f5f4ef]"
    >
      {/* readability scrim over the pixel world — light veil, text stays king */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#0e0b26]/45 via-[#0e0b26]/10 to-[#0e0b26]/45"
      />

      {/* content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-36 pb-20 md:pt-44">
        <div className="w8-shell">
          <div className="flex items-center gap-4 mb-7">
            <PixelText text="01" cell={3} color="#00e5ff" className="w8-blink" />
            <span className="h-px w-10 bg-[#00e5ff]/50" aria-hidden />
            <p className="w8-eyebrow w8-accent">The Creative Machine</p>
          </div>

          <h1 className="w8-h1 max-w-4xl text-balance">
            AI-Powered Video &amp; Creative Marketing
          </h1>

          <p className="w8-lead w8-muted-hi mt-7 max-w-2xl">
            We create product videos, UGC-style ads, social creatives, and
            AI-powered marketing content for modern brands.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-10">
            <Link
              href="/contact"
              className="w8-btn w8-btn-primary"
              data-cursor="open"
            >
              Get a Quote
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link href="/work" className="w8-btn w8-btn-ghost-hi">
              View Our Work
            </Link>
          </div>

          <p className="mt-10 text-xs w8-muted-hi tracking-wide w8-pixel">
            WENOV8 LLC — Creative technology company · Wyoming, United States
          </p>
        </div>
      </div>

      {/* capability marquee */}
      <div className="relative z-10 border-t border-white/10 py-5 overflow-hidden bg-[#0e0b26]/25">
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
                  className="w8-pixel flex items-center gap-10 text-sm text-[#a3a0c2] whitespace-nowrap"
                >
                  {cap}
                  <span className="w-1 h-1 bg-[#00e5ff]/60" aria-hidden />
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
        className="hidden md:flex absolute bottom-24 right-8 z-10 items-center justify-center w-11 h-11 border border-white/15 text-[#a3a0c2] hover:text-[#F5F4EF] hover:border-white/40 transition-colors"
      >
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
