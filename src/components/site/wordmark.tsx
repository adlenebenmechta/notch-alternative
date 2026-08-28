import Link from "next/link";

/**
 * Typographic WENOV8 wordmark — "8" in signal lime.
 * `onLight` swaps the lime for the accessible deep variant.
 */
export function Wordmark({
  onLight = false,
  className = "",
}: {
  onLight?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`font-semibold tracking-tight ${className}`}
      style={{ fontFamily: "var(--w8-font-display)" }}
    >
      WENOV
      <span style={{ color: onLight ? "var(--w8-lime-deep)" : "var(--w8-lime)" }}>
        8
      </span>
    </span>
  );
}

/** Clickable logo lockup — mark + wordmark. */
export function LogoLink({
  onLight = false,
  href = "/",
}: {
  onLight?: boolean;
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
        className="flex items-center justify-center w-9 h-9 rounded-lg font-black text-[15px] leading-none transition-transform duration-500 group-hover:rotate-[8deg]"
        style={{
          background: onLight ? "var(--w8-ink)" : "var(--w8-text-hi)",
          color: onLight ? "var(--w8-lime)" : "var(--w8-ink)",
          fontFamily: "var(--w8-font-display)",
        }}
      >
        W8
      </span>
      <Wordmark onLight={onLight} className="text-lg" />
    </Link>
  );
}
