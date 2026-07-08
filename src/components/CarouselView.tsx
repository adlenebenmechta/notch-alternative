"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

// ─── Colors ─────────────────────────────────────────────────────────────────

const C = {
  pink: "#E461AD",
  gold: "#C9A96E",
  dark: "#0A0A0A",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  lightPink: "#F9E4EE",
  lightGold: "#FBF5EB",
  white: "#FFFFFF",
  cream: "#FFF8F0",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Slide {
  slideNumber: number;
  slideType: string; // "hero" | "quote" | "comparison" | "product"
  title: string;
  body: string;
  imagePrompt: string;
  imageUrl: string | null;
  headerText: string | null;
  bodyText: string | null;
  textPosition: "top" | "center" | "bottom";
  status: "done" | "image_failed";
  error?: string;
  textOverlayUrl?: string | null;
}

interface CarouselData {
  carouselTitle: string;
  slides: Slide[];
}

interface CarouselViewProps {
  onBack: () => void;
  isAdmin?: boolean;
}

// ─── Slide type colors/icons ───────────────────────────────────────────────
const SLIDE_TYPE_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  hero: { color: "#E461AD", bg: "#E461AD25", label: "Hero Shot", emoji: "🎯" },
  quote: { color: "#3B82F6", bg: "#3B82F625", label: "Quote", emoji: "💬" },
  comparison: { color: "#F59E0B", bg: "#F59E0B25", label: "❌/✅", emoji: "⚖️" },
  product: { color: "#C9A96E", bg: "#C9A96E25", label: "Product", emoji: "📦" },
};

