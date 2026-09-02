import localFont from "next/font/local";
export const Etna = localFont({ src: "./Etna-Regular.otf", variable: "--font-etna" });
export const SugoProDisplay = localFont({ src: "./SugoProDisplay-Regular.ttf", variable: "--font-sugo" });

/**
 * Brewok — the WENOV8 primary display font (user-supplied).
 * Bold distressed display face: headlines, wordmarks, W8 marks,
 * big numerals. The hero voice of the brand.
 */
export const Brewok = localFont({
  src: "./Brewok.otf",
  variable: "--font-brewok",
  display: "swap",
});

/**
 * Game Paused DEMO — the Y2K label font (user-supplied).
 * Chunky retro-game pixel face: eyebrows, nav accents, buttons,
 * micro-copy. Used uppercase with generous tracking.
 */
export const GamePaused = localFont({
  src: "./GamePausedDEMO.otf",
  variable: "--font-game",
  display: "swap",
});
