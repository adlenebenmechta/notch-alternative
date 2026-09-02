import localFont from "next/font/local";
export const Etna = localFont({ src: "./Etna-Regular.otf", variable: "--font-etna" });
export const SugoProDisplay = localFont({ src: "./SugoProDisplay-Regular.ttf", variable: "--font-sugo" });

/**
 * Unbounded — the WENOV8 primary display font (Google Fonts, OFL).
 * Wide geometric Y2K revival face, variable 200–900. Headlines,
 * wordmarks, W8 marks, big numerals. The hero voice of the brand:
 * airy sidebearings (no cramped letters), elegant at light weights.
 */
export const Unbounded = localFont({
  src: "./Unbounded-Variable.ttf",
  variable: "--font-unbounded",
  weight: "200 900",
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
