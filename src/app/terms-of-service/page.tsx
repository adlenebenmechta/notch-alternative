import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for the WENOV8 website, creative services and AI Studio platform.",
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="August 2026"
      intro="These Terms of Service (“Terms”) govern your use of wenov8.online, the creative services of WENOV8 LLC, and the WENOV8 AI Studio platform. By using the website or services, you agree to these Terms."
      sections={[
        {
          heading: "1. Services",
          paragraphs: [
            "WENOV8 LLC provides digital marketing and AI-assisted video production services, including AI video production, AI video ads, UGC-style content, product marketing videos, creative strategy and access to the WENOV8 AI Studio. The specific scope, deliverables and pricing of any project are agreed in a separate quote or proposal.",
          ],
        },
        {
          heading: "2. Accounts",
          paragraphs: [
            "Some features of the AI Studio require an account. You are responsible for the accuracy of your registration information, for safeguarding your credentials, and for all activity under your account. You must be at least 18 years old (or the age of majority in your jurisdiction) to create an account.",
          ],
        },
        {
          heading: "3. AI Studio plans and credits",
          list: [
            "The AI Studio offers a free plan with a limited number of generation credits, and paid plans with higher limits.",
            "Credits are consumed when you generate videos or other media, as indicated in the interface before generation.",
            "Plan features, credit allowances and prices are shown in the AI Studio and may change with notice.",
            "Subscriptions renew automatically until cancelled by you.",
          ],
        },
        {
          heading: "4. Acceptable use",
          list: [
            "Do not use the services to create content that is unlawful, defamatory, hateful, harassing or harmful.",
            "Do not misrepresent AI-generated content as real footage of real people, and comply with platform disclosure rules when publishing AI-generated advertising.",
            "Do not attempt to breach security, scrape aggressively, resell access, or interfere with the operation of the services.",
            "You retain responsibility for the content you generate and for having the rights to any material you upload (e.g. product images, brand assets, scripts).",
          ],
        },
        {
          heading: "5. Intellectual property",
          paragraphs: [
            "You own the media you generate with the AI Studio to the extent permitted by the underlying AI providers, and you may use it in your marketing subject to those providers' terms. WENOV8 retains all rights in the platform, its brand and its website content.",
          ],
        },
        {
          heading: "6. Client materials",
          paragraphs: [
            "When you provide materials for a production project (logos, products, footage, claims), you confirm you have the rights to use them. WENOV8 may use completed work for its own portfolio unless you request otherwise in writing.",
          ],
        },
        {
          heading: "7. Payments",
          paragraphs: [
            "Service projects are invoiced according to the agreed quote. AI Studio subscriptions are charged on a recurring basis through our payment provider. Taxes may apply. Fees are stated in the currency indicated at checkout.",
          ],
        },
        {
          heading: "8. Disclaimers",
          paragraphs: [
            "The services are provided “as is”. While we aim for high quality, AI generation can produce unexpected results, and we do not warrant that any creative asset will achieve specific business or advertising results.",
          ],
        },
        {
          heading: "9. Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, WENOV8 LLC is not liable for indirect or consequential damages, and our aggregate liability under these Terms is limited to the amount you paid us in the twelve months preceding the claim.",
          ],
        },
        {
          heading: "10. Termination",
          paragraphs: [
            "You may cancel your subscription or close your account at any time. We may suspend or terminate access for breach of these Terms, with notice where practicable.",
          ],
        },
        {
          heading: "11. Governing law",
          paragraphs: [
            "These Terms are governed by the laws of the State of Wyoming, United States, without regard to conflict-of-law principles.",
          ],
        },
        {
          heading: "12. Contact",
          paragraphs: [
            "Questions about these Terms can be sent to hello@wenov8.online.",
          ],
        },
      ]}
    />
  );
}
