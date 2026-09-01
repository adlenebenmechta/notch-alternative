import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SITE } from "@/lib/site/config";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

/**
 * Shared layout for legal pages — dark hero + readable single column.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader />
      <main className="w8-dark">
        <section className="w8-grain relative overflow-hidden pt-36 pb-12 md:pt-44 md:pb-14">
          <div className="w8-shell relative">
            <p className="w8-eyebrow w8-accent mb-5">Legal</p>
            <h1 className="w8-h1 !text-[clamp(2rem,4.5vw,3.4rem)]">{title}</h1>
            <p className="w8-muted-hi text-sm mt-5">Last updated: {updated}</p>
            <p className="w8-lead w8-muted-hi mt-6 max-w-2xl text-[1.02rem]">
              {intro}
            </p>
          </div>
        </section>

        <section className="pb-24 md:pb-32">
          <div className="w8-shell max-w-3xl">
            <div className="w8-card-hi !rounded-2xl p-7 md:p-10 space-y-9">
              {sections.map((s, i) => (
                <section key={i} aria-labelledby={`legal-${i}`}>
                  <h2
                    id={`legal-${i}`}
                    className="text-lg font-bold mb-4"
                    style={{ fontFamily: "var(--w8-font-display)" }}
                  >
                    {s.heading}
                  </h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j} className="w8-muted-hi text-sm w8-body mb-3">
                      {p}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="space-y-2.5 mt-2">
                      {s.list.map((li, j) => (
                        <li
                          key={j}
                          className="w8-muted-hi text-sm w8-body flex gap-3"
                        >
                          <span className="w8-accent mt-0.5" aria-hidden>
                            —
                          </span>
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              <div className="pt-2 border-t border-[var(--w8-line)]">
                <p className="w8-muted-hi text-sm w8-body">
                  Questions about this document? Contact us at{" "}
                  <a
                    href={`mailto:${SITE.email}`}
                    className="w8-link w8-accent"
                  >
                    {SITE.email}
                  </a>{" "}
                  or visit our{" "}
                  <Link href="/contact" className="w8-link w8-accent">
                    contact page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
