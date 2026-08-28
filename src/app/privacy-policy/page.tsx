import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How WENOV8 LLC collects, uses and protects information on wenov8.online and the WENOV8 AI Studio.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 2026"
      intro="This Privacy Policy explains how WENOV8 LLC (“WENOV8”, “we”, “us”) handles information when you visit wenov8.online, submit our contact form, or use the WENOV8 AI Studio."
      sections={[
        {
          heading: "1. Who we are",
          paragraphs: [
            "WENOV8 LLC is a creative technology company providing digital marketing and AI-assisted video production services. Our principal location is Wyoming, United States. You can contact us at hello@wenov8.online.",
          ],
        },
        {
          heading: "2. Information we collect",
          list: [
            "Contact form submissions: name, email, company, website, project type, budget range and project details you choose to provide.",
            "AI Studio account data: name, email address and password (handled by our authentication provider), plus your plan and credit usage.",
            "Content you create: scripts, uploads and generated media associated with your AI Studio account.",
            "Usage data: basic analytics such as pages visited, device type and approximate location derived from IP address.",
          ],
        },
        {
          heading: "3. How we use information",
          list: [
            "To respond to enquiries and prepare project quotes.",
            "To operate, maintain and improve the WENOV8 AI Studio.",
            "To manage subscriptions, credits and billing.",
            "To understand how the website is used and improve it.",
            "To comply with legal obligations and protect against abuse.",
          ],
        },
        {
          heading: "4. Legal bases",
          paragraphs: [
            "We process information on the basis of your consent (e.g. submitting a form), the performance of a contract (operating your AI Studio account), our legitimate interest in running and securing our business, and compliance with law.",
          ],
        },
        {
          heading: "5. Sharing",
          paragraphs: [
            "We do not sell your personal information. We share data only with service providers that help us operate the website — for example hosting, database and authentication providers — under their own privacy obligations, or when required by law.",
          ],
        },
        {
          heading: "6. AI-generated content",
          paragraphs: [
            "Content you generate in the AI Studio is processed by third-party AI providers to produce the requested output. Do not submit confidential or sensitive material that you are not comfortable processing through these services.",
          ],
        },
        {
          heading: "7. Retention",
          paragraphs: [
            "Contact form submissions are kept for as long as needed to handle your enquiry and for reasonable record-keeping. AI Studio account data is retained while your account is active. You may request deletion at any time.",
          ],
        },
        {
          heading: "8. Your rights",
          paragraphs: [
            "Depending on your jurisdiction, you may have the right to access, correct, export or delete your personal information, and to object to or restrict certain processing. To exercise any of these rights, email hello@wenov8.online.",
          ],
        },
        {
          heading: "9. Security",
          paragraphs: [
            "We apply reasonable technical and organizational measures to protect information. No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.",
          ],
        },
        {
          heading: "10. Changes",
          paragraphs: [
            "We may update this policy from time to time. Material changes will be reflected by the “Last updated” date above.",
          ],
        },
      ]}
    />
  );
}
