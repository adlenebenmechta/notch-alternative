import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/reveal";
import { WorkCard } from "@/components/site/work-card";
import { PORTFOLIO } from "@/lib/site/portfolio";

export const metadata: Metadata = {
  title: "Selected Work — AI Video & Creative Projects",
  description:
    "A selection of creative work produced by WENOV8 — AI video ads, UGC-style content, product videos, AI avatars and social creatives.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* hero */}
        <section className="w8-dark w8-grain relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
          <div
            aria-hidden
            className="absolute -top-32 right-0 w-[480px] h-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--w8-accent-soft), transparent)",
            }}
          />
          <div className="w8-shell relative">
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-5">Selected Work</p>
              <h1 className="w8-h1 max-w-3xl">
                Creative work, end to end.
              </h1>
              <p className="w8-lead w8-muted-hi mt-6 max-w-2xl">
                A selection of creative work produced for brands, products,
                and marketing campaigns — all created through the WENOV8
                production workflow.
              </p>
            </Reveal>
          </div>
        </section>

        {/* grid */}
        <section className="w8-dark w8-section !pt-4">
          <div className="w8-shell">
            <RevealGroup
              stagger={0.06}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
            >
              {PORTFOLIO.map((item) => (
                <RevealItem key={item.src} className="h-full">
                  <div className="flex flex-col gap-3">
                    <WorkCard item={item} />
                    <p className="text-xs w8-muted-hi px-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal className="mt-14 md:mt-20">
              <div className="w8-card-hi p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="w8-h3">
                    Want work like this for your brand?
                  </h2>
                  <p className="w8-muted-hi text-sm mt-2 max-w-md">
                    Tell us about your product and campaign — we&apos;ll come
                    back with a production approach.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="w8-btn w8-btn-primary self-start md:self-auto shrink-0"
                >
                  Get a Quote
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
