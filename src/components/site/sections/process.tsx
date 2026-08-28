"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SectionHeading } from "./work";

const STEPS = [
  {
    n: "01",
    title: "Brief",
    text: "You share your product, audience, goals, references, and campaign requirements.",
  },
  {
    n: "02",
    title: "Creative Direction",
    text: "We develop concepts, hooks, scripts, visual direction, and production references.",
  },
  {
    n: "03",
    title: "AI Production",
    text: "Our AI-assisted workflow produces the visual content.",
  },
  {
    n: "04",
    title: "Post-Production",
    text: "Editing, sound design, voice-over, motion, compositing, and final creative refinement.",
  },
  {
    n: "05",
    title: "Delivery",
    text: "Final assets are delivered ready for websites, social media, and advertising campaigns.",
  },
];

/**
 * From Idea to Final Frame — 5-step process with a scroll-linked progress
 * line drawn down the timeline (desktop) / inline (mobile).
 */
export function ProcessSection() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start 0.75", "end 0.6"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="w8-paper w8-section">
      <div className="w8-shell">
        <SectionHeading
          onDark={false}
          eyebrow="How It Works"
          title="From Idea to Final Frame"
        />

        <div ref={wrapRef} className="relative mt-12 md:mt-16">
          {/* progress rail */}
          <div
            aria-hidden
            className="absolute left-[7px] md:left-[9px] top-2 bottom-2 w-px bg-[#0e0e10]/10"
          >
            <motion.div
              className="w-full h-full origin-top"
              style={{
                scaleY: reduce ? 1 : lineScale,
                background: "linear-gradient(to bottom, #55661a, #0e0e10)",
              }}
            />
          </div>

          <ol className="space-y-10 md:space-y-14">
            {STEPS.map((step, i) => (
              <li key={step.n}>
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.65,
                    delay: i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-5 md:gap-8"
                >
                  {/* node */}
                  <span
                    aria-hidden
                    className="relative z-10 flex items-center justify-center w-[15px] md:w-[19px] aspect-square rounded-full border-2 border-[#0e0e10] bg-white shrink-0 mt-1.5 md:mt-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#55661a]" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span
                        className="text-sm font-bold w8-accent-lo"
                        style={{ fontFamily: "var(--w8-font-display)" }}
                      >
                        {step.n}
                      </span>
                      <h3 className="w8-h3">{step.title}</h3>
                    </div>
                    <p className="w8-muted-lo text-sm w8-body mt-2 max-w-xl">
                      {step.text}
                    </p>
                  </div>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
