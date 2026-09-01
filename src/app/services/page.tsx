import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { PixelDot } from "@/components/site/pixel/pixel-dot";
import { SiteFooter } from "@/components/site/footer";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/reveal";
import { SERVICES } from "@/lib/site/services";

export const metadata: Metadata = {
  title: "Services — AI Video & Creative Marketing",
  description:
    "AI video production, AI video ads, UGC-style content, product marketing videos, AI avatars and creative strategy — WENOV8 services for modern brands.",
  alternates: { canonical: "/services" },
};

const WHY_ITEMS = [
  "Creative strategy included in every production",
  "AI-assisted workflow built for volume and testing",
  "Formats for every platform, delivered campaign-ready",
];

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* hero */}
        <section className="w8-dark w8-grain relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-24">
          <div
            aria-hidden
            className="absolute -top-32 left-1/3 w-[520px] h-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--w8-accent-soft), transparent)",
            }}
          />
          <div className="w8-shell relative">
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-5">What We Do</p>
              <h1 className="w8-h1 max-w-3xl">
                Services built for modern creative production.
              </h1>
              <p className="w8-lead w8-muted-hi mt-6 max-w-2xl">
                From concept to final creative, we help brands produce
                high-quality marketing content with modern, smart
                production workflows.
              </p>
            </Reveal>
          </div>
        </section>

        {/* service rows */}
        <section className="w8-light w8-section !pt-10">
          <div className="w8-shell">
            <RevealGroup className="grid md:grid-cols-2 gap-4 md:gap-5">
              {SERVICES.map((s, i) => (
                <RevealItem key={s.slug} className="h-full">
                  <Link
                    href={`/${s.slug}`}
                    className="w8-card-lo group flex flex-col h-full p-7 md:p-9"
                  >
                    <PixelDot
                      color={
                        i % 3 === 1
                          ? "var(--w8-gold)"
                          : i % 3 === 2
                            ? "var(--w8-aqua)"
                            : "var(--w8-ember)"
                      }
                    />
                    <h2 className="w8-h3 mt-4">{s.name}</h2>
                    <p className="w8-muted-lo text-sm w8-body mt-3 flex-1">
                      {s.card}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--w8-inv-text)]">
                      Explore service
                      <ArrowUpRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </span>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>

            {/* included strip */}
            <Reveal className="mt-12 md:mt-16">
              <div className="w8-card-lo p-7 md:p-10">
                <p className="w8-eyebrow w8-accent-lo mb-6">
                  Included in every project
                </p>
                <ul className="grid sm:grid-cols-3 gap-4">
                  {WHY_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm w8-body">
                      <Check size={15} className="mt-1 shrink-0 w8-accent-lo" />
                      <span className="w8-muted-lo">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
