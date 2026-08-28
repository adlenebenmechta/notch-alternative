"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { MAIN_NAV } from "@/lib/site/config";
import { LogoLink } from "./wordmark";

/**
 * Site header — transparent over dark hero, solid ink on scroll.
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#060607]/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent border-b border-transparent"
      }`}
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
                className={`w8-link text-sm transition-colors ${
                  active ? "text-[#F5F4EF]" : "text-[#9b9ba2] hover:text-[#F5F4EF]"
                }`}
                style={{ fontFamily: "var(--w8-font-display)" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {!loading && user ? (
            <Link href="/studio" className="w8-btn w8-btn-primary !py-2.5 !px-6">
              Open Studio
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </Link>
          ) : (
            <>
              <Link
                href="/studio"
                className="w8-link text-sm text-[#9b9ba2] hover:text-[#F5F4EF] transition-colors"
                style={{ fontFamily: "var(--w8-font-display)" }}
              >
                AI Studio
              </Link>
              <Link href="/contact" className="w8-btn w8-btn-primary !py-2.5 !px-6">
                Get a Quote
              </Link>
            </>
          )}
        </div>

        {/* mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden flex items-center justify-center w-11 h-11 -mr-2 text-[#F5F4EF]"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* mobile overlay menu */}
      <div
        className={`lg:hidden fixed inset-0 top-0 pt-20 bg-[#060607] transition-all duration-500 lg:transition-none ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
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
              className="flex items-center justify-between py-4 border-b border-white/10 text-[#F5F4EF] text-2xl"
              style={{
                fontFamily: "var(--w8-font-display)",
                transitionDelay: `${i * 40}ms`,
              }}
            >
              {item.label}
              <ArrowUpRight size={20} className="text-[#6d6d74]" />
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
