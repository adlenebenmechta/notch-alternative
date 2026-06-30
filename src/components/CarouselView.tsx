"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { saveVideoToStorage } from "@/lib/video-store";

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
  red: "#EF4444",
  green: "#22C55E",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProblemSolutionImages {
  problemImageUrl: string | null;
  solutionImageUrl: string | null;
  problemOverlayUrl: string | null;
  solutionOverlayUrl: string | null;
}

interface CarouselSlide {
  slide_number: number;
  problem: {
    image_prompt: string;
    header_text: string | null;
    body_text: string | null;
  };
  solution: {
    image_prompt: string;
    header_text: string | null;
    body_text: string | null;
  };
}

interface ProductInfo {
  productName: string;
  productDescription: string;
  features: string[];
  problems: string[];
  benefits: string[];
  targetAudience: string;
}

interface GeneratedSlide extends CarouselSlide, ProblemSolutionImages {
  problemLoading?: boolean;
  solutionLoading?: boolean;
  problemError?: string;
  solutionError?: string;
}

type Step = "idle" | "analyzing" | "planning" | "generating" | "complete" | "error";

interface CarouselViewProps {
  onBack: () => void;
  isAdmin?: boolean;
}

// ─── Canvas: Render text overlay on image ────────────────────────────────────
function renderTextOnImage(
  imageUrl: string,
  headerText: string | null,
  bodyText: string | null,
  position: "top" | "center" | "bottom",
  slideIndex: number,
  totalSlides: number,
  isProblem: boolean
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

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const hasHeader = headerText && headerText.trim() !== "";
      const hasBody = bodyText && bodyText.trim() !== "";
      const hasText = !!(hasHeader || hasBody);

      const maxWidth = canvas.width * 0.85;
      const padding = canvas.width * 0.075;

      if (hasText) {
        // Gradient overlay
        const gradHeight = canvas.height * 0.4;
        let gradStart, gradEnd;
        if (position === "top") {
          gradStart = 0;
          gradEnd = gradHeight;
        } else if (position === "center") {
          gradStart = (canvas.height - gradHeight) / 2;
          gradEnd = gradStart + gradHeight;
        } else {
          gradStart = canvas.height - gradHeight;
          gradEnd = canvas.height;
        }

        const grad = ctx.createLinearGradient(0, gradStart, 0, gradEnd);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(0.3, isProblem ? "rgba(180,0,0,0.45)" : "rgba(0,120,0,0.35)");
        grad.addColorStop(1, isProblem ? "rgba(120,0,0,0.85)" : "rgba(0,80,0,0.75)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, gradStart, canvas.width, gradHeight);

        // Badge: PROBLEM or SOLUTION
        const badgeFontSize = canvas.width * 0.04;
        ctx.font = `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const badgeText = isProblem ? "PROBLEM" : "SOLUTION";
        const badgePadding = badgeFontSize * 0.6;
        const badgeTextWidth = ctx.measureText(badgeText).width;
        const badgeW = badgeTextWidth + badgePadding * 2;
        const badgeH = badgeFontSize + badgePadding * 1.2;
        const badgeX = padding;
        const badgeY = padding;

        ctx.fillStyle = isProblem ? "rgba(220,38,38,0.8)" : "rgba(34,197,94,0.8)";
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

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

        // Slide number badge
        const slideBadgeText = `${slideIndex + 1}/${totalSlides}`;
        ctx.font = `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const slideBadgeW = ctx.measureText(slideBadgeText).width + badgePadding * 2;
        const slideBadgeX = canvas.width - padding - slideBadgeW;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.moveTo(slideBadgeX + badgeRadius, badgeY);
        ctx.lineTo(slideBadgeX + slideBadgeW - badgeRadius, badgeY);
        ctx.quadraticCurveTo(slideBadgeX + slideBadgeW, badgeY, slideBadgeX + slideBadgeW, badgeY + badgeRadius);
        ctx.lineTo(slideBadgeX + slideBadgeW, badgeY + badgeH - badgeRadius);
        ctx.quadraticCurveTo(slideBadgeX + slideBadgeW, badgeY + badgeH, slideBadgeX + slideBadgeW - badgeRadius, badgeY + badgeH);
        ctx.lineTo(slideBadgeX + badgeRadius, badgeY + badgeH);
        ctx.quadraticCurveTo(slideBadgeX, badgeY + badgeH, slideBadgeX, badgeY + badgeH - badgeRadius);
        ctx.lineTo(slideBadgeX, badgeY + badgeRadius);
        ctx.quadraticCurveTo(slideBadgeX, badgeY, slideBadgeX + badgeRadius, badgeY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(slideBadgeText, slideBadgeX + slideBadgeW / 2, badgeY + badgeH / 2);

        // Draw header text
        if (hasHeader) {
          const headerLen = headerText!.length;
          let headerFontSize: number;
          if (headerLen <= 20) headerFontSize = canvas.width * 0.08;
          else if (headerLen <= 40) headerFontSize = canvas.width * 0.065;
          else headerFontSize = canvas.width * 0.055;
          headerFontSize = Math.max(headerFontSize, 28);

          ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";

          const headerLines = wrapText(ctx, headerText!, maxWidth);
          const lineHeight = headerFontSize * 1.35;

          let baseY: number;
          if (position === "top") {
            baseY = padding + badgeH + 16 + headerFontSize;
          } else if (position === "center") {
            const totalHeight = headerLines.length * lineHeight + (hasBody ? headerFontSize * 0.5 + 20 : 0);
            baseY = canvas.height / 2 - totalHeight / 2 + headerFontSize;
          } else {
            const bodyLines = hasBody ? wrapText(ctx, bodyText!, maxWidth, headerFontSize * 0.7) : [];
            const bodyFontSize = headerFontSize * 0.7;
            const bodyLineHeight = bodyFontSize * 1.35;
            const totalHeight = headerLines.length * lineHeight + (hasBody ? 20 + bodyLines.length * bodyLineHeight : 0);
            baseY = canvas.height - padding - totalHeight + headerFontSize;
          }

          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = headerFontSize * 0.15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;

          for (let i = 0; i < headerLines.length; i++) {
            ctx.fillText(headerLines[i], canvas.width / 2, baseY + i * lineHeight);
          }

          // Body text
          if (hasBody) {
            const bodyFontSize = headerFontSize * 0.7;
            ctx.font = `${bodyFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const bodyLines = wrapText(ctx, bodyText!, maxWidth, bodyFontSize);
            const bodyLineHeight = bodyFontSize * 1.35;
            const bodyStartY = baseY + headerLines.length * lineHeight + 10;
            ctx.shadowBlur = bodyFontSize * 0.1;

            for (let i = 0; i < bodyLines.length; i++) {
              ctx.fillText(bodyLines[i], canvas.width / 2, bodyStartY + i * bodyLineHeight);
            }
          }
        }
      }

      ctx.shadowBlur = 0;
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image for text overlay"));
    img.src = imageUrl;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize?: number): string[] {
  if (fontSize) {
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
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

// ─── Carousel View Component ───────────────────────────────────────────────

export default function CarouselView({ onBack, isAdmin = false }: CarouselViewProps) {
  const { user, authFetch } = useAuth();
  const userEmail = user?.email || "";

  // ─── States ──────────────────────────────────────────────────────────
  const [productUrl, setProductUrl] = useState("");
  const [numSlides, setNumSlides] = useState(3);
  const [language, setLanguage] = useState<"en" | "ar" | "fr">("en");
  const [userInstructions, setUserInstructions] = useState("");

  const [step, setStep] = useState<Step>("idle");
  const [stepMessage, setStepMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewingProblem, setViewingProblem] = useState(true); // Toggle between problem/solution view

  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const abortRef = useRef(false);

  // ─── Download helper ─────────────────────────────────────────────────
  const downloadImage = useCallback(async (imageUrl: string, filename: string) => {
    try {
      if (imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  }, []);

  // ─── Main Generation Pipeline ────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!productUrl.trim()) return;
    abortRef.current = false;

    // Pre-flight auth check
    if (!user?.email) {
      setError("You must be logged in to generate carousels. Please sign in and try again.");
      return;
    }
    console.log("[Carousel] Starting generation for user:", user.email);

    setStep("analyzing");
    setError("");
    setProgress(5);
    setStepMessage("Analyzing product from URL...");

    try {
      // Step 1: Analyze product
      const analyzeRes = await authFetch("/api/carousel/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl: productUrl.trim(),
          numSlides,
          userInstructions: userInstructions.trim(),
        }),
      });

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json();
        throw new Error(errData.error || "Product analysis failed");
      }

      const analyzeData = await analyzeRes.json();
      const pInfo: ProductInfo = analyzeData.productInfo;
      setProductInfo(pInfo);
      setProgress(20);
      setStep("planning");
      setStepMessage("DeepSeek is creating your carousel plan...");

      if (abortRef.current) return;

      // Step 2: Generate slide plan
      const planRes = await authFetch("/api/carousel/generate-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productInfo: pInfo,
          numSlides,
          userInstructions: userInstructions.trim(),
          language,
        }),
      });

      if (!planRes.ok) {
        const errData = await planRes.json();
        throw new Error(errData.error || "Slide planning failed");
      }

      const planData = await planRes.json();
      const plan = planData.plan;
      setCarouselTitle(plan.carousel_title || pInfo.productName || "Carousel");
      setProgress(35);
      setStep("generating");
      setStepMessage("Generating images...");

      if (abortRef.current) return;

      // Step 3: Initialize slides
      const initialSlides: GeneratedSlide[] = plan.slides.map((s: CarouselSlide) => ({
        ...s,
        problemImageUrl: null,
        solutionImageUrl: null,
        problemOverlayUrl: null,
        solutionOverlayUrl: null,
        problemLoading: true,
        solutionLoading: true,
      }));
      setSlides(initialSlides);

      // Step 4: Generate images for each slide
      const totalImages = plan.slides.length * 2; // problem + solution per slide
      let completedImages = 0;

      for (let i = 0; i < plan.slides.length; i++) {
        if (abortRef.current) {
          setStep("error");
          setError("Generation cancelled");
          return;
        }

        const slide = plan.slides[i];

        // Generate PROBLEM image
        try {
          setStepMessage(`Generating problem image ${i + 1}/${plan.slides.length}...`);
          const imgRes = await authFetch("/api/carousel/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_prompt: slide.problem.image_prompt }),
          });

          if (imgRes.ok) {
            const imgData = await imgRes.json();
            // Apply text overlay
            let overlayUrl: string | null = null;
            if (imgData.image && (slide.problem.header_text || slide.problem.body_text)) {
              try {
                overlayUrl = await renderTextOnImage(
                  imgData.image,
                  slide.problem.header_text,
                  slide.problem.body_text,
                  "bottom",
                  i,
                  plan.slides.length,
                  true
                );
              } catch (overlayErr) {
                console.warn(`[Carousel] Problem overlay failed for slide ${i + 1}:`, overlayErr);
              }
            }
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, problemImageUrl: imgData.image, problemOverlayUrl: overlayUrl, problemLoading: false }
                  : s
              )
            );
          } else {
            const errData = await imgRes.json().catch(() => ({ error: "Image generation failed" }));
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, problemLoading: false, problemError: errData.error || "Image generation failed" }
                  : s
              )
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Image generation failed";
          setSlides((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, problemLoading: false, problemError: msg } : s
            )
          );
        }
        completedImages++;
        setProgress(35 + Math.round((completedImages / totalImages) * 60));

        // Generate SOLUTION image
        try {
          setStepMessage(`Generating solution image ${i + 1}/${plan.slides.length}...`);
          const imgRes = await authFetch("/api/carousel/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_prompt: slide.solution.image_prompt }),
          });

          if (imgRes.ok) {
            const imgData = await imgRes.json();
            let overlayUrl: string | null = null;
            if (imgData.image && (slide.solution.header_text || slide.solution.body_text)) {
              try {
                overlayUrl = await renderTextOnImage(
                  imgData.image,
                  slide.solution.header_text,
                  slide.solution.body_text,
                  "bottom",
                  i,
                  plan.slides.length,
                  false
                );
              } catch (overlayErr) {
                console.warn(`[Carousel] Solution overlay failed for slide ${i + 1}:`, overlayErr);
              }
            }
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, solutionImageUrl: imgData.image, solutionOverlayUrl: overlayUrl, solutionLoading: false }
                  : s
              )
            );
          } else {
            const errData = await imgRes.json().catch(() => ({ error: "Image generation failed" }));
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, solutionLoading: false, solutionError: errData.error || "Image generation failed" }
                  : s
              )
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Image generation failed";
          setSlides((prev) =>
            prev.map((s, idx) =>
              idx === i ? { ...s, solutionLoading: false, solutionError: msg } : s
            )
          );
        }
        completedImages++;
        setProgress(35 + Math.round((completedImages / totalImages) * 60));
      }

      setProgress(100);
      setStep("complete");
      setStepMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unknown error occurred";
      setError(msg);
      setStep("error");
    }
  }, [productUrl, numSlides, userInstructions, language, authFetch, user]);

  // ─── Save to Library ────────────────────────────────────────────────
  const saveToLibrary = useCallback(async () => {
    if (slides.length === 0 || savedToLibrary) return;

    // Save each slide pair as a library entry
    const allImages: string[] = [];
    for (const slide of slides) {
      if (slide.problemOverlayUrl || slide.problemImageUrl) allImages.push(slide.problemOverlayUrl || slide.problemImageUrl!);
      if (slide.solutionOverlayUrl || slide.solutionImageUrl) allImages.push(slide.solutionOverlayUrl || slide.solutionImageUrl!);
    }

    // Save to API
    try {
      await authFetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Carousel: ${carouselTitle}`,
          videoUrl: allImages[0] || "",
          thumbnailUrl: allImages[0] || null,
          duration: null,
          scenesCount: slides.length,
          provider: "carousel",
          metadata: { type: "carousel", slideCount: slides.length, productUrl },
        }),
      });
    } catch {
      // Continue to localStorage
    }

    // Save to localStorage
    if (userEmail) {
      saveVideoToStorage(userEmail, {
        id: "carousel_" + Date.now(),
        title: `Carousel: ${carouselTitle}`,
        videoUrl: allImages[0] || "",
        thumbnailUrl: allImages[0] || null,
        duration: null,
        scenesCount: slides.length,
        provider: "carousel",
        createdAt: new Date().toISOString(),
      });
    }
    setSavedToLibrary(true);
  }, [slides, carouselTitle, productUrl, savedToLibrary, userEmail, authFetch]);

  // Auto-save to library when complete
  useEffect(() => {
    if (step === "complete" && slides.length > 0 && !savedToLibrary) {
      saveToLibrary();
    }
  }, [step, slides, savedToLibrary, saveToLibrary]);

  // ─── Download All ───────────────────────────────────────────────────
  const downloadAll = useCallback(async () => {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const problemUrl = slide.problemOverlayUrl || slide.problemImageUrl;
      const solutionUrl = slide.solutionOverlayUrl || slide.solutionImageUrl;
      if (problemUrl) {
        await downloadImage(problemUrl, `${carouselTitle}-slide${i + 1}-problem.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
      if (solutionUrl) {
        await downloadImage(solutionUrl, `${carouselTitle}-slide${i + 1}-solution.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }, [slides, carouselTitle, downloadImage]);

  // ─── Touch / Swipe ──────────────────────────────────────────────────
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < slides.length - 1) {
        setCurrentSlide(currentSlide + 1);
        setViewingProblem(true);
      } else if (diff < 0 && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
        setViewingProblem(true);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RESULT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (step === "complete" && slides.length > 0) {
    const slide = slides[currentSlide];
    const currentDisplayUrl = viewingProblem
      ? (slide.problemOverlayUrl || slide.problemImageUrl)
      : (slide.solutionOverlayUrl || slide.solutionImageUrl);
    const currentLoading = viewingProblem ? slide.problemLoading : slide.solutionLoading;
    const currentError = viewingProblem ? slide.problemError : slide.solutionError;
    const currentHeaderText = viewingProblem ? slide.problem.header_text : slide.solution.header_text;
    const currentBodyText = viewingProblem ? slide.problem.body_text : slide.solution.body_text;

    return (
      <div className="min-h-screen" style={{ backgroundColor: C.dark }}>
        {/* Top Bar */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3"
          style={{
            backgroundColor: `${C.dark}ee`,
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #222222",
          }}
        >
          <button
            onClick={() => {
              setStep("idle");
              setSlides([]);
              setProductInfo(null);
              setSavedToLibrary(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
            style={{ backgroundColor: "#1A1A1A", color: "#E0E0E0", border: "1.5px solid #333333" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E0E0E0" }}>
              {currentSlide + 1} / {slides.length}
            </span>
            {/* Problem/Solution toggle */}
            <button
              onClick={() => setViewingProblem(!viewingProblem)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                backgroundColor: viewingProblem ? "rgba(220,38,38,0.2)" : "rgba(34,197,94,0.2)",
                color: viewingProblem ? "#EF4444" : "#22C55E",
                border: `1.5px solid ${viewingProblem ? "rgba(220,38,38,0.4)" : "rgba(34,197,94,0.4)"}`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: viewingProblem ? "#EF4444" : "#22C55E" }} />
              {viewingProblem ? "Problem" : "Solution"}
            </button>
          </div>

          {currentDisplayUrl && (
            <button
              onClick={() =>
                downloadImage(
                  currentDisplayUrl,
                  `${carouselTitle}-slide${currentSlide + 1}-${viewingProblem ? "problem" : "solution"}.png`
                )
              }
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
              style={{ backgroundColor: `${C.pink}20`, color: C.pink, border: `1.5px solid ${C.pink}40` }}
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

        {/* Slide Display */}
        <main
          className="flex items-center justify-center min-h-[calc(100vh-56px)] p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-full max-w-sm mx-auto">
            {/* Slide Image */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ aspectRatio: "9/16", backgroundColor: "#1A1A1A", border: "2px solid #333333", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
            >
              {currentLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-3 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: `${viewingProblem ? C.red : C.green}33`, borderTopColor: viewingProblem ? C.red : C.green }} />
                    <p className="text-xs font-medium" style={{ color: "#A0A0A0" }}>
                      Generating {viewingProblem ? "problem" : "solution"} image...
                    </p>
                  </div>
                </div>
              ) : currentDisplayUrl ? (
                <img src={currentDisplayUrl} alt={viewingProblem ? "Problem" : "Solution"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(220,38,38,0.15)" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "#E0E0E0" }}>Image failed to generate</p>
                    <p className="text-xs mt-2" style={{ color: "#888888" }}>{currentError || "Unknown error"}</p>
                  </div>
                </div>
              )}

              {/* Type indicator badge */}
              {currentDisplayUrl && !currentLoading && (
                <div
                  className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{
                    backgroundColor: viewingProblem ? "rgba(220,38,38,0.85)" : "rgba(34,197,94,0.85)",
                    color: C.white,
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  {viewingProblem ? "Problem" : "Solution"}
                </div>
              )}
            </div>

            {/* Slide Text Content */}
            <div className="mt-4 px-2">
              {currentHeaderText && (
                <h2 className="text-lg font-black mb-2" style={{ color: C.white }}>{currentHeaderText}</h2>
              )}
              {currentBodyText && (
                <p className="text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>{currentBodyText}</p>
              )}
            </div>

            {/* Problem/Solution Toggle Buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setViewingProblem(true)}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: viewingProblem ? "rgba(220,38,38,0.2)" : "#1A1A1A",
                  color: viewingProblem ? "#EF4444" : "#666666",
                  border: `1.5px solid ${viewingProblem ? "rgba(220,38,38,0.4)" : "#333333"}`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Problem
              </button>
              <button
                onClick={() => setViewingProblem(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: !viewingProblem ? "rgba(34,197,94,0.2)" : "#1A1A1A",
                  color: !viewingProblem ? "#22C55E" : "#666666",
                  border: `1.5px solid ${!viewingProblem ? "rgba(34,197,94,0.4)" : "#333333"}`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Solution
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => { setCurrentSlide(Math.max(0, currentSlide - 1)); setViewingProblem(true); }}
                disabled={currentSlide === 0}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 disabled:opacity-20"
                style={{ backgroundColor: "#1A1A1A", border: "1.5px solid #333333" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Slide dots */}
              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentSlide(i); setViewingProblem(true); }}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentSlide ? "24px" : "8px",
                      height: "8px",
                      backgroundColor: i === currentSlide ? C.pink : "#444444",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => { setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1)); setViewingProblem(true); }}
                disabled={currentSlide === slides.length - 1}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 disabled:opacity-20"
                style={{ backgroundColor: "#1A1A1A", border: "1.5px solid #333333" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Download All Button */}
            <button
              onClick={downloadAll}
              className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-300"
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
                Download All Slides ({slides.length * 2} images)
              </span>
            </button>

            {/* Library Saved Indicator */}
            {savedToLibrary && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: C.green }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Saved to library
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GENERATING / PROGRESS VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (step === "analyzing" || step === "planning" || step === "generating") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.cream }}>
        <div className="w-full max-w-md mx-auto px-6">
          <div
            className="rounded-3xl p-8 text-center"
            style={{ backgroundColor: C.white, border: "1.5px solid #F3F4F6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          >
            {/* Progress spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full" style={{ border: "3px solid #F3F4F6" }} />
              <div
                className="absolute inset-0 rounded-full border-3 border-t-transparent animate-spin"
                style={{ borderColor: `${C.pink}33`, borderTopColor: C.pink }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black" style={{ color: C.pink }}>{progress}%</span>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {["analyzing", "planning", "generating"].map((s, i) => {
                const isActive = step === s;
                const isDone = ["analyzing", "planning", "generating"].indexOf(step) > i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{
                        backgroundColor: isDone ? C.green : isActive ? C.pink : "#E5E7EB",
                        color: isDone || isActive ? C.white : "#9CA3AF",
                      }}
                    >
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 2 && (
                      <div className="w-8 h-0.5" style={{ backgroundColor: isDone ? C.green : "#E5E7EB" }} />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-sm font-semibold mb-2" style={{ color: C.dark }}>
              {step === "analyzing" && "Analyzing your product..."}
              {step === "planning" && "Creating carousel plan..."}
              {step === "generating" && "Generating slide images..."}
            </p>
            <p className="text-xs" style={{ color: C.textMuted }}>
              {stepMessage || "This may take 2-5 minutes..."}
            </p>

            {/* Product info preview */}
            {productInfo && step !== "analyzing" && (
              <div className="mt-5 pt-5" style={{ borderTop: "1px solid #F3F4F6" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.gold }}>
                  Product Detected
                </p>
                <p className="text-sm font-semibold" style={{ color: C.dark }}>
                  {productInfo.productName}
                </p>
                {productInfo.productDescription && (
                  <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                    {productInfo.productDescription.slice(0, 100)}
                    {productInfo.productDescription.length > 100 ? "..." : ""}
                  </p>
                )}
              </div>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                abortRef.current = true;
                setStep("idle");
                setError("");
                setStepMessage("");
              }}
              className="mt-6 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
              style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INPUT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream }}>
      {/* Top Bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{ backgroundColor: `${C.white}ee`, backdropFilter: "blur(12px)", borderBottom: "1px solid #F3F4F6" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:shadow-lg"
          style={{ backgroundColor: C.white, color: C.text, border: `1.5px solid ${C.lightPink}` }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Menu
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.gold, boxShadow: `0 2px 10px ${C.gold}40` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 9h6M9 13h4" />
              <circle cx="18" cy="6" r="2" fill="white" stroke="none" />
            </svg>
          </div>
          <span className="text-sm font-black uppercase tracking-wider hidden sm:inline" style={{ color: C.dark }}>
            Carousel Machine
          </span>
        </div>

        <div className="w-[100px]" />
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ backgroundColor: `${C.gold}18` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.gold }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.gold }}>
              AI-Powered Problem/Solution
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4 leading-tight" style={{ color: C.dark }}>
            AI Viral{" "}
            <span style={{ color: C.pink }}>Carousel</span>{" "}
            Machine
          </h1>

          <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: C.textMuted }}>
            Paste your product link, choose the number of slides, and let DeepSeek AI create stunning Problem/Solution carousels — ready to go viral.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { num: "1", title: "Paste Link", desc: "Add your product URL", color: C.pink },
            { num: "2", title: "AI Analyzes", desc: "DeepSeek extracts features", color: C.gold },
            { num: "3", title: "Get Slides", desc: "Problem → Solution images", color: "#22C55E" },
          ].map((item) => (
            <div
              key={item.num}
              className="rounded-2xl p-4 text-center"
              style={{ backgroundColor: C.white, border: "1px solid #F3F4F6" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-black"
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
              >
                {item.num}
              </div>
              <h3 className="text-xs font-bold mb-1" style={{ color: C.dark }}>{item.title}</h3>
              <p className="text-[10px]" style={{ color: C.textMuted }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Main Input Card */}
        <div
          className="rounded-3xl p-6 sm:p-8 mb-6"
          style={{ backgroundColor: C.white, border: "1.5px solid #F3F4F6", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}
        >
          {/* Product URL Input */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.pink}12` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
              Product Link
            </label>
          </div>

          <input
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://www.amazon.com/dp/B0... or any product page"
            className="w-full px-5 py-4 rounded-2xl text-sm outline-none transition-all duration-200"
            style={{
              backgroundColor: `${C.lightPink}30`,
              border: `1.5px solid ${productUrl ? `${C.pink}40` : "#F3F4F6"}`,
              color: C.text,
              boxShadow: productUrl ? `0 0 0 3px ${C.pink}10` : "none",
            }}
          />

          <p className="text-[11px] mt-2" style={{ color: C.textMuted }}>
            We'll analyze the product page and extract features, benefits, and target audience
          </p>

          {/* Settings Row */}
          <div className="flex flex-wrap items-end gap-4 mt-6 mb-5">
            {/* Number of Slides */}
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.pink}12` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
                  Slides
                </label>
              </div>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumSlides(n)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{
                      backgroundColor: numSlides === n ? C.pink : "#F9FAFB",
                      color: numSlides === n ? C.white : C.textMuted,
                      border: `1.5px solid ${numSlides === n ? C.pink : "#E5E7EB"}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: C.textMuted }}>
                {numSlides * 2} images total (problem + solution per slide)
              </p>
            </div>

            {/* Language */}
            <div className="min-w-[140px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.pink}12` }}>
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

          {/* User Instructions */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.gold}12` }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
              </svg>
            </div>
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
              Additional Instructions <span style={{ color: C.textMuted }}>(optional)</span>
            </label>
          </div>

          <textarea
            value={userInstructions}
            onChange={(e) => setUserInstructions(e.target.value)}
            placeholder="e.g. Focus on eco-friendly benefits, target moms aged 25-40, emphasize the time-saving aspect..."
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all duration-200"
            style={{
              backgroundColor: `${C.lightGold}30`,
              border: `1.5px solid ${userInstructions ? `${C.gold}40` : "#F3F4F6"}`,
              color: C.text,
            }}
          />

          {/* Error Message */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              {error}
              <button
                onClick={() => setError("")}
                className="ml-3 underline text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!productUrl.trim() || step !== "idle"}
            className="w-full mt-5 py-4 rounded-2xl text-sm font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
              color: C.white,
              boxShadow: productUrl.trim() && step === "idle" ? `0 6px 24px ${C.pink}35` : "none",
              transform: productUrl.trim() && step === "idle" ? "scale(1)" : "scale(0.98)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Carousel ({numSlides} slides, {numSlides * 2} images)
            </span>
          </button>
        </div>

        {/* Slide Preview Explanation */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: C.white, border: "1px solid #F3F4F6" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: C.gold }}>
            How Each Slide Works
          </p>
          <div className="flex items-start gap-4">
            {/* Problem */}
            <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: "rgba(220,38,38,0.06)", border: "1px dashed rgba(220,38,38,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(220,38,38,0.15)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase" style={{ color: "#EF4444" }}>Problem</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>
                Shows the pain point WITHOUT the product. Dark tones, frustrated expressions, chaotic environment — makes your audience feel the struggle.
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            {/* Solution */}
            <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px dashed rgba(34,197,94,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase" style={{ color: "#22C55E" }}>Solution</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>
                Shows the result WITH the product. Bright tones, happy expressions, organized environment — gives hope and desire to buy.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              ),
              title: "Product Analysis",
              desc: "DeepSeek AI reads your product page and extracts key features & benefits",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              ),
              title: "Problem / Solution",
              desc: "Each slide shows the pain point then the solution — proven viral format",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
              title: "Ready to Post",
              desc: "Download all images as 9:16 vertical — perfect for Instagram & TikTok",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: C.white, border: "1px solid #F3F4F6" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${C.lightPink}40` }}>
                {feature.icon}
              </div>
              <h3 className="text-xs font-bold mb-1" style={{ color: C.dark }}>{feature.title}</h3>
              <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
