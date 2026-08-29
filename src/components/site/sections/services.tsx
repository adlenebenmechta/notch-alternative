"use client";

import Link from "next/link";
import { ArrowUpRight, Play, Heart, MessageCircle, Share2 } from "lucide-react";
import { SERVICES } from "@/lib/site/services";
import { Reveal } from "../reveal";
import { PixelText } from "../pixel/pixel-text";
import { PixelImage } from "../pixel/pixel-image";

/**
 * Chapter 03 — WHAT WE DO.
 * Six services as cinematic rows (not SaaS cards). Each service gets
 * its own visual vignette — built from real production posters and
 * CSS staging, no fake UI. Rows reveal progressively on scroll.
 */

/* ── vignettes: one per service, staged from real assets ── */

function VignetteFilm() {
  // AI Video Production — stacked cinematic frames
  return (
    <div className="relative h-full w-full" aria-hidden>
      <div className="absolute inset-x-6 top-6 bottom-0 border border-white/15 bg-[#111114] translate-x-3 rotate-2" />
      <div className="absolute inset-x-3 top-3 bottom-0 border border-white/20 bg-[#15151a] -translate-x-2 -rotate-1" />
      <div className="absolute inset-0 border border-[#c6f135]/40 bg-[#0a0a0b] overflow-hidden">
        <PixelImage
          src="/posters/hero-promo.jpg"
          alt=""
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] text-[#c6f135]">
          <span className="w-1.5 h-1.5 bg-[#c6f135] w8-blink" /> REC
        </span>
      </div>
    </div>
  );
}

function VignetteAds() {
  // AI Video Ads — three vertical ad frames
  return (
    <div className="relative h-full w-full flex items-end justify-center gap-3 pb-2" aria-hidden>
      {[
        { h: "72%", src: "/posters/work-pov-hook.jpg" },
        { h: "86%", src: "/posters/work-ugc-testimonial.jpg", lime: true },
        { h: "64%", src: "/posters/work-product-story.jpg" },
      ].map((f, i) => (
        <div
          key={i}
          className={`relative w-[28%] border ${
            f.lime ? "border-[#c6f135]/60" : "border-white/15"
          } bg-[#101013] overflow-hidden`}
          style={{ height: f.h }}
        >
          <img
            src={f.src}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 border border-white/40 bg-black/40 text-white">
            <Play size={9} className="ml-0.5" fill="currentColor" />
          </span>
        </div>
      ))}
    </div>
  );
}

function VignetteUGC() {
  // UGC-Style Ads — phone composition with engagement affordances
  return (
    <div className="relative h-full w-full flex items-center justify-center" aria-hidden>
      <div className="relative w-[42%] aspect-[9/16] max-h-[86%] border border-white/20 bg-[#101013] overflow-hidden">
        <PixelImage
          src="/posters/work-ugc-testimonial.jpg"
          alt=""
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        {/* engagement rail */}
        <div className="absolute right-1.5 bottom-8 flex flex-col gap-3 text-white/80">
          <Heart size={13} />
          <MessageCircle size={13} />
          <Share2 size={13} />
        </div>
        <span className="absolute left-2 bottom-2 text-[8px] tracking-[0.18em] text-white/90 font-semibold">
          UGC-STYLE
        </span>
      </div>
      {/* ambient blocks */}
      <span className="absolute left-8 top-8 w-3 h-3 bg-[#c6f135]/70" />
      <span className="absolute right-10 bottom-10 w-2 h-2 bg-white/40" />
      <span className="absolute right-16 top-12 w-1.5 h-1.5 bg-[#c6f135]/50" />
    </div>
  );
}

