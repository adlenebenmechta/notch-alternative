"use client";

import { Reveal } from "../reveal";
import { PixelDot } from "../pixel/pixel-dot";

const BENEFITS = [
  {
    title: "Produce More Creative",
    text: "Create more concepts, variations, and formats without repeating traditional production workflows.",
  },
  {
    title: "Move Faster",
    text: "Turn creative ideas into production-ready content faster than traditional production.",
  },
  {
    title: "Test More Ideas",
    text: "Generate different hooks, angles, visual concepts, and ad variations for creative testing.",
  },
  {
    title: "Create What Cameras Can't",
    text: "Modern tools allow brands to explore visual concepts, environments, characters, and product worlds that can be difficult or expensive to film traditionally.",
  },
];

/**
 * WHY MODERN PRODUCTION — four statement scenes.
 * Typographic and quiet by design (contrast to the other chapters):
 * pixel dots, bold statements, breathing room.
 */
export function WhySection() {
  return (
    <section
      id="why"
      data-chapter="services"
      className="relative w8-scrim w8-section-pad"
    >
      <div className="w8-shell relative">
        <Reveal className="max-w-3xl">
          <div className="flex items-center gap-3.5 mb-4">
            <PixelDot color="var(--w8-gold)" />
            <p className="w8-eyebrow w8-accent">The Production Advantage</p>
          </div>
          <h2 className="w8-h2 text-balance">
            Why modern production wins.
          </h2>
        </Reveal>

        <div
          className="mt-14 md:mt-20 border-y"
          style={{ borderColor: "var(--w8-line)" }}
        >
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={0.05}>
              <div className="group grid md:grid-cols-12 gap-4 md:gap-8 py-9 md:py-12 items-start border-b last:border-b-0" style={{ borderColor: "var(--w8-line)" }}>
                <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-4 transition-opacity duration-500 group-hover:opacity-100 opacity-70">
                  <PixelDot
                    size="lg"
                    color={
                      i % 3 === 1 ? "var(--w8-gold)" : i % 3 === 2 ? "var(--w8-aqua)" : "var(--w8-ember)"
                    }
                  />
                  <span
                    aria-hidden
                    className="hidden md:block h-px w-12 transition-colors duration-500"
                    style={{ background: "color-mix(in srgb, var(--w8-ember) 55%, transparent)" }}
                  />
                </div>
                <div className="md:col-span-9">
                  <h3 className="w8-h3 md:text-xl lg:text-2xl transition-colors duration-300 group-hover:text-[var(--w8-ember)]">
                    {b.title}
                  </h3>
                  <p className="w8-muted-hi text-sm md:text-[15px] w8-body mt-3 max-w-2xl">
                    {b.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
