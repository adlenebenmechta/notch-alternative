import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SERVICES } from "@/lib/site/services";
import { SectionHeading } from "./work";
import { Reveal, RevealGroup, RevealItem } from "../reveal";

/** What We Do — 6 interactive service cards on light bone background. */
export function ServicesSection() {
  return (
    <section id="services" className="w8-light w8-section">
      <div className="w8-shell">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-14">
          <SectionHeading
            onDark={false}
            eyebrow="What We Do"
            title="From concept to final creative."
            intro="We help brands produce high-quality marketing content using modern AI-powered production workflows."
          />
          <Reveal delay={0.15}>
            <Link
              href="/services"
              className="w8-btn w8-btn-ghost-lo !py-2.5 !px-5 text-sm"
            >
              All Services
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </Link>
          </Reveal>
        </div>

        <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {SERVICES.map((service, i) => (
            <RevealItem key={service.slug}>
              <Link
                href={`/${service.slug}`}
                className="w8-card-lo group flex flex-col h-full p-6 md:p-7"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold"
                    style={{
                      background: "rgba(85, 102, 26, 0.08)",
                      color: "var(--w8-lime-deep)",
                      fontFamily: "var(--w8-font-display)",
                    }}
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ArrowUpRight
                    size={18}
                    className="text-[#b9b9be] transition-all duration-300 group-hover:text-[#0e0e10] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <h3 className="w8-h3 mt-6">{service.name}</h3>
                <p className="w8-muted-lo text-sm w8-body mt-3 flex-1">
                  {service.card}
                </p>
                <span
                  className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] w8-accent-lo"
                  style={{ fontFamily: "var(--w8-font-display)" }}
                >
                  Learn more
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
