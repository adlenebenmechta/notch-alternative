import { Reveal, RevealGroup, RevealItem } from "../reveal";
import { SectionHeading } from "./work";

const BENEFITS = [
  {
    title: "Produce More Creative",
    text: "Create more concepts, variations, and formats without repeating traditional production workflows.",
  },
  {
    title: "Move Faster",
    text: "Turn creative ideas into production-ready content faster than traditional production.",
  },
  {
    title: "Test More Ideas",
    text: "Generate different hooks, angles, visual concepts, and ad variations for creative testing.",
  },
  {
    title: "Create What Cameras Can't",
    text: "AI allows brands to explore visual concepts, environments, characters, and product worlds that can be difficult or expensive to film traditionally.",
  },
];

/** Why WENOV8 — editorial numbered benefits on dark. */
export function WhySection() {
  return (
    <section className="w8-dark w8-section">
      <div className="w8-shell">
        <SectionHeading
          eyebrow="Why WENOV8"
          title="Why Brands Use AI-Powered Production"
        />

        <RevealGroup className="mt-12 md:mt-16 grid md:grid-cols-2 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {BENEFITS.map((b, i) => (
            <RevealItem key={b.title} className="bg-[#0a0a0b]">
              <div className="h-full p-7 md:p-10 hover:bg-[#121214] transition-colors duration-500">
                <p
                  className="w8-eyebrow w8-accent"
                  style={{ fontFamily: "var(--w8-font-display)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="w8-h3 mt-4">{b.title}</h3>
                <p className="w8-muted-hi text-sm w8-body mt-3 max-w-md">
                  {b.text}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
