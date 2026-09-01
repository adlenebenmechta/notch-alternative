"use client";

/**
 * HoloAtmos — fixed holographic atmosphere overlay.
 * A whisper of iridescent sheen + a soft vignette that keeps
 * copy edges readable. Restrained by design: sheen at ~4%,
 * vignette 45%. Replaces the CRT scanlines + grain layer.
 */
export function HoloAtmos() {
  return (
    <div aria-hidden className="fixed inset-0 z-[70] pointer-events-none">
      {/* iridescent Y2K sheen */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, transparent 18%, rgba(255, 77, 166, 0.028) 36%, rgba(157, 107, 255, 0.04) 50%, rgba(63, 224, 255, 0.028) 64%, transparent 82%)",
        }}
      />
      {/* soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 50% 42%, transparent 58%, rgba(4, 3, 16, 0.45) 100%)",
        }}
      />
    </div>
  );
}
