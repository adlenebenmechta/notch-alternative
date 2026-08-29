"use client";

/**
 * Atmosphere — fixed film-grain + scanlines + vignette overlay.
 * Restrained by design: grain 5%, scanlines 3%, soft vignette.
 * Grain animation disabled for reduced-motion.
 */
export function Atmosphere() {
  return (
    <div aria-hidden className="fixed inset-0 z-[70] pointer-events-none w8-atmos">
      <div className="absolute inset-0 w8-scanlines" />
      <div className="absolute inset-0 w8-grain-anim" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 42%, transparent 55%, rgba(5,5,6,0.55) 100%)",
        }}
      />
    </div>
  );
}
