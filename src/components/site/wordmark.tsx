import Link from "next/link";

/**
 * Typographic WENOV8 wordmark — "8" in signal light-blue.
 * Always sets an explicit text color so the mark is readable on any
 * surface (the header floats transparent over the dark hero).
 * `onLight` swaps to the accessible deep variant.
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
      style={{
        fontFamily: "var(--w8-font-display)",
        color: onLight ? "var(--w8-text-lo)" : "var(--w8-text-hi)",
      }}
    >
      WENOV
      <span
        style={{
          color: onLight ? "var(--w8-signal-deep)" : "var(--w8-signal)",
        }}
      >
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
          background: "var(--w8-signal)",
          color: "var(--w8-ink)",
          fontFamily: "var(--w8-font-display)",
        }}
      >
        W8
      </span>
      <Wordmark onLight={onLight} className="text-lg" />
    </Link>
  );
}
