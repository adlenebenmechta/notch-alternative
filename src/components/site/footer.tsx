import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SITE, LEGAL_NAV } from "@/lib/site/config";
import { SERVICES } from "@/lib/site/services";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="w8-darker" role="contentinfo">
      {/* CTA strip */}
      <div className="w8-rule-hi">
        <div className="w8-shell py-14 md:py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="w8-eyebrow w8-accent mb-4">Start a project</p>
            <p
              className="text-3xl md:text-5xl font-bold tracking-tight max-w-xl"
              style={{ fontFamily: "var(--w8-font-display)" }}
            >
              Let&apos;s create something.
            </p>
          </div>
          <Link
            href="/contact"
            className="w8-btn w8-btn-primary self-start md:self-auto"
          >
            Get a Quote
            <ArrowUpRight size={17} strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {/* main footer grid */}
      <div className="w8-rule-hi">
        <div className="w8-shell py-14 grid grid-cols-2 md:grid-cols-12 gap-10">
          {/* brand */}
          <div className="col-span-2 md:col-span-4">
            <Wordmark className="text-2xl" />
            <p className="w8-muted-hi text-sm mt-4 max-w-xs leading-relaxed">
              {SITE.tagline}. AI-powered creative production for modern brands.
            </p>
            <a
              href={`mailto:${SITE.email}`}
              className="w8-link inline-block mt-5 text-sm w8-accent"
            >
              {SITE.email}
            </a>
          </div>

          {/* explore */}
          <nav aria-label="Explore" className="md:col-span-2">
            <p className="w8-eyebrow w8-muted-hi mb-5">Explore</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">Home</Link></li>
              <li><Link href="/work" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">Work</Link></li>
              <li><Link href="/services" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">Services</Link></li>
              <li><Link href="/studio" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">AI Studio</Link></li>
              <li><Link href="/about" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">About</Link></li>
              <li><Link href="/contact" className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors">Contact</Link></li>
            </ul>
          </nav>

          {/* services */}
          <nav aria-label="Services" className="md:col-span-3">
            <p className="w8-eyebrow w8-muted-hi mb-5">Services</p>
            <ul className="space-y-3 text-sm">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/${s.slug}`}
                    className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* legal */}
          <nav aria-label="Legal" className="md:col-span-3">
            <p className="w8-eyebrow w8-muted-hi mb-5">Legal</p>
            <ul className="space-y-3 text-sm">
              {LEGAL_NAV.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/support"
                  className="w8-link w8-muted-hi hover:text-[#F5F4EF] transition-colors"
                >
                  Support
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* bottom bar */}
      <div className="w8-rule-hi">
        <div className="w8-shell py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs w8-muted-hi">
            © 2026 {SITE.legalName}. All rights reserved.
          </p>
          <p className="text-xs w8-muted-hi">
            {SITE.legalName} · {SITE.location}
          </p>
        </div>
      </div>
    </footer>
  );
}
