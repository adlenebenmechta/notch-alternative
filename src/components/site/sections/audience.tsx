import { Reveal } from "../reveal";
import { PixelText } from "../pixel/pixel-text";

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
 * WHO WE WORK WITH — part of the journey (end of chapter 04).
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
          <p className="w8-eyebrow w8-accent mb-4">Who We Work With</p>
          <h2 className="w8-h2 text-balance">Built for modern brands.</h2>
          <p className="w8-lead w8-muted-hi mt-5">
            Teams that need more creative, more often — and can't wait on
            traditional production cycles.
          </p>
        </Reveal>

        <div className="mt-12 md:mt-16 border-t border-white/10">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.05}>
              <div
                data-cursor="explore"
                className="group grid md:grid-cols-12 gap-3 md:gap-8 items-center py-7 md:py-8 border-b border-white/10 hover:bg-white/[0.025] transition-colors duration-300"
              >
                <div className="md:col-span-1">
                  <PixelText
                    text={String(i + 1).padStart(2, "0")}
                    cell={2}
                    color="#6d6d74"
                  />
                </div>
                <h3
                  className="md:col-span-5 text-xl md:text-2xl font-semibold tracking-tight text-[#f5f4ef] group-hover:text-[#c6f135] transition-colors duration-300"
                  style={{ fontFamily: "var(--w8-font-display)" }}
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
