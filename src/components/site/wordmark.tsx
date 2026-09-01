import Link from "next/link";

/**
 * Typographic WENOV8 wordmark — "8" in ember.
 * Token-driven colors: bone-on-space in dark mode, ink-on-paper in
 * light mode. The mark is always readable on any surface.
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
          "var(--font-kabisat), var(--font-geist-sans), sans-serif",
        fontStyle: "italic",
        letterSpacing: "0.05em",
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
          background: "var(--w8-grad-btn)",
          color: "#ffffff",
          fontFamily: "var(--font-cyber), var(--w8-font-display)",
          borderRadius: "0.65rem",
          boxShadow: "0 6px 18px -6px rgba(255, 77, 166, 0.5)",
        }}
      >
        W8
      </span>
      <Wordmark className="text-lg" />
    </Link>
  );
}
