/**
 * WENOV8 site-wide configuration.
 * Single source of truth for brand, domain, contact and navigation.
 */

export const SITE = {
  name: "WENOV8",
  legalName: "WENOV8 LLC",
  domain: "wenov8.online",
  url: "https://wenov8.online",
  tagline: "AI-Powered Video & Creative Marketing",
  description:
    "WENOV8 creates AI-powered video ads, UGC-style content, product videos, and creative marketing assets for modern brands.",
  email: "hello@wenov8.online",
  location: "Wyoming, United States",
} as const;

export const MAIN_NAV = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "AI Studio", href: "/studio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const LEGAL_NAV = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
] as const;
