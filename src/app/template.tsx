"use client";

/**
 * Route transition shell — Next.js remounts this template on every
 * navigation, so both animations replay per route change:
 *   1. the veil + light-blue scanline mask the page swap,
 *   2. the new page fades in beneath (opacity only — fixed-position
 *      elements like the header are never affected).
 */
export default function Template({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="w8-page-enter">
      <div aria-hidden className="w8-route-veil" data-nosnippet>
        <span className="w8-route-veil-line" />
      </div>
      {children}
    </div>
  );
}
