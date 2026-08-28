import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "../reveal";
import { SectionHeading } from "./work";

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

/** Your AI Creative Studio — dark feature section. */
export function StudioSection() {
  return (
    <section className="relative w8-darker w8-section overflow-hidden">
      {/* ambient shape */}
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(198,241,53,0.07), transparent)",
        }}
      />

      <div className="w8-shell relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionHeading
              eyebrow="AI Studio"
              title="Your AI Creative Studio"
              intro="Create, experiment, and produce AI-powered video content with the WENOV8 creative platform."
            />

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
                <Link href="/studio" className="w8-btn w8-btn-primary">
                  Open AI Studio
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
                <Link
                  href="/ai-avatar-video"
                  className="w8-btn w8-btn-ghost-hi"
                >
                  About AI Avatars
                </Link>
              </div>
            </Reveal>
          </div>

          {/* visual: real studio preview */}
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
                  <div className="relative rounded-xl overflow-hidden aspect-[9/16] border border-white/10">
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
