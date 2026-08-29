"use client";

import { useEffect, useRef } from "react";
import { sceneState } from "../scene/scene-state";

/**
 * AtariWorld — the WENOV8 pixel universe.
 *
 * A loving nod to the Atari 2600: a chunky pixel starfield, a striped
 * arcade sun, blocky mountain ranges with blinking beacon towers,
 * drifting pixel clouds, occasional shooting stars and a slow patrol
 * UFO. Rendered at ~1/5 viewport resolution on a 2D canvas and upscaled
 * with `image-rendering: pixelated` — true retro pixels at 60fps for
 * pocket change (no WebGL, no dependencies).
 *
 * Deliberately calm: stars are tiny and sparse, silhouettes stay dark,
 * bright accents are small and live near the horizon — the page copy
 * always stays the hero. The horizon glow slowly cycles through the
 * brand arcade hues as the visitor scrolls through the chapters.
 */

const HUES = ["#00E5FF", "#FF2E88", "#FFD60A", "#8A5CFF"];

const SKY = {
  top: "#0B0920",
  mid: "#15103A",
  low: "#221A5E",
};

const MOUNT = {
  far: "#1B1548",
  farEdge: "#2A2170",
  near: "#0D0A24",
  nearEdge: "#16113E",
};

const STAR_COLORS = ["#E8E6F5", "#E8E6F5", "#00E5FF", "#FF2E88", "#FFD60A", "#8A5CFF"];

const SUN_ROWS = [4, 6, 8, 10, 10, 12, 12, 12, 10, 10, 8, 6];
const SUN_COLORS = ["#FFD60A", "#FFD60A", "#FFD60A", "#FFB13D", "#FFB13D", "#FF7A3D", "#FF7A3D", "#FF2E88", "#FF2E88", "#FF2E88", "#FF2E88", "#FF2E88"];

