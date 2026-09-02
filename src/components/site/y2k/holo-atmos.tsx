"use client";

/**
 * HoloAtmos — fixed holographic atmosphere overlay.
 * A whisper of iridescent sheen + a soft vignette that keeps
 * copy edges readable. Restrained by design: sheen at ~2%,
 * vignette 14% on the bright pearl canvas.
 */
export function HoloAtmos() {
  return (
    <div aria-hidden className="fixed inset-0 z-[70] pointer-events-none">
      {/* iridescent Y2K sheen */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 18%, rgba(232, 89, 12, 0.02) 36%, rgba(255, 183, 77, 0.024) 50%, rgba(245, 158, 11, 0.02) 64%, transparent 82%)",
        }}
      />
      {/* soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 42%, transparent 58%, rgba(33, 20, 5, 0.12) 100%)",
        }}
      />
    </div>
  );
}
