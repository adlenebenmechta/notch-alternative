"use client";

/**
 * THE WENOV8 STUDIO — persistent WebGL scene behind the homepage.
 *
 * A professional 3D production studio, driven by scroll:
 *   01 INTRO   — high wide establishing shot from the entrance
 *   02 WORK    — glide through the side monitor gallery
 *   03 SERVICES — deeper along the gallery, other side
 *   04 PROCESS — approach the curved video wall
 *   05 STUDIO  — front row of the wall, AI core overhead
 *   06 ABOUT   — crane up, look down over the studio
 *   07 CONTACT — slow pull-back, final wide
 *
 * The wall plays the real portfolio videos (progressive: posters first,
 * each video fades in once decoded). The camera travels a Catmull-Rom
 * spline damped for buttery, cinematic motion.
 */

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, useVideoTexture } from "@react-three/drei";
import { sceneState } from "./scene-state";

const INK = "#0a0b0e";
const SIGNAL = "#7dd3fc";
const FLOOR_Y = -2.3;

/* ─────────────────────────── camera path ─────────────────────────── */

/** Studio viewpoints: [position, lookAt] per chapter (7 total). */
const CAM_POS: [number, number, number][] = [
  [0, 1.9, 8], // 01 intro — corridor establishing shot
  [-2.3, 1.5, 4.2], // 02 work — enter gallery (left rail)
  [2.4, 1.6, -6], // 03 services — gallery right rail
  [0, 1.35, -15], // 04 process — approach the wall
  [0, 1.5, -22.5], // 05 studio — front row
  [0, 4.3, -18], // 06 about — crane high
  [0, 3.0, -6], // 07 contact — pull back
];
const CAM_LOOK: [number, number, number][] = [
  [0, 2.0, -30], // 01
  [2.6, 1.3, -14], // 02
  [-2.2, 1.4, -24], // 03
  [0, 1.9, -30], // 04
  [0, 2.5, -30.5], // 05
  [0, 1.1, -31], // 06
  [0, 2.0, -30], // 07
];

function CameraRig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(...CAM_POS[0]));
  const look = useRef(new THREE.Vector3(...CAM_LOOK[0]));
  const tp = useMemo(() => new THREE.Vector3(), []);
  const tl = useMemo(() => new THREE.Vector3(), []);

  const posCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        CAM_POS.map((p) => new THREE.Vector3(...p)),
        false,
        "catmullrom",
        0.6
      ),
    []
  );
  const lookCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        CAM_LOOK.map((p) => new THREE.Vector3(...p)),
        false,
        "catmullrom",
        0.6
      ),
    []
  );

  useFrame((_, dt) => {
    const rm = sceneState.reducedMotion;
    // 9 DOM sections map onto 7 chapters — clamp so the spline never extrapolates
    const m = Math.min(1, Math.max(0, sceneState.master));

    // spline targets for this scroll position
    posCurve.getPoint(m, tp);
    lookCurve.getPoint(m, tl);

    let tx = tp.x;
    let ty = tp.y;
    let tz = tp.z;
    let lx = tl.x;
    let ly = tl.y;
    let lz = tl.z;

    if (!rm && !sceneState.isMobile) {
      // gentle mouse parallax + idle breathing — the studio "listens"
      const t = performance.now() * 0.001;
      tx += sceneState.mouseX * 0.5 + Math.sin(t * 0.35) * 0.07;
      ty += -sceneState.mouseY * 0.26 + Math.cos(t * 0.3) * 0.045;
      lx += sceneState.mouseX * 0.22;
      ly += -sceneState.mouseY * 0.1;
    }

    const lam = 3.0; // damping lambda — smooth dolly
    pos.current.x = THREE.MathUtils.damp(pos.current.x, tx, lam, dt);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, ty, lam, dt);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, tz, lam, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, lx, lam, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, ly, lam, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, lz, lam, dt);

    camera.position.copy(pos.current);
    camera.lookAt(look.current);
  });
  return null;
}

/* ─────────────────────────── the video wall ─────────────────────────── */

type WallScreenDef = {
  id: string;
  video: string;
  poster: string;
  angle: number; // arc angle (radians)
};

