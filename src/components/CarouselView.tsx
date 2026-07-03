"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { saveVideoToStorage } from "@/lib/video-store";
import SlidePublisher from "@/components/SlidePublisher";

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
}

interface CarouselSlide {
  slide_number: number;
  problem: {
    image_prompt: string;
    problem_text: string | null;
  };
  solution: {
    image_prompt: string;
    solution_text: string | null;
  };
}

interface ProductInfo {
  productName: string;
  productDescription: string;
  features: string[];
  problems: string[];
  benefits: string[];
  targetAudience: string;
  productImages?: string[];
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

// ─── Proxy-load an external image to avoid CORS issues ────────────────────────
// Uses /api/proxy-image?url=... to fetch external images through our server
async function loadProxiedImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // For external URLs, try loading directly first (works if CORS headers present)
    // If that fails, use a proxy approach via canvas
    const isExternal = imageUrl.startsWith("http");

    img.onload = () => resolve(img);
    img.onerror = () => {
      if (isExternal) {
        // Try loading without CORS for display (won't work for canvas export but shows the image)
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = "anonymous";
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error("Failed to load image"));
        // Try with no-cors as last resort — at least it displays
        fallbackImg.src = imageUrl;
      } else {
        reject(new Error("Failed to load image"));
      }
    };

    img.src = imageUrl;
  });
}

