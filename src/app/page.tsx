import type { Metadata } from "next";
import { SITE } from "@/lib/site/config";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/sections/hero";
import { SelectedWork } from "@/components/site/sections/work";
import { ServicesSection } from "@/components/site/sections/services";
import { WhySection } from "@/components/site/sections/why";
import { ProcessSection } from "@/components/site/sections/process";
import { AudienceSection } from "@/components/site/sections/audience";
import { StudioSection } from "@/components/site/sections/studio";
import { AboutPreview } from "@/components/site/sections/about-preview";

export const metadata: Metadata = {
  title: "WENOV8 | AI Video Production & Creative Marketing",
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
          "WENOV8 LLC provides digital marketing and AI-assisted video production services to businesses and brands.",
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

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <SiteHeader />
      <main>
        <Hero />
        <SelectedWork />
        <ServicesSection />
        <WhySection />
        <ProcessSection />
        <AudienceSection />
        <StudioSection />
        <AboutPreview />
      </main>
      <SiteFooter />
    </>
  );
}
