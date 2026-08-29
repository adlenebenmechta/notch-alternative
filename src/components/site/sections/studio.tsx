"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "../reveal";
import { ConvergeCanvas } from "../pixel/converge-canvas";
import { PixelText } from "../pixel/pixel-text";

/**
 * Real capabilities of the in-house WENOV8 AI Studio (all of these tools
 * exist in the deployed platform — no invented features).
 */
const STUDIO_TOOLS = [
  "AI avatar & presenter videos",
  "Script-to-video production",
  "UGC-style ad generation",
  "Viral social carousels",
  "AI podcast videos",
  "Auto-publish scheduling",
];

/**
 * Chapter 05 — THE AI ENGINE / YOUR AI CREATIVE STUDIO.
 * The signature transition: pixel particles converge and assemble the
 * "AI STUDIO" wordmark (scroll-linked), echoing the 3D core behind.
 * Links straight into the real application at /studio.
 */
export function StudioSection() {
  return (
    <section
      id="studio"
      data-chapter="studio"
      className="relative w8-scrim w8-section-pad overflow-hidden"
    >
      {/* ghost chapter number */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-10 right-4 md:right-10 opacity-[0.13]"
      >
        <PixelText text="05" cell={14} color="#f4f3ee" />
      </div>

      <div className="w8-shell relative">
        {/* the convergence wordmark */}
        <ConvergeCanvas text="AI STUDIO" cell={7} className="mb-12 md:mb-16" />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-4">The AI Engine</p>
              <h2 className="w8-h2 text-balance">Your AI Creative Studio</h2>
              <p className="w8-lead w8-muted-hi mt-5">
                Create, experiment, and produce AI-powered video content
                with the WENOV8 creative platform — the same engine that
                produces every piece of work on this page.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-8">
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {STUDIO_TOOLS.map((tool) => (
                  <li key={tool} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: "var(--w8-lime)" }}
                    />
                    <span className="w8-muted-hi">{tool}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15} className="mt-9">
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/studio"
                  className="w8-btn w8-btn-primary"
                  data-cursor="open"
                >
                  Open AI Studio
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
                <Link href="/ai-avatar-video" className="w8-btn w8-btn-ghost-hi">
                  About AI Avatars
                </Link>
              </div>
            </Reveal>
          </div>

          {/* real studio output — actual platform-produced stills */}
          <Reveal delay={0.1}>
            <RevealGroup
              stagger={0.07}
              className="grid grid-cols-3 gap-3 md:gap-4"
            >
              {[
                {
                  src: "/posters/work-avatar-presenter.jpg",
                  alt: "AI presenter video generated in the WENOV8 studio",
                },
                {
                  src: "/posters/work-podcast.jpg",
                  alt: "AI podcast video generated in the WENOV8 studio",
                },
                {
                  src: "/posters/work-ugc-testimonial.jpg",
                  alt: "UGC-style ad generated in the WENOV8 studio",
                },
              ].map((shot) => (
                <RevealItem key={shot.src}>
                  <div
                    data-cursor="view"
                    className="relative overflow-hidden aspect-[9/16] border border-white/10 hover:border-[#c6f135]/40 transition-colors duration-500"
                  >
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
            <p className="mt-4 text-xs w8-muted-hi">
              Stills from videos produced end-to-end in the studio —
              no stock, no mockups.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
