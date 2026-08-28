/**
 * WENOV8 asset generation script.
 * - Video posters (ffmpeg thumbnail filter picks a representative frame)
 * - Icons (W8 monogram via sharp)
 * - OG image 1200x630 via sharp
 * Run from repo root: node scripts/gen-assets.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const R = path.resolve(process.cwd());
const posters = path.join(R, "public", "posters");
fs.mkdirSync(posters, { recursive: true });
fs.mkdirSync(path.join(R, "public", "og"), { recursive: true });

// ── 1. Video posters ─────────────────────────────────────────────────────────
const posterJobs = [
  { src: "public/videos/1.mp4", out: "work-product-story.jpg" },
  { src: "public/videos/2.mp4", out: "work-ugc-testimonial.jpg" },
  { src: "public/videos/3.mp4", out: "work-avatar-presenter.jpg" },
  { src: "public/videos/podcast-preview.mp4", out: "work-podcast.jpg" },
  { src: "public/hooks/hook-4.mp4", out: "work-pov-hook.jpg" },
  { src: "public/hooks/hook-2.mp4", out: "work-broll.jpg" },
  { src: "public/videos/5.mp4", out: "work-avatar-outdoor.jpg" },
  { src: "public/videos/menu-bg.mp4", out: "work-talking-head.jpg" },
  { src: "public/videos/promo.mp4", out: "hero-promo.jpg" },
];

for (const job of posterJobs) {
  const inPath = path.join(R, job.src);
  const outPath = path.join(posters, job.out);
  execSync(
    `ffmpeg -y -v error -i "${inPath}" -vf "thumbnail,scale=720:-2" -frames:v 1 -update 1 -q:v 4 "${outPath}"`,
    { stdio: "pipe" }
  );
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`poster ${job.out} (${kb}KB)`);
}

// ── 2. W8 monogram SVG ───────────────────────────────────────────────────────
const W8_SVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#151517"/>
      <stop offset="1" stop-color="#060607"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="128" y="340" font-family="Arial, Helvetica, sans-serif" font-size="250" font-weight="900" fill="#F5F4EF" letter-spacing="-14">W</text>
  <text x="332" y="340" font-family="Arial, Helvetica, sans-serif" font-size="250" font-weight="900" fill="#C6F135">8</text>
</svg>`;

// favicon.svg (app dir)
fs.writeFileSync(path.join(R, "src", "app", "icon.svg"), W8_SVG(512));

// PNG icons via sharp
const iconJobs = [
  { out: "public/apple-touch-icon.png", size: 180 },
  { out: "public/icon-192.png", size: 192 },
  { out: "public/icon-512.png", size: 512 },
  { out: "public/favicon-src.png", size: 64 },
];
for (const job of iconJobs) {
  await sharp(Buffer.from(W8_SVG(job.size)))
    .resize(job.size, job.size)
    .png()
    .toFile(path.join(R, job.out));
  console.log(`icon ${job.out}`);
}

// favicon.ico (32px, via ffmpeg from the 64px png)
execSync(
  `ffmpeg -y -v error -i "${path.join(R, "public", "favicon-src.png")}" -vf scale=32:32 -update 1 "${path.join(R, "public", "favicon.ico")}"`,
  { stdio: "pipe" }
);
fs.unlinkSync(path.join(R, "public", "favicon-src.png"));
console.log("icon public/favicon.ico");

// ── 3. OG image 1200x630 ─────────────────────────────────────────────────────
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101012"/>
      <stop offset="1" stop-color="#050506"/>
    </linearGradient>
    <linearGradient id="lime" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#C6F135"/>
      <stop offset="1" stop-color="#A8D92B"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1060" cy="90" r="290" fill="#C6F135" opacity="0.05"/>
  <circle cx="120" cy="580" r="220" fill="#C6F135" opacity="0.04"/>
  <rect x="80" y="96" width="56" height="8" rx="4" fill="url(#lime)"/>
  <text x="80" y="200" font-family="Arial, Helvetica, sans-serif" font-size="118" font-weight="900" letter-spacing="2" fill="#F5F4EF">WENOV<tspan fill="#C6F135">8</tspan></text>
  <text x="80" y="268" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="500" fill="#B9B9BE">AI-Powered Video Content for Modern Brands</text>
  <line x1="80" y1="470" x2="1120" y2="470" stroke="#26262B" stroke-width="2"/>
  <text x="80" y="530" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#8A8A93">AI Video Ads · UGC-Style Content · Product Videos · Creative Strategy</text>
  <text x="80" y="580" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#C6F135">wenov8.online</text>
</svg>`;

await sharp(Buffer.from(OG_SVG)).jpeg({ quality: 90 }).toFile(path.join(R, "public", "og", "og-default.jpg"));
console.log("og public/og/og-default.jpg");
console.log("DONE");
