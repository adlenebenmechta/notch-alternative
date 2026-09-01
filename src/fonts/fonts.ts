import localFont from "next/font/local";
export const Etna = localFont({ src: "./Etna-Regular.otf", variable: "--font-etna" });
export const SugoProDisplay = localFont({ src: "./SugoProDisplay-Regular.ttf", variable: "--font-sugo" });

/**
 * Cyberwave 2000 — the Y2K display font (user-supplied).
 * Ultra-wide futuristic techno face: headlines, wordmarks, big numbers.
 */
export const Cyberwave2000 = localFont({
  src: "./Cyberwave2000-Regular.otf",
  variable: "--font-cyber",
  display: "swap",
});

/**
 * Kabisat Demo ItalicTall — the Y2K label font (user-supplied).
 * Tall condensed italic: eyebrows, nav, buttons, micro-copy.
 */
export const Kabisat = localFont({
  src: "./Kabisat-Demo-ItalicTall.ttf",
  variable: "--font-kabisat",
  display: "swap",
});
