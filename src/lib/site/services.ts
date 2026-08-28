/**
 * WENOV8 service definitions — used for homepage cards, /services overview
 * and the SEO service detail pages. Copy follows the brand guidelines:
 * confident, clear, no invented claims.
 */

export type ServiceFaq = { q: string; a: string };

export type Service = {
  slug: string;
  /** short name used in nav/cards */
  name: string;
  /** card description (homepage + services page) */
  card: string;
  /** page H1 */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  overview: string[];
  capabilities: string[];
  useCases: { title: string; text: string }[];
  faqs: ServiceFaq[];
};

export const SERVICES: Service[] = [
  {
    slug: "ai-video-production",
    name: "AI Video Production",
    card: "Cinematic and AI-assisted video production for products, campaigns, launches, and social media.",
    h1: "AI Video Production",
    metaTitle: "AI Video Production Services",
    metaDescription:
      "AI-assisted video production for products, campaigns and launches. Cinematic product films, brand videos and social content by WENOV8.",
    intro:
      "Full-cycle video production, accelerated by AI. We develop the concept, produce the visuals, and deliver finished films built for products, campaigns and launches.",
    overview: [
      "AI video production at WENOV8 combines creative direction with an AI-assisted production pipeline. Instead of a traditional shoot for every asset, we generate, adapt and refine visual content in a fraction of the usual production cycle — then finish everything with real editing, sound and motion craft.",
      "The result is a production model where a brand can brief a concept and receive polished, on-brand video assets ready for websites, social media and paid campaigns — without scheduling a single filming day.",
    ],
    capabilities: [
      "Concept development and creative direction",
      "AI-assisted scene and visual production",
      "Product films and campaign videos",
      "Launch and promotional assets",
      "Editing, sound design and motion finishing",
      "Delivery in every major aspect ratio and platform format",
    ],
    useCases: [
      {
        title: "Product launches",
        text: "A full set of launch assets — hero film, teasers and social cutdowns — produced from one brief.",
      },
      {
        title: "Campaign content",
        text: "Multiple visual concepts and variations for campaign rollouts across platforms.",
      },
      {
        title: "Always-on social content",
        text: "A steady stream of video content for channels that never stop demanding it.",
      },
    ],
    faqs: [
      {
        q: "Do you still use traditional filming?",
        a: "Our core workflow is AI-assisted production, which removes the need for filming days in most projects. Where live footage already exists, we can integrate it into the final edit.",
      },
      {
        q: "What do you need from us to start?",
        a: "A short brief: your product, audience, goals, references and where the videos will run. From there we develop the creative direction before anything is produced.",
      },
      {
        q: "What formats do you deliver?",
        a: "Vertical 9:16 for TikTok, Reels and Shorts, square and 4:5 for feed placements, and 16:9 for web and YouTube — whatever your campaign requires.",
      },
    ],
  },
  {
    slug: "ai-video-ads",
    name: "AI Video Ads",
    card: "Performance-focused video creatives designed for TikTok, Instagram, Meta, YouTube, and other advertising platforms.",
    h1: "AI Video Ads",
    metaTitle: "AI Video Ads for Paid Social",
    metaDescription:
      "Performance-focused AI video ads for TikTok, Instagram, Meta and YouTube. Hooks, variations and creative testing at production speed by WENOV8.",
    intro:
      "Video creatives engineered for paid performance. Strong hooks, fast pacing and platform-native formats — produced in the volumes that creative testing actually requires.",
    overview: [
      "Paid social rewards brands that can test more creative. Our AI-assisted workflow produces ad variations — different hooks, angles, presenters and formats — quickly enough to support a real testing program instead of a one-off launch.",
      "Every ad is built around the platforms it will run on: vertical, sound-on, hook-first and designed to communicate value in the first seconds.",
    ],
    capabilities: [
      "Hook-first ad concepts and scripts",
      "Multiple creative variations for testing",
      "Platform-native formats for TikTok, Instagram, Meta and YouTube",
      "UGC-style and presenter-led ad formats",
      "Captions, overlays and cutdowns",
      "Iterating winning concepts into fresh variations",
    ],
    useCases: [
      {
        title: "Creative testing",
        text: "Launch a set of distinct hooks and concepts, then scale the winners into new variations.",
      },
      {
        title: "Ad refresh cycles",
        text: "Replace fatigued creative regularly without waiting on traditional production.",
      },
      {
        title: "Full-funnel campaigns",
        text: "Awareness, consideration and retargeting creatives produced from one strategy.",
      },
    ],
    faqs: [
      {
        q: "How many ad variations can you produce?",
        a: "The workflow is built for volume. A typical engagement starts with a set of distinct concepts, then scales the angles that perform into further variations.",
      },
      {
        q: "Which platforms do you design for?",
        a: "TikTok, Instagram, Meta, YouTube and Snapchat — each with the format, pacing and framing that works natively on the platform.",
      },
      {
        q: "Can you work with our existing performance data?",
        a: "Yes. Sharing which hooks and angles have performed for you helps us brief sharper concepts from the start.",
      },
    ],
  },
  {
    slug: "ugc-video-ads",
    name: "UGC-Style Ads",
    card: "Authentic-looking short-form creatives built around strong hooks, product storytelling, and social-first formats.",
    h1: "UGC-Style Video Ads",
    metaTitle: "UGC-Style Video Ads",
    metaDescription:
      "Authentic-style UGC video ads with AI presenters, strong hooks and social-first storytelling. Produced by WENOV8 for modern brands.",
    intro:
      "The look and feel of creator content, produced at brand scale. UGC-style ads built around relatable presenters, natural delivery and hooks that stop the scroll.",
    overview: [
      "UGC-style creative feels like a recommendation from a real person — which is exactly why it performs. We produce that authenticity with AI presenters and smart scripting: selfie-style framing, conversational delivery and product-in-hand storytelling.",
      "Because every asset is produced digitally, you can run the same concept with different presenters, hooks and product angles — a testing surface that creator management alone can't offer.",
    ],
    capabilities: [
      "Selfie-style and POV ad formats",
      "AI presenters across looks, ages and settings",
      "Hook and script writing for short-form",
      "Product-in-hand storytelling",
      "Caption and overlay styling",
      "Variations for A/B testing",
    ],
    useCases: [
      {
        title: "TikTok and Reels ads",
        text: "Native-feeling vertical ads that match the tone of the feed they run in.",
      },
      {
        title: "Product reviews and testimonials",
        text: "Presenter-led product stories that feel personal rather than produced.",
      },
      {
        title: "Comment-style hooks",
        text: "Ads that open like a reply to a common question or objection.",
      },
    ],
    faqs: [
      {
        q: "Do these ads look like real creator content?",
        a: "They are designed to match the visual language of creator content — natural framing, conversational scripts and authentic pacing — while being fully produced with AI presenters.",
      },
      {
        q: "Can we choose the presenter?",
        a: "Yes. Presenters can be selected or generated to match your audience and brand tone, and the same script can be tested with different presenters.",
      },
      {
        q: "Is AI-generated UGC allowed on ad platforms?",
        a: "Platforms increasingly require disclosure of AI-generated content in advertising. We build ads to be effective while complying with platform policies.",
      },
    ],
  },
  {
    slug: "product-video-production",
    name: "Product Marketing Videos",
    card: "Product demonstrations, lifestyle visuals, promotional videos, and product-focused creative assets.",
    h1: "Product Marketing Videos",
    metaTitle: "Product Video Production",
    metaDescription:
      "Product demo videos, lifestyle visuals and promotional product films. AI-assisted product marketing video production by WENOV8.",
    intro:
      "Videos that make products understandable and desirable — demonstrations, lifestyle visuals and promotional films produced around what your product actually does.",
    overview: [
      "A product video has one job: make the viewer picture the product in their life. We script and produce demos, lifestyle scenes and promotional films that show the product in use, communicate its value clearly and fit the channels where customers discover it.",
      "Our AI-assisted pipeline is well suited to product catalogs: once a product's visual identity is established, variations for different angles, audiences and formats can be produced consistently.",
    ],
    capabilities: [
      "Product demonstrations and how-it-works videos",
      "Lifestyle and in-use scene production",
      "Promotional product films",
      "Feature highlight cutdowns",
      "E-commerce and marketplace-ready assets",
      "Consistent multi-product catalogs",
    ],
    useCases: [
      {
        title: "E-commerce product pages",
        text: "Demo and lifestyle videos that help shoppers understand the product before they buy.",
      },
      {
        title: "Marketplace listings",
        text: "Short product films formatted for marketplace requirements.",
      },
      {
        title: "Feature launches",
        text: "Focused videos that explain what's new and why it matters.",
      },
    ],
    faqs: [
      {
        q: "Do you need our product physically?",
        a: "No. We work from product images, descriptions and any existing footage. Clear visuals of the product from a few angles are usually enough.",
      },
      {
        q: "Can you produce videos for a full catalog?",
        a: "Yes. The workflow is designed for scale — a consistent template and look can be applied across many products efficiently.",
      },
      {
        q: "How do you keep the product accurate?",
        a: "Product appearance, claims and usage are reviewed against the brief and your input before final delivery.",
      },
    ],
  },
  {
    slug: "ai-avatar-video",
    name: "AI Avatars & Spokespeople",
    card: "AI-powered presenters, avatars, voices, and spokesperson content for scalable marketing production.",
    h1: "AI Avatars & Spokespeople",
    metaTitle: "AI Avatar & Spokesperson Videos",
    metaDescription:
      "AI presenters, avatars and spokesperson videos that deliver your message consistently, in any language, at any scale. Powered by the WENOV8 AI Studio.",
    intro:
      "Presenters without production limits. AI avatars and spokespeople deliver your message consistently — across scenes, languages and campaigns — through the WENOV8 AI Studio.",
    overview: [
      "An AI spokesperson can present your product, explain your service and represent your brand in video form — without scheduling, travel or reshoots. Once a presenter is established, new scripts become new videos with the same face, voice and delivery.",
      "This capability is built directly into the WENOV8 platform: our AI Studio generates presenter-led videos from scripts, with consistent characters across multiple scenes and formats.",
    ],
    capabilities: [
      "AI presenter and avatar generation",
      "Script-to-video production",
      "Consistent characters across scenes",
      "Voice-over and dialogue production",
      "Explainer and spokesperson formats",
      "Multi-language delivery",
    ],
    useCases: [
      {
        title: "Product explainers",
        text: "A consistent presenter explains your product the same way, every time, in every market.",
      },
      {
        title: "Brand spokespeople",
        text: "A recurring digital presenter that becomes part of your brand identity.",
      },
      {
        title: "Training and internal video",
        text: "Scalable presenter-led content for onboarding and enablement.",
      },
    ],
    faqs: [
      {
        q: "Can I try the avatar technology myself?",
        a: "Yes. The AI Studio is part of the WENOV8 platform and is available to try — you can generate avatar videos from your own scripts.",
      },
      {
        q: "How consistent are the characters?",
        a: "The studio is built around character consistency: the same presenter can appear across multiple scenes and videos with the same appearance.",
      },
      {
        q: "Which languages are supported?",
        a: "The studio supports multiple languages for scripts and voice delivery, which makes localized versions of the same video straightforward.",
      },
    ],
  },
  {
    slug: "creative-marketing",
    name: "Creative Strategy",
    card: "Hooks, concepts, scripts, angles, and creative directions designed around the brand and campaign objective.",
    h1: "Creative Strategy",
    metaTitle: "Creative Strategy for Video Marketing",
    metaDescription:
      "Hooks, concepts, scripts and creative direction for campaigns that need to perform. Creative strategy services by WENOV8.",
    intro:
      "Before production, there is the idea. We develop hooks, concepts, scripts and creative directions designed around your brand, your audience and the objective of the campaign.",
    overview: [
      "Creative strategy is what separates content from advertising that works. Every engagement starts with the strategic layer: what is the message, who is it for, what angle makes it interesting, and what hook earns the viewer's attention in the first seconds.",
      "We then carry that direction through production — scripts, visual concepts, presenter choices and formats — so the final assets are coherent, on-brand and built to perform.",
    ],
    capabilities: [
      "Hook and angle development",
      "Campaign concepts and creative directions",
      "Script writing for video ads",
      "Creative briefs for production",
      "Concept testing structures",
      "Ongoing creative advisory",
    ],
    useCases: [
      {
        title: "New campaign development",
        text: "A strategic creative direction before any budget goes into production.",
      },
      {
        title: "Refreshing an angle",
        text: "New hooks and concepts for a product that has been running the same creative.",
      },
      {
        title: "Creative systems",
        text: "A repeatable structure of hooks, formats and angles your team can keep testing.",
      },
    ],
    faqs: [
      {
        q: "Is strategy sold separately from production?",
        a: "It can be. Some clients engage us for strategy and direction only; most include it as the first phase of a production project.",
      },
      {
        q: "How do you develop hooks?",
        a: "From your product, audience and objectives — mapped against the patterns that earn attention on each platform, then adapted to your brand voice.",
      },
      {
        q: "Can you work with our existing brand guidelines?",
        a: "Yes. Existing guidelines, tone of voice and references are the starting point, not an afterthought.",
      },
    ],
  },
];

export const getService = (slug: string) => SERVICES.find((s) => s.slug === slug);
