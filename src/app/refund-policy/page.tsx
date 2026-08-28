import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund policy for WENOV8 creative services and AI Studio subscriptions.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="August 2026"
      intro="This policy explains when refunds are available for WENOV8 creative services and for WENOV8 AI Studio subscriptions. We aim to be fair and straightforward."
      sections={[
        {
          heading: "1. Creative service projects",
          paragraphs: [
            "Production projects are scoped and quoted before work begins. Because creative production is delivered digitally and tailored to each client, refunds depend on the stage of the project:",
          ],
          list: [
            "Before production starts: if you cancel before work has begun, any advance payment for unproduced deliverables will be refunded in full.",
            "During production: refunds cover unproduced deliverables only; completed and delivered assets are non-refundable.",
            "After delivery: completed creative deliverables are non-refundable, but we will work with you on reasonable revisions if the deliverables do not match the agreed scope.",
          ],
        },
        {
          heading: "2. AI Studio subscriptions",
          list: [
            "You may cancel your subscription at any time; cancellation stops future renewals, and your plan remains active until the end of the paid period.",
            "Unused generation credits from a cancelled plan are not refundable.",
            "If you were charged in error or experienced a clear technical failure that prevented you from using the service, contact us within 14 days and we will review a refund of the affected charge.",
          ],
        },
        {
          heading: "3. How to request a refund",
          paragraphs: [
            "Email hello@wenov8.online with your account email, the charge or project reference, and a short description of the issue. We aim to respond within a few business days.",
          ],
        },
        {
          heading: "4. Processing",
          paragraphs: [
            "Approved refunds are returned via the original payment method. Depending on your bank or card provider, the amount may take additional days to appear on your statement.",
          ],
        },
      ]}
    />
  );
}
