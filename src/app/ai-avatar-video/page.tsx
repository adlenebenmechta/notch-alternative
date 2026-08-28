import type { Metadata } from "next";
import { ServicePageTemplate } from "@/components/site/service-template";
import { getService } from "@/lib/site/services";

const service = getService("ai-avatar-video")!;

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: { canonical: "/ai-avatar-video" },
};

export default function Page() {
  return <ServicePageTemplate service={service} />;
}