const WALL_FOCUS = new THREE.Vector3(0, 1.7, -21);
const WALL_ARC_CENTER_Z = -37.6;
const WALL_ARC_R = 7.6;
const SCREEN_W = 2.1;
const SCREEN_H = 3.73; // 9:16
const SCREEN_Y = 1.72;

const WALL_SCREENS: WallScreenDef[] = [
  { id: "w1", video: "/videos/1.mp4", poster: "/posters/work-pov-hook.jpg", angle: -0.52 },
  { id: "w2", video: "/videos/2.mp4", poster: "/posters/work-ugc-testimonial.jpg", angle: -0.26 },
  { id: "w3", video: "/videos/3.mp4", poster: "/posters/work-product-story.jpg", angle: 0 },
  { id: "w4", video: "/videos/4.mp4", poster: "/posters/work-avatar-presenter.jpg", angle: 0.26 },
  { id: "w5", video: "/videos/5.mp4", poster: "/posters/work-podcast.jpg", angle: 0.52 },
];

const PROMO_BOARD = {
  video: "/videos/promo.mp4",
  poster: "/posters/hero-promo.jpg",
  pos: [0, 5.35, -33.8] as [number, number, number],
  size: [5.2, 2.925] as [number, number], // 16:9
};

/** Foreground screens flanking the corridor entrance — frame the hero shot. */
const FLANKERS = [
  { video: "/videos/2.mp4", poster: "/posters/work-ugc-testimonial.jpg", pos: [-4.2, 1.35, 0.5] as [number, number, number], rotY: 0.51 },
  { video: "/videos/4.mp4", poster: "/posters/work-avatar-presenter.jpg", pos: [4.2, 1.35, 0.5] as [number, number, number], rotY: -0.51 },
];
const FLANKER_SIZE: [number, number] = [1.7, 3.0];

function screenPlacement(angle: number) {
  const x = Math.sin(angle) * WALL_ARC_R;
  const z = WALL_ARC_CENTER_Z + Math.cos(angle) * WALL_ARC_R;
  const rotY = Math.atan2(WALL_FOCUS.x - x, WALL_FOCUS.z - z);
  return { pos: [x, SCREEN_Y, z] as [number, number, number], rotY };
}

