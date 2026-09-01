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
      className={`font-semibold tracking-tight ${className}`}
      style={{
        fontFamily: "var(--w8-font-display)",
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
        className="flex items-center justify-center w-9 h-9 font-black text-[15px] leading-none transition-transform duration-500 group-hover:rotate-[8deg]"
        style={{
          background: "var(--w8-ember)",
          color: "var(--w8-on-accent)",
          fontFamily: "var(--w8-font-display)",
          borderRadius: "0.5rem",
        }}
      >
        W8
      </span>
      <Wordmark className="text-lg" />
    </Link>
  );
}
