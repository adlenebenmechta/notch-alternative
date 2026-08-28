import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FEATURED_WORK } from "@/lib/site/portfolio";
import { WorkCard } from "../work-card";
import { Reveal, RevealGroup, RevealItem } from "../reveal";

/** Section heading lockup. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  onDark = true,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  onDark?: boolean;
}) {
  return (
    <Reveal className="max-w-3xl">
      <p className={`w8-eyebrow mb-4 ${onDark ? "w8-accent" : "w8-accent-lo"}`}>
        {eyebrow}
      </p>
      <h2 className="w8-h2 text-balance">{title}</h2>
      {intro && (
        <p className={`w8-lead mt-5 ${onDark ? "w8-muted-hi" : "w8-muted-lo"}`}>
          {intro}
        </p>
      )}
    </Reveal>
  );
}

/** Selected Work — horizontal rail on mobile, editorial grid on desktop. */
export function SelectedWork() {
  return (
    <section id="work" className="w8-dark w8-section">
      <div className="w8-shell">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-14">
          <SectionHeading
            eyebrow="Selected Work"
            title="Creative work, produced with AI."
            intro="A selection of creative work produced for brands, products, and marketing campaigns."
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
              <WorkCard item={item} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1} className="mt-6">
          <p className="text-xs w8-muted-hi">
            All pieces above were produced with the WENOV8 AI production
            workflow.{" "}
            <Link href="/studio" className="w8-link w8-accent">
              Explore the AI Studio
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
