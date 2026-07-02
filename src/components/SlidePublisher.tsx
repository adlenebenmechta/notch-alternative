"use client";

import React, { useState, useEffect } from "react";

// ─── Colors (matching existing design) ─────────────────────────────────────

const C = {
  pink: "#E461AD",
  gold: "#C9A96E",
  cyan: "#16B1DE",
  dark: "#0A0A0A",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  white: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface SlidePublisherProps {
  slideNumber: number;
  problemImageUrl: string | null;
  solutionImageUrl: string | null;
  /** Pre-rendered image URLs with text overlay (data URLs or HTTP URLs) */
  textedProblemUrl?: string | null;
  textedSolutionUrl?: string | null;
  /** Text to overlay if texted URLs are not available yet */
  problemText?: string | null;
  solutionText?: string | null;
  carouselTitle: string;
  autoPublish: boolean;
  onPublishStateChange?: (slideNumber: number, state: PublishState) => void;
  /** Optional authFetch for calling add-text API */
  authFetch?: (url: string, options?: RequestInit) => Promise<Response>;
}

type PublishState = "idle" | "publishing" | "published" | "failed";

// ─── Upload a base64 data URL to get a persistent HTTP URL ────────────────
async function uploadDataUrlToPersistent(dataUrl: string): Promise<string> {
  // If it's already an HTTP URL, return as-is
  if (dataUrl.startsWith("http")) return dataUrl;

  // Convert data URL to a File and upload via /api/upload-avatar
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], `texted_${Date.now()}.png`, { type: "image/png" });

  const formData = new FormData();
  formData.append("avatar", file);

  const uploadRes = await fetch("/api/upload-avatar", {
    method: "POST",
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success || !uploadData.avatarUrl) {
    throw new Error("Failed to upload texted image: " + (uploadData.error || "unknown"));
  }

  return uploadData.avatarUrl;
}

// ─── Apply text overlay via server API ────────────────────────────────────
async function applyTextOverlay(
  imageUrl: string,
  text: string,
  authFetchFn?: (url: string, options?: RequestInit) => Promise<Response>
): Promise<string | null> {
  const fetchFn = authFetchFn || fetch.bind(window);
  try {
    const res = await fetchFn("/api/carousel/add-text", {
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
      if (data.image) return data.image;
    }
  } catch (e) {
    console.warn("[SlidePublisher] applyTextOverlay failed:", e);
  }
  return null;
}

// ─── SlidePublisher Component ──────────────────────────────────────────────

export default function SlidePublisher({
  slideNumber,
  problemImageUrl,
  solutionImageUrl,
  textedProblemUrl,
  textedSolutionUrl,
  problemText,
  solutionText,
  carouselTitle,
  autoPublish,
  onPublishStateChange,
  authFetch: authFetchProp,
}: SlidePublisherProps) {
  const [state, setState] = useState<PublishState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState<string | null>(null);
  const [hasAutoPublished, setHasAutoPublished] = useState(false);

  // Both images ready?
  const bothReady = !!(problemImageUrl && solutionImageUrl);

  // Auto-publish when both images are ready (only once per slide)
  useEffect(() => {
    if (autoPublish && bothReady && !hasAutoPublished && state === "idle") {
      setHasAutoPublished(true);
      handlePublish();
    }
  }, [autoPublish, bothReady, hasAutoPublished, state]);

  // Notify parent of state changes
  useEffect(() => {
    onPublishStateChange?.(slideNumber, state);
  }, [state, slideNumber, onPublishStateChange]);

  const handlePublish = async () => {
    if (!bothReady) {
      setErrorMsg("Both images must be generated first");
      return;
    }

    setState("publishing");
    setErrorMsg(null);

    try {
      // Determine the images to publish — prefer texted versions
      let problemUrl = textedProblemUrl || problemImageUrl!;
      let solutionUrl = textedSolutionUrl || solutionImageUrl!;

      // If no texted version exists but we have text, generate it now
      if (!textedProblemUrl && problemText && problemImageUrl) {
        const texted = await applyTextOverlay(problemImageUrl, problemText, authFetchProp);
        if (texted) problemUrl = texted;
      }
      if (!textedSolutionUrl && solutionText && solutionImageUrl) {
        const texted = await applyTextOverlay(solutionImageUrl, solutionText, authFetchProp);
        if (texted) solutionUrl = texted;
      }

      // If texted images are data URLs (base64), upload them to get persistent HTTP URLs
      // The TikTok publish API requires HTTP URLs
      if (problemUrl.startsWith("data:")) {
        try {
          problemUrl = await uploadDataUrlToPersistent(problemUrl);
        } catch (e) {
          console.warn("[SlidePublisher] Failed to upload texted problem image, using original:", e);
          problemUrl = problemImageUrl!;
        }
      }
      if (solutionUrl.startsWith("data:")) {
        try {
          solutionUrl = await uploadDataUrlToPersistent(solutionUrl);
        } catch (e) {
          console.warn("[SlidePublisher] Failed to upload texted solution image, using original:", e);
          solutionUrl = solutionImageUrl!;
        }
      }

      const response = await fetch("/api/autopublish/publish-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: [problemUrl, solutionUrl],
          caption: `${carouselTitle} - Slide ${slideNumber} 🔥`,
          hashtags: ["fyp", "viral", "carousel", "ai", "tiktok"],
          aiDescription: `Carousel slide ${slideNumber} for ${carouselTitle}`,
          externalId: `carousel_${slideNumber}_${Date.now()}`,
          autoCaption: false,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setState("failed");
        setErrorMsg(data.error);
        return;
      }

      setPostId(data.postId);
      // Don't immediately set to "published" - Blotato processes async
      // We'll consider it published once we get a successful response
      // The actual TikTok URL comes later via polling
      setState("published");
    } catch (err: any) {
      setState("failed");
      setErrorMsg(err.message || "Failed to publish");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!bothReady) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold opacity-50"
        style={{
          backgroundColor: "rgba(107, 114, 128, 0.1)",
          color: C.textMuted,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Waiting for images...
      </div>
    );
  }

  if (state === "publishing") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold"
        style={{
          backgroundColor: "rgba(22, 177, 222, 0.15)",
          color: C.cyan,
        }}
      >
        <div
          className="w-3 h-3 rounded-full border-2 animate-spin"
          style={{ borderColor: `${C.cyan}30`, borderTopColor: C.cyan }}
        />
        Publishing to TikTok...
      </div>
    );
  }

  if (state === "published") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold"
        style={{
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          color: C.success,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Published to TikTok
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline hover:opacity-70"
          >
            View ↗
          </a>
        )}
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            color: C.error,
          }}
          title={errorMsg || "Failed"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Failed
        </div>
        <button
          onClick={handlePublish}
          className="px-2 py-1 rounded text-[10px] font-bold hover:opacity-70"
          style={{ backgroundColor: C.error, color: C.white }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Idle state - show publish button
  return (
    <button
      onClick={handlePublish}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
      style={{
        backgroundColor: C.pink,
        color: C.white,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M19 7.5c-1.5 0-3-1-3-3 0-.5.1-1 .3-1.4-2.7-.4-5.5-.1-8 1C4 6 1.5 10.5 1.5 15.5c0 4 3 7.5 7 7.5 4.5 0 7-3.5 7-7 0-1.5-.5-3-1.5-4 .8.3 1.7.5 2.5.5 1.5 0 3-.5 4-1.5-.5-2-1.5-3.5-3.5-3.5z" stroke="currentColor" strokeWidth="1.8" fill="none" />
      </svg>
      Publish to TikTok
    </button>
  );
}
