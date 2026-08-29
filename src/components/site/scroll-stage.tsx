"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useSpring } from "framer-motion";
import { sceneState, CHAPTER_IDS } from "./scene/scene-state";
import { PixelIntro } from "./pixel/pixel-intro";
import { PixelCursor } from "./pixel/pixel-cursor";
import { ChapterNav } from "./pixel/chapter-nav";
import { Atmosphere } from "./pixel/atmosphere";

const CinematicScene = dynamic(() => import("./scene/CinematicScene"), {
  ssr: false,
});

/** WebGL failure → the site remains fully usable (canvas simply absent). */
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* WebGL unavailable — gracefully degrade */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const smooth = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
};

/**
 * ScrollStage — orchestrates the cinematic journey:
 * scroll → chapter detection → shared scene state (camera, particles),
 * chapter nav, pixel cursor, atmosphere + progress hairline.
 * All page content renders as normal, crawlable DOM above the canvas.
 */
export function ScrollStage({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const activeRef = useRef(0);

  // one-time flags for the scene
  useEffect(() => {
    sceneState.isMobile = window.matchMedia("(max-width: 768px)").matches;
    sceneState.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // mount the WebGL scene after first paint so content paints instantly
    const t = window.setTimeout(() => setSceneReady(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  // scroll → chapter progress
  useEffect(() => {
    let raf = 0;
    let queued = false;

    const compute = () => {
      queued = false;
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chapter]")
      );
      if (!sections.length) return;
      const vh = window.innerHeight;
      const mid = window.scrollY + vh * 0.5;
      let idx = 0;
      let local = 0;
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const top = s.getBoundingClientRect().top + window.scrollY;
        const bottom = top + s.offsetHeight;
        if (mid >= top && mid < bottom) {
          idx = i;
          local = (mid - top) / Math.max(1, s.offsetHeight);
          break;
        }
        if (i === sections.length - 1 && mid >= bottom) {
          idx = i;
          local = 1;
        }
      }
      sceneState.master = (idx + smooth(local)) / CHAPTER_IDS.length;
      sceneState.activeChapter = idx;
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const onScroll = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(compute);
      }
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // pointer parallax (desktop)
  useEffect(() => {
    if (sceneState.isMobile || sceneState.reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      sceneState.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const jump = (i: number) => {
    const sections = document.querySelectorAll<HTMLElement>("[data-chapter]");
    sections[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <PixelIntro />
      {sceneReady && (
        <SceneBoundary>
          <CinematicScene />
        </SceneBoundary>
      )}
      <ChapterNav active={active} onJump={jump} />
      <PixelCursor />
      <Atmosphere />
      <ProgressHairline />
      <div className="relative z-10">{children}</div>
    </>
  );
}

function ProgressHairline() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left"
      style={{ scaleX, background: "linear-gradient(to right, #2563eb, #7dd3fc)" }}
    />
  );
}