// ─── Format product image to 9:16 vertical with background ──────────────────
// Takes a product image (any aspect ratio) and renders it centered on a 9:16 canvas
// with a matching blurred background fill. Uses server proxy for CORS bypass.
function formatProductImageTo9x16(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Use our server proxy to bypass CORS for external images
    const isExternal = imageUrl.startsWith("http");
    const proxiedUrl = isExternal ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}` : imageUrl;

    img.onload = () => {
      const targetW = 768;
      const targetH = 1344; // 9:16 ratio
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Fill background with a blurred/scaled version
      ctx.drawImage(img, 0, 0, targetW, targetH);
      ctx.filter = "blur(30px) brightness(0.5)";
      ctx.drawImage(img, -10, -10, targetW + 20, targetH + 20);
      ctx.filter = "none";

      // Add semi-transparent overlay
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, targetW, targetH);

      // Calculate centered product image size (fit within canvas with padding)
      const padding = targetW * 0.08;
      const availW = targetW - padding * 2;
      const availH = targetH * 0.75; // Leave room for text at bottom
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const availAspect = availW / availH;

      let drawW: number, drawH: number;
      if (imgAspect > availAspect) {
        // Image is wider — fit to width
        drawW = availW;
        drawH = availW / imgAspect;
      } else {
        // Image is taller — fit to height
        drawH = availH;
        drawW = availH * imgAspect;
      }

      const drawX = (targetW - drawW) / 2;
      const drawY = (targetH * 0.45 - drawH) / 2; // Center in upper portion

      // Draw subtle shadow behind product image
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 5;

      // Draw white background behind product image
      const bgPad = 8;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(drawX - bgPad, drawY - bgPad, drawW + bgPad * 2, drawH + bgPad * 2);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Draw the product image
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      // If proxy also fails, just return the raw URL (it will display in <img> but won't have 9:16 formatting)
      console.warn("[Carousel] Product image load failed (even via proxy), using raw URL");
      resolve(imageUrl);
    };

    img.src = proxiedUrl;
  });
}

// ─── Copy text to clipboard ────────────────────────────────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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

  const [productImageBase64, setProductImageBase64] = useState<string | null>(null); // User-uploaded product image (base64) for solution slides
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewingProblem, setViewingProblem] = useState(true); // Toggle between problem/solution view

  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [autoPublishTikTok, setAutoPublishTikTok] = useState(false);
  const [publishStates, setPublishStates] = useState<Record<number, "idle" | "publishing" | "published" | "failed">>({});
  const abortRef = useRef(false);

  // ─── Text Editor States ──────────────────────────────────────────────
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textOverlayText, setTextOverlayText] = useState("");
  const [textFontSize, setTextFontSize] = useState(48);
  const [textFontColor, setTextFontColor] = useState("#FFFFFF");
  const [textStrokeColor, setTextStrokeColor] = useState("#000000");
  const [textStrokeWidth, setTextStrokeWidth] = useState(3);
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom" | "custom">("bottom");
  const [textCustomX, setTextCustomX] = useState(50);
  const [textCustomY, setTextCustomY] = useState(82);
  const [textAlignment, setTextAlignment] = useState<"left" | "center" | "right">("center");
  const [textShadow, setTextShadow] = useState(true);
  const [textFont, setTextFont] = useState("dejavu-bold");
  const [textApplying, setTextApplying] = useState(false);
  const [textedImageUrl, setTextedImageUrl] = useState<string | null>(null); // The image with text applied

  // ─── Per-slide cache for text overlay images and text ────────────────
  // Key: "slideIndex-problem/solution" (e.g. "0-problem", "2-solution")
  const textedImageCacheRef = useRef<Map<string, string>>(new Map());
  const textContentCacheRef = useRef<Map<string, string>>(new Map());

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

  // ─── Apply Text Overlay via FFmpeg ──────────────────────────────────
  const applyTextOverlay = useCallback(async () => {
    const slide = slides[currentSlide];
    const baseImageUrl = viewingProblem ? slide.problemImageUrl : slide.solutionImageUrl;
    if (!baseImageUrl || !textOverlayText.trim()) return;

    setTextApplying(true);
    try {
      const res = await authFetch("/api/carousel/add-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: baseImageUrl,
          text: textOverlayText.trim(),
          fontSize: textFontSize,
          fontColor: textFontColor,
          strokeColor: textStrokeColor,
          strokeWidth: textStrokeWidth,
          position: textPosition,
          x: textCustomX,
          y: textCustomY,
          alignment: textAlignment,
          shadow: textShadow,
          fontFile: textFont,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to apply text" }));
        throw new Error(err.error || "Failed to apply text");
      }

      const data = await res.json();
      if (data.image) {
        setTextedImageUrl(data.image);
        // Cache the texted image for this slide so it persists when navigating
        const cacheKey = `${currentSlide}-${viewingProblem ? "problem" : "solution"}`;
        textedImageCacheRef.current.set(cacheKey, data.image);
        textContentCacheRef.current.set(cacheKey, textOverlayText.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply text overlay";
      console.error("[Carousel] Text overlay error:", msg);
      alert("Failed to apply text: " + msg);
    } finally {
      setTextApplying(false);
    }
  }, [slides, currentSlide, viewingProblem, textOverlayText, textFontSize, textFontColor, textStrokeColor, textStrokeWidth, textPosition, textCustomX, textCustomY, textAlignment, textShadow, textFont, authFetch]);

  // ─── Ensure texted image is available for a given slide ───────────────
  // If the texted image is already in the cache, return it.
  // Otherwise, call /api/carousel/add-text to render text onto the image.
  const ensureTextedImage = useCallback(async (
    slideIndex: number,
    type: "problem" | "solution"
  ): Promise<string | null> => {
    const cacheKey = `${slideIndex}-${type}`;
    const cached = textedImageCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const slide = slides[slideIndex];
    if (!slide) return null;

    const imageUrl = type === "problem" ? slide.problemImageUrl : slide.solutionImageUrl;
    const text = type === "problem" ? slide.problem.problem_text : slide.solution.solution_text;

    if (!imageUrl || !text) return imageUrl || null;

    try {
      const res = await authFetch("/api/carousel/add-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          text,
          fontSize: 48,
          fontColor: "#FFFFFF",
          strokeColor: "#000000",
          strokeWidth: 3,
          position: "bottom",
          alignment: "center",
          shadow: true,
          fontFile: "dejavu-bold",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.image) {
          textedImageCacheRef.current.set(cacheKey, data.image);
          textContentCacheRef.current.set(cacheKey, text);
          return data.image;
        }
      }
    } catch (e) {
      console.warn(`[Carousel] ensureTextedImage failed for slide ${slideIndex} ${type}:`, e);
    }
    return imageUrl;
  }, [slides, authFetch]);

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
    textedImageCacheRef.current.clear(); // Clear text overlay cache for new generation
    textContentCacheRef.current.clear();

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
      // Store extracted product images for use in solution slides
      const extractedImages: string[] = analyzeData.productImages || [];
      setProductImages(extractedImages);
      console.log(`[Carousel] Got ${extractedImages.length} product images for solution slides`);
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

      // Normalize: map old field names (header_text/body_text) to new (problem_text/solution_text)
      for (const s of plan.slides) {
        if (s.problem && !s.problem.problem_text) {
          s.problem.problem_text = (s.problem as Record<string, unknown>).header_text as string || (s.problem as Record<string, unknown>).body_text as string || null;
        }
        if (s.solution && !s.solution.solution_text) {
          s.solution.solution_text = (s.solution as Record<string, unknown>).header_text as string || (s.solution as Record<string, unknown>).body_text as string || "sorry if they sold out";
        }
      }

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
            // No text overlay — images are clean, text is shown separately
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, problemImageUrl: imgData.image, problemLoading: false }
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

        // Generate SOLUTION image — use user-uploaded product image as reference
        try {
          setStepMessage(`Generating product image ${i + 1}/${plan.slides.length}...`);

          let solutionImage: string | null = null;

          // If user uploaded a product image, send it as reference.
          // The server will try nano-banana-edit first, then Sharp composite fallback
          // to guarantee the product appears in the solution image.
          if (productImageBase64) {
            console.log(`[Carousel] Sending product image as reference for solution slide ${i + 1} (base64 length: ${productImageBase64.length})`);
            const imgRes = await authFetch("/api/carousel/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image_prompt: slide.solution.image_prompt,
                reference_image_base64: productImageBase64,
              }),
            });

            if (imgRes.ok) {
              const imgData = await imgRes.json();
              solutionImage = imgData.image;
              console.log(`[Carousel] Solution image with product reference ready!`);
            } else {
              const errData = await imgRes.json().catch(() => ({ error: "Image generation failed" }));
              console.warn(`[Carousel] Solution image with reference failed: ${errData.error} (status: ${imgRes.status})`);
            }
          }

          // Fallback: generate without reference if no product image or if ref-based generation failed
          if (!solutionImage) {
            console.log(`[Carousel] Falling back to no-reference generation for solution slide ${i + 1}`);
            const imgRes = await authFetch("/api/carousel/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_prompt: slide.solution.image_prompt }),
            });

            if (imgRes.ok) {
              const imgData = await imgRes.json();
              solutionImage = imgData.image;
            }
          }

          if (solutionImage) {
            // No text overlay — images are clean, text is shown separately
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, solutionImageUrl: solutionImage, solutionLoading: false }
                  : s
              )
            );
          } else {
            setSlides((prev) =>
              prev.map((s, idx) =>
                idx === i
                  ? { ...s, solutionLoading: false, solutionError: "No product image available" }
                  : s
              )
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Solution image failed";
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
  }, [productUrl, numSlides, userInstructions, language, authFetch, user, productImageBase64]);

  // ─── Save to Library ────────────────────────────────────────────────
  const saveToLibrary = useCallback(async () => {
    if (slides.length === 0 || savedToLibrary) return;
    setSavingToLibrary(true);

    // For each slide, we need to generate texted versions (image + text overlay)
    // The text comes from the AI-generated problem_text / solution_text
    // We use the /api/carousel/add-text endpoint to render text onto images
    const allImages: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      // Check cache first — if user already applied text manually, use that
      const problemCacheKey = `${i}-problem`;
      const solutionCacheKey = `${i}-solution`;
      const textedProblem = textedImageCacheRef.current.get(problemCacheKey);
      const textedSolution = textedImageCacheRef.current.get(solutionCacheKey);

      // For problem image: apply problem_text if not already cached
      if (textedProblem) {
        allImages.push(textedProblem);
      } else if (slide.problemImageUrl && slide.problem.problem_text) {
        try {
          const res = await authFetch("/api/carousel/add-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: slide.problemImageUrl,
              text: slide.problem.problem_text,
              fontSize: 48,
              fontColor: "#FFFFFF",
              strokeColor: "#000000",
              strokeWidth: 3,
              position: "bottom",
              alignment: "center",
              shadow: true,
              fontFile: "dejavu-bold",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.image) {
              allImages.push(data.image);
              textedImageCacheRef.current.set(problemCacheKey, data.image);
              textContentCacheRef.current.set(problemCacheKey, slide.problem.problem_text);
              continue;
            }
          }
        } catch (e) {
          console.warn(`[Carousel] Failed to add text to problem slide ${i + 1}:`, e);
        }
        allImages.push(slide.problemImageUrl);
      } else {
        if (slide.problemImageUrl) allImages.push(slide.problemImageUrl);
      }

      // For solution image: apply solution_text if not already cached
      if (textedSolution) {
        allImages.push(textedSolution);
      } else if (slide.solutionImageUrl && slide.solution.solution_text) {
        try {
          const res = await authFetch("/api/carousel/add-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageUrl: slide.solutionImageUrl,
              text: slide.solution.solution_text,
              fontSize: 48,
              fontColor: "#FFFFFF",
              strokeColor: "#000000",
              strokeWidth: 3,
              position: "bottom",
              alignment: "center",
              shadow: true,
              fontFile: "dejavu-bold",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.image) {
              allImages.push(data.image);
              textedImageCacheRef.current.set(solutionCacheKey, data.image);
              textContentCacheRef.current.set(solutionCacheKey, slide.solution.solution_text);
              continue;
            }
          }
        } catch (e) {
          console.warn(`[Carousel] Failed to add text to solution slide ${i + 1}:`, e);
        }
        allImages.push(slide.solutionImageUrl);
      } else {
        if (slide.solutionImageUrl) allImages.push(slide.solutionImageUrl);
      }
    }

    console.log(`[Carousel] Saving to library: ${allImages.length} images (with text overlays applied)`);

    // Upload data URLs to persistent storage so they survive page refresh
    const uploadedImages: string[] = [];
    for (let i = 0; i < allImages.length; i++) {
      const imgUrl = allImages[i];
      if (imgUrl && !imgUrl.startsWith("http")) {
        try {
          const blob = await (await fetch(imgUrl)).blob();
          const file = new File([blob], `carousel_slide_${i}_${Date.now()}.png`, { type: "image/png" });
          const fd = new FormData();
          fd.append("avatar", file);
          let uploaded = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const upRes = await fetch("/api/upload-avatar", { method: "POST", body: fd });
              const upData = await upRes.json();
              if (upData.success && upData.avatarUrl) {
                uploadedImages.push(upData.avatarUrl);
                uploaded = true;
                break;
              }
            } catch (e) {
              console.warn(`[Carousel] Upload slide ${i} attempt ${attempt} error:`, e);
            }
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
          }
          if (!uploaded) uploadedImages.push(imgUrl); // Fallback to data URL
        } catch (e) {
          console.warn(`[Carousel] Failed to upload slide ${i}:`, e);
          uploadedImages.push(imgUrl);
        }
      } else {
        uploadedImages.push(imgUrl);
      }
    }

    const finalImages = uploadedImages;

    // Save to API
    try {
      await authFetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Carousel: ${carouselTitle}`,
          videoUrl: finalImages[0] || "",
          thumbnailUrl: finalImages[0] || null,
          duration: null,
          scenesCount: slides.length,
          provider: "carousel",
          metadata: {
            type: "carousel",
            slideCount: slides.length,
            productUrl,
            imageUrls: finalImages, // ALL image URLs with text overlays applied, uploaded to persistent storage
          },
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
        videoUrl: finalImages[0] || "",
        thumbnailUrl: finalImages[0] || null,
        duration: null,
        scenesCount: slides.length,
        provider: "carousel",
        createdAt: new Date().toISOString(),
        metadata: JSON.stringify({ type: "carousel", slideCount: slides.length, productUrl, imageUrls: finalImages }),
      });
    }
    setSavedToLibrary(true);
    setSavingToLibrary(false);
  }, [slides, carouselTitle, productUrl, savedToLibrary, userEmail, authFetch]);

  // REMOVED: Auto-save was saving before text overlays were applied.
  // User now clicks "Save to Library" button manually to ensure text is included.

  // Restore text overlay from cache when switching slides or problem/product
  useEffect(() => {
    const cacheKey = `${currentSlide}-${viewingProblem ? "problem" : "solution"}`;
    const cachedImage = textedImageCacheRef.current.get(cacheKey) || null;
    const cachedText = textContentCacheRef.current.get(cacheKey) || "";
    setTextedImageUrl(cachedImage);
    setTextOverlayText(cachedText);
    setShowTextEditor(false);
  }, [currentSlide, viewingProblem]);

  // ─── Download All ───────────────────────────────────────────────────
  const downloadAll = useCallback(async () => {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      // Prefer texted images from cache when downloading
      const textedProblem = textedImageCacheRef.current.get(`${i}-problem`);
      const textedSolution = textedImageCacheRef.current.get(`${i}-solution`);
      const problemUrl = textedProblem || slide.problemImageUrl;
      const solutionUrl = textedSolution || slide.solutionImageUrl;
      if (problemUrl) {
        await downloadImage(problemUrl, `${carouselTitle}-slide${i + 1}-problem.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
      if (solutionUrl) {
        await downloadImage(solutionUrl, `${carouselTitle}-slide${i + 1}-product.png`);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }, [slides, carouselTitle, downloadImage]);

  // ─── Touch / Swipe ──────────────────────────────────────────────────
  const touchStartX = useRef(0);
  // ─── TikTok Auto-Publish Helpers ─────────────────────────────────────
  // Track publish state for each slide
  const handlePublishStateChange = useCallback((slideNum: number, state: "idle" | "publishing" | "published" | "failed") => {
    setPublishStates(prev => ({ ...prev, [slideNum]: state }));
  }, []);

  // Publish all slides at once
  const handlePublishAllToTikTok = async () => {
    const readySlides = slides.filter(s => s.problemImageUrl && s.solutionImageUrl);
    if (readySlides.length === 0) {
      alert("No slides ready to publish. Generate images first.");
      return;
    }
    if (!confirm(`Publish ${readySlides.length} slide(s) to TikTok?`)) return;

    for (const slide of readySlides) {
      try {
        // Use texted images from cache when available
        const slideIdx = slides.indexOf(slide);
        const textedProblem = slideIdx >= 0 ? textedImageCacheRef.current.get(`${slideIdx}-problem`) : null;
        const textedSolution = slideIdx >= 0 ? textedImageCacheRef.current.get(`${slideIdx}-solution`) : null;
        let problemUrl = textedProblem || slide.problemImageUrl!;
        let solutionUrl = textedSolution || slide.solutionImageUrl!;

        // Upload data URLs to get persistent HTTP URLs (TikTok API requires HTTP)
        if (problemUrl.startsWith("data:")) {
          try {
            const blob = await (await fetch(problemUrl)).blob();
            const file = new File([blob], `texted_problem_${slide.slide_number}.png`, { type: "image/png" });
            const fd = new FormData();
            fd.append("avatar", file);
            const upRes = await fetch("/api/upload-avatar", { method: "POST", body: fd });
            const upData = await upRes.json();
            if (upData.success && upData.avatarUrl) problemUrl = upData.avatarUrl;
          } catch (e) {
            console.warn("[Carousel] Upload texted problem failed, using original:", e);
            problemUrl = slide.problemImageUrl!;
          }
        }
        if (solutionUrl.startsWith("data:")) {
          try {
            const blob = await (await fetch(solutionUrl)).blob();
            const file = new File([blob], `texted_solution_${slide.slide_number}.png`, { type: "image/png" });
            const fd = new FormData();
            fd.append("avatar", file);
            const upRes = await fetch("/api/upload-avatar", { method: "POST", body: fd });
            const upData = await upRes.json();
            if (upData.success && upData.avatarUrl) solutionUrl = upData.avatarUrl;
          } catch (e) {
            console.warn("[Carousel] Upload texted solution failed, using original:", e);
            solutionUrl = slide.solutionImageUrl!;
          }
        }

        await fetch("/api/autopublish/publish-carousel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrls: [problemUrl, solutionUrl],
            caption: `${carouselTitle} - Slide ${slide.slide_number} 🔥`,
            hashtags: ["fyp", "viral", "carousel", "ai"],
            aiDescription: `Slide ${slide.slide_number}`,
            externalId: `carousel_${slide.slide_number}_${Date.now()}`,
            autoCaption: false,
          }),
        });
        setPublishStates(prev => ({ ...prev, [slide.slide_number]: "published" }));
      } catch (err) {
        setPublishStates(prev => ({ ...prev, [slide.slide_number]: "failed" }));
      }
      // Small delay between publishes to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }
  };

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
    const baseImageUrl = viewingProblem
      ? slide.problemImageUrl
      : slide.solutionImageUrl;
    const currentDisplayUrl = textedImageUrl || baseImageUrl;
    const currentLoading = viewingProblem ? slide.problemLoading : slide.solutionLoading;
    const currentError = viewingProblem ? slide.problemError : slide.solutionError;
    const currentText = viewingProblem ? slide.problem.problem_text : slide.solution.solution_text;

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
            {/* Problem/Product toggle */}
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
              {viewingProblem ? "Problem" : "Product"}
            </button>
          </div>

          {currentDisplayUrl && (
            <button
              onClick={() =>
                downloadImage(
                  currentDisplayUrl,
                  `${carouselTitle}-slide${currentSlide + 1}-${viewingProblem ? "problem" : "product"}.png`
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

          {/* Per-slide TikTok publish button */}
          {step === "complete" && slides[currentSlide] && (
            <div className="ml-2">
              <SlidePublisher
                slideNumber={slides[currentSlide].slide_number}
                problemImageUrl={slides[currentSlide].problemImageUrl}
                solutionImageUrl={slides[currentSlide].solutionImageUrl}
                textedProblemUrl={textedImageCacheRef.current.get(`${currentSlide}-problem`) || null}
                textedSolutionUrl={textedImageCacheRef.current.get(`${currentSlide}-solution`) || null}
                problemText={slides[currentSlide].problem.problem_text}
                solutionText={slides[currentSlide].solution.solution_text}
                carouselTitle={carouselTitle}
                autoPublish={autoPublishTikTok}
                onPublishStateChange={handlePublishStateChange}
                authFetch={authFetch}
              />
            </div>
          )}
        </header>

        {/* Slide Display */}
        <main
          className="overflow-y-auto p-4"
          style={{ height: "calc(100vh - 56px)" }}
        >
          <div className="w-full max-w-sm mx-auto">
            {/* Slide Image */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ aspectRatio: "9/16", backgroundColor: "#1A1A1A", border: "2px solid #333333", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {currentLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-3 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: `${viewingProblem ? C.red : C.green}33`, borderTopColor: viewingProblem ? C.red : C.green }} />
                    <p className="text-xs font-medium" style={{ color: "#A0A0A0" }}>
                    Generating {viewingProblem ? "problem" : "product"} image...
                    </p>
                  </div>
                </div>
              ) : currentDisplayUrl ? (
                <img src={currentDisplayUrl} alt={viewingProblem ? "Problem" : "Product"} className="w-full h-full object-cover" />
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
                  {viewingProblem ? "Problem" : "Product"}
                </div>
              )}
            </div>

            {/* Text Editor Panel — FFmpeg overlay with full control */}
            {currentDisplayUrl && !currentLoading && (
              <div className="mt-4 px-2">
                {/* Toggle Text Editor */}
                <button
                  onClick={() => {
                    if (!showTextEditor && !textOverlayText && currentText) {
                      setTextOverlayText(currentText || "");
                    }
                    setShowTextEditor(!showTextEditor);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
                  style={{
                    backgroundColor: showTextEditor ? `${C.pink}20` : "#1A1A1A",
                    color: showTextEditor ? C.pink : "#E0E0E0",
                    border: `1.5px solid ${showTextEditor ? `${C.pink}40` : "#333333"}`,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7" />
                      <line x1="9" y1="20" x2="15" y2="20" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                    {showTextEditor ? "Close Text Editor" : "Add Text Overlay"}
                  </span>
                  <span style={{ transform: showTextEditor ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {showTextEditor && (
                  <div className="mt-3 space-y-3" style={{ animation: "fadeIn 0.2s ease-out" }}>
                    {/* Text Input */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                        Text (use Enter for new line)
                      </label>
                      <textarea
                        value={textOverlayText}
                        onChange={(e) => setTextOverlayText(e.target.value)}
                        placeholder={currentText || "Type your text here..."}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl text-sm font-medium resize-none outline-none transition-all duration-200"
                        style={{
                          backgroundColor: "#111111",
                          color: C.white,
                          border: "1.5px solid #333333",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = C.pink; }}
                        onBlur={(e) => { e.target.style.borderColor = "#333333"; }}
                      />
                    </div>

                    {/* Font Size + Font Family Row */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                          Font Size: {textFontSize}px
                        </label>
                        <input
                          type="range"
                          min={20}
                          max={120}
                          value={textFontSize}
                          onChange={(e) => setTextFontSize(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, ${C.pink} ${(textFontSize - 20) / 100 * 100}%, #333333 ${(textFontSize - 20) / 100 * 100}%)` }}
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                          Font
                        </label>
                        <select
                          value={textFont}
                          onChange={(e) => setTextFont(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg text-[11px] font-medium outline-none"
                          style={{ backgroundColor: "#111111", color: C.white, border: "1.5px solid #333333" }}
                        >
                          <option value="dejavu-bold">DejaVu Bold</option>
                          
                          <option value="tinos-bold">Tinos Bold</option>
                          
                          <option value="carlito-bold">Carlito Bold</option>
                          
                          <option value="noto-sans-sc">Noto Sans SC</option>
                        </select>
                      </div>
                    </div>

                    {/* Colors Row */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                          Text Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={textFontColor}
                            onChange={(e) => setTextFontColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                            style={{ backgroundColor: "transparent" }}
                          />
                          <input
                            type="text"
                            value={textFontColor}
                            onChange={(e) => setTextFontColor(e.target.value)}
                            className="flex-1 px-2 py-1 rounded-lg text-[11px] font-mono outline-none"
                            style={{ backgroundColor: "#111111", color: C.white, border: "1.5px solid #333333" }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                          Stroke Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={textStrokeColor}
                            onChange={(e) => setTextStrokeColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                            style={{ backgroundColor: "transparent" }}
                          />
                          <input
                            type="text"
                            value={textStrokeColor}
                            onChange={(e) => setTextStrokeColor(e.target.value)}
                            className="flex-1 px-2 py-1 rounded-lg text-[11px] font-mono outline-none"
                            style={{ backgroundColor: "#111111", color: C.white, border: "1.5px solid #333333" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stroke Width + Shadow Row */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                          Stroke Width: {textStrokeWidth}px
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={textStrokeWidth}
                          onChange={(e) => setTextStrokeWidth(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, ${C.pink} ${textStrokeWidth * 10}%, #333333 ${textStrokeWidth * 10}%)` }}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <button
                          onClick={() => setTextShadow(!textShadow)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                          style={{
                            backgroundColor: textShadow ? `${C.pink}20` : "#111111",
                            color: textShadow ? C.pink : "#666666",
                            border: `1.5px solid ${textShadow ? `${C.pink}40` : "#333333"}`,
                          }}
                        >
                          Shadow {textShadow ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>

                    {/* Position Presets */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                        Position
                      </label>
                      <div className="flex gap-1.5">
                        {(["top", "center", "bottom", "custom"] as const).map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setTextPosition(pos)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                            style={{
                              backgroundColor: textPosition === pos ? `${C.pink}20` : "#111111",
                              color: textPosition === pos ? C.pink : "#666666",
                              border: `1.5px solid ${textPosition === pos ? `${C.pink}40` : "#333333"}`,
                            }}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom X/Y Sliders (only when "custom" position) */}
                    {textPosition === "custom" && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                            X: {textCustomX}%
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={textCustomX}
                            onChange={(e) => setTextCustomX(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, ${C.pink} ${textCustomX}%, #333333 ${textCustomX}%)` }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                            Y: {textCustomY}%
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={textCustomY}
                            onChange={(e) => setTextCustomY(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, ${C.pink} ${textCustomY}%, #333333 ${textCustomY}%)` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Alignment */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#888888" }}>
                        Alignment
                      </label>
                      <div className="flex gap-1.5">
                        {(["left", "center", "right"] as const).map((al) => (
                          <button
                            key={al}
                            onClick={() => setTextAlignment(al)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                            style={{
                              backgroundColor: textAlignment === al ? `${C.pink}20` : "#111111",
                              color: textAlignment === al ? C.pink : "#666666",
                              border: `1.5px solid ${textAlignment === al ? `${C.pink}40` : "#333333"}`,
                            }}
                          >
                            {al}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Apply / Reset Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={applyTextOverlay}
                        disabled={textApplying || !textOverlayText.trim()}
                        className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-30"
                        style={{
                          background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                          color: C.white,
                        }}
                      >
                        {textApplying ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C.white}44`, borderTopColor: C.white }} />
                            Applying...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Apply Text
                          </span>
                        )}
                      </button>
                      {textedImageUrl && (
                        <button
                          onClick={() => {
                            setTextedImageUrl(null);
                            // Also clear from cache
                            const cacheKey = `${currentSlide}-${viewingProblem ? "problem" : "solution"}`;
                            textedImageCacheRef.current.delete(cacheKey);
                            textContentCacheRef.current.delete(cacheKey);
                          }}
                          className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
                          style={{ backgroundColor: "#1A1A1A", color: "#EF4444", border: "1.5px solid rgba(220,38,38,0.4)" }}
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Quick text suggestions */}
                    {currentText && !textOverlayText && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#555555" }}>
                          Suggested text — tap to use
                        </label>
                        <button
                          onClick={() => setTextOverlayText(currentText)}
                          className="w-full px-3 py-2 rounded-xl text-xs text-left font-medium transition-all duration-200"
                          style={{
                            backgroundColor: "#111111",
                            color: "#AAAAAA",
                            border: "1px dashed #333333",
                          }}
                        >
                          {currentText}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Problem/Product Toggle Buttons */}
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
                Product
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

            {/* ─── Save to Library Button ─────────────────────────────── */}
            <button
              onClick={async () => {
                await saveToLibrary();
              }}
              disabled={savingToLibrary || savedToLibrary}
              className="w-full mt-5 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
              style={{
                backgroundColor: savedToLibrary ? `${C.green}20` : C.pink,
                color: savedToLibrary ? C.green : C.white,
                border: savedToLibrary ? `1.5px solid ${C.green}40` : "none",
                boxShadow: savedToLibrary ? "none" : `0 4px 20px ${C.pink}30`,
              }}
            >
              {savingToLibrary ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving to Library...
                </>
              ) : savedToLibrary ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Saved to Library
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save to Library
                </>
              )}
            </button>

            {/* Download All Button */}
            <button
              onClick={downloadAll}
              className="w-full mt-3 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all duration-300"
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

            {/* ─── TikTok Auto-Publish Controls ────────────────────────── */}
            <div
              className="mt-4 p-4 rounded-2xl"
              style={{
                backgroundColor: "rgba(228, 97, 173, 0.08)",
                border: "1.5px solid rgba(228, 97, 173, 0.25)",
              }}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7.5c-1.5 0-3-1-3-3 0-.5.1-1 .3-1.4-2.7-.4-5.5-.1-8 1C4 6 1.5 10.5 1.5 15.5c0 4 3 7.5 7 7.5 4.5 0 7-3.5 7-7 0-1.5-.5-3-1.5-4 .8.3 1.7.5 2.5.5 1.5 0 3-.5 4-1.5-.5-2-1.5-3.5-3.5-3.5z" stroke="#E461AD" strokeWidth="1.8" fill="none" />
                  </svg>
                  <div>
                    <div className="text-sm font-bold" style={{ color: C.white }}>
                      TikTok Auto-Publish
                    </div>
                    <div className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      Publish each slide as a TikTok photo carousel (2 images per post)
                    </div>
                  </div>
                </div>

                {/* Auto-publish toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
                    Auto-publish
                  </span>
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{
                      backgroundColor: autoPublishTikTok ? C.pink : "rgba(156, 163, 175, 0.3)",
                    }}
                    onClick={() => setAutoPublishTikTok(!autoPublishTikTok)}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{
                        transform: autoPublishTikTok ? "translateX(22px)" : "translateX(2px)",
                      }}
                    />
                  </div>
                </label>
              </div>

              {/* Publish All button */}
              <button
                onClick={handlePublishAllToTikTok}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${C.pink}, ${C.gold})`,
                  color: C.white,
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Publish All Slides to TikTok ({slides.filter(s => s.problemImageUrl && s.solutionImageUrl).length} ready)
                </span>
              </button>

              {/* Per-slide publish status */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {slides.map((s, i) => {
                  const state = publishStates[s.slide_number] || "idle";
                  const ready = !!(s.problemImageUrl && s.solutionImageUrl);
                  const colors = {
                    idle: ready ? C.pink : "rgba(156, 163, 175, 0.3)",
                    publishing: C.cyan,
                    published: C.green,
                    failed: C.red,
                  };
                  return (
                    <div
                      key={i}
                      className="px-2 py-1 rounded text-[9px] font-bold"
                      style={{
                        backgroundColor: `${colors[state]}20`,
                        color: colors[state],
                      }}
                      title={`Slide ${s.slide_number}: ${state}`}
                    >
                      {state === "publishing" ? "⏳" : state === "published" ? "✅" : state === "failed" ? "❌" : ready ? "⏸" : "⏳"} {s.slide_number}
                    </div>
                  );
                })}
              </div>
            </div>
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
              AI-Powered Problem/Product
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4 leading-tight" style={{ color: C.dark }}>
            AI Viral{" "}
            <span style={{ color: C.pink }}>Carousel</span>{" "}
            Machine
          </h1>

          <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: C.textMuted }}>
            Paste your product link, choose the number of slides, and let DeepSeek AI create stunning Problem/Product carousels — clean images, you add the text.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { num: "1", title: "Paste Link", desc: "Add your product URL", color: C.pink },
            { num: "2", title: "AI Analyzes", desc: "DeepSeek extracts features", color: C.gold },
            { num: "3", title: "Get Slides", desc: "Problem → Product images", color: "#22C55E" },
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

          {/* Product Image Upload */}
          <div className="flex items-center gap-2 mt-6 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.green}12` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text }}>
              Product Image <span style={{ color: C.textMuted }}>(for product slides)</span>
            </label>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              // Resize to max 1024px before base64 to keep payload small
              const img = new Image();
              img.onload = () => {
                const MAX = 1024;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                  if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                  else { w = Math.round(w * MAX / h); h = MAX; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                const result = canvas.toDataURL('image/png');
                setProductImageBase64(result);
                console.log(`[Carousel] Product image uploaded & resized to ${w}x${h} (${(result.length / 1024).toFixed(0)}KB base64)`);
              };
              img.src = URL.createObjectURL(file);
            }}
          />

          {/* Upload zone or preview */}
          {productImageBase64 ? (
            <div
              className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{ backgroundColor: `${C.green}06`, border: `1.5px solid ${C.green}30` }}
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={productImageBase64}
                alt="Product preview"
                className="w-16 h-16 rounded-xl object-cover"
                style={{ border: "2px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: C.green }}>Product image uploaded ✓</p>
                <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                  This image will be used as reference to place your product in the product slides
                </p>
                <p className="text-[10px] mt-1 font-semibold" style={{ color: C.pink }}>
                  Click to change image
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProductImageBase64(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-md"
              style={{
                backgroundColor: `${C.green}04`,
                border: `2px dashed ${C.green}30`,
                minHeight: "120px",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  const img = new Image();
                  img.onload = () => {
                    const MAX = 1024;
                    let w = img.width, h = img.height;
                    if (w > MAX || h > MAX) {
                      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                      else { w = Math.round(w * MAX / h); h = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    setProductImageBase64(canvas.toDataURL('image/png'));
                  };
                  img.src = URL.createObjectURL(file);
                }
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${C.green}12` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-xs font-bold" style={{ color: C.text }}>
                Upload your product image
              </p>
              <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                Click or drag & drop • PNG, JPG, WebP
              </p>
              <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                Optional: GPT Image will use it as reference to create product slides featuring your product
              </p>
            </div>
          )}

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
                {numSlides * 2} images total (problem + product per slide)
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
                "If you are..." style image showing the pain point. Dark tones, messy environment — no faces, no text on image. You add the text yourself!
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center pt-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            {/* Product */}
            <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px dashed rgba(34,197,94,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.15)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase" style={{ color: "#22C55E" }}>Product</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: C.textMuted }}>
                Your product front & center with "sorry if they sold out" text. Bright tones, clean setup — no faces, no text on image. Copy & paste the text yourself!
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
              title: "Problem / Product",
              desc: "\"If you are...\" then product + \"sorry if they sold out\" — proven viral format",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
              title: "Clean Images",
              desc: "No AI text or faces — you write text your way. Download 9:16 vertical for Instagram & TikTok",
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
