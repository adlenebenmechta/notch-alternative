"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../reveal";
import { WordmarkDisplay } from "../y2k/wordmark-display";
import { PixelDot } from "../pixel/pixel-dot";
import { SITE } from "@/lib/site/config";

/**
 * Chapter 07 — THE FINAL SCENE.
 * The end of the short film: the environment goes quiet, particles
 * gather into the WENOV8 mark, and one invitation remains.
 */
export function FinalCta() {
  return (
    <section
      id="contact-final"
      data-chapter="contact"
      className="relative w8-scrim min-h-[95svh] flex flex-col justify-center py-24 md:py-32"
    >
      <div className="w8-shell relative text-center">
        <Reveal className="flex items-center justify-center gap-3.5 mb-8">
          <PixelDot blink />
          <span
            aria-hidden
            className="h-px w-10"
            style={{ background: "var(--w8-ember)", opacity: 0.5 }}
          />
          <p className="w8-eyebrow w8-accent">Final Scene</p>
        </Reveal>

        <h2 className="w8-h2 md:text-5xl lg:text-6xl text-balance">
          Let&apos;s create something.
        </h2>

        <p className="w8-lead w8-muted-hi mt-6 max-w-xl mx-auto">
          Tell us about your product, campaign, or creative project —
          we&apos;ll take it from brief to final frame.
        </p>

        {/* the chrome WENOV8 mark */}
        <WordmarkDisplay text="WENOV8" className="mt-14 md:mt-20" />

        <Reveal delay={0.1} className="mt-12 md:mt-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="w8-btn w8-btn-primary"
              data-cursor="open"
            >
              Get a Quote
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <a
              href={`mailto:${SITE.email}`}
              className="w8-link text-sm w8-muted-hi transition-colors hover:text-[var(--w8-text)]"
              style={{ fontFamily: "var(--w8-font-display)" }}
            >
              {SITE.email}
            </a>
          </div>
          <p
            className="mt-10 text-[10px] tracking-[0.3em] uppercase"
            style={{ color: "var(--w8-muted)", fontFamily: "var(--w8-font-display)" }}
          >
            WENOV8 LLC · Video Production &amp; Creative Marketing Studio
          </p>
        </Reveal>
      </div>
    </section>
  );
}
