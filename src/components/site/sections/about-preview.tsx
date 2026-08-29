import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "../reveal";
import { PixelText } from "../pixel/pixel-text";

/**
 * Chapter 06 — ABOUT.
 * The calm after the journey: a full light "bone" section — visual
 * breathing room after five dark 3D chapters (contrast by design).
 */
export function AboutPreview() {
  return (
    <section
      id="about"
      data-chapter="about"
      className="relative w8-light w8-section-pad"
    >
      <div className="w8-shell">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <div className="flex items-center gap-4 mb-5">
              <PixelText text="06" cell={3} color="#55661a" />
              <span className="h-px w-8 bg-[#55661a]/40" aria-hidden />
              <p className="w8-eyebrow w8-accent-lo">About WENOV8</p>
            </div>
            <h2 className="w8-h2 text-balance">
              A creative technology company.
            </h2>
            <Link href="/about" className="w8-btn w8-btn-ink mt-8">
              About WENOV8
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="w8-body w8-muted-lo space-y-5 max-w-xl text-[15px] md:text-base">
              <p className="text-[#0e0e10] font-medium">
                WENOV8 LLC is a creative technology company focused on
                AI-assisted video production and digital marketing.
              </p>
              <p>
                We help brands produce high-quality marketing content faster
                through a combination of creative strategy, video production,
                and modern AI-powered workflows.
              </p>
              <p>
                Our work includes product advertising, UGC-style content,
                social media creatives, promotional videos, AI-generated
                visuals, and scalable creative production.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
