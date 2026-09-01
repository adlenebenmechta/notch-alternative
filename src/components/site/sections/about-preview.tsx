import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "../reveal";
import { PixelDot } from "../pixel/pixel-dot";

/**
 * Chapter 06 — ABOUT.
 * The calm after the journey: a full contrast section — bone paper
 * in dark mode, deep ink in light mode. Visual breathing room
 * after the film chapters (contrast by design).
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
            <div className="flex items-center gap-3.5 mb-5">
              <PixelDot color="var(--w8-ember)" />
              <span
                aria-hidden
                className="h-px w-8"
                style={{ background: "var(--w8-ember)", opacity: 0.45 }}
              />
              <p className="w8-eyebrow" style={{ color: "var(--w8-ember)" }}>
                About WENOV8
              </p>
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
            <div className="w8-body space-y-5 max-w-xl text-[15px] md:text-base" style={{ color: "var(--w8-inv-muted)" }}>
              <p className="font-medium" style={{ color: "var(--w8-inv-text)" }}>
                WENOV8 LLC is a creative technology company focused on
                video production and digital marketing.
              </p>
              <p>
                We help brands produce high-quality marketing content faster
                through a combination of creative strategy, video production,
                and modern AI-assisted workflows.
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
