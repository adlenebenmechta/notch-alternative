import { ChevronDown } from "lucide-react";

/**
 * Chapter 01 — INTRO.
 * A single full-screen brand film — the WENOV8 title video. Nothing
 * sits on top of it but the top nav and a minimal scroll cue at the
 * bottom edge. The page below (the windows, each with its own video)
 * reveals itself the moment the visitor scrolls. The H1 stays in the
 * DOM for SEO and screen readers — visually hidden, never painted
 * over the film.
 */
export function Hero() {
  return (
    <section
      data-chapter="intro"
      id="intro"
      aria-label="WENOV8 brand film"
      className="relative h-[100svh] w-full overflow-hidden bg-black"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero-film.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      />
      <h1 className="sr-only">
        WENOV8 — Video Production &amp; Creative Marketing Studio
      </h1>

      {/* scroll cue — the only mark on the film, bottom center */}
      <a
        href="#work"
        className="w8-scroll-cue"
        aria-label="Scroll down to explore our work"
      >
        <ChevronDown size={22} strokeWidth={2.2} aria-hidden="true" />
      </a>
    </section>
  );
}
