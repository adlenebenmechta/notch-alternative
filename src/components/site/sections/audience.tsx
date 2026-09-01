import { Reveal } from "../reveal";
import { PixelDot } from "../pixel/pixel-dot";

const AUDIENCES = [
  {
    title: "E-commerce Brands",
    text: "Product videos, UGC-style ads, lifestyle creatives, and paid-social assets.",
  },
  {
    title: "DTC Brands",
    text: "Creative testing, product storytelling, and performance-focused video ads.",
  },
  {
    title: "Startups & SaaS",
    text: "Product explainers, launch videos, social content, and marketing creatives.",
  },
  {
    title: "Marketing Teams",
    text: "Scalable creative production for ongoing campaigns and content needs.",
  },
];

/**
 * WHO WE WORK WITH — part of the journey.
 * A large typographic list instead of cards; hover ignites the row.
 */
export function AudienceSection() {
  return (
    <section
      id="audiences"
      data-chapter="process"
      className="relative w8-scrim w8-section-pad"
    >
      <div className="w8-shell relative">
        <Reveal className="max-w-3xl">
          <div className="flex items-center gap-3.5 mb-4">
            <PixelDot color="var(--w8-aqua)" />
            <p className="w8-eyebrow w8-accent">Who We Work With</p>
          </div>
          <h2 className="w8-h2 text-balance">Built for modern brands.</h2>
          <p className="w8-lead w8-muted-hi mt-5">
            Teams that need more creative, more often — and can&apos;t wait on
            traditional production cycles.
          </p>
        </Reveal>

        <div className="mt-12 md:mt-16 border-t" style={{ borderColor: "var(--w8-line)" }}>
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.05}>
              <div
                data-cursor="explore"
                className="group grid md:grid-cols-12 gap-3 md:gap-8 items-center py-7 md:py-8 border-b w8-hover-row transition-colors duration-300"
                style={{ borderColor: "var(--w8-line)" }}
              >
                <div className="md:col-span-1">
                  <PixelDot
                    color={
                      i % 3 === 1 ? "var(--w8-gold)" : i % 3 === 2 ? "var(--w8-aqua)" : "var(--w8-ember)"
                    }
                  />
                </div>
                <h3
                  className="md:col-span-5 text-xl md:text-2xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-[var(--w8-ember)]"
                  style={{ fontFamily: "var(--w8-font-display)", color: "var(--w8-text)" }}
                >
                  {a.title}
                </h3>
                <p className="md:col-span-6 w8-muted-hi text-sm w8-body">
                  {a.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
