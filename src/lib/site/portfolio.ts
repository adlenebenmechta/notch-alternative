/**
 * Portfolio items — REAL assets produced with the WENOV8 AI Studio.
 * Every entry below maps to an actual video/image file in /public.
 * Labels describe the content truthfully; no invented clients or results.
 */

export type PortfolioItem = {
  title: string;
  category:
    | "AI Video"
    | "UGC Ads"
    | "AI Avatar"
    | "Product Advertising"
    | "AI Podcast"
    | "Social Media";
  description: string;
  /** path under /public */
  src: string;
  poster: string;
  /** media type */
  kind: "video" | "image";
  /** aspect for the grid tile */
  aspect: "9/16" | "16/9";
  /** shown on the homepage selected-work rail */
  featured?: boolean;
};

export const PORTFOLIO: PortfolioItem[] = [
  {
    title: "Product Story — Supplement Demo",
    category: "Product Advertising",
    description:
      "UGC-style product demonstration produced with an AI presenter — hook, product reveal and everyday-use framing.",
    src: "/videos/1.mp4",
    poster: "/posters/work-product-story.jpg",
    kind: "video",
    aspect: "9/16",
    featured: true,
  },
  {
    title: "UGC-Style Testimonial — Skincare",
    category: "UGC Ads",
    description:
      "Authentic-style short-form ad built around a relatable presenter, natural pacing and a product-in-hand moment.",
    src: "/videos/2.mp4",
    poster: "/posters/work-ugc-testimonial.jpg",
    kind: "video",
    aspect: "9/16",
    featured: true,
  },
  {
    title: "AI Spokesperson — Brand Presenter",
    category: "AI Avatar",
    description:
      "A consistent AI presenter delivering a brand message — generated end-to-end with the WENOV8 AI Studio.",
    src: "/videos/3.mp4",
    poster: "/posters/work-avatar-presenter.jpg",
    kind: "video",
    aspect: "9/16",
    featured: true,
  },
  {
    title: "AI Podcast Show — GLOW CAST",
    category: "AI Podcast",
    description:
      "Two-character AI podcast production — automated dialogue, studio visuals and a branded show format.",
    src: "/videos/podcast-preview.mp4",
    poster: "/posters/work-podcast.jpg",
    kind: "video",
    aspect: "9/16",
    featured: true,
  },
  {
    title: "POV Hook — Short-Form Opener",
    category: "UGC Ads",
    description:
      "A first-person hook clip produced for short-form social ads, designed to stop the scroll in the first seconds.",
    src: "/hooks/hook-4.mp4",
    poster: "/posters/work-pov-hook.jpg",
    kind: "video",
    aspect: "9/16",
    featured: true,
  },
  {
    title: "Cinematic B-Roll — Golden Hour",
    category: "AI Video",
    description:
      "AI-generated atmospheric b-roll used as pacing and transition material inside longer ad cuts.",
    src: "/hooks/hook-2.mp4",
    poster: "/posters/work-broll.jpg",
    kind: "video",
    aspect: "9/16",
  },
  {
    title: "AI Spokesperson — Outdoor Scene",
    category: "AI Avatar",
    description:
      "AI presenter filmed-style outdoor scene — consistent character, natural lighting, vertical delivery format.",
    src: "/videos/5.mp4",
    poster: "/posters/work-avatar-outdoor.jpg",
    kind: "video",
    aspect: "9/16",
  },
  {
    title: "Talking-Head Studio Session",
    category: "AI Video",
    description:
      "Talking-head studio session generated with the avatar engine — built for explainers and spokespeople.",
    src: "/videos/menu-bg.mp4",
    poster: "/posters/work-talking-head.jpg",
    kind: "video",
    aspect: "16/9",
  },
  {
    title: "Viral Carousel — Social Series",
    category: "Social Media",
    description:
      "AI-designed social carousel set — copy, layout and visuals generated for Instagram and LinkedIn.",
    src: "/carousel/1.jpeg",
    poster: "/carousel/1.jpeg",
    kind: "image",
    aspect: "9/16",
  },
];

export const FEATURED_WORK = PORTFOLIO.filter((p) => p.featured);
