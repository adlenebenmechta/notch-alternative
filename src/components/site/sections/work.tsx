import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FEATURED_WORK } from "@/lib/site/portfolio";
import { WorkCard } from "../work-card";
import { Reveal, RevealGroup, RevealItem } from "../reveal";

/** Section heading lockup — pixel-dot edition. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <Reveal className="max-w-3xl">
      <div className="flex items-center gap-3.5 mb-4">
        <span
          aria-hidden
          className="w-2.5 h-2.5"
          style={{ background: "var(--w8-ember)" }}
        />
        <p className="w8-eyebrow w8-accent">{eyebrow}</p>
      </div>
      <h2 className="w8-h2 text-balance">{title}</h2>
      {intro && (
        <p className="w8-lead mt-5 w8-muted-hi">{intro}</p>
      )}
    </Reveal>
  );
}

/**
 * Chapter 02 — SELECTED WORK.
 * A cinematic gallery over the astronaut film. Each card materializes
 * through a pixel dissolve; hover previews the real video.
 */
export function SelectedWork() {
  return (
    <section
      id="work"
      data-chapter="work"
      className="relative w8-scrim w8-section-pad"
    >
      <div className="w8-shell relative">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-14">
          <SectionHeading
            eyebrow="Selected Work"
            title="Creative work, end to end."
            intro="A selection of creative work produced for brands, products, and marketing campaigns — every piece made through the WENOV8 production workflow."
          />
          <Reveal delay={0.15}>
            <Link
              href="/work"
              className="w8-btn w8-btn-ghost-hi !py-2.5 !px-5 text-sm"
            >
              View All Work
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </Link>
          </Reveal>
        </div>

        {/* rail (mobile) → grid (desktop) */}
        <RevealGroup className="w8-rail md:grid md:grid-cols-3 lg:grid-cols-5 md:gap-5 !gap-4 pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0">
          {FEATURED_WORK.map((item) => (
            <RevealItem key={item.src} className="w-[68vw] sm:w-[44vw] md:w-auto">
              <div data-cursor="view">
                <WorkCard item={item} />
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1} className="mt-6">
          <p className="text-xs w8-muted-hi">
            All pieces above were produced through the WENOV8 workflow.{" "}
            <Link href="/studio" className="w8-link w8-accent">
              Explore the Studio
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
