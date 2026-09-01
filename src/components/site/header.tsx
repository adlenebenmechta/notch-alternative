"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
import { MAIN_NAV } from "@/lib/site/config";
import { LogoLink } from "./wordmark";

/**
 * ThemeToggle — flips the site between ember-dark and paper-light.
 * Both modes are first-class brand surfaces. Rendered after mount
 * to avoid a hydration mismatch on the icon.
 */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="inline-block w-11 h-11" aria-hidden />;
  }

  const isDark = resolvedTheme !== "light";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w8-pixel flex items-center justify-center w-11 h-11 transition-colors"
      style={{ color: "var(--w8-muted)" }}
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

/**
 * Site header — transparent over the hero, solid surface on scroll.
 * Shows "Open Studio" instead of "Get a Quote" primary CTA when
 * the visitor is authenticated (checks the existing Firebase session).
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change + lock scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "color-mix(in srgb, var(--w8-bg) 88%, transparent)"
          : "transparent",
        borderBottom: `1px solid ${scrolled ? "var(--w8-line)" : "transparent"}`,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="w8-shell flex items-center justify-between h-16 md:h-[76px]">
        <LogoLink />

        {/* desktop nav */}
        <nav aria-label="Main" className="hidden lg:flex items-center gap-8">
          {MAIN_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w8-link text-sm transition-colors`}
                style={{
                  color: active ? "var(--w8-text)" : "var(--w8-muted)",
                  fontFamily: "var(--w8-font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--w8-text)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = active ? "var(--w8-text)" : "var(--w8-muted)")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          {!loading && user ? (
            <Link href="/studio" className="w8-btn w8-btn-primary !py-2.5 !px-6">
              Open Studio
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </Link>
          ) : (
            <>
              <Link
                href="/studio"
                className="w8-link text-sm hidden xl:inline transition-colors"
                style={{
                  color: "var(--w8-muted)",
                  fontFamily: "var(--w8-font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--w8-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--w8-muted)")}
              >
                Studio
              </Link>
              <Link href="/contact" className="w8-btn w8-btn-primary !py-2.5 !px-6">
                Get a Quote
              </Link>
            </>
          )}
        </div>

        {/* mobile: theme toggle + menu toggle */}
        <div className="lg:hidden flex items-center">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-11 h-11 -mr-2"
            style={{ color: "var(--w8-text)" }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* mobile overlay menu */}
      <div
        className="lg:hidden fixed inset-0 top-0 pt-20 transition-all duration-500 lg:transition-none"
        style={{
          background: "var(--w8-bg)",
          visibility: open ? "visible" : "hidden",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <nav
          aria-label="Mobile"
          className="w8-shell flex flex-col gap-1 pt-6"
        >
          {MAIN_NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between py-4 border-b text-2xl"
              style={{
                fontFamily: "var(--w8-font-display)",
                color: "var(--w8-text)",
                borderColor: "var(--w8-line)",
                transitionDelay: `${i * 40}ms`,
              }}
            >
              {item.label}
              <ArrowUpRight size={20} style={{ color: "var(--w8-muted)" }} />
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-8">
            {!loading && user ? (
              <Link href="/studio" className="w8-btn w8-btn-primary w-full">
                Open Studio
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </Link>
            ) : (
              <Link href="/contact" className="w8-btn w8-btn-primary w-full">
                Get a Quote
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
