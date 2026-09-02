/**
 * WordmarkDisplay — the big Y2K chrome statement.
 *
 * A word (STUDIO / WENOV8) rendered in Brewok with the
 * liquid-chrome gradient flowing across it and a soft brand glow
 * behind. Replaces the pixel-converge canvas: same scale and
 * role in the layout, pure CSS, zero canvas cost.
 */
export function WordmarkDisplay({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-hidden
      data-nosnippet
    >
      {/* soft brand glow behind the word */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 90% at 50% 50%, var(--w8-accent-soft) 0%, transparent 72%)",
          filter: "blur(24px)",
        }}
      />
      <span
        className="w8-wordmark w8-chrome-text"
        style={{
          filter: "drop-shadow(0 10px 44px rgba(232, 89, 12, 0.2))",
        }}
      >
        {text}
      </span>
    </div>
  );
}
