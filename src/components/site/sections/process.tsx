"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

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
    title: "Production",
    tag: "PRODUCTION",
    text: "Our production workflow produces the visual content — smart tools, real craft.",
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
 * Chapter 04 — HOW IT WORKS.
 * The one section that keeps its numbers on purpose: a numbered
 * production pipeline reads as a real production line. A
 * scroll-linked pixel line draws left→right (desktop) / top→bottom
 * (mobile) through five storyboard nodes.
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
      <div className="w8-shell relative">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3.5 mb-4">
            <span
              className="w8-num text-[15px]"
              style={{ color: "var(--w8-ember)" }}
            >
              1-5
            </span>
            <span
              aria-hidden
              className="h-px w-8"
              style={{ background: "var(--w8-ember)", opacity: 0.45 }}
            />
            <p className="w8-eyebrow w8-accent">How It Works</p>
          </div>
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
              className="absolute left-0 right-0 top-[7px] h-[3px]"
              style={{ background: "var(--w8-line-strong)" }}
            >
              <motion.div
                className="h-full origin-left"
                style={{
                  scaleX: reduce ? 1 : lineScale,
                  background: "linear-gradient(to right, var(--w8-aqua), var(--w8-ember))",
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
                    className="block w-[15px] h-[15px] mb-6"
                    style={{
                      background: "var(--w8-bg)",
                      border: `2px solid ${i % 2 ? "var(--w8-gold)" : "var(--w8-ember)"}`,
                      boxShadow: "0 0 0 4px var(--w8-bg)",
                    }}
                  />
                  {/* storyboard panel */}
                  <div
                    className="p-4 h-full w8-panel"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="w8-num text-[17px]"
                        style={{ color: i % 2 ? "var(--w8-gold)" : "var(--w8-ember)" }}
                      >
                        {step.n}
                      </span>
                      <span
                        className="w8-pixel text-[10px] tracking-[0.2em]"
                        style={{ color: "var(--w8-muted)" }}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <h3
                      className="text-[15px]"
                      style={{
                        fontFamily: "var(--font-unbounded), var(--w8-font-display)",
                        color: "var(--w8-text)",
                      }}
                    >
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
              className="absolute left-[7px] top-2 bottom-2 w-[3px]"
              style={{ background: "var(--w8-line-strong)" }}
            >
              <motion.div
                className="w-full h-full origin-top"
                style={{
                  scaleY: reduce ? 1 : lineScaleY,
                  background: "linear-gradient(to bottom, var(--w8-aqua), var(--w8-ember))",
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
                    className="absolute left-0 top-1 block w-[15px] h-[15px]"
                    style={{
                      background: "var(--w8-bg)",
                      border: `2px solid ${i % 2 ? "var(--w8-gold)" : "var(--w8-ember)"}`,
                    }}
                  />
                  <div className="p-4 w8-panel">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="w8-num text-[17px]"
                        style={{ color: i % 2 ? "var(--w8-gold)" : "var(--w8-ember)" }}
                      >
                        {step.n}
                      </span>
                      <span
                        className="w8-pixel text-[10px] tracking-[0.2em]"
                        style={{ color: "var(--w8-muted)" }}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <h3
                      className="text-[15px]"
                      style={{
                        fontFamily: "var(--font-unbounded), var(--w8-font-display)",
                        color: "var(--w8-text)",
                      }}
                    >
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
