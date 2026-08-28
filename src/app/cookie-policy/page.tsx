import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How WENOV8 uses cookies and similar technologies on wenov8.online and the AI Studio.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="August 2026"
      intro="This policy describes the cookies and similar technologies used on wenov8.online and the WENOV8 AI Studio, and why we use them."
      sections={[
        {
          heading: "1. What cookies are",
          paragraphs: [
            "Cookies are small text files stored by your browser. Similar technologies — such as local storage — work in comparable ways. They help websites remember actions and preferences between pages and visits.",
          ],
        },
        {
          heading: "2. What we use",
          list: [
            "Authentication: strictly necessary storage that keeps you signed in to the AI Studio and remembers your session safely.",
            "Preferences: we store your interface choices — such as selected language — so the Studio opens the way you left it.",
            "Analytics: aggregated statistics about page usage that help us understand what works and improve the site.",
          ],
        },
        {
          heading: "3. Managing cookies",
          paragraphs: [
            "You can clear or block cookies through your browser settings. Blocking strictly necessary cookies will prevent the AI Studio from working correctly (for example, you may not stay signed in).",
          ],
        },
        {
          heading: "4. Third parties",
          paragraphs: [
            "Our authentication and payment providers may set their own cookies when you sign in or make a purchase. These are governed by those providers' policies.",
          ],
        },
      ]}
    />
  );
}