/** Bezel + poster artwork — rendered instantly, before videos decode. */
function PosterScreen({
  src,
  position,
  rotationY = 0,
  size = [SCREEN_W, SCREEN_H],
  tiltX = 0,
  dim = 1,
}: {
  src: string;
  position: [number, number, number];
  rotationY?: number;
  size?: [number, number];
  tiltX?: number;
  dim?: number;
}) {
  const texture = useTexture(src);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);

  return (
    <group position={position} rotation={[tiltX, rotationY, 0]}>
      {/* dark bezel — recessed behind the artwork (no z-fighting) */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.04]} />
        <meshStandardMaterial color="#15161c" roughness={0.5} metalness={0.45} />
      </mesh>
      {/* artwork — glowing screen look, immune to fog */}
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial
          map={texture}
          color={new THREE.Color(0xd6d6da).multiplyScalar(dim)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

/** Guard: a failed video must never kill the whole scene. */
class VideoBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* video unavailable — poster stays */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Live video layer — fades in on top of the poster once decoded. */
function VideoLayer({
  src,
  position,
  rotationY = 0,
  size = [SCREEN_W, SCREEN_H],
  tiltX = 0,
}: {
  src: string;
  position: [number, number, number];
  rotationY?: number;
  size?: [number, number];
  tiltX?: number;
}) {
  const texture = useVideoTexture(src, {
    muted: true,
    loop: true,
    playsInline: true,
    start: true,
  });
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const born = useRef(0);

  // sit just in front of the poster plane along the screen normal
  const meshPos = useMemo(() => {
    const n = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(tiltX, rotationY, 0)
    );
    return new THREE.Vector3(...position).addScaledVector(n, 0.01);
  }, [position, rotationY, tiltX]);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);

  useFrame(({ clock }) => {
    if (born.current === 0) born.current = clock.elapsedTime;
    const a = Math.min(1, (clock.elapsedTime - born.current) / 0.9);
    if (mat.current) mat.current.opacity = a;
  });

  return (
    <mesh position={meshPos} rotation={[tiltX, rotationY, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        ref={mat}
        map={texture}
        transparent
        opacity={0}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

function VideoWall({ live }: { live: boolean }) {
  return (
    <group>
      {/* backing structure */}
      <mesh position={[0, 1.6, -36.6]}>
        <boxGeometry args={[15.5, 10.5, 0.3]} />
        <meshStandardMaterial color="#0c0d12" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* LED strip under the wall */}
      <mesh position={[0, FLOOR_Y + 0.06, -30.4]}>
        <boxGeometry args={[10.5, 0.035, 0.035]} />
        <meshBasicMaterial color={SIGNAL} toneMapped={false} fog={false} />
      </mesh>

      {/* the five vertical screens — posters resolve together */}
      <Suspense fallback={null}>
        {WALL_SCREENS.map((def) => {
          const { pos, rotY } = screenPlacement(def.angle);
          return (
            <PosterScreen key={def.id} src={def.poster} position={pos} rotationY={rotY} />
          );
        })}

        {/* wide promo board above */}
        <PosterScreen
          src={PROMO_BOARD.poster}
          position={PROMO_BOARD.pos}
          size={PROMO_BOARD.size}
          tiltX={0.1}
        />

        {/* ── floor reflection (posters only, dimmed) ── */}
        <group position={[0, 2 * FLOOR_Y, 0]} scale={[1, -1, 1]}>
          {WALL_SCREENS.map((def) => {
            const { pos, rotY } = screenPlacement(def.angle);
            return (
              <PosterScreen
                key={"r" + def.id}
                src={def.poster}
                position={pos}
                rotationY={rotY}
                dim={0.16}
              />
            );
          })}
          <PosterScreen
            src={PROMO_BOARD.poster}
            position={PROMO_BOARD.pos}
            size={PROMO_BOARD.size}
            tiltX={0.1}
            dim={0.14}
          />
        </group>
      </Suspense>

      {/* live video layers — each fades in independently */}
      {live &&
        WALL_SCREENS.map((def) => {
          const { pos, rotY } = screenPlacement(def.angle);
          return (
            <VideoBoundary key={"v" + def.id}>
              <Suspense fallback={null}>
                <VideoLayer src={def.video} position={pos} rotationY={rotY} />
              </Suspense>
            </VideoBoundary>
          );
        })}
      {live && (
        <VideoBoundary>
          <Suspense fallback={null}>
            <VideoLayer
              src={PROMO_BOARD.video}
              position={PROMO_BOARD.pos}
              size={PROMO_BOARD.size}
              tiltX={0.1}
            />
          </Suspense>
        </VideoBoundary>
      )}

      {/* ── foreground flankers — the corridor entrance ── */}
      {FLANKERS.map((f) => (
        <Suspense key={"fp" + f.video} fallback={null}>
          <PosterScreen
            src={f.poster}
            position={f.pos}
            rotationY={f.rotY}
            size={FLANKER_SIZE}
          />
        </Suspense>
      ))}
      {live &&
        FLANKERS.map((f) => (
          <VideoBoundary key={"fv" + f.video}>
            <Suspense fallback={null}>
              <VideoLayer
                src={f.video}
                position={f.pos}
                rotationY={f.rotY}
                size={FLANKER_SIZE}
              />
            </Suspense>
          </VideoBoundary>
        ))}
    </group>
  );
}

/* ─────────────────────────── gallery monitors ─────────────────────────── */

const GALLERY: { tex: string; side: 1 | -1; z: number; accent?: boolean }[] = [
  { tex: "/posters/work-product-story.jpg", side: -1, z: -3, accent: true },
  { tex: "/posters/work-ugc-testimonial.jpg", side: 1, z: -5 },
  { tex: "/posters/work-avatar-presenter.jpg", side: -1, z: -11 },
  { tex: "/posters/work-pov-hook.jpg", side: 1, z: -13, accent: true },
  { tex: "/posters/work-talking-head.jpg", side: -1, z: -19 },
  { tex: "/posters/work-broll.jpg", side: 1, z: -21 },
  { tex: "/posters/work-avatar-outdoor.jpg", side: -1, z: -25, accent: true },
  { tex: "/posters/work-podcast.jpg", side: 1, z: -27 },
];

function GalleryMonitors() {
  return (
    <group>
      {GALLERY.map((g, i) => {
        const x = g.side * 6.2;
        const rotY = g.side * -0.52; // angle toward the corridor
        const size: [number, number] = g.z < -18 ? [2.5, 1.41] : [1.45, 2.58];
        const y = size[1] / 2 + FLOOR_Y + 0.55 + (i % 2) * 0.35;
        return (
          <group key={i} position={[x, y, g.z]} rotation={[0, rotY, 0]}>
            {/* stand */}
            <mesh position={[0, -size[1] / 2 - 0.28, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.55, 8]} />
              <meshStandardMaterial color="#20222a" roughness={0.4} metalness={0.7} />
            </mesh>
            <mesh position={[0, -size[1] / 2 - 0.55, 0]}>
              <cylinderGeometry args={[0.22, 0.26, 0.03, 16]} />
              <meshStandardMaterial color="#171820" roughness={0.5} metalness={0.5} />
            </mesh>
            {/* bezel — recessed behind the artwork */}
            <mesh position={[0, 0, -0.03]}>
              <boxGeometry args={[size[0] + 0.08, size[1] + 0.08, 0.04]} />
              <meshStandardMaterial color="#15161c" roughness={0.5} metalness={0.45} />
            </mesh>
            {/* standby screen — GalleryArt renders at z=0, just in front */}
            <mesh position={[0, 0, -0.008]}>
              <planeGeometry args={size} />
              <meshBasicMaterial color="#20242e" toneMapped={false} />
            </mesh>
            {/* signal-blue edge for selected monitors */}
            {g.accent && (
              <mesh position={[0, size[1] / 2 + 0.06, -0.02]}>
                <boxGeometry args={[size[0] + 0.1, 0.03, 0.05]} />
                <meshBasicMaterial color={SIGNAL} toneMapped={false} fog={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Fill gallery artwork via useTexture (suspends once for all). */
function GalleryArt() {
  const textures = useTexture(GALLERY.map((g) => g.tex));
  useEffect(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
  }, [textures]);

  return (
    <group>
      {GALLERY.map((g, i) => {
        const x = g.side * 6.2;
        const rotY = g.side * -0.52;
        const size: [number, number] = g.z < -18 ? [2.5, 1.41] : [1.45, 2.58];
        const y = size[1] / 2 + FLOOR_Y + 0.55 + (i % 2) * 0.35;
        return (
          <mesh key={i} position={[x, y, g.z]} rotation={[0, rotY, 0]}>
            <planeGeometry args={size} />
            <meshBasicMaterial map={textures[i]} color="#d6d6da" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ─────────────────────────── studio camera rig ─────────────────────────── */

/** Professional studio camera on a tripod — slowly pans across the set. */
function StudioCameraRig() {
  const pan = useRef<THREE.Group>(null);
  const rec = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pan.current) {
      pan.current.rotation.y = Math.sin(t * 0.24) * 0.55;
      pan.current.rotation.x = Math.sin(t * 0.17) * 0.06;
    }
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.4) * 0.015;
    }
    if (rec.current) {
      const mat = rec.current.material as THREE.MeshBasicMaterial;
      const blink = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.4)), 6);
      mat.color.set(SIGNAL).multiplyScalar(blink);
    }
  });

  const metal = <meshStandardMaterial color="#262832" roughness={0.32} metalness={0.85} />;

  return (
    <group ref={group} position={[-3.4, 0, -13]} rotation={[0, 0.34, 0]}>
      {/* tripod legs */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const len = 1.55;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.42, -len / 2 - 0.06, Math.cos(a) * 0.42]}
            rotation={[Math.cos(a) * 0.42, -a, Math.sin(a) * 0.42]}
          >
            <cylinderGeometry args={[0.022, 0.03, len, 8]} />
            {metal}
          </mesh>
        );
      })}
      {/* head */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.09, 16]} />
        {metal}
      </mesh>

      {/* panning body */}
      <group ref={pan} position={[0, 0.16, 0]}>
        {/* body */}
        <mesh>
          <boxGeometry args={[0.46, 0.3, 0.62]} />
          <meshStandardMaterial color="#1b1d24" roughness={0.42} metalness={0.6} />
        </mesh>
        {/* top handle */}
        <mesh position={[0, 0.2, -0.05]}>
          <torusGeometry args={[0.1, 0.018, 8, 20, Math.PI]} />
          {metal}
        </mesh>
        {/* lens barrel — pointing toward the video wall (-z) */}
        <mesh position={[0, 0, -0.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.095, 0.115, 0.34, 24]} />
          <meshStandardMaterial color="#101218" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* lens glass */}
        <mesh position={[0, 0, -0.64]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.02, 24]} />
          <meshBasicMaterial color="#25384d" toneMapped={false} />
        </mesh>
        {/* matte box */}
        <mesh position={[0, 0.02, -0.74]}>
          <boxGeometry args={[0.3, 0.26, 0.14]} />
          <meshStandardMaterial color="#0d0e13" roughness={0.55} metalness={0.4} />
        </mesh>
        {/* REC light */}
        <mesh ref={rec} position={[0.16, 0.17, 0.22]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshBasicMaterial color={SIGNAL} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ─────────────────────────── pixel particles ─────────────────────────── */

const CORE_POS = new THREE.Vector3(0, 4.7, -29.2);

function smoothstep(t: number) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

function PixelParticles() {
  const count = sceneState.isMobile ? 220 : 480;
  const mesh = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3().randomDirection();
      arr.push({
        base: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          -1.6 + Math.random() * 8.5,
          10 - Math.random() * 52
        ),
        size: 0.03 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.6,
        orbit: 1.2 + Math.random() * 1.15,
        dir,
        signal: Math.random() < 0.12,
      });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    data.forEach((d, i) => {
      c.set(d.signal ? SIGNAL : "#8b93a4");
      m.setColorAt(i, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  const M = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const rm = sceneState.reducedMotion;

    // convergence window: chapter 05 (studio) — master ∈ [4/7, 5/7]
    const c05 = 4 / 7;
    const c06 = 5 / 7;
    const into = smoothstep((sceneState.master - (c05 - 0.015)) / 0.05);
    const out = smoothstep((sceneState.master - (c06 - 0.03)) / 0.04);
    const conv = rm ? 0.85 : into * (1 - out);

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const dx = Math.sin(t * d.speed + d.phase) * 0.32;
      const dy = Math.cos(t * d.speed * 0.8 + d.phase * 1.3) * 0.28;
      const dz = Math.sin(t * d.speed * 0.6 + d.phase * 0.7) * 0.32;

      const ang = t * 0.5 + d.phase;
      const core = CORE_POS.clone().add(
        d.dir.clone().multiplyScalar(d.orbit + Math.sin(ang) * 0.15)
      );
      core.x += Math.cos(ang * 1.2) * 0.25;
      core.y += Math.sin(ang * 0.9) * 0.2;

      p.set(
        THREE.MathUtils.lerp(d.base.x + dx, core.x, conv),
        THREE.MathUtils.lerp(d.base.y + dy, core.y, conv),
        THREE.MathUtils.lerp(d.base.z + dz, core.z, conv)
      );
      s.setScalar(d.size * (1 - 0.35 * conv));
      M.compose(p, q, s);
      m.setMatrixAt(i, M);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      key={count}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ─────────────────────────── AI core ─────────────────────────── */

function AICore() {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (outer.current) {
      outer.current.rotation.y = t * 0.16;
      outer.current.rotation.x = Math.sin(t * 0.22) * 0.2;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.24) * 0.18;
    }
    const pulse = 0.9 + Math.sin(t * 1.3) * 0.12;
    if (inner.current) inner.current.scale.setScalar(pulse);
    if (light.current) light.current.intensity = 9 + Math.sin(t * 1.3) * 3;
  });

  return (
    <group position={CORE_POS.toArray()}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial color={SIGNAL} wireframe transparent opacity={0.5} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshBasicMaterial color={SIGNAL} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[1.3, 0.016, 8, 64]} />
        <meshBasicMaterial color={SIGNAL} transparent opacity={0.7} toneMapped={false} fog={false} />
      </mesh>
      <pointLight ref={light} color={SIGNAL} intensity={9} distance={18} decay={2} />
    </group>
  );
}

/* ─────────────────────────── studio lighting ─────────────────────────── */

/** Overhead softbox grid — emissive panels with a gentle sway. */
function SoftboxGrid() {
  const group = useRef<THREE.Group>(null);

  const panels = useMemo(() => {
    const arr: { pos: [number, number, number] }[] = [];
    for (const z of [3, -9, -21, -30]) {
      for (const x of [-5.5, -1.8, 1.8, 5.5]) {
        arr.push({ pos: [x, 4.7, z] });
      }
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.position.y = 4.7 + Math.sin(t * 0.5 + i * 1.3) * 0.03;
      child.rotation.z = Math.sin(t * 0.3 + i) * 0.012;
    });
  });

  return (
    <group ref={group}>
      {panels.map((p, i) => (
        <group key={i} position={p.pos}>
          {/* housing */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[1.15, 0.07, 0.62]} />
            <meshStandardMaterial color="#101116" roughness={0.6} metalness={0.4} />
          </mesh>
          {/* emissive face */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.02, 0.52]} />
            <meshBasicMaterial color="#f2ede1" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Volumetric-ish light cone. */
function LightCone({ z, x = 0 }: { z: number; x?: number }) {
  return (
    <group position={[x, 3.6, z]}>
      <mesh rotation={[0, 0, 0.05]}>
        <boxGeometry args={[2.4, 0.05, 0.05]} />
        <meshBasicMaterial color="#f2ede1" toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.7, 0]}>
        <coneGeometry args={[1.55, 3.3, 4, 1, true]} />
        <meshBasicMaterial
          color="#fff2d8"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** Subtle grid floor — cheap canvas texture sells the depth. */
function GridFloor() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 127, 127);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 44);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, -22]}>
      <planeGeometry args={[64, 90]} />
      <meshBasicMaterial map={texture} transparent opacity={0.15} color="#9fb2c8" />
    </mesh>
  );
}

