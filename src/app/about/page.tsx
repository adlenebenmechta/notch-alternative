import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/reveal";
import { SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "About — Creative Technology Company",
  description:
    "WENOV8 LLC is a creative technology company focused on AI-assisted video production and digital marketing for businesses and brands.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    title: "Creative first",
    text: "Strategy, concepts and craft lead every project — the technology serves the idea.",
  },
  {
    title: "AI-native production",
    text: "Our workflows combine creative direction with modern AI production tools.",
  },
  {
    title: "Built for scale",
    text: "One brief can become a full campaign: concepts, variations and formats.",
  },
];

export default function AboutPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About WENOV8",
    description:
      "WENOV8 LLC is a creative technology company focused on AI-assisted video production and digital marketing.",
    url: `${SITE.url}/about`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <SiteHeader />
      <main>
        {/* hero */}
        <section className="w8-dark w8-grain relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-24">
          <div
            aria-hidden
            className="absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(125,211,252,0.06), transparent)",
            }}
          />
          <div className="w8-shell relative">
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-5">About</p>
              <h1 className="w8-h1 max-w-3xl">About WENOV8</h1>
            </Reveal>
          </div>
        </section>

        {/* statement */}
        <section className="w8-light w8-section">
          <div className="w8-shell grid lg:grid-cols-12 gap-10 lg:gap-16">
            <Reveal className="lg:col-span-7">
              <div className="w8-body text-[15px] md:text-base space-y-6 max-w-2xl">
                <p className="text-[#0e0e10] font-medium text-lg md:text-xl leading-relaxed">
                  WENOV8 LLC is a creative technology company focused on
                  AI-assisted video production and digital marketing.
                </p>
                <p className="w8-muted-lo">
                  We help brands produce high-quality marketing content faster
                  through a combination of creative strategy, video
                  production, and modern AI-powered workflows.
                </p>
                <p className="w8-muted-lo">
                  Our work includes product advertising, UGC-style content,
                  social media creatives, promotional videos, AI-generated
                  visuals, and scalable creative production.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="w8-card-lo p-7 md:p-8">
                <p className="w8-eyebrow w8-accent-lo mb-5">Company</p>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between gap-4 pb-4 border-b border-[#0e0e10]/8">
                    <dt className="w8-muted-lo">Legal name</dt>
                    <dd className="font-semibold text-right">{SITE.legalName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-4 border-b border-[#0e0e10]/8">
                    <dt className="w8-muted-lo">Based in</dt>
                    <dd className="font-semibold text-right">{SITE.location}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-4 border-b border-[#0e0e10]/8">
                    <dt className="w8-muted-lo">Focus</dt>
                    <dd className="font-semibold text-right">
                      AI-assisted video & digital marketing
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="w8-muted-lo">Contact</dt>
                    <dd>
                      <a
                        href={`mailto:${SITE.email}`}
                        className="w8-link font-semibold w8-accent-lo"
                      >
                        {SITE.email}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* how we think */}
        <section className="w8-paper w8-section">
          <div className="w8-shell">
            <Reveal className="max-w-2xl">
              <p className="w8-eyebrow w8-accent-lo mb-4">How we work</p>
              <h2 className="w8-h2">Creative company, AI-native studio.</h2>
              <p className="w8-lead w8-muted-lo mt-5">
                WENOV8 combines a creative services team with its own AI
                production platform — the same technology we use for client
                work is available in the WENOV8 AI Studio.
              </p>
            </Reveal>

            <RevealGroup className="mt-12 grid md:grid-cols-3 gap-4 md:gap-5">
              {PILLARS.map((p) => (
                <RevealItem key={p.title} className="h-full">
                  <div className="w8-card-lo h-full p-6 md:p-7">
                    <h3 className="w8-h3">{p.title}</h3>
                    <p className="w8-muted-lo text-sm w8-body mt-3">{p.text}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal className="mt-12">
              <Link href="/studio" className="w8-btn w8-btn-ink">
                Explore the AI Studio
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
