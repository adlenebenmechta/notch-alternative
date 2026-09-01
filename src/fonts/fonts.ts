import localFont from "next/font/local";
export const Etna = localFont({ src: "./Etna-Regular.otf", variable: "--font-etna" });
export const SugoProDisplay = localFont({ src: "./SugoProDisplay-Regular.ttf", variable: "--font-sugo" });
/** Jersey 10 — pixel display font (user-supplied) for eyebrows, REC badges and micro-copy. */
export const Jersey10 = localFont({
  src: "./Jersey10-Regular.ttf",
  variable: "--font-pixel",
  display: "swap",
});
