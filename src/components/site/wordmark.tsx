import Link from "next/link";

/**
 * Typographic WENOV8 wordmark — "8" in ember.
 * Token-driven colors: ink-on-pearl. The mark is always
 * readable on any surface.
 */
export function Wordmark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        fontFamily:
          "var(--font-game), var(--font-geist-sans), sans-serif",
        letterSpacing: "0.08em",
        color: "var(--w8-text)",
      }}
    >
      WENOV
      <span style={{ color: "var(--w8-ember)" }}>8</span>
    </span>
  );
}

/** Clickable logo lockup — W8 mark + wordmark. */
export function LogoLink({
  href = "/",
}: {
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="WENOV8 — home"
      className="flex items-center gap-2.5 group"
    >
      <span
        aria-hidden
        className="flex items-center justify-center w-9 h-9 text-[13px] leading-none transition-transform duration-500 group-hover:rotate-[8deg]"
        style={{
          background: "var(--w8-ember)",
          color: "#ffffff",
          fontFamily: "var(--font-unbounded), var(--w8-font-display)",
          borderRadius: "0.65rem",
          boxShadow: "0 6px 18px -6px rgba(194, 65, 12, 0.45)",
        }}
      >
        W8
      </span>
      <Wordmark className="text-lg" />
    </Link>
  );
}
