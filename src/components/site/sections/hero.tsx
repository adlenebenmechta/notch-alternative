"use client";

import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { PixelDot } from "../pixel/pixel-dot";

/**
 * Chapter 01 — INTRO.
 * The hero sits over the astronaut film + pixel dust. Text stays
 * fully readable thanks to the scrim veil. H1 leads with the craft
 * (video production & creative marketing) — AI is a tool we use,
 * not the whole identity.
 */
export function Hero() {
  return (
    <section
      data-chapter="intro"
      id="intro"
      className="relative min-h-[105svh] flex flex-col overflow-hidden bg-transparent"
      style={{ color: "var(--w8-text)" }}
    >
      {/* readability scrim over the film — light veil, text stays king */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[var(--w8-veil-0)] via-transparent to-[var(--w8-veil-2)]"
      />

      {/* content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pt-36 pb-20 md:pt-44">
        <div className="w8-shell">
          <div className="flex items-center gap-3.5 mb-7">
            <PixelDot blink />
            <span
              aria-hidden
              className="h-px w-10"
              style={{ background: "var(--w8-ember)", opacity: 0.5 }}
            />
            <p className="w8-eyebrow w8-accent">Creative Studio</p>
          </div>

          <h1 className="w8-h1 max-w-4xl text-balance">
            Video Production &amp; Creative Marketing
          </h1>

          <p className="w8-lead mt-7 max-w-2xl" style={{ color: "var(--w8-muted)" }}>
            We create product videos, UGC-style ads, social creatives, and
            marketing content for modern brands — produced with a smart,
            AI-assisted workflow.
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

          <p
            className="mt-10 text-xs tracking-wide w8-pixel"
            style={{ color: "var(--w8-muted)" }}
          >
            WENOV8 LLC — Creative technology company · Wyoming, United States
          </p>
        </div>
      </div>

      {/* capability marquee */}
      <div
        className="relative z-10 py-5 overflow-hidden"
        style={{
          borderTop: "1px solid var(--w8-line)",
          background: "color-mix(in srgb, var(--w8-bg) 40%, transparent)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="w8-marquee-track" aria-hidden>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10 pr-10">
              {[
                "Video Production",
                "Video Ads",
                "UGC-Style Ads",
                "Product Marketing Videos",
                "Creative Strategy",
                "AI Avatars & Spokespeople",
                "Social Media Creative",
              ].map((cap) => (
                <span
                  key={cap + copy}
                  className="w8-pixel flex items-center gap-10 text-sm whitespace-nowrap"
                  style={{ color: "var(--w8-muted)" }}
                >
                  {cap}
                  <PixelDot size="sm" color="var(--w8-ember)" />
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
        className="hidden md:flex absolute bottom-24 right-8 z-10 items-center justify-center w-11 h-11 transition-colors"
        style={{
          border: "1px solid var(--w8-line-strong)",
          color: "var(--w8-muted)",
        }}
      >
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
