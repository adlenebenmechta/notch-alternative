/**
 * Shared mutable scene state — written by the scroll/mouse listeners in
 * ScrollStage (DOM side) and read every frame by the WebGL scene.
 * Module-level singleton: zero re-renders between DOM and canvas.
 */

export const CHAPTER_IDS = [
  "intro",
  "work",
  "services",
  "process",
  "studio",
  "about",
  "contact",
] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

export const sceneState = {
  /** Continuous 0..1 journey progress across all 7 chapters. */
  master: 0,
  /** Index of the chapter currently occupying the viewport center. */
  activeChapter: 0,
  /** Normalized pointer position (-1..1), desktop only. */
  mouseX: 0,
  mouseY: 0,
  isMobile: false,
  reducedMotion: false,
};
