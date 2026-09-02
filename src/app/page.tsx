import type { Metadata } from "next";
import { SITE } from "@/lib/site/config";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { ScrollStage } from "@/components/site/scroll-stage";
import { Hero } from "@/components/site/sections/hero";
import { MarqueeTicker } from "@/components/site/y2k/marquee-ticker";
import { SelectedWork } from "@/components/site/sections/work";
import { ServicesSection } from "@/components/site/sections/services";
import { WhySection } from "@/components/site/sections/why";
import { ProcessSection } from "@/components/site/sections/process";
import { AudienceSection } from "@/components/site/sections/audience";
import { StudioSection } from "@/components/site/sections/studio";
import { AboutPreview } from "@/components/site/sections/about-preview";
import { FinalCta } from "@/components/site/sections/final-cta";

export const metadata: Metadata = {
  title: "WENOV8 | Video Production & Creative Marketing Studio",
  description: SITE.description,
  alternates: { canonical: "/" },
};

/** Organization + WebSite structured data. */
function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.legalName,
        alternateName: SITE.name,
        url: SITE.url,
        email: SITE.email,
        description:
          "WENOV8 LLC provides video production and digital marketing services to businesses and brands.",
        address: {
          "@type": "PostalAddress",
          addressRegion: "Wyoming",
          addressCountry: "US",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: "WENOV8",
        description: SITE.description,
        publisher: { "@id": `${SITE.url}/#organization` },
        inLanguage: "en",
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * The WENOV8 homepage — one continuous cinematic journey through the
 * creative machine. Seven chapters over a persistent WebGL scene:
 * intro → work → services → process → studio → about → contact.
 * All content is real DOM (crawlable, accessible); the 3D canvas is a
 * progressive enhancement behind it.
 */
export default function HomePage() {
  return (
    <>
      <JsonLd />
      <SiteHeader />
      <ScrollStage>
        <main>
          <Hero />
          <MarqueeTicker />
          <SelectedWork />
          <ServicesSection />
          <WhySection />
          <ProcessSection />
          <AudienceSection />
          <StudioSection />
          <AboutPreview />
          <FinalCta />
        </main>
        <SiteFooter />
      </ScrollStage>
    </>
  );
}