/** Deterministic PRNG — the world looks identical on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function lerpHex(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

interface Star {
  x: number;
  y: number;
  s: number; // size in game pixels
  c: number; // color index
  ph: number; // twinkle phase
  sp: number; // twinkle speed
  dx: number; // drift speed
  base: number; // base alpha
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  v: number;
  a: number;
}

interface Tower {
  x: number;
  top: number; // y (game px, from top of near layer strip)
}

interface Ridge {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  towers: Tower[];
}

interface Shot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  dur: number;
}

interface Ufo {
  active: boolean;
  x: number;
  y: number;
  dir: 1 | -1;
}

/** Random-walk blocky ridge that tiles seamlessly. */
function makeRidge(
  rand: () => number,
  stripW: number,
  height: number,
  minH: number,
  maxH: number,
  fill: string,
  edge: string,
  withTowers: boolean
): Ridge {
  const ys = new Array<number>(stripW);
  let y = Math.round((minH + maxH) / 2);
  for (let x = 0; x < stripW; x++) {
    const r = rand();
    if (r < 0.3) y += 1;
    else if (r < 0.6) y -= 1;
    if (rand() < 0.05) y += rand() < 0.5 ? 2 : -2;
    y = Math.max(minH, Math.min(maxH, y));
    ys[x] = y;
  }
  // seamless wrap: ease the tail back to the start height
  const K = 20;
  for (let i = 0; i < K; i++) {
    const x = stripW - K + i;
    const w = i / K;
    ys[x] = Math.round(ys[x] * (1 - w) + ys[0] * w);
  }

  const towers: Tower[] = [];
  if (withTowers) {
    let x = 24;
    while (x < stripW - 40) {
      if (rand() < 0.3) {
        const w = 3 + Math.floor(rand() * 4);
        const th = Math.min(maxH + 9, ys[x] + 6 + Math.floor(rand() * 6));
        for (let i = 0; i < w; i++) {
          if (x + i < stripW) ys[x + i] = Math.max(ys[x + i], th);
        }
        towers.push({ x, top: th });
        x += w + 40 + Math.floor(rand() * 90);
      } else {
        x += 30;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = stripW;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  for (let x = 0; x < stripW; x++) {
    const h = ys[x];
    ctx.fillStyle = edge;
    ctx.fillRect(x, height - h, 1, 1);
    ctx.fillStyle = fill;
    ctx.fillRect(x, height - h + 1, 1, h - 1);
  }
  return { canvas, width: stripW, height, towers };
}

export function AtariWorld() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let PIXEL = 5;
    let stars: Star[] = [];
    let clouds: Cloud[] = [];
    let far: Ridge | null = null;
    let near: Ridge | null = null;
    let sky: HTMLCanvasElement | null = null;
    let farScroll = 0;
    let nearScroll = 0;
    let t = 0;
    let raf = 0;
    let last = performance.now();
    let shotTimer = 4 + Math.random() * 5;
    let ufoTimer = 12 + Math.random() * 12;
    const shot: Shot = {
      active: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, dur: 0.9,
    };
    const ufo: Ufo = { active: false, x: 0, y: 0, dir: 1 };

    const build = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      PIXEL = vw < 768 ? 4 : 5;
      W = Math.ceil(vw / PIXEL);
      H = Math.ceil(vh / PIXEL);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.imageSmoothingEnabled = false;

      const rand = mulberry32(21081972); // Atari's birthday

      // ── sky: banded gradient, pre-rendered once ──
      sky = document.createElement("canvas");
      sky.width = W;
      sky.height = H;
      const sctx = sky.getContext("2d")!;
      const rows = Math.ceil(H * 0.82);
      for (let y = 0; y < rows; y++) {
        const p = y / rows;
        const c =
          p < 0.45
            ? lerpHex(SKY.top, SKY.mid, p / 0.45)
            : lerpHex(SKY.mid, SKY.low, (p - 0.45) / 0.55);
        sctx.fillStyle = c;
        sctx.fillRect(0, y, W, 1);
      }
      sctx.fillStyle = SKY.low;
      sctx.fillRect(0, rows, W, H - rows);

      // ── arcade sun: striped pixel circle (drawn on the sky, behind ridges) ──
      const sunX = Math.round(W * 0.72);
      const sunBase = Math.round(H * 0.82) - 2; // sits on the horizon
      for (let r = 0; r < SUN_ROWS.length; r++) {
        const w = SUN_ROWS[r];
        const y = sunBase - SUN_ROWS.length + r;
        const x0 = sunX - Math.floor(w / 2);
        sctx.globalAlpha = 0.92;
        sctx.fillStyle = SUN_COLORS[r];
        if (r >= 7) {
          // striped bottom half — the iconic retro sun
          const seg = Math.max(1, Math.floor(w / 3));
          sctx.fillRect(x0, y, seg, 1);
          sctx.fillRect(x0 + w - seg, y, seg, 1);
        } else {
          sctx.fillRect(x0, y, w, 1);
        }
      }
      // soft halo around the sun so it glows over the ridge line
      sctx.globalAlpha = 0.1;
      sctx.fillStyle = "#FFB13D";
      sctx.fillRect(sunX - 9, sunBase - 13, 18, 15);
      sctx.globalAlpha = 1;

      // ── stars: sparse, tiny, twinkling ──
      const count = vw < 768 ? 60 : Math.min(150, Math.round(W / 3));
      stars = Array.from({ length: count }, () => {
        const s = rand() < 0.78 ? 1 : 2;
        return {
          x: rand() * W,
          y: rand() * H * 0.72,
          s,
          c: Math.floor(rand() * STAR_COLORS.length),
          ph: rand() * Math.PI * 2,
          sp: 0.6 + rand() * 1.6,
          dx: 0.15 + rand() * 0.45,
          base: s === 2 ? 0.65 + rand() * 0.3 : 0.35 + rand() * 0.5,
        };
      });

      // ── drifting pixel clouds ──
      const nClouds = vw < 768 ? 2 : 4;
      clouds = Array.from({ length: nClouds }, () => ({
        x: rand() * W,
        y: Math.round(H * (0.08 + rand() * 0.3)),
        w: 8 + Math.floor(rand() * 10),
        v: 0.4 + rand() * 0.9,
        a: 0.05 + rand() * 0.06,
      }));

      // ── mountain ranges (far + near) ──
      const farH = Math.max(14, Math.round(H * 0.22));
      const nearH = Math.max(10, Math.round(H * 0.15));
      const stripW = Math.max(W * 2, 480);
      far = makeRidge(rand, stripW, farH, 2, Math.round(farH * 0.75), MOUNT.far, MOUNT.farEdge, false);
      near = makeRidge(rand, stripW, nearH, 1, Math.round(nearH * 0.6), MOUNT.near, MOUNT.nearEdge, true);
    };

    const drawFrame = (dt: number) => {
      if (!far || !near || !sky) return;
      const horizon = Math.round(H * 0.82);

      // ── sky + sun ──
      ctx.drawImage(sky, 0, 0);

      // ── horizon glow: brand hues cycle with scroll progress ──
      const master = Math.min(1, Math.max(0, sceneState.master));
      const huePos = master * (HUES.length - 1);
      const i0 = Math.floor(huePos);
      const i1 = Math.min(HUES.length - 1, i0 + 1);
      const glow = lerpHex(HUES[i0], HUES[i1], huePos - i0);
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.4);
      const glowAlphas = [0.09, 0.15, 0.24, 0.34];
      for (let g = 0; g < 4; g++) {
        ctx.globalAlpha = glowAlphas[g] * breathe;
        ctx.fillStyle = glow;
        ctx.fillRect(0, horizon - 8 + g, W, 1);
      }
      ctx.globalAlpha = 1;

      // ── stars ──
      for (const st of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * st.sp + st.ph);
        ctx.globalAlpha = st.base * tw;
        ctx.fillStyle = STAR_COLORS[st.c];
        if (!reduce) {
          st.x -= st.dx * dt * st.s;
          if (st.x < -2) st.x += W + 4;
        }
        ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
      }
      ctx.globalAlpha = 1;

      // ── clouds ──
      for (const cl of clouds) {
        if (!reduce) {
          cl.x -= cl.v * dt;
          if (cl.x < -cl.w - 6) cl.x = W + 6;
        }
        ctx.globalAlpha = cl.a + 0.03;
        ctx.fillStyle = "#8A5CFF";
        const cx = Math.round(cl.x);
        const cy = Math.round(cl.y);
        ctx.fillRect(cx, cy, cl.w, 2);
        ctx.fillRect(cx + 2, cy - 1, cl.w - 5, 1);
        ctx.fillRect(cx + 1, cy + 2, cl.w - 3, 1);
      }
      ctx.globalAlpha = 1;

      // ── shooting star ──
      if (shot.active) {
        shot.t += dt;
        if (shot.t >= shot.dur) {
          shot.active = false;
        } else {
          const p = shot.t / shot.dur;
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          const fade = Math.sin(Math.PI * p); // ease in-out
          for (let k = 0; k < 6; k++) {
            ctx.globalAlpha = fade * 0.75 * (1 - k / 6);
            ctx.fillStyle = k === 0 ? "#FFFFFF" : "#00E5FF";
            ctx.fillRect(
              Math.round(shot.x - shot.vx * 0.06 * k),
              Math.round(shot.y - shot.vy * 0.06 * k),
              1,
              1
            );
          }
          ctx.globalAlpha = 1;
        }
      } else if (!reduce) {
        shotTimer -= dt;
        if (shotTimer <= 0) {
          shotTimer = 6 + Math.random() * 7;
          shot.active = true;
          shot.t = 0;
          shot.dur = 0.75 + Math.random() * 0.4;
          const fromLeft = Math.random() < 0.5;
          shot.x = fromLeft ? -4 : W + 4;
          shot.y = (0.05 + Math.random() * 0.3) * H;
          shot.vx = (fromLeft ? 1 : -1) * (55 + Math.random() * 30);
          shot.vy = 14 + Math.random() * 12;
        }
      }

      // ── UFO patrol ──
      if (ufo.active) {
        if (!reduce) ufo.x += ufo.dir * 16 * dt;
        const ux = Math.round(ufo.x);
        const uy = Math.round(ufo.y);
        // dome
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(ux + 2, uy, 3, 1);
        // hull
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#C9C4F0";
        ctx.fillRect(ux, uy + 1, 7, 1);
        // running lights
        for (let l = 0; l < 3; l++) {
          const on = Math.floor(t * 3 + l) % 3 === 0;
          ctx.globalAlpha = on ? 0.95 : 0.25;
          ctx.fillStyle = l === 0 ? "#FF2E88" : l === 1 ? "#FFD60A" : "#00E5FF";
          ctx.fillRect(ux + l * 3, uy + 2, 1, 1);
        }
        ctx.globalAlpha = 1;
        if (ufo.dir === 1 ? ufo.x > W + 8 : ufo.x < -16) ufo.active = false;
      } else if (!reduce) {
        ufoTimer -= dt;
        if (ufoTimer <= 0) {
          ufoTimer = 22 + Math.random() * 20;
          ufo.active = true;
          ufo.dir = Math.random() < 0.5 ? 1 : -1;
          ufo.x = ufo.dir === 1 ? -12 : W + 8;
          ufo.y = H * (0.16 + Math.random() * 0.22);
        }
      }

      // ── mountain ranges with parallax drift ──
      if (!reduce) {
        farScroll += 1.1 * dt;
        nearScroll += 2.6 * dt;
      }
      const drawRidge = (r: Ridge, scroll: number, baseY: number) => {
        const off = Math.floor(scroll) % r.width;
        for (let k = -1; k <= Math.ceil(W / r.width); k++) {
          const x = -off + k * r.width;
          if (x + r.width < 0 || x > W) continue;
          ctx.drawImage(r.canvas, x, baseY - r.height);
        }
        return off;
      };

      const farBase = horizon + 1;
      drawRidge(far, farScroll, farBase);

      // beacon lights on the near ridge towers
      const nearBase = H;
      const nearOff = Math.floor(nearScroll) % near.width;
      for (const tw of near.towers) {
        let sx = tw.x - nearOff;
        if (sx < 0) sx += near.width;
        if (sx > W) continue;
        const on = Math.floor(t * 1.4) % 2 === 0;
        ctx.globalAlpha = on ? 0.9 : 0.28;
        ctx.fillStyle = on ? "#00E5FF" : "#FF2E88";
        ctx.fillRect(sx + 1, nearBase - near.height + tw.top - 2, 1, 1);
      }
      ctx.globalAlpha = 1;

      drawRidge(near, nearScroll, nearBase);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      drawFrame(dt);
      raf = requestAnimationFrame(frame);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    };

    build();
    if (reduce) {
      // static, fully-formed world — no motion
      drawFrame(0);
    } else {
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none block w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
