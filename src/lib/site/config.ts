/**
 * WENOV8 site-wide configuration.
 * Single source of truth for brand, domain, contact and navigation.
 */

export const SITE = {
  name: "WENOV8",
  legalName: "WENOV8 LLC",
  domain: "wenov8.online",
  url: "https://wenov8.online",
  tagline: "Video Production & Creative Marketing Studio",
  description:
    "WENOV8 creates video ads, UGC-style content, product videos, and creative marketing assets for modern brands — produced with a smart, AI-assisted workflow.",
  email: "hello@wenov8.online",
  location: "Wyoming, United States",
} as const;

export const MAIN_NAV = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Studio", href: "/studio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const LEGAL_NAV = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
] as const;
