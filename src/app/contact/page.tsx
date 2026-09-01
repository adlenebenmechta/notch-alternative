import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Reveal } from "@/components/site/reveal";
import { ContactForm } from "@/components/site/contact-form";
import { SITE } from "@/lib/site/config";

export const metadata: Metadata = {
  title: "Contact — Start a Creative Project",
  description:
    "Tell us about your product, campaign, or creative project. WENOV8 will get back to you with the best production approach.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="w8-dark">
        <section className="w8-grain relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
          <div
            aria-hidden
            className="absolute -top-32 right-1/4 w-[480px] h-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, var(--w8-accent-soft), transparent)",
            }}
          />
          <div className="w8-shell relative">
            <Reveal>
              <p className="w8-eyebrow w8-accent mb-5">Contact</p>
              <h1 className="w8-h1 max-w-3xl">Let&apos;s create something.</h1>
              <p className="w8-lead w8-muted-hi mt-6 max-w-2xl">
                Tell us about your product, campaign, or creative project.
                We&apos;ll get back to you with the best production approach.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="w8-section !pt-6 pb-20 md:pb-28">
          <div className="w8-shell grid lg:grid-cols-12 gap-10 lg:gap-14">
            <Reveal className="lg:col-span-7">
              <ContactForm />
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="space-y-8">
                <div className="w8-card-hi p-7">
                  <p className="w8-eyebrow w8-accent mb-4">Prefer email?</p>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="w8-link text-lg font-semibold"
                    style={{ fontFamily: "var(--w8-font-display)" }}
                  >
                    {SITE.email}
                  </a>
                  <p className="w8-muted-hi text-sm w8-body mt-3">
                    Send us your brief directly — product, audience, goals and
                    any references you like.
                  </p>
                </div>

                <div className="w8-card-hi p-7">
                  <p className="w8-eyebrow w8-accent mb-4">What happens next</p>
                  <ol className="space-y-4">
                    {[
                      "We review your brief and reply with questions or a proposed direction.",
                      "A short call aligns on goals, creative angles and scope.",
                      "You receive a production plan with timeline and quote.",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3.5 text-sm">
                        <span
                          className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0" style={{ background: "var(--w8-accent-soft)", color: "var(--w8-ember)" }}
                          style={{ fontFamily: "var(--w8-font-display)" }}
                        >
                          {i + 1}
                        </span>
                        <span className="w8-muted-hi w8-body">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="w8-card-hi p-7">
                  <p className="w8-eyebrow w8-accent mb-4">Company</p>
                  <p className="text-sm font-semibold">{SITE.legalName}</p>
                  <p className="w8-muted-hi text-sm mt-1">{SITE.location}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
