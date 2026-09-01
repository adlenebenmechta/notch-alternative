/**
 * Resolve a CSS custom property to a concrete color for <canvas> drawing.
 * Canvas fillStyle cannot consume var() strings, so pixel components pass
 * tokens like "var(--w8-ember)" and resolve them at draw time — which
 * keeps every canvas perfectly in sync with the dark/light theme.
 */
export function cssVar(name: string, fallback = "#f2efe6"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/** Accepts either a raw hex or a var(--token) and resolves it. */
export function resolveColor(color: string, fallback = "#f2efe6"): string {
  if (!color) return fallback;
  if (color.startsWith("var(--")) {
    const name = color.slice(4, -1);
    return cssVar(name, fallback);
  }
  return color;
}
