"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const PROJECT_TYPES = [
  "AI Video Production",
  "AI Video Ads",
  "UGC-Style Ads",
  "Product Marketing Video",
  "AI Avatars & Spokespeople",
  "Creative Strategy",
  "Other / Not sure yet",
];

const BUDGET_RANGES = [
  "Under $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000+",
  "To be discussed",
];

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [budget, setBudget] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      website: String(fd.get("website") || "").trim(),
      projectType,
      budgetRange: budget,
      details: String(fd.get("details") || "").trim(),
      // honeypot — bots fill it, humans never see it
      nickname: String(fd.get("nickname") || ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setStatus("sent");
      form.reset();
      setBudget("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "sent") {
    return (
      <div className="w8-card-hi p-8 md:p-10 text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C6F135] text-[#0a0a0b] mb-5">
          <Check size={22} strokeWidth={2.5} />
        </span>
        <h3
          className="text-xl font-bold"
          style={{ fontFamily: "var(--w8-font-display)" }}
        >
          Thank you — your brief is in.
        </h3>
        <p className="w8-muted-hi text-sm w8-body mt-3 max-w-sm mx-auto">
          We&apos;ll review your project and get back to you with the best
          production approach.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="w8-btn w8-btn-ghost-hi mt-7 !py-2.5 !px-6 text-sm"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl bg-white/[0.04] border border-white/12 px-4 py-3.5 text-sm text-[#F5F4EF] placeholder:text-[#6d6d74] outline-none transition-colors focus:border-[#C6F135]/60 focus:bg-white/[0.06]";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-[0.14em] w8-muted-hi mb-2";
  const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#121214] [&>option]:text-[#F5F4EF]`;

  return (
    <form onSubmit={onSubmit} className="w8-card-hi p-7 md:p-9 space-y-5" noValidate>
      {/* honeypot */}
      <input
        type="text"
        name="nickname"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-name" className={labelCls}>
            Name *
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cf-email" className={labelCls}>
            Work Email *
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-company" className={labelCls}>
            Company
          </label>
          <input
            id="cf-company"
            name="company"
            type="text"
            autoComplete="organization"
            placeholder="Company name"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cf-website" className={labelCls}>
            Website
          </label>
          <input
            id="cf-website"
            name="website"
            type="text"
            autoComplete="url"
            placeholder="https://"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-type" className={labelCls}>
            Project Type *
          </label>
          <select
            id="cf-type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className={selectCls}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cf-budget" className={labelCls}>
            Budget Range <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <select
            id="cf-budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={selectCls}
          >
            <option value="">Select a range</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="cf-details" className={labelCls}>
          Project Details *
        </label>
        <textarea
          id="cf-details"
          name="details"
          required
          rows={5}
          placeholder="Tell us about your product, campaign goals, timeline, references…"
          className={`${inputCls} resize-y min-h-[120px]`}
        />
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="text-sm rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 px-4 py-3"
        >
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w8-btn w8-btn-primary w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Sending…" : "Get a Quote"}
        {status !== "sending" && <ArrowRight size={17} strokeWidth={2.2} />}
      </button>
    </form>
  );
}