/** LED floor strips along both walls — the studio runway. */
function FloorLedStrips() {
  return (
    <group>
      {[-6.9, 6.9].map((x) => (
        <mesh key={x} position={[x, FLOOR_Y + 0.02, -12]}>
          <boxGeometry args={[0.045, 0.02, 42]} />
          <meshBasicMaterial color={SIGNAL} toneMapped={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Far backdrop — soft radial glow so the corridor has an "end". */
function Backdrop() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(256, 128, 10, 256, 128, 250);
    g.addColorStop(0, "rgba(125,211,252,0.10)");
    g.addColorStop(0.35, "rgba(42,50,66,0.18)");
    g.addColorStop(1, "rgba(10,11,14,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh position={[0, 1.5, -55]}>
      <planeGeometry args={[110, 55]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} fog={false} />
    </mesh>
  );
}

/* ─────────────────────────── scene root ─────────────────────────── */

function SceneContent({ live }: { live: boolean }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 7, 9]} intensity={1.5} color="#eef3fa" />
      <directionalLight position={[-6, 5, -30]} intensity={0.75} color="#a8c4e8" />
      <pointLight position={[0, 3.4, -18]} intensity={5} distance={26} color="#8a94a8" />

      <GridFloor />
      <FloorLedStrips />
      <Backdrop />
      <Suspense fallback={null}>
        <GalleryArt />
      </Suspense>
      <GalleryMonitors />
      <VideoWall live={live} />
      <StudioCameraRig />
      <PixelParticles />
      <AICore />
      <SoftboxGrid />
      <LightCone z={-5} x={-3} />
      <LightCone z={-16} x={3} />
      <LightCone z={-26} x={-3} />
    </>
  );
}

export default function CinematicScene() {
  // one-time capability check: live video only on capable desktop clients
  const live = useMemo(
    () =>
      typeof window !== "undefined" &&
      !sceneState.isMobile &&
      !sceneState.reducedMotion,
    []
  );

  // signal the DOM side that the WebGL layer is live (hero fallback fades)
  useEffect(() => {
    document.body.classList.add("w8-scene-on");
    return () => document.body.classList.remove("w8-scene-on");
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      data-scene-root
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 55, near: 0.1, far: 140, position: CAM_POS[0] }}
      >
        <color attach="background" args={[INK]} />
        <fog attach="fog" args={[INK, 16, 88]} />
        <Suspense fallback={null}>
          <CameraRig />
          <SceneContent live={live} />
        </Suspense>
      </Canvas>
    </div>
  );
}