// ─── Word wrap helper ────────────────────────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize?: number): string[] {
  if (fontSize) {
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : currentLine + word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Canvas: Render text overlay on image (Skill style) ────────────────────
// Bold white rounded font with solid black outline, ~22% from top
function renderTextOnImage(
  imageUrl: string,
  headerText: string | null,
  bodyText: string | null,
  _textPosition: string,
  slideIndex: number,
  totalSlides: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 768;
      canvas.height = img.naturalHeight || 1344;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Draw the original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const hasHeader = headerText && headerText.trim() !== "";
      const hasBody = bodyText && bodyText.trim() !== "";
      const hasText = !!(hasHeader || hasBody);

      if (hasText) {
        const maxWidth = canvas.width * 0.85;
        const outlineWidth = Math.max(4, canvas.width * 0.008);

        // ─── Position: ~22% from top ───
        const baseY = canvas.height * 0.22;

        // Draw header text (bold, white, rounded, with black outline)
        if (hasHeader) {
          const headerLen = headerText!.length;
          let headerFontSize: number;
          if (headerLen <= 20) headerFontSize = canvas.width * 0.09;
          else if (headerLen <= 40) headerFontSize = canvas.width * 0.07;
          else headerFontSize = canvas.width * 0.058;
          headerFontSize = Math.max(headerFontSize, 32);

          ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.textAlign = "center";

          // Handle multi-line headers (e.g. ❌/✅ comparison)
          const headerLines = headerText!.split("\n");
          const lineHeight = headerFontSize * 1.45;

          // Draw solid black outline first (stroke)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = outlineWidth * 2;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;

          for (let i = 0; i < headerLines.length; i++) {
            const lineText = headerLines[i];
            const subLines = wrapText(ctx, lineText, maxWidth);
            for (let j = 0; j < subLines.length; j++) {
              const y = baseY + (i * lineHeight) + (j * lineHeight);
              ctx.strokeText(subLines[j], canvas.width / 2, y);
            }
          }

          // Then draw white fill
          ctx.fillStyle = "#FFFFFF";
          for (let i = 0; i < headerLines.length; i++) {
            const lineText = headerLines[i];
            const subLines = wrapText(ctx, lineText, maxWidth);
            for (let j = 0; j < subLines.length; j++) {
              const y = baseY + (i * lineHeight) + (j * lineHeight);
              ctx.fillText(subLines[j], canvas.width / 2, y);
            }
          }

          // Draw body text below header
          if (hasBody) {
            const bodyFontSize = headerFontSize * 0.65;
            ctx.font = `bold ${bodyFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const bodyLines = wrapText(ctx, bodyText!, maxWidth);
            const bodyLineHeight = bodyFontSize * 1.4;
            const bodyStartY = baseY + headerLines.length * lineHeight + 12;

            // Black outline
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = outlineWidth * 1.5;
            ctx.lineJoin = "round";
            ctx.miterLimit = 2;

            for (let i = 0; i < bodyLines.length; i++) {
              ctx.strokeText(bodyLines[i], canvas.width / 2, bodyStartY + i * bodyLineHeight);
            }

            // White fill
            ctx.fillStyle = "#FFFFFF";
            for (let i = 0; i < bodyLines.length; i++) {
              ctx.fillText(bodyLines[i], canvas.width / 2, bodyStartY + i * bodyLineHeight);
            }
          }
        } else if (hasBody) {
          // Only body text
          const bodyLen = bodyText!.length;
          let fontSize: number;
          if (bodyLen <= 20) fontSize = canvas.width * 0.08;
          else if (bodyLen <= 50) fontSize = canvas.width * 0.065;
          else fontSize = canvas.width * 0.055;
          fontSize = Math.max(fontSize, 28);

          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.textAlign = "center";

          const bodyLines = wrapText(ctx, bodyText!, maxWidth);
          const lineHeight = fontSize * 1.4;

          // Black outline
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = outlineWidth * 1.5;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;

          for (let i = 0; i < bodyLines.length; i++) {
            ctx.strokeText(bodyLines[i], canvas.width / 2, baseY + i * lineHeight);
          }

          // White fill
          ctx.fillStyle = "#FFFFFF";
          for (let i = 0; i < bodyLines.length; i++) {
            ctx.fillText(bodyLines[i], canvas.width / 2, baseY + i * lineHeight);
          }
        }
      }

      // ─── Slide number badge ───
      ctx.shadowColor = "rgba(0,0,0,0)";
      ctx.shadowBlur = 0;
      const badgeText = `${slideIndex + 1}/${totalSlides}`;
      const badgeFontSize = canvas.width * 0.035;
      ctx.font = `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

      const badgePadding = badgeFontSize * 0.6;
      const badgeTextWidth = ctx.measureText(badgeText).width;
      const badgeW = badgeTextWidth + badgePadding * 2;
      const badgeH = badgeFontSize + badgePadding * 1.2;
      const badgeX = canvas.width * 0.05;
      const badgeY = canvas.height * 0.05;

      // Badge background
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      const badgeRadius = badgeH / 2;
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeRadius, badgeY);
      ctx.lineTo(badgeX + badgeW - badgeRadius, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeRadius);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - badgeRadius);
      ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - badgeRadius, badgeY + badgeH);
      ctx.lineTo(badgeX + badgeRadius, badgeY + badgeH);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - badgeRadius);
      ctx.lineTo(badgeX, badgeY + badgeRadius);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + badgeRadius, badgeY);
      ctx.closePath();
      ctx.fill();

      // Badge text
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image for text overlay"));
    img.src = imageUrl;
  });
}

// ─── Carousel View Component ───────────────────────────────────────────────

