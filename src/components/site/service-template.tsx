import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/reveal";
import { WorkCard } from "@/components/site/work-card";
import { SITE } from "@/lib/site/config";
import { SERVICES, type Service } from "@/lib/site/services";
import { PORTFOLIO } from "@/lib/site/portfolio";

/**
 * Shared template for the six SEO service pages.
 * Renders hero, overview, capabilities, use cases, related work, FAQ (with
 * JSON-LD) and CTA from the Service data object.
 */
export function ServicePageTemplate({ service }: { service: Service }) {
  const related = PORTFOLIO.filter((p) =>
    service.slug === "ugc-video-ads"
      ? p.category === "UGC Ads"
      : service.slug === "ai-avatar-video"
        ? p.category === "AI Avatar"
        : service.slug === "ai-video-ads" || service.slug === "creative-marketing"
          ? ["UGC Ads", "AI Video"].includes(p.category)
          : ["AI Video", "Product Advertising", "Social Media"].includes(p.category)
  ).slice(0, 4);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} — ${SITE.legalName}`,
    description: service.metaDescription,
    provider: {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.legalName,
      url: SITE.url,
    },
    url: `${SITE.url}/${service.slug}`,
    areaServed: "Worldwide",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <SiteHeader />
      <main>
        {/* hero */}
        <section className="w8-dark w8-grain relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-24">
          <div
            aria-hidden
            className="absolute -top-32 right-0 w-[480px] h-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(198,241,53,0.06), transparent)",
            }}
          />
          <div className="w8-shell relative">
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-5">
                <Link href="/services" className="w8-link">
                  Services
                </Link>
                <span className="mx-2 text-[#6d6d74]">/</span>
                {service.name}
              </p>
              <h1 className="w8-h1 max-w-3xl">{service.h1}</h1>
              <p className="w8-lead w8-muted-hi mt-6 max-w-2xl">
                {service.intro}
              </p>
              <div className="flex flex-wrap gap-4 mt-9">
                <Link href="/contact" className="w8-btn w8-btn-primary">
                  Get a Quote
                  <ArrowRight size={17} strokeWidth={2.2} />
                </Link>
                <Link href="/work" className="w8-btn w8-btn-ghost-hi">
                  View Our Work
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* overview + capabilities */}
        <section className="w8-light w8-section">
          <div className="w8-shell grid lg:grid-cols-12 gap-10 lg:gap-16">
            <Reveal className="lg:col-span-7">
              <p className="w8-eyebrow w8-accent-lo mb-4">Overview</p>
              <div className="w8-body w8-muted-lo space-y-5 text-[15px] md:text-base">
                {service.overview.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-[#0e0e10] font-medium" : ""}>
                    {p}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="w8-card-lo p-7 md:p-8">
                <p className="w8-eyebrow w8-accent-lo mb-5">
                  What&apos;s included
                </p>
                <ul className="space-y-3.5">
                  {service.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2.5 text-sm w8-body">
                      <Check size={15} className="mt-1 shrink-0 w8-accent-lo" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* use cases */}
        <section className="w8-paper w8-section">
          <div className="w8-shell">
            <Reveal className="max-w-2xl">
              <p className="w8-eyebrow w8-accent-lo mb-4">Use cases</p>
              <h2 className="w8-h2">Where it works</h2>
            </Reveal>
            <RevealGroup className="mt-10 grid md:grid-cols-3 gap-4 md:gap-5">
              {service.useCases.map((u) => (
                <RevealItem key={u.title} className="h-full">
                  <div className="w8-card-lo h-full p-6 md:p-7">
                    <h3 className="w8-h3">{u.title}</h3>
                    <p className="w8-muted-lo text-sm w8-body mt-3">{u.text}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* related work */}
        {related.length > 0 && (
          <section className="w8-dark w8-section">
            <div className="w8-shell">
              <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
                <Reveal className="max-w-2xl">
                  <p className="w8-eyebrow w8-accent mb-4">Related work</p>
                  <h2 className="w8-h2">Produced with this workflow</h2>
                </Reveal>
                <Reveal delay={0.1}>
                  <Link
                    href="/work"
                    className="w8-btn w8-btn-ghost-hi !py-2.5 !px-5 text-sm"
                  >
                    All Work
                    <ArrowUpRight size={15} strokeWidth={2.2} />
                  </Link>
                </Reveal>
              </div>
              <RevealGroup
                stagger={0.06}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
              >
                {related.map((item) => (
                  <RevealItem key={item.src}>
                    <WorkCard item={item} />
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="w8-light w8-section">
          <div className="w8-shell max-w-3xl">
            <Reveal>
              <p className="w8-eyebrow w8-accent-lo mb-4">FAQ</p>
              <h2 className="w8-h2">Common questions</h2>
            </Reveal>
            <div className="mt-10 space-y-4">
              {service.faqs.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 0.05}>
                  <details className="group w8-card-lo p-6 md:p-7 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                      <span
                        className="font-semibold text-[15px] md:text-base"
                        style={{ fontFamily: "var(--w8-font-display)" }}
                      >
                        {faq.q}
                      </span>
                      <span
                        aria-hidden
                        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-[#0e0e10]/10 text-[#0e0e10] transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="w8-muted-lo text-sm w8-body mt-4">{faq.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w8-darker w8-section">
          <div className="w8-shell">
            <Reveal>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                <div>
                  <p className="w8-eyebrow w8-accent mb-4">Start a project</p>
                  <h2 className="w8-h2 max-w-xl">
                    Ready to produce {service.name.toLowerCase()} for your brand?
                  </h2>
                </div>
                <Link
                  href="/contact"
                  className="w8-btn w8-btn-primary self-start md:self-auto"
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

/** Generate a thin page file body for each service. */
export function servicePage(service: Service) {
  return function Page() {
    return <ServicePageTemplate service={service} />;
  };
}
