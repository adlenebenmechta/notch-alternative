import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Studio — Create AI Videos, Avatars & Ads",
  description:
    "The WENOV8 AI Studio: generate AI avatar videos, UGC-style ads, social carousels, AI podcasts and more — the creative platform behind WENOV8's production workflow.",
  alternates: { canonical: "/studio" },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
