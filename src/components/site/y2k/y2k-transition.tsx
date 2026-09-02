"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Y2KTransition — the signature click transition ("Star Iris Wipe").
 *
 * When a visitor clicks any internal site link:
 *   1. COVER  — a chrome panel irises open FROM THE EXACT CLICK POINT
 *      (clip-path circle), a 4-point Y2K star pops + spins there, a light
 *      shine sweeps across the chrome, and the WENOV8 wordmark rises
 *      letter-by-letter over pulsing loading dots.
 *   2. NAVIGATE — router.push() fires once the cover is complete, so the
 *      page swaps invisibly beneath the chrome.
 *   3. REVEAL  — the panel drops away like a stage curtain (top-first
 *      reveal) with a glowing ember edge leading the wipe.
 *
 * Everything respects prefers-reduced-motion (no interception at all —
 * native navigation). Studio/admin/auth routes are excluded: the wipe is
 * a marketing-site signature. Add the `w8x-slow` class on <html> to watch
 * it in slow motion (QA hook).
 */
const WORD = "WENOV8";
const COVER_MS = 500;
const PUSH_DELAY_MS = 560;

function isSitePath(p: string | null): boolean {
  if (!p) return false;
  return !/^\/(studio|admin|auth|debug-auth|api|_next)(\/|$)/.test(p);
}

type Stage = "idle" | "cover" | "reveal";

export function Y2KTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("idle");
  const [pt, setPt] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Stage>("idle");
  const targetRef = useRef<string | null>(null);
  const pushTimer = useRef<number | null>(null);
  const guardTimer = useRef<number | null>(null);

  stageRef.current = stage;

  const clearTimers = useCallback(() => {
    if (pushTimer.current) {
      window.clearTimeout(pushTimer.current);
      pushTimer.current = null;
    }
    if (guardTimer.current) {
      window.clearTimeout(guardTimer.current);
      guardTimer.current = null;
    }
  }, []);

  // ── click interception (capture phase, site routes only) ──────────────
  useEffect(() => {
    if (!isSitePath(pathname)) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;

      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (/^(mailto:|tel:|javascript:|blob:|data:)/i.test(href)) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!isSitePath(url.pathname)) return; // studio/admin keep native nav
      if (url.pathname === pathname) return; // same page / hash scroll
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      if (stageRef.current !== "idle") return; // already wiping

      e.preventDefault();
      targetRef.current = url.pathname + url.search;

      // keyboard-activated links report 0,0 — bloom from screen centre
      const x = e.clientX || window.innerWidth / 2;
      const y = e.clientY || window.innerHeight / 2;
      setPt({ x, y });
      setStage("cover");

      // navigate once the iris has fully covered the viewport
      const slow =
        document.documentElement.classList.contains("w8x-slow");
      pushTimer.current = window.setTimeout(
        () => {
          pushTimer.current = null;
          if (stageRef.current === "cover" && targetRef.current) {
            router.push(targetRef.current);
            // safety: if the route never lands, drop the curtain anyway
            guardTimer.current = window.setTimeout(() => {
              guardTimer.current = null;
              if (stageRef.current === "cover") setStage("reveal");
            }, slow ? 4000 : 1800);
          }
        },
        slow ? PUSH_DELAY_MS * 5 : PUSH_DELAY_MS,
      );
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  // ── arrival: swap cover -> reveal as soon as the new route lands ──────
  useEffect(() => {
    if (stageRef.current === "cover") {
      clearTimers();
      setStage("reveal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── reveal done -> idle (timeout safety in case animationend is missed) ─
  useEffect(() => {
    if (stage !== "reveal") return;
    const slow = document.documentElement.classList.contains("w8x-slow");
    const t = window.setTimeout(() => setStage("idle"), slow ? 2600 : 640);
    return () => window.clearTimeout(t);
  }, [stage]);

  useEffect(() => clearTimers, [clearTimers]);

  if (stage === "idle" || !isSitePath(pathname)) return null;

  return (
    <div
      aria-hidden
      data-nosnippet
      className="w8-xwrap"
      data-stage={stage}
      style={{ ["--xpx" as string]: `${pt.x}px`, ["--ypx" as string]: `${pt.y}px` }}
    >
      <div className="w8-xpanel">
        <span className="w8-xshine" />

        {/* 4-point Y2K star blooming at the click point */}
        <svg className="w8-xstar" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 1.5c1.1 10.9 8.6 17.4 18.5 18.5-9.9 1.1-17.4 7.6-18.5 18.5C18.9 27.6 11.4 21.1 1.5 20 11.4 18.9 18.9 12.4 20 1.5Z"
            fill="url(#w8x-star-grad)"
          />
          <defs>
            <linearGradient id="w8x-star-grad" x1="0" y1="0" x2="40" y2="40">
              <stop offset="0%" stopColor="var(--w8-ember)" />
              <stop offset="100%" stopColor="var(--w8-aqua)" />
            </linearGradient>
          </defs>
        </svg>

        {/* wordmark rising letter-by-letter, brand ember 8 */}
        <span className="w8-xword">
          {Array.from(WORD).map((ch, i) => (
            <span
              key={i}
              className="w8-wx"
              style={{
                animationDelay: `${0.08 + i * 0.045}s`,
                color: ch === "8" ? "var(--w8-ember)" : undefined,
              }}
            >
              {ch}
            </span>
          ))}
        </span>

        {/* pulsing loading dots */}
        <span className="w8-xdots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
