import { RevealGroup, RevealItem } from "../reveal";
import { SectionHeading } from "./work";

const AUDIENCES = [
  {
    title: "E-commerce Brands",
    text: "Product videos, UGC-style ads, lifestyle creatives, and paid-social assets.",
  },
  {
    title: "DTC Brands",
    text: "Creative testing, product storytelling, and performance-focused video ads.",
  },
  {
    title: "Startups & SaaS",
    text: "Product explainers, launch videos, social content, and marketing creatives.",
  },
  {
    title: "Marketing Teams",
    text: "Scalable creative production for ongoing campaigns and content needs.",
  },
];

/** Built for Modern Brands — 4 audience cards, light. */
export function AudienceSection() {
  return (
    <section className="w8-light w8-section">
      <div className="w8-shell">
        <SectionHeading
          onDark={false}
          eyebrow="Who We Work With"
          title="Built for Modern Brands"
          intro="WENOV8 works with teams that need more creative, more often — and can't wait on traditional production cycles."
        />

        <RevealGroup className="mt-12 md:mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {AUDIENCES.map((a) => (
            <RevealItem key={a.title} className="h-full">
              <div className="w8-card-lo h-full p-6 md:p-7 flex flex-col">
                <span
                  aria-hidden
                  className="w-10 h-10 rounded-xl mb-6"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(198,241,53,0.5), rgba(85,102,26,0.25))",
                  }}
                />
                <h3 className="w8-h3">{a.title}</h3>
                <p className="w8-muted-lo text-sm w8-body mt-3">{a.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
