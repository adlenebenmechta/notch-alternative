"use client";

/**
 * THE CREATIVE MACHINE — persistent WebGL scene behind the homepage.
 *
 * A fixed full-screen canvas travelling through one continuous corridor:
 *   01 INTRO → voxel camera + wordmark zone
 *   02 WORK   → floating portfolio frames
 *   03 SERVICES → wider frames + light bars
 *   04 PROCESS → storyboard corridor
 *   05 STUDIO  → pixel particles converge into the AI core
 *   06 ABOUT   → calm high pull-back
 *   07 CONTACT → quiet wide ending shot
 *
 * The camera is driven by `sceneState.master` (page scroll), damped for
 * cinematic smoothness. Pixel particles converge during chapter 05.
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { sceneState } from "./scene-state";

const INK = "#0a0a0b";
const LIME = "#c6f135";
const BONE = "#f4f3ee";

/* ─────────────────────────── camera path ─────────────────────────── */

type KF = { pos: [number, number, number]; look: [number, number, number] };

const KFS: KF[] = [
  { pos: [0, 0.9, 15], look: [0, 0.6, 0] }, // 01 intro — machine awakens
  { pos: [0, 0.45, 5], look: [0, 0.25, -12] }, // 02 work — enter gallery
  { pos: [1.7, 1.15, -11], look: [-0.9, 0.45, -26] }, // 03 services
  { pos: [-1.5, 0.8, -24], look: [0, 0.55, -40] }, // 04 process corridor
  { pos: [0, 0.6, -37], look: [0, 0.45, -50] }, // 05 studio — approach core
  { pos: [0, 2.5, -45], look: [0, 0.3, -56] }, // 06 about — calm + high
  { pos: [0, 3.7, -51], look: [0, 0.45, -62] }, // 07 contact — wide ending
];

const CORE_POS = new THREE.Vector3(0, 0.45, -50);

function smoothstep(t: number) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

