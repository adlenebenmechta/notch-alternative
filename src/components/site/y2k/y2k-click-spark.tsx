"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Y2KClickSpark — every tap on the marketing site blooms a tiny ember
 * spark: six particles fly outward + a small 4-point star pops and spins.
 * Pure ephemeral DOM (aria-hidden, removed after 600ms) — no React state,
 * zero cost when idle. Skips form fields, reduced-motion users and
 * non-site routes (studio/admin keep their native feel).
 */
const STAR_PATH =
  "M20 1.5c1.1 10.9 8.6 17.4 18.5 18.5-9.9 1.1-17.4 7.6-18.5 18.5C18.9 27.6 11.4 21.1 1.5 20 11.4 18.9 18.9 12.4 20 1.5Z";

function isSitePath(p: string | null): boolean {
  if (!p) return false;
  return !/^\/(studio|admin|auth|debug-auth|api|_next)(\/|$)/.test(p);
}

export function Y2KClickSpark() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isSitePath(pathname)) return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !(e.clientX || e.clientY)) return;
      if (t.closest?.("input, textarea, select, [contenteditable='true']"))
        return;

      const host = document.createElement("div");
      host.className = "w8-spark";
      host.style.left = `${e.clientX}px`;
      host.style.top = `${e.clientY}px`;
      host.setAttribute("aria-hidden", "");
      host.setAttribute("data-nosnippet", "");

      // six ember particles, pseudo-random directions and distances
      const N = 6;
      for (let k = 0; k < N; k++) {
        const ang = (Math.PI * 2 * k) / N + Math.random() * 0.7 - 0.35;
        const dist = 15 + Math.random() * 19;
        const p = document.createElement("i");
        p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
        p.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
        p.style.animationDelay = `${Math.random() * 0.04}s`;
        host.appendChild(p);
      }

      // the little spinning star
      const star = document.createElement("b");
      star.innerHTML = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="${STAR_PATH}" fill="currentColor"/></svg>`;
      host.appendChild(star);

      document.body.appendChild(host);
      window.setTimeout(() => host.remove(), 620);
    };

    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [pathname]);

  return null;
}