function VignetteProduct() {
  // Product Marketing Videos — product stage + spotlight
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden>
      {/* spotlight cone */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[70%] h-[70%]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,244,221,0.14), transparent)",
          clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
        }}
      />
      {/* product frame */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[16%] w-[34%] aspect-[9/16] border border-[#c6f135]/40 overflow-hidden">
        <PixelImage
          src="/posters/work-product-story.jpg"
          alt=""
          className="absolute inset-0"
        />
      </div>
      {/* pedestal */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[14%] w-[46%] h-3 bg-[#1c1c20] border border-white/10" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[10%] w-[58%] h-1 bg-white/10" />
      {/* floor glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[9%] w-[80%] h-6"
        style={{
          background:
            "radial-gradient(closest-side, rgba(198,241,53,0.12), transparent)",
        }}
      />
    </div>
  );
}

function VignetteStrategy() {
  // Creative Strategy — storyboard panels + flow
  return (
    <div className="relative h-full w-full flex items-center gap-3 px-6" aria-hidden>
      {["BRIEF", "BOARD", "SCRIPT"].map((label, i) => (
        <div key={label} className="relative flex-1">
          <div
            className={`aspect-[4/3] border ${
              i === 1 ? "border-[#c6f135]/50" : "border-white/15"
            } bg-[#111114] p-2 flex flex-col gap-1.5`}
          >
            <span className="h-1 w-2/3 bg-white/20" />
            <span className="h-1 w-1/2 bg-white/12" />
            <span className="mt-auto text-[7px] tracking-[0.2em] text-white/50 font-bold">
              {label}
            </span>
          </div>
          {i < 2 && (
            <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-[#c6f135] text-[10px] font-bold">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function VignetteAvatar() {
  // AI Avatars — pixel representation resolving into a digital character
  return (
    <div className="relative h-full w-full flex items-center justify-center" aria-hidden>
      <div className="relative w-[46%] aspect-[9/16] max-h-[88%] border border-white/20 overflow-hidden">
        <PixelImage
          src="/posters/work-avatar-presenter.jpg"
          alt=""
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute left-2 top-2 text-[8px] tracking-[0.2em] text-[#c6f135] font-bold">
          AI PRESENTER
        </span>
      </div>
      <span className="absolute left-10 top-10 w-2.5 h-2.5 bg-[#c6f135]/60" />
      <span className="absolute right-12 bottom-12 w-2 h-2 bg-white/40" />
      <span className="absolute right-8 top-16 w-1.5 h-1.5 bg-white/30" />
    </div>
  );
}

const VIGNETTES = [
  VignetteFilm,
  VignetteAds,
  VignetteUGC,
  VignetteProduct,
  VignetteStrategy,
  VignetteAvatar,
];

/* ── section ── */

export function ServicesSection() {
  return (
    <section
      id="services"
      data-chapter="services"
      className="relative w8-scrim w8-section-pad"
    >
      {/* ghost chapter number */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute top-10 right-4 md:right-10 opacity-[0.13]"
      >
        <PixelText text="03" cell={14} color="#f4f3ee" />
      </div>

      <div className="w8-shell relative">
        <Reveal className="max-w-3xl">
          <p className="w8-eyebrow w8-accent mb-4">What We Do</p>
          <h2 className="w8-h2 text-balance">
            Six ways we build creative for modern brands.
          </h2>
          <p className="w8-lead w8-muted-hi mt-5">
            Every service runs on the same WENOV8 production engine —
            creative strategy, AI-assisted production, and real finishing
            craft.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-20 space-y-5 md:space-y-7">
          {SERVICES.map((service, i) => {
            const Vignette = VIGNETTES[i] ?? VignetteFilm;
            const flip = i % 2 === 1;
            return (
              <Reveal key={service.slug} delay={0.04}>
                <Link
                  href={`/${service.slug}`}
                  data-cursor="explore"
                  className="group grid md:grid-cols-12 gap-5 md:gap-8 items-stretch border border-white/10 bg-[#0a0a0b]/60 hover:border-[#c6f135]/35 transition-colors duration-500"
                >
                  {/* vignette stage */}
                  <div
                    className={`relative md:col-span-4 h-44 md:h-56 lg:h-60 border-white/10 ${
                      flip ? "md:order-2 md:border-l" : "md:border-r"
                    } border-b md:border-b-0 bg-[#0d0d10]`}
                  >
                    <Vignette />
                  </div>

                  {/* copy */}
                  <div className="md:col-span-8 flex flex-col justify-center p-6 md:p-9">
                    <div className="flex items-center gap-4">
                      <PixelText
                        text={String(i + 1).padStart(2, "0")}
                        cell={2}
                        color="#c6f135"
                      />
                      <span className="h-px flex-1 bg-white/10" aria-hidden />
                      <ArrowUpRight
                        size={18}
                        className="text-[#6d6d74] transition-all duration-300 group-hover:text-[#c6f135] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                    <h3 className="w8-h3 mt-4 group-hover:text-[#c6f135] transition-colors duration-300">
                      {service.name}
                    </h3>
                    <p className="w8-muted-hi text-sm w8-body mt-3 max-w-xl">
                      {service.card}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
