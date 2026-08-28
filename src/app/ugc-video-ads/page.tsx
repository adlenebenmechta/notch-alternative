import type { Metadata } from "next";
import { ServicePageTemplate } from "@/components/site/service-template";
import { getService } from "@/lib/site/services";

const service = getService("ugc-video-ads")!;

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: { canonical: "/ugc-video-ads" },
};

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
