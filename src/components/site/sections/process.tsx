"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { PixelText } from "../pixel/pixel-text";

const STEPS = [
  {
    n: "01",
    title: "Brief",
    tag: "BRIEF",
    text: "You share your product, audience, goals, references, and campaign requirements.",
  },
  {
    n: "02",
    title: "Creative Direction",
    tag: "STORYBOARD",
    text: "We develop concepts, hooks, scripts, visual direction, and production references.",
  },
  {
    n: "03",
    title: "AI Production",
    tag: "PRODUCTION",
    text: "Our AI-assisted workflow produces the visual content.",
  },
  {
    n: "04",
    title: "Post-Production",
    tag: "EDIT",
    text: "Editing, sound design, voice-over, motion, compositing, and final creative refinement.",
  },
  {
    n: "05",
    title: "Delivery",
    tag: "FINAL FRAME",
    text: "Final assets are delivered ready for websites, social media, and advertising campaigns.",
  },
];

/**
 * Chapter 04 — THE PROCESS.
 * A cinematic production pipeline: a scroll-linked pixel line draws
 * left→right (desktop) / top→bottom (mobile) through five storyboard
 * nodes. The visitor travels through the production line.
 */
export function ProcessSection() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start 0.8", "end 0.55"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="process"
      data-chapter="process"
      className="relative w8-scrim w8-section-pad"
    >
      {/* ghost chapter number */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-10 right-4 md:right-10 opacity-[0.13]"
      >
        <PixelText text="04" cell={14} color="#f4f3ee" />
      </div>

      <div className="w8-shell relative">
        <div className="max-w-3xl">
          <p className="w8-eyebrow w8-accent mb-4">How It Works</p>
          <h2 className="w8-h2 text-balance">From idea to final frame.</h2>
          <p className="w8-lead w8-muted-hi mt-5">
            One pipeline — brief, storyboard, production, edit, delivery.
            You see the process; we run the machine.
          </p>
        </div>

        <div ref={wrapRef} className="relative mt-14 md:mt-20">
          {/* ── desktop: horizontal pipeline ── */}
          <div className="hidden md:block">
            {/* rail */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-[7px] h-[3px] bg-white/10"
            >
              <motion.div
                className="h-full origin-left"
                style={{
                  scaleX: reduce ? 1 : lineScale,
                  background: "linear-gradient(to right, #2563eb, #7dd3fc)",
                }}
              />
            </div>

            <ol className="grid grid-cols-5 gap-6">
              {STEPS.map((step, i) => (
                <motion.li
                  key={step.n}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative"
                >
                  {/* pixel node */}
                  <span
                    aria-hidden
                    className="block w-[15px] h-[15px] bg-[#0a0a0b] border-2 border-[#7dd3fc] mb-6"
                    style={{ boxShadow: "0 0 0 4px rgba(10,10,11,0.9)" }}
                  />
                  {/* storyboard panel */}
                  <div className="border border-white/12 bg-[#0d0d10]/80 p-4 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <PixelText text={step.n} cell={2} color="#7dd3fc" />
                      <span className="text-[8px] tracking-[0.2em] text-white/40 font-bold">
                        {step.tag}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#f5f4ef]" style={{ fontFamily: "var(--w8-font-display)" }}>
                      {step.title}
                    </h3>
                    <p className="w8-muted-hi text-[13px] w8-body mt-2.5">
                      {step.text}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* ── mobile: vertical pipeline ── */}
          <div className="md:hidden relative">
            <div
              aria-hidden
              className="absolute left-[7px] top-2 bottom-2 w-[3px] bg-white/10"
            >
              <motion.div
                className="w-full h-full origin-top"
                style={{
                  scaleY: reduce ? 1 : lineScaleY,
                  background: "linear-gradient(to bottom, #2563eb, #7dd3fc)",
                }}
              />
            </div>
            <ol className="space-y-8">
              {STEPS.map((step, i) => (
                <motion.li
                  key={step.n}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.55,
                    delay: i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="pl-8 relative"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 block w-[15px] h-[15px] bg-[#0a0a0b] border-2 border-[#7dd3fc]"
                  />
                  <div className="border border-white/12 bg-[#0d0d10]/80 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <PixelText text={step.n} cell={2} color="#7dd3fc" />
                      <span className="text-[8px] tracking-[0.2em] text-white/40 font-bold">
                        {step.tag}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#f5f4ef]" style={{ fontFamily: "var(--w8-font-display)" }}>
                      {step.title}
                    </h3>
                    <p className="w8-muted-hi text-[13px] w8-body mt-2">
                      {step.text}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