export default function CarouselView({ onBack, isAdmin = false }: CarouselViewProps) {
  const { authFetch } = useAuth();

  // ─── States ──────────────────────────────────────────────────────────
  const [idea, setIdea] = useState("");
  const [numCarousels, setNumCarousels] = useState(1);
  const [language, setLanguage] = useState<"en" | "ar" | "fr">("en");

  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [error, setError] = useState("");

  // Multiple carousels result
  const [carousels, setCarousels] = useState<CarouselData[]>([]);
  const [currentCarousel, setCurrentCarousel] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [applyingOverlay, setApplyingOverlay] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // ─── Apply text overlay to all slides in all carousels ──────────────
  const applyTextOverlay = useCallback(async (rawCarousels: CarouselData[]) => {
    setApplyingOverlay(true);
    setGenerationStep("Applying text overlay...");

    const updated = rawCarousels.map((carousel, cIdx) => ({
      ...carousel,
      slides: carousel.slides.map((slide, sIdx) => {
        // Return as-is, we'll update async
        return slide;
      }),
    }));

    // Apply overlay sequentially to avoid canvas memory issues
    for (let c = 0; c < updated.length; c++) {
      for (let s = 0; s < updated[c].slides.length; s++) {
        const slide = updated[c].slides[s];
        const hasHeader = slide.headerText && slide.headerText.trim() !== "";
        const hasBody = slide.bodyText && slide.bodyText.trim() !== "";
        if (slide.imageUrl && (hasHeader || hasBody)) {
          try {
            const overlayUrl = await renderTextOnImage(
              slide.imageUrl!,
              slide.headerText,
              slide.bodyText,
              slide.textPosition || "top",
              s,
              updated[c].slides.length
            );
            updated[c].slides[s] = { ...updated[c].slides[s], textOverlayUrl: overlayUrl };
          } catch (err) {
            console.error(`[Carousel] Text overlay failed for carousel ${c + 1} slide ${s + 1}:`, err);
            updated[c].slides[s] = { ...updated[c].slides[s], textOverlayUrl: null };
          }
        }
      }
    }

    setCarousels(updated);
    setApplyingOverlay(false);
    setGenerationStep("");
  }, []);

  // ─── Handle Generate ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setGenerating(true);
    setError("");
    setCarousels([]);
    setCurrentCarousel(0);
    setCurrentSlide(0);
    setShowResult(false);
    setGenerationStep("Generating carousel content with AI...");

    try {
      const res = await authFetch("/api/generate-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          kieApiKey: "",
          numCarousels,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Parse carousels from new format
      const rawCarousels: CarouselData[] = (data.carousels || []).map((c: Record<string, unknown>) => ({
        carouselTitle: (c.carouselTitle as string) || idea.slice(0, 30),
        slides: ((c.slides || []) as Record<string, unknown>[]).map((s: Record<string, unknown>) => ({
          ...s,
          textOverlayUrl: null,
        })) as Slide[],
      }));

      // Fallback: if old format (single carousel with slides array at top level)
      if (rawCarousels.length === 0 && data.slides && Array.isArray(data.slides)) {
        rawCarousels.push({
          carouselTitle: data.carouselTitle || idea.slice(0, 30),
          slides: (data.slides as Record<string, unknown>[]).map((s: Record<string, unknown>) => ({
            ...s,
            textOverlayUrl: null,
          })) as Slide[],
        });
      }

      setCarousels(rawCarousels);
      setShowResult(true);
      setGenerationStep("");

      // Auto-apply text overlay from AI response
      const hasAnyText = rawCarousels.some(c =>
        c.slides.some(s =>
          (s.headerText && s.headerText.trim()) || (s.bodyText && s.bodyText.trim())
        )
      );
      if (hasAnyText) {
        await applyTextOverlay(rawCarousels);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Download Slide Image ────────────────────────────────────────────
  const downloadSlide = async (slide: Slide, carouselIdx: number, slideIdx: number) => {
    const downloadUrl = slide.textOverlayUrl || slide.imageUrl;
    if (!downloadUrl) return;

    try {
      if (downloadUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `carousel-${carouselIdx + 1}-slide-${slideIdx + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const imgRes = await fetch(downloadUrl);
      const blob = await imgRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousel-${carouselIdx + 1}-slide-${slideIdx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(downloadUrl, "_blank");
    }
  };

  // ─── Download all slides for a carousel ──────────────────────────────
  const downloadAllSlides = async (carouselIdx: number) => {
    const carousel = carousels[carouselIdx];
    if (!carousel) return;
    for (let i = 0; i < carousel.slides.length; i++) {
      if (carousel.slides[i].imageUrl) {
        await downloadSlide(carousel.slides[i], carouselIdx, i);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  // ─── Touch / Swipe handling ──────────────────────────────────────────
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const carousel = carousels[currentCarousel];
      if (!carousel) return;
      if (diff > 0 && currentSlide < carousel.slides.length - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (diff < 0 && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      }
    }
  };

  // ─── Save carousel to library ────────────────────────────────────────
  const saveCarouselToLibrary = async (carouselIdx: number) => {
    const carousel = carousels[carouselIdx];
    if (!carousel) return;

    const totalSlides = carousel.slides.length;
    for (let i = 0; i < totalSlides; i++) {
      const slide = carousel.slides[i];
      const downloadUrl = slide.textOverlayUrl || slide.imageUrl;
      if (!downloadUrl) continue;

      try {
        // Convert data URL to blob if needed
        let imageBlob: Blob;
        if (downloadUrl.startsWith("data:")) {
          const res = await fetch(downloadUrl);
          imageBlob = await res.blob();
        } else {
          const res = await fetch(downloadUrl);
          imageBlob = await res.blob();
        }

        // Upload to API
        const formData = new FormData();
        formData.append("file", imageBlob, `carousel-${carouselIdx + 1}-slide-${i + 1}.png`);
        formData.append("title", `Carousel: ${carousel.carouselTitle} (${i + 1}/${totalSlides})`);
        formData.append("type", "carousel");
        if (isAdmin) formData.append("isAdmin", "true");

        const uploadRes = await authFetch("/api/videos/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // Also save to localStorage
          const { saveVideoToStorage } = await import("@/lib/video-store");
          saveVideoToStorage({
            id: uploadData.video?.id || `local-${Date.now()}-${carouselIdx}-${i}`,
            title: `Carousel: ${carousel.carouselTitle} (${i + 1}/${totalSlides})`,
            type: "carousel",
            url: uploadData.video?.url || downloadUrl,
            thumbnailUrl: uploadData.video?.thumbnailUrl || downloadUrl,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[Carousel] Failed to save slide ${i + 1} to library:`, err);
      }
    }

    alert(`Carousel "${carousel.carouselTitle}" saved to library! (${totalSlides} slides)`);
  };

  // ─── Examples ────────────────────────────────────────────────────────
  const examples = [
    "5 tips to grow your Instagram in 2025",
    "How AI is changing digital marketing",
    "Healthy morning routine for productivity",
    "Top 7 mistakes entrepreneurs make",
    "The psychology of viral content",
  ];

  // ─── Current helpers ────────────────────────────────────────────────
  const activeCarousel = carousels[currentCarousel];
  const activeSlide = activeCarousel?.slides[currentSlide];

  // ═══════════════════════════════════════════════════════════════════════
  // RESULT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (showResult && carousels.length > 0 && activeSlide) {
    const displayUrl = activeSlide.textOverlayUrl || activeSlide.imageUrl;
    const slideTypeMeta = SLIDE_TYPE_META[activeSlide.slideType] || { color: "#A0A0A0", bg: "#A0A0A015", label: activeSlide.slideType, emoji: "📌" };

    return (
      <div className="min-h-screen" style={{ backgroundColor: C.dark }}>
        {/* ─── Top Bar ──────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3"
          style={{
            backgroundColor: `${C.dark}ee`,
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid #222222`,
          }}
        >
          <button
            onClick={() => {
              setShowResult(false);
              setCarousels([]);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
            style={{
              backgroundColor: "#1A1A1A",
              color: "#E0E0E0",
              border: `1.5px solid #333333`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>

          <div className="flex items-center gap-2">
            {/* Carousel selector */}
            {carousels.length > 1 && (
              <div className="flex items-center gap-1">
                {carousels.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentCarousel(i); setCurrentSlide(0); }}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentCarousel ? "24px" : "8px",
                      height: "8px",
                      backgroundColor: i === currentCarousel ? C.gold : "#555555",
                    }}
                  />
                ))}
              </div>
            )}

            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${C.gold}25` }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M9 9h6M9 13h4" />
              </svg>
            </div>
            <span className="text-xs font-bold tracking-wider" style={{ color: "#E0E0E0" }}>
              {currentSlide + 1}/{activeCarousel!.slides.length}
            </span>

            {/* Slide type badge */}
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: slideTypeMeta.bg,
                color: slideTypeMeta.color,
              }}
            >
              {slideTypeMeta.emoji} {slideTypeMeta.label}
            </span>

            {/* Carousel title */}
            {carousels.length > 1 && (
              <span className="hidden sm:inline text-[10px] font-semibold max-w-[120px] truncate" style={{ color: "#888" }}>
                {activeCarousel!.carouselTitle}
              </span>
            )}
          </div>

          {displayUrl && (
            <button
              onClick={() => downloadSlide(activeSlide, currentCarousel, currentSlide)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
              style={{
                backgroundColor: `${C.pink}20`,
                color: C.pink,
                border: `1.5px solid ${C.pink}40`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Save
            </button>
          )}
        </header>

        {/* ─── Applying overlay indicator ─────────────────────────── */}
        {applyingOverlay && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2"
            style={{ backgroundColor: `${C.gold}`, color: C.white, boxShadow: `0 4px 20px ${C.gold}40` }}>
            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Applying text overlay...
          </div>
        )}

        {/* ─── Slide Display ─────────────────────────────────────── */}
        <main
          className="flex items-center justify-center min-h-[calc(100vh-56px)] p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full max-w-sm mx-auto">
            {/* Carousel title */}
            {carousels.length > 1 && (
              <div className="mb-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.gold }}>
                  Carousel {currentCarousel + 1} of {carousels.length}
                </span>
                <p className="text-xs font-semibold mt-0.5" style={{ color: "#ccc" }}>
                  {activeCarousel!.carouselTitle}
                </p>
              </div>
            )}

            {/* Slide Image */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                aspectRatio: "3/4",
                backgroundColor: "#1A1A1A",
                border: `2px solid #333333`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.5)`,
              }}
            >
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt={activeSlide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${C.pink}15` }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "#E0E0E0" }}>
                      Image failed to generate
                    </p>
                    <p className="text-xs mt-2" style={{ color: "#888888" }}>
                      {activeSlide.error || "Unknown error"}
                    </p>
                  </div>
                </div>
              )}

              {/* Text overlay badge */}
              {activeSlide.textOverlayUrl && (
                <div
                  className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ backgroundColor: `${C.pink}cc`, color: C.white }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9.5" y1="20" x2="14.5" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                  Text
                </div>
              )}
            </div>

            {/* Slide Text Content */}
            <div className="mt-5 px-2">
              {activeSlide.headerText && (
                <h2 className="text-lg font-black mb-2" style={{ color: C.white }}>
                  {activeSlide.headerText.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </h2>
              )}
              {activeSlide.bodyText && (
                <p className="text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
                  {activeSlide.bodyText}
                </p>
              )}
              {!activeSlide.headerText && !activeSlide.bodyText && (
                <p className="text-xs italic" style={{ color: "#666666" }}>
                  Clean image — no text overlay
                </p>
              )}
            </div>

            {/* Navigation: Carousel selector (if multiple) + Slide arrows */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 disabled:opacity-20"
                style={{
                  backgroundColor: "#1A1A1A",
                  border: "1.5px solid #333333",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Slide dots */}
              <div className="flex items-center gap-1.5">
                {activeCarousel!.slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentSlide ? "24px" : "8px",
                      height: "8px",
                      backgroundColor: i === currentSlide ? (SLIDE_TYPE_META[s.slideType]?.color || C.pink) : "#444444",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentSlide(Math.min(activeCarousel!.slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === activeCarousel!.slides.length - 1}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 disabled:opacity-20"
                style={{
                  backgroundColor: "#1A1A1A",
                  border: "1.5px solid #333333",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Carousel navigation (if multiple carousels) */}
            {carousels.length > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <button
                  onClick={() => { setCurrentCarousel(Math.max(0, currentCarousel - 1)); setCurrentSlide(0); }}
                  disabled={currentCarousel === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-20"
                  style={{ backgroundColor: "#1A1A1A", color: C.gold, border: "1.5px solid #333" }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Prev Carousel
                </button>

                <span className="text-[10px] font-bold" style={{ color: "#888" }}>
                  {currentCarousel + 1} / {carousels.length}
                </span>

                <button
                  onClick={() => { setCurrentCarousel(Math.min(carousels.length - 1, currentCarousel + 1)); setCurrentSlide(0); }}
                  disabled={currentCarousel === carousels.length - 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-20"
                  style={{ backgroundColor: "#1A1A1A", color: C.gold, border: "1.5px solid #333" }}
                >
                  Next Carousel
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 mt-5">
              {/* Save to Library */}
              <button
                onClick={() => saveCarouselToLibrary(currentCarousel)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-300"
                style={{
                  backgroundColor: "#1A1A1A",
                  color: C.gold,
                  border: `1.5px solid ${C.gold}40`,
                  boxShadow: `0 4px 20px ${C.gold}15`,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  Save to Library
                </span>
              </button>

              {/* Download All */}
              <button
                onClick={() => downloadAllSlides(currentCarousel)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                  color: C.white,
                  boxShadow: `0 4px 20px ${C.pink}30`,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download All Slides
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INPUT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream }}>
      {/* ─── Top Bar ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{
          backgroundColor: `${C.white}ee`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid #F3F4F6`,
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
          style={{
            backgroundColor: C.white,
            color: C.text,
            border: `1.5px solid ${C.lightPink}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Menu
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: C.gold, boxShadow: `0 2px 10px ${C.gold}40` }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 9h6M9 13h4" />
              <circle cx="18" cy="6" r="2" fill="white" stroke="none" />
            </svg>
          </div>
          <span
            className="text-sm font-black uppercase tracking-wider hidden sm:inline"
            style={{ color: C.dark }}
          >
            Carousel Machine
          </span>
        </div>

        <div className="w-[100px]" />
      </header>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
            style={{ backgroundColor: `${C.gold}18` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.gold }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.gold }}>
              Nano Banana 2
            </span>
          </div>

          <h1
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4 leading-tight"
            style={{ color: C.dark }}
          >
            AI Viral{" "}
            <span style={{ color: C.pink }}>Carousel</span>{" "}
            Machine
          </h1>

          <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: C.textMuted }}>
            Turn any idea into scroll-stopping carousels. Each carousel: Hero → Quote → Comparison → Product. Nano Banana 2 model, text baked in.
          </p>
        </div>

        {/* Main Input Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 mb-6"
          style={{
            backgroundColor: C.white,
            border: `1.5px solid #F3F4F6`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.04)`,
          }}
        >
          {/* ─── Settings Row ──────────────────────────────────── */}
          <div className="flex flex-wrap items-end gap-4 mb-5">
            {/* Number of Carousels */}
            <div className="flex-1 min-w-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${C.pink}12` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Carousels
                </label>
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={numCarousels}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 10) setNumCarousels(val);
                  else if (e.target.value === "") setNumCarousels(1);
                }}
                className="w-20 px-3 py-2.5 rounded-xl text-sm font-bold text-center focus:outline-none transition-all duration-200"
                style={{ border: `1.5px solid ${C.pink}`, color: C.pink, backgroundColor: `${C.pink}08` }}
              />
              <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                Each has 4 slides (Hero+Quote+Compare+Product)
              </p>
            </div>

            {/* Language */}
            <div className="min-w-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${C.pink}12` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Language
                </label>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { code: "en" as const, label: "EN" },
                  { code: "ar" as const, label: "AR" },
                  { code: "fr" as const, label: "FR" },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{
                      backgroundColor: language === lang.code ? C.pink : "#F9FAFB",
                      color: language === lang.code ? C.white : C.textMuted,
                      border: `1.5px solid ${language === lang.code ? C.pink : "#E5E7EB"}`,
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Skill Info Badge ────────────────────────────── */}
          <div
            className="mb-5 rounded-2xl p-3 flex items-start gap-3"
            style={{
              backgroundColor: `${C.gold}08`,
              border: `1px dashed ${C.gold}30`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${C.gold}15` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.gold }}>
                Locked Settings
              </p>
              <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: C.textMuted }}>
                Model: <b>Nano Banana 2</b> • 3:4 ratio • Product as reference (tin/pack always matches)
                <br />
                Text: <b>Bold white rounded + black outline</b> • ~22% from top
                <br />
                Sequence: 🎯 Hero → 💬 Quote → ❌/✅ Comparison → 📦 Product (pure white)
              </p>
            </div>
          </div>

          {/* ─── Idea Input ────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${C.pink}12` }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
              </svg>
            </div>
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
              What&apos;s your product/idea?
            </label>
          </div>

          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. Anti-aging face cream, Protein powder brand, SaaS tool for marketers..."
            rows={4}
            className="w-full px-5 py-4 rounded-2xl text-sm outline-none resize-none transition-all duration-200"
            style={{
              backgroundColor: `${C.lightPink}30`,
              border: `1.5px solid ${idea ? `${C.pink}40` : "#F3F4F6"}`,
              color: C.text,
              boxShadow: idea ? `0 0 0 3px ${C.pink}10` : "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = `${C.pink}50`;
              e.target.style.boxShadow = `0 0 0 3px ${C.pink}10`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = idea ? `${C.pink}40` : "#F3F4F6";
              e.target.style.boxShadow = idea ? `0 0 0 3px ${C.pink}10` : "none";
            }}
          />

          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px]" style={{ color: C.textMuted }}>
              {idea.length > 0 ? `${idea.length} characters` : "Describe your product for best results"}
            </p>
          </div>

          {/* ─── Error Message ─────────────────────────────────── */}
          {error && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: "#FEF2F2",
                color: "#DC2626",
                border: "1px solid #FECACA",
              }}
            >
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!idea.trim() || generating}
            className="w-full mt-5 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: generating
                ? `linear-gradient(135deg, ${C.pink}90, ${C.gold}90)`
                : `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
              color: C.white,
              boxShadow: idea.trim() && !generating ? `0 6px 24px ${C.pink}35` : "none",
              transform: idea.trim() && !generating ? "scale(1)" : "scale(0.98)",
            }}
          >
            {generating ? (
              <span className="inline-flex items-center gap-3">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {generationStep || "Generating..."}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate {numCarousels} Carousel{numCarousels > 1 ? "s" : ""}
              </span>
            )}
          </button>
        </div>

        {/* ─── Generating Progress ────────────────────────────── */}
        {generating && (
          <div
            className="rounded-2xl p-6 text-center animate-pulse"
            style={{
              backgroundColor: C.white,
              border: `1.5px solid ${C.pink}20`,
            }}
          >
            <div
              className="w-12 h-12 rounded-full border-3 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: `${C.pink}33`, borderTopColor: C.pink }}
            />
            <p className="text-sm font-semibold" style={{ color: C.dark }}>
              Creating {numCarousels} carousel{numCarousels > 1 ? "s" : ""} with Nano Banana 2...
            </p>
            <p className="text-xs mt-2" style={{ color: C.textMuted }}>
              Each carousel: Hero → Quote → Comparison → Product (4 slides)
              <br />
              This may take 2-5 minutes per carousel. Text overlay will be applied after images are ready.
            </p>
          </div>
        )}

        {/* Example Ideas */}
        {!generating && (
          <>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.textMuted }}>
                Try these ideas
              </p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setIdea(ex)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                    style={{
                      backgroundColor: C.white,
                      color: C.text,
                      border: `1px solid #E5E7EB`,
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Features Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                  ),
                  title: "Nano Banana 2",
                  desc: "High-quality AI images, 3:4 ratio, product reference built-in",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9.5" y1="20" x2="14.5" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  ),
                  title: "Bold Text Overlay",
                  desc: "White rounded font + black outline, baked into each slide",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  ),
                  title: "Viral Sequence",
                  desc: "Hero → Quote → ❌/✅ → Product (proven viral format)",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  style={{
                    backgroundColor: C.white,
                    border: "1px solid #F3F4F6",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${C.lightPink}40` }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xs font-bold mb-1" style={{ color: C.dark }}>
                    {feature.title}
                  </h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
