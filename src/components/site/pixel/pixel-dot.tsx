/**
 * PixelDot — the WENOV8 section marker, Y2K edition.
 *
 * A single glossy chrome orb (plus an optional hairline) that marks
 * each section. Pure CSS (theme-aware via tokens) — zero canvas cost.
 * The name keeps its place in the imports; the soul is chrome now.
 */

export function PixelDot({
  size = "md",
  color = "var(--w8-ember)",
  blink = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  color?: string;
  blink?: boolean;
  className?: string;
}) {
  const dim =
    size === "sm" ? "w-2 h-2" : size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${dim} ${blink ? "w8-blink" : ""} ${className}`}
      style={{
        background: `radial-gradient(circle at 32% 30%, #ffffff 0%, ${color} 62%)`,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  );
}

/**
 * PixelDotLockup — the heading marker: orb + hairline + eyebrow.
 */
export function PixelDotLockup({
  eyebrow,
  color = "var(--w8-ember)",
  dotColor,
  className = "",
}: {
  eyebrow: string;
  color?: string;
  dotColor?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <PixelDot color={dotColor ?? color} />
      <span
        aria-hidden
        className="h-px w-8"
        style={{ background: color, opacity: 0.45 }}
      />
      <p className="w8-eyebrow w8-accent">{eyebrow}</p>
    </div>
  );
}
