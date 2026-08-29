"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../reveal";
import { ConvergeCanvas } from "../pixel/converge-canvas";
import { PixelText } from "../pixel/pixel-text";
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
        <Reveal className="flex items-center justify-center gap-4 mb-8">
          <PixelText text="07" cell={3} color="#7dd3fc" className="w8-blink" />
          <span className="h-px w-10 bg-[#7dd3fc]/50" aria-hidden />
          <p className="w8-eyebrow w8-accent">Final Scene</p>
        </Reveal>

        <h2 className="w8-h2 md:text-5xl lg:text-6xl text-balance">
          Let&apos;s create something.
        </h2>

        <p className="w8-lead w8-muted-hi mt-6 max-w-xl mx-auto">
          Tell us about your product, campaign, or creative project —
          we&apos;ll take it from brief to final frame.
        </p>

        {/* particles gather into the WENOV8 mark */}
        <ConvergeCanvas text="WENOV8" cell={9} className="mt-14 md:mt-20" />

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
              className="w8-link text-sm w8-muted-hi hover:text-[#f5f4ef] transition-colors"
              style={{ fontFamily: "var(--w8-font-display)" }}
            >
              {SITE.email}
            </a>
          </div>
          <p
            className="mt-10 text-[10px] tracking-[0.3em] uppercase text-[#6d6d74]"
            style={{ fontFamily: "var(--w8-font-display)" }}
          >
            WENOV8 LLC · AI-Powered Video &amp; Creative Marketing
          </p>
        </Reveal>
      </div>
    </section>
  );
}