function CameraRig() {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(...KFS[0].pos));
  const look = useRef(new THREE.Vector3(...KFS[0].look));

  useFrame((_, dt) => {
    const rm = sceneState.reducedMotion;
    const m = sceneState.master * (KFS.length - 1); // 0..6
    const seg = Math.min(KFS.length - 2, Math.floor(m));
    const local = smoothstep(m - seg);
    const a = KFS[seg];
    const b = KFS[seg + 1];

    let tx = THREE.MathUtils.lerp(a.pos[0], b.pos[0], local);
    let ty = THREE.MathUtils.lerp(a.pos[1], b.pos[1], local);
    let tz = THREE.MathUtils.lerp(a.pos[2], b.pos[2], local);
    let lx = THREE.MathUtils.lerp(a.look[0], b.look[0], local);
    let ly = THREE.MathUtils.lerp(a.look[1], b.look[1], local);
    let lz = THREE.MathUtils.lerp(a.look[2], b.look[2], local);

    if (!rm && !sceneState.isMobile) {
      // gentle mouse parallax — the scene "listens"
      const t = performance.now() * 0.001;
      tx += sceneState.mouseX * 0.55 + Math.sin(t * 0.4) * 0.08;
      ty += -sceneState.mouseY * 0.28 + Math.cos(t * 0.32) * 0.05;
      lx += sceneState.mouseX * 0.2;
    }

    const lam = 3.2; // damping lambda
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

/* ─────────────────────────── floating frames ─────────────────────────── */

type FrameDef = {
  tex: string;
  pos: [number, number, number];
  size: [number, number];
  rotY: number;
  lime?: boolean;
};

const FRAMES: FrameDef[] = [
  // ── chapter 02 · WORK — vertical social frames + one wide ──
  { tex: "/posters/work-product-story.jpg", pos: [-5.2, 1.4, -1], size: [1.3, 2.3], rotY: 0.22 },
  { tex: "/posters/work-ugc-testimonial.jpg", pos: [5.0, 0.8, -3.5], size: [1.2, 2.1], rotY: -0.18 },
  { tex: "/posters/work-podcast.jpg", pos: [-6.0, 0.2, -7], size: [1.5, 2.6], rotY: 0.3, lime: true },
  { tex: "/posters/work-pov-hook.jpg", pos: [4.6, 2.0, -9], size: [1.1, 1.95], rotY: -0.25 },
  { tex: "/posters/hero-promo.jpg", pos: [-3.4, 1.0, -13], size: [2.6, 1.46], rotY: 0.5 },
  { tex: "/posters/work-avatar-presenter.jpg", pos: [5.6, 0.6, -14], size: [1.35, 2.4], rotY: -0.3 },
  // ── chapter 03 · SERVICES ──
  { tex: "/posters/work-broll.jpg", pos: [5.4, 1.6, -20], size: [2.4, 1.35], rotY: -0.35 },
  { tex: "/posters/work-avatar-outdoor.jpg", pos: [-5.6, 0.4, -23], size: [1.3, 2.3], rotY: 0.28, lime: true },
  { tex: "/posters/work-talking-head.jpg", pos: [4.8, 2.2, -27], size: [2.2, 1.24], rotY: -0.4 },
  // ── chapter 04 · PROCESS — storyboard corridor ──
  { tex: "/posters/work-pov-hook.jpg", pos: [-4.6, 1.8, -33], size: [1.5, 1.13], rotY: 0.35 },
  { tex: "/posters/work-product-story.jpg", pos: [4.6, 0.8, -36], size: [1.5, 1.13], rotY: -0.3 },
  { tex: "/posters/work-ugc-testimonial.jpg", pos: [-5.0, 0.5, -39], size: [1.5, 1.13], rotY: 0.3 },
  // ── chapter 07 · CONTACT — two far witnesses ──
  { tex: "/posters/work-talking-head.jpg", pos: [-6.5, 1.2, -47], size: [2.8, 1.58], rotY: 0.45 },
  { tex: "/posters/work-podcast.jpg", pos: [6.5, 0.8, -52], size: [1.6, 2.84], rotY: -0.45 },
];

function FloatingFrames() {
  const textures = useTexture(FRAMES.map((f) => f.tex));
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
  }, [textures]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    group.current?.children.forEach((child, i) => {
      const f = FRAMES[i];
      child.position.y = f.pos[1] + Math.sin(t * 0.45 + i * 1.7) * 0.07;
      child.rotation.y = f.rotY + Math.sin(t * 0.22 + i) * 0.012;
    });
  });

  return (
    <group ref={group}>
      {FRAMES.map((f, i) => (
        <group key={i} position={f.pos} rotation={[0, f.rotY, 0]}>
          {/* dark bezel */}
          <mesh position={[0, 0, -0.015]}>
            <boxGeometry args={[f.size[0] + 0.09, f.size[1] + 0.09, 0.03]} />
            <meshStandardMaterial color="#1c1c20" roughness={0.55} metalness={0.3} />
          </mesh>
          {/* lime edge accent for selected frames */}
          {f.lime && (
            <mesh position={[0, f.size[1] / 2 + 0.07, -0.015]}>
              <boxGeometry args={[f.size[0] + 0.11, 0.028, 0.034]} />
              <meshBasicMaterial color={LIME} toneMapped={false} />
            </mesh>
          )}
          {/* the artwork — glowing screen look (unlit, fog still applies) */}
          <mesh>
            <planeGeometry args={f.size} />
            <meshBasicMaterial
              map={textures[i]}
              color="#d9d9d9"
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ─────────────────────────── voxel camera ─────────────────────────── */

/** Voxel map: 3D video camera built from unit cubes (pixel-art in 3D). */
function buildVoxelCamera(): [number, number, number][] {
  const v: [number, number, number][] = [];
  // body 5×3×3
  for (let x = -2; x <= 2; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) v.push([x, y, z]);
  // lens block 3×3 forward (+z), corners removed → octagonal feel
  const lensXY = [
    [-1, 0],
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 0],
  ];
  for (const [x, y] of lensXY) v.push([x, y, 2]);
  for (const [x, y] of lensXY) v.push([x, y, 3]);
  // viewfinder on top
  v.push([1, 2, -1]);
  v.push([2, 2, -1]);
  // carry handle
  v.push([-2, 2, 0]);
  v.push([-1, 2, 0]);
  v.push([-2, 2, 1]);
  v.push([-1, 2, 1]);
  return v;
}

function VoxelCamera() {
  const voxels = useMemo(buildVoxelCamera, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const rec = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const M = new THREE.Matrix4();
    const s = 0.24;
    voxels.forEach(([x, y, z], i) => {
      M.makeScale(s, s, s);
      M.setPosition(x * s, y * s, z * s);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [voxels]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.28) * 0.14;
      group.current.rotation.x = Math.sin(t * 0.2) * 0.045;
      group.current.position.y = 0.85 + Math.sin(t * 0.5) * 0.06;
    }
    if (rec.current) {
      const mat = rec.current.material as THREE.MeshBasicMaterial;
      mat.color.setScalar(0.5 + 0.5 * Math.sin(t * 3.2)); // blinking REC
      mat.color.multiply(new THREE.Color(LIME));
    }
  });

  return (
    <group ref={group} position={[0.85, 0.85, 0.6]} scale={0.85}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, voxels.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#45454e" roughness={0.45} metalness={0.3} />
      </instancedMesh>
      {/* key light on the machine */}
      <pointLight position={[1.6, 2.4, 2.2]} intensity={9} distance={9} decay={2} color="#fff3e0" />
      {/* REC light */}
      <mesh ref={rec} position={[-0.24, 0.26, 0.36]}>
        <boxGeometry args={[0.08, 0.08, 0.05]} />
        <meshBasicMaterial color={LIME} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── pixel particles ─────────────────────────── */

function PixelParticles() {
  const count = sceneState.isMobile ? 240 : 520;
  const mesh = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3().randomDirection();
      arr.push({
        base: new THREE.Vector3(
          (Math.random() - 0.5) * 22,
          -1.5 + Math.random() * 8,
          6 - Math.random() * 64
        ),
        size: 0.035 + Math.random() * 0.075,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        orbit: 1.3 + Math.random() * 1.1,
        dir,
        lime: Math.random() < 0.09,
      });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new THREE.Color();
    data.forEach((d, i) => {
      c.set(d.lime ? LIME : "#8f8f96");
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
      // ambient drift
      const dx = Math.sin(t * d.speed + d.phase) * 0.35;
      const dy = Math.cos(t * d.speed * 0.8 + d.phase * 1.3) * 0.3;
      const dz = Math.sin(t * d.speed * 0.6 + d.phase * 0.7) * 0.35;

      // orbit around the AI core when converged
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
      const sc = d.size * (1 - 0.35 * conv);
      s.setScalar(sc);
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
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (outer.current) {
      outer.current.rotation.y = t * 0.18;
      outer.current.rotation.x = Math.sin(t * 0.24) * 0.22;
    }
    const pulse = 0.9 + Math.sin(t * 1.4) * 0.12;
    if (inner.current) inner.current.scale.setScalar(pulse);
    if (light.current) light.current.intensity = 10 + Math.sin(t * 1.4) * 3;
  });

  return (
    <group position={CORE_POS.toArray()}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshBasicMaterial color={LIME} wireframe transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color={LIME} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color={LIME} intensity={10} distance={16} decay={2} />
    </group>
  );
}

/* ─────────────────────────── studio lights + floor ─────────────────────────── */

/** Volumetric-ish light cone. */
function LightCone({ z }: { z: number }) {
  return (
    <group position={[0, 3.4, z]}>
      {/* light bar */}
      <mesh rotation={[0, 0, 0.06]}>
        <boxGeometry args={[2.6, 0.06, 0.06]} />
        <meshBasicMaterial color="#f5f0e2" toneMapped={false} />
      </mesh>
      {/* cone */}
      <mesh position={[0, -1.75, 0]}>
        <coneGeometry args={[1.7, 3.4, 4, 1, true]} />
        <meshBasicMaterial
          color="#fff4dd"
          transparent
          opacity={0.075}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/** Subtle grid floor — cheap canvas texture, sells the depth. */
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
    tex.repeat.set(34, 46);
    return tex;
  }, []);

  return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.3, -28]}>
      <planeGeometry args={[68, 92]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.14}
        color="#a8a8b0"
      />
    </mesh>
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
    g.addColorStop(0, "rgba(198,241,53,0.10)");
    g.addColorStop(0.35, "rgba(60,62,72,0.16)");
    g.addColorStop(1, "rgba(10,10,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh position={[0, 1.5, -76]}>
      <planeGeometry args={[100, 50]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/* ─────────────────────────── scene root ─────────────────────────── */

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 7, 9]} intensity={1.6} color="#fff6e8" />
      <directionalLight position={[-6, 5, -30]} intensity={0.7} color="#c9d8a0" />
      <pointLight position={[0, 3, -18]} intensity={5} distance={26} color="#8a8a96" />

      <GridFloor />
      <Backdrop />
      <VoxelCamera />
      <Suspense fallback={null}>
        <FloatingFrames />
      </Suspense>
      <PixelParticles />
      <AICore />
      <LightCone z={-6} />
      <LightCone z={-15} />
      <LightCone z={-25} />
      <LightCone z={-34} />
    </>
  );
}

export default function CinematicScene() {
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
        camera={{ fov: 55, near: 0.1, far: 130, position: KFS[0].pos }}
      >
        <color attach="background" args={[INK]} />
        <fog attach="fog" args={[INK, 11, 62]} />
        <CameraRig />
        <SceneContent />
      </Canvas>
    </div>
  );
}
