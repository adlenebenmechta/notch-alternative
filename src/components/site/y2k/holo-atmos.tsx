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
            "linear-gradient(115deg, transparent 18%, rgba(214, 31, 134, 0.018) 36%, rgba(255, 183, 77, 0.022) 50%, rgba(63, 224, 255, 0.018) 64%, transparent 82%)",
        }}
      />
      {/* soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 42%, transparent 58%, rgba(27, 23, 38, 0.14) 100%)",
        }}
      />
    </div>
  );
}
