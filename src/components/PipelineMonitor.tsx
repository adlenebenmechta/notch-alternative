"use client";

import React, { useState, useEffect } from "react";

const C = {
  pink: "#FF2E88",
  gold: "#C9A96E",
  cyan: "#16B1DE",
  dark: "#0A0A0A",
  text: "#1A1A2E",
  textMuted: "#6B7280",
  white: "#FFFFFF",
  cream: "#FFF8F0",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

interface PipelineStep {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "active" | "done" | "failed";
  timestamp?: string;
  message?: string;
}

interface PipelineMonitorProps {
  postId: string;
  onClose: () => void;
}

export default function PipelineMonitor({ postId, onClose }: PipelineMonitorProps) {
  const [post, setPost] = useState<any>(null);
  const [postpeerStatus, setPostpeerStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/autopublish/status?postId=${postId}`);
        const data = await res.json();
        if (data.post) {
          setPost(data.post);
          setPostpeerStatus(data.postpeerStatus);
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Pipeline fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Poll every 5 seconds while in-progress
    interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [postId]);

  // Stop polling when published or failed
  useEffect(() => {
    if (post?.status === "PUBLISHED" || post?.status === "FAILED") {
      // Already done - polling continues but won't change
    }
  }, [post?.status]);

  // Build pipeline steps based on status
  const getSteps = (): PipelineStep[] => {
    const steps: PipelineStep[] = [
      {
        id: "created",
        label: "Post Created",
        icon: "📝",
        status: "done",
        timestamp: post?.createdAt,
      },
    ];

    // Step 2: Sent to PostPeer
    if (post?.postpeerPostId) {
      steps.push({
        id: "postpeer",
        label: "Sent to PostPeer",
        icon: "📤",
        status: "done",
        message: `Submission ID: ${post.postpeerPostId.substring(0, 8)}...`,
      });
    } else if (post?.status === "PUBLISHING") {
      steps.push({
        id: "postpeer",
        label: "Sending to PostPeer...",
        icon: "📤",
        status: "active",
      });
    } else if (post?.status === "FAILED" && !post?.postpeerPostId) {
      steps.push({
        id: "postpeer",
        label: "Failed to send to PostPeer",
        icon: "❌",
        status: "failed",
        message: post?.errorMessage,
      });
    } else {
      steps.push({
        id: "postpeer",
        label: "Send to PostPeer",
        icon: "📤",
        status: "pending",
      });
    }

    // Step 3: PostPeer processing
    if (postpeerStatus?.status === "in-progress") {
      steps.push({
        id: "processing",
        label: "PostPeer Publishing to TikTok...",
        icon: "⏳",
        status: "active",
        message: "PostPeer is uploading your post to TikTok (takes 1-5 minutes)",
      });
    } else if (postpeerStatus?.status === "published" || post?.status === "PUBLISHED") {
      steps.push({
        id: "processing",
        label: "Published on TikTok",
        icon: "✅",
        status: "done",
        message: "Your post is live!",
      });
    } else if (postpeerStatus?.status === "failed" || post?.status === "FAILED") {
      steps.push({
        id: "processing",
        label: "Publishing Failed",
        icon: "❌",
        status: "failed",
        message: postpeerStatus?.error || post?.errorMessage,
      });
    } else if (post?.postpeerPostId) {
      steps.push({
        id: "processing",
        label: "Waiting for PostPeer",
        icon: "⏳",
        status: "pending",
      });
    } else {
      steps.push({
        id: "processing",
        label: "Publish to TikTok",
        icon: "📱",
        status: "pending",
      });
    }

    // Step 4: Live on TikTok
    if (post?.status === "PUBLISHED" || postpeerStatus?.status === "published") {
      steps.push({
        id: "live",
        label: "Live on TikTok",
        icon: "🎉",
        status: "done",
        message: post?.tiktokUrl || postpeerStatus?.url,
      });
    } else {
      steps.push({
        id: "live",
        label: "Live on TikTok",
        icon: "🎉",
        status: "pending",
      });
    }

    return steps;
  };

  const steps = getSteps();
  const isActive = post?.status === "PENDING" || post?.status === "PUBLISHING" || postpeerStatus?.status === "in-progress";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: C.white }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${C.cream}` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{isActive ? "⏳" : post?.status === "PUBLISHED" ? "🎉" : "❌"}</span>
            <h3 className="font-bold text-sm" style={{ color: C.text }}>
              Publish Pipeline
            </h3>
            {isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ backgroundColor: `${C.warning}20`, color: C.warning }}>
                LIVE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100"
            style={{ color: C.textMuted }}
          >
            ✕
          </button>
        </div>

        {/* Account info */}
        {post?.account && (
          <div className="px-4 py-2" style={{ backgroundColor: C.cream, borderBottom: `1px solid ${C.cream}` }}>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>
              Publishing to
            </div>
            <div className="text-sm font-semibold" style={{ color: C.text }}>
              @{post.account.username || post.account.displayName}
            </div>
          </div>
        )}

        {/* Pipeline steps */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3">
                {/* Step number/icon */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{
                      backgroundColor:
                        step.status === "done" ? `${C.success}20` :
                        step.status === "active" ? `${C.warning}20` :
                        step.status === "failed" ? `${C.error}20` :
                        `${C.textMuted}10`,
                    }}
                  >
                    {step.status === "active" ? (
                      <div
                        className="w-4 h-4 rounded-full border-2 animate-spin"
                        style={{ borderColor: `${C.warning}30`, borderTopColor: C.warning }}
                      />
                    ) : step.status === "done" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : step.status === "failed" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M6 18L18 6" stroke={C.error} strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <span style={{ opacity: 0.4 }}>{step.icon}</span>
                    )}
                  </div>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div
                      className="w-0.5 h-8 mt-1"
                      style={{
                        backgroundColor:
                          step.status === "done" ? C.success :
                          step.status === "active" ? `${C.warning}40` :
                          `${C.textMuted}20`,
                      }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1.5">
                  <div
                    className="text-xs font-bold"
                    style={{
                      color:
                        step.status === "done" ? C.success :
                        step.status === "active" ? C.warning :
                        step.status === "failed" ? C.error :
                        C.textMuted,
                    }}
                  >
                    {step.label}
                  </div>
                  {step.message && (
                    <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                      {step.id === "live" && step.message ? (
                        <a
                          href={step.message}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline break-all"
                        >
                          {step.message}
                        </a>
                      ) : (
                        step.message
                      )}
                    </div>
                  )}
                  {step.timestamp && (
                    <div className="text-[9px] mt-0.5" style={{ color: C.textMuted }}>
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Logs section */}
          {logs.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.cream}` }}>
              <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: C.textMuted }}>
                Activity Log
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {logs.slice().reverse().map((log, i) => (
                  <div
                    key={i}
                    className="text-[9px] font-mono p-1.5 rounded"
                    style={{
                      backgroundColor:
                        log.level === "ERROR" ? `${C.error}10` :
                        log.level === "WARN" ? `${C.warning}10` :
                        `${C.cream}`,
                      color:
                        log.level === "ERROR" ? C.error :
                        log.level === "WARN" ? C.warning :
                        C.textMuted,
                    }}
                  >
                    <span className="opacity-60">[{new Date(log.createdAt).toLocaleTimeString()}]</span>{" "}
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {post?.status === "PUBLISHED" && (
          <div
            className="p-3 flex items-center justify-between"
            style={{ backgroundColor: `${C.success}10`, borderTop: `1px solid ${C.success}30` }}
          >
            <span className="text-xs font-bold" style={{ color: C.success }}>
              ✅ Successfully published!
            </span>
            {post?.tiktokUrl && (
              <a
                href={post.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ backgroundColor: C.success, color: C.white }}
              >
                View on TikTok ↗
              </a>
            )}
          </div>
        )}
        {post?.status === "FAILED" && (
          <div
            className="p-3"
            style={{ backgroundColor: `${C.error}10`, borderTop: `1px solid ${C.error}30` }}
          >
            <span className="text-xs font-bold" style={{ color: C.error }}>
              ❌ {post?.errorMessage || "Publishing failed"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
