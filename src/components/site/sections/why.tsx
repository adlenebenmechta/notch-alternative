"use client";

import { Reveal } from "../reveal";
import { PixelText } from "../pixel/pixel-text";

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
    text: "AI allows brands to explore visual concepts, environments, characters, and product worlds that can be difficult or expensive to film traditionally.",
  },
];

/**
 * WHY AI-POWERED PRODUCTION — four cinematic statement scenes.
 * Typographic and quiet by design (contrast to the 3D chapters):
 * huge pixel numbers, bold statements, breathing room.
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
          <p className="w8-eyebrow w8-accent mb-4">Why AI-Powered Production</p>
          <h2 className="w8-h2 text-balance">
            The production advantage of AI.
          </h2>
        </Reveal>

        <div className="mt-14 md:mt-20 divide-y divide-white/10 border-y border-white/10">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={0.05}>
              <div className="group grid md:grid-cols-12 gap-4 md:gap-8 py-9 md:py-12 items-start">
                <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-4 transition-opacity duration-500 group-hover:opacity-100 opacity-70">
                  <PixelText
                    text={String(i + 1).padStart(2, "0")}
                    cell={4}
                    color="#6d6d74"
                  />
                  <span
                    aria-hidden
                    className="hidden md:block h-px w-12 bg-[#c6f135]/0 group-hover:bg-[#c6f135]/60 transition-colors duration-500"
                  />
                </div>
                <div className="md:col-span-9">
                  <h3 className="w8-h3 md:text-2xl lg:text-[1.75rem] group-hover:text-[#c6f135] transition-colors duration-300">
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
