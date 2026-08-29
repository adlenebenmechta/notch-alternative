import localFont from "next/font/local";
export const Etna = localFont({ src: "./Etna-Regular.otf", variable: "--font-etna" });
export const SugoProDisplay = localFont({ src: "./SugoProDisplay-Regular.ttf", variable: "--font-sugo" });
/** Minecraft-style pixel font — used for eyebrows, REC badges and micro-copy. */
export const Minecraft = localFont({
  src: "./Minecraft.ttf",
  variable: "--font-minecraft",
  display: "swap",
});
