import type { Metadata } from "next";
import { ServicePageTemplate } from "@/components/site/service-template";
import { getService } from "@/lib/site/services";

const service = getService("creative-marketing")!;

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: { canonical: "/creative-marketing" },
};

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
