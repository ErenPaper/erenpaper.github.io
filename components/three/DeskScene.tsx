"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useOS } from "../../store/windows";

const ACCENT = "#e63946";
const PHOSPHOR = "#57ff8a";

// Screen plane dimensions / world placement (group y 0.23 + mesh y 0.1).
const SCREEN_W = 3.3;
const SCREEN_H = 2.35;
const SCREEN_CENTER = new THREE.Vector3(0, 0.33, 0.46);

// The star the "Professional" exit dives into, in screen UV space (v from the
// top, matching canvas coordinates). Drawn extra bright in the texture below.
const TARGET_STAR_UV = { u: 0.68, v: 0.36 };
const TARGET_STAR = new THREE.Vector3(
  (TARGET_STAR_UV.u - 0.5) * SCREEN_W,
  SCREEN_CENTER.y + (0.5 - TARGET_STAR_UV.v) * SCREEN_H,
  SCREEN_CENTER.z
);

// Draw the "screen" content once into a canvas texture. Text lives in the
// HTML landing menu on top, so the monitor shows only a quiet starfield —
// phosphor-green tinted, with one bright star as the exit-transition target.
function useScreenTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 640;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#060d08"; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height;
      const r = Math.random() * 1.6;
      ctx.globalAlpha = 0.3 + Math.random() * 0.6;
      const roll = Math.random();
      ctx.fillStyle = roll > 0.92 ? ACCENT : roll > 0.55 ? "#c9f7d4" : "#cdd6f4";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // the target star: hot white core inside a phosphor-green halo
    const sx = TARGET_STAR_UV.u * c.width, sy = TARGET_STAR_UV.v * c.height;
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    halo.addColorStop(0, "rgba(255,255,255,0.95)");
    halo.addColorStop(0.3, "rgba(160,255,190,0.5)");
    halo.addColorStop(1, "rgba(160,255,190,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

const MATRIX_GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789:・.=*+-<>¦";

// Digital-rain wall behind the desk: a low-fps canvas texture on a big plane,
// additively blended and faint so it reads as room ambience, not a gimmick.
function MatrixRain() {
  const rain = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640; c.height = 360;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#010302"; ctx.fillRect(0, 0, c.width, c.height);
    const cols = Math.floor(c.width / 14);
    const drops = Array.from({ length: cols }, () => Math.floor(Math.random() * -60));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { c, ctx, drops, tex };
  }, []);
  const last = useRef(0);

  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.09) return; // ~11fps is plenty for rain
    last.current = clock.elapsedTime;
    const { c, ctx, drops, tex } = rain;
    ctx.fillStyle = "rgba(1, 4, 2, 0.16)"; // fade previous frame → trailing glyphs
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = "13px monospace";
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * 14;
      if (y > 0) {
        ctx.fillStyle = Math.random() > 0.94 ? "#b4ffc8" : "#2f9e52";
        ctx.fillText(MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0], i * 14, y);
      }
      drops[i] = y > c.height && Math.random() > 0.972 ? 0 : drops[i] + 1;
    }
    tex.needsUpdate = true;
  });

  return (
    <mesh position={[0, 1.1, -3.8]}>
      <planeGeometry args={[17, 9.5]} />
      <meshBasicMaterial
        map={rain.tex}
        transparent
        opacity={0.32}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

// Trinitron-style CRT: deep boxy front, tapered tube hump behind, convex glass.
function Monitor() {
  const screenTex = useScreenTexture();
  return (
    <group position={[0, 0.23, 0]}>
      {/* front body */}
      <RoundedBox args={[3.9, 3.0, 0.9]} radius={0.14} smoothness={4} castShadow>
        <meshStandardMaterial color="#1a1a10" roughness={0.35} metalness={0.05} />
      </RoundedBox>
      {/* rear tube hump */}
      <RoundedBox args={[2.9, 2.3, 1.4]} radius={0.2} smoothness={3} position={[0, 0.05, -1.0]} castShadow>
        <meshStandardMaterial color="#15150d" roughness={0.5} metalness={0.05} />
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0.1, 0.46]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshStandardMaterial
          color="#000"
          emissive="#ffffff"
          emissiveMap={screenTex}
          emissiveIntensity={1.25}
          toneMapped={false}
        />
      </mesh>
      {/* slightly convex CRT glass over the screen */}
      <mesh position={[0, 0.1, 0.42]} scale={[1.68, 1.2, 0.14]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial transparent opacity={0.07} color="#aaffcc" roughness={0} metalness={0.1} />
      </mesh>
      {/* power LED on the bezel */}
      <mesh position={[1.55, -1.28, 0.46]}>
        <boxGeometry args={[0.08, 0.04, 0.02]} />
        <meshStandardMaterial emissive={PHOSPHOR} emissiveIntensity={2} color="#000" toneMapped={false} />
      </mesh>
      {/* phosphor glow spilling off the screen onto the desk (flickers) */}
      <ScreenGlow />
    </group>
  );
}

// Slight intensity wobble so the CRT spill reads as a live tube, not a lamp.
function ScreenGlow() {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.intensity = 6 + Math.sin(t * 8.3) * 0.3 + Math.sin(t * 2.1) * 0.25;
  });
  return <pointLight ref={ref} position={[0, 0.1, 1.6]} intensity={6} distance={7} color="#6effa4" />;
}

// PS2-slim-style console lying on the desk beside the monitor, angled toward
// the camera and lit by its own little spill so it reads at idle distance.
function Console() {
  return (
    <group position={[2.35, -1.17, 1.15]} rotation={[0, -0.55, 0]}>
      <RoundedBox args={[1.35, 0.18, 1.0]} radius={0.04} smoothness={3} castShadow>
        <meshStandardMaterial color="#2a2a38" roughness={0.3} metalness={0.25} />
      </RoundedBox>
      {/* disc-lid ridge */}
      <mesh position={[-0.15, 0.1, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.02, 32]} />
        <meshStandardMaterial color="#333344" roughness={0.25} metalness={0.35} />
      </mesh>
      {/* power LED */}
      <mesh position={[0.55, 0.02, 0.51]}>
        <boxGeometry args={[0.06, 0.03, 0.02]} />
        <meshStandardMaterial emissive="#4a7dff" emissiveIntensity={2.5} color="#000" toneMapped={false} />
      </mesh>
      {/* soft cool spill so the black shell isn't swallowed by the dark room */}
      <pointLight position={[0.3, 1.2, 0.9]} intensity={1.6} distance={4} color="#9fd8ff" />
    </group>
  );
}

function Desk() {
  return (
    <mesh position={[0, -1.35, 0.2]} receiveShadow>
      <boxGeometry args={[8.5, 0.16, 3.6]} />
      <meshStandardMaterial color="#2b2118" roughness={0.85} metalness={0} />
    </mesh>
  );
}

/* ---- desk clutter: low-poly primitives only, no textures/GLTFs ----
   Desk top sits at y ≈ -1.27; each prop rests with half its height above. */

// DMG Game Boy lying face-up near the front-left corner.
function GameBoy() {
  return (
    <group position={[-2.5, -1.22, 1.35]} rotation={[-Math.PI / 2, 0, 0.55]}>
      <RoundedBox args={[0.62, 1.0, 0.09]} radius={0.03} smoothness={3} castShadow>
        <meshStandardMaterial color="#b8b2a4" roughness={0.6} />
      </RoundedBox>
      {/* screen bezel + off screen */}
      <mesh position={[0, 0.24, 0.05]}>
        <boxGeometry args={[0.5, 0.36, 0.012]} />
        <meshStandardMaterial color="#474a52" roughness={0.4} />
      </mesh>
      <mesh position={[-0.02, 0.24, 0.058]}>
        <boxGeometry args={[0.34, 0.28, 0.01]} />
        <meshStandardMaterial color="#39412c" roughness={0.3} />
      </mesh>
      {/* d-pad */}
      <mesh position={[-0.17, -0.14, 0.05]}>
        <boxGeometry args={[0.16, 0.055, 0.02]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>
      <mesh position={[-0.17, -0.14, 0.05]}>
        <boxGeometry args={[0.055, 0.16, 0.02]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>
      {/* A/B buttons */}
      <mesh position={[0.13, -0.1, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
        <meshStandardMaterial color="#8e2f5d" roughness={0.4} />
      </mesh>
      <mesh position={[0.24, -0.17, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
        <meshStandardMaterial color="#8e2f5d" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Compact 35mm film camera, lens toward the viewer.
function FilmCamera() {
  return (
    <group position={[-3.15, -1.02, 0.35]} rotation={[0, 0.45, 0]}>
      <RoundedBox args={[0.85, 0.5, 0.34]} radius={0.05} smoothness={3} castShadow>
        <meshStandardMaterial color="#1d1d20" roughness={0.45} metalness={0.2} />
      </RoundedBox>
      {/* silver top plate + shutter button */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.85, 0.09, 0.34]} />
        <meshStandardMaterial color="#9a9890" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0.28, 0.35, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 12]} />
        <meshStandardMaterial color="#c8c6c0" roughness={0.25} metalness={0.7} />
      </mesh>
      {/* lens barrel + glass */}
      <mesh position={[0, 0, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.22, 24]} />
        <meshStandardMaterial color="#111114" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.375]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
        <meshStandardMaterial color="#1b2b4a" roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  );
}

// Loose stack of floppies near the back-right, slightly fanned.
function FloppyStack() {
  const disks: Array<[string, number, number]> = [
    ["#2b3a6b", -1.253, 0.18],
    ["#6b2b2b", -1.231, -0.14],
    ["#23262b", -1.209, 0.32],
  ];
  return (
    <group position={[3.15, 0, -0.35]}>
      {disks.map(([color, y, rot], i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[0, rot, 0]} castShadow>
          <boxGeometry args={[0.55, 0.022, 0.55]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// Mug of coffee, long gone cold.
function Mug() {
  return (
    <group position={[1.6, -1.12, 1.55]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.13, 0.3, 20]} />
        <meshStandardMaterial color="#7a2e2e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 20]} />
        <meshStandardMaterial color="#241812" roughness={0.9} />
      </mesh>
      <mesh position={[0.17, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.08, 0.02, 10, 20]} />
        <meshStandardMaterial color="#7a2e2e" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Quadratic ease-in: starts from rest and accelerates, so the star dive reads
// as a deliberate plunge that speeds up into the whiteout rather than a
// fast-then-crawl lerp.
const easeIn = (t: number) => t * t;
const DIVE_DUR = 2.6; // seconds, menu POV → just in front of the star

// Additive glow sprite sitting on the target star. It's a faint twinkle at
// idle and blooms bright as the camera dives in (proximity-driven), so the
// star visibly brightens right before the whiteout DOM overlay takes over.
function StarGlow() {
  const phase = useOS((s) => s.phase);
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(230,255,238,0.9)");
    g.addColorStop(0.45, "rgba(140,255,180,0.35)");
    g.addColorStop(1, "rgba(140,255,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame(({ camera }) => {
    const m = ref.current;
    if (!m) return;
    const dist = camera.position.distanceTo(TARGET_STAR);
    // idle sits ~7 units back (faint); the dive ends ~0.26 away (blazing).
    const k = THREE.MathUtils.clamp(1 - (dist - 0.26) / 6.5, 0, 1);
    const level = phase === "leaving" ? Math.pow(k, 1.4) : k * 0.14;
    m.visible = level > 0.01;
    m.lookAt(camera.position);
    const s = 0.35 + level * 3.4;
    m.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = Math.min(1, level * 1.25);
  });

  return (
    // renderOrder + depthTest:false so the star's glow always draws over the
    // monitor geometry — otherwise the bezel/glass clips one side of it as the
    // camera dives in off-axis (the "cut in half" look).
    <mesh ref={ref} position={TARGET_STAR} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        color="#ffffff"
      />
    </mesh>
  );
}

function CameraRig() {
  const phase = useOS((s) => s.phase);
  const { camera, mouse } = useThree();
  const idle = useRef(0);
  const bloomFired = useRef(false);
  const starFired = useRef(false);
  // Snapshot of the camera when the dive begins, so it flows straight out of
  // the menu POV instead of snapping onto a new path.
  const diveFrom = useRef<THREE.Vector3 | null>(null);
  const diveT = useRef(0);
  const lookAt = useRef(new THREE.Vector3(0, 0.35, 0));
  // Small standoff so the dive ends right on top of the star — it fills the
  // frame and blooms bright before the whiteout takes over.
  const starCam = useMemo(
    () => new THREE.Vector3(TARGET_STAR.x, TARGET_STAR.y, TARGET_STAR.z + 0.26),
    []
  );
  // A point behind the screen the camera keeps pushing toward once the
  // whiteout starts, so the zoom continues *through* the star (never stalls).
  const starThrough = useMemo(
    () => new THREE.Vector3(TARGET_STAR.x, TARGET_STAR.y, TARGET_STAR.z - 0.7),
    []
  );

  useFrame((_, dt) => {
    idle.current += dt;
    if (phase === "entering") {
      diveFrom.current = null;
      // dolly straight into the screen; the phosphor bloom takes over near it
      const tp = new THREE.Vector3(0, 0.35, 1.1);
      camera.position.lerp(tp, 0.06);
      camera.lookAt(0, 0.33, 0);
      if (!bloomFired.current && camera.position.z < 2.5) {
        bloomFired.current = true;
        window.dispatchEvent(new Event("crt-bloom"));
      }
    } else if (phase === "leaving") {
      // Time-based eased dive at the bright star on the CRT. On the first frame
      // capture the current (menu) position; then glide along a fixed path so
      // the motion is smooth and repeatable regardless of frame rate.
      if (!diveFrom.current) {
        diveFrom.current = camera.position.clone();
        diveT.current = 0;
      }
      if (!starFired.current) {
        // Eased approach from the menu POV toward the star.
        diveT.current = Math.min(1, diveT.current + dt / DIVE_DUR);
        camera.position.lerpVectors(diveFrom.current, starCam, easeIn(diveT.current));
        // Ease the aim toward the star (it sits off-centre) so the view pans
        // smoothly early and holds steady — this is what kills the end jitter.
        lookAt.current.lerp(TARGET_STAR, Math.min(1, dt * 3.5));
        camera.lookAt(lookAt.current);
        // Cross a set distance → kick off the whiteout AND hand over to the
        // push-through, so brightening and zooming ramp up together.
        if (camera.position.distanceTo(TARGET_STAR) < 1.5) {
          starFired.current = true;
          window.dispatchEvent(new Event("star-zoom"));
        }
      } else {
        // Keep dollying straight through the star — the zoom never stalls
        // while the frame blooms to white over it.
        camera.position.lerp(starThrough, 0.09);
        camera.lookAt(TARGET_STAR);
      }
    } else {
      bloomFired.current = false;
      starFired.current = false;
      diveFrom.current = null;
      lookAt.current.set(0, 0.35, 0);
      // gentle idle float + subtle mouse parallax — kept small so the HTML
      // landing menu stays registered over the monitor's screen area
      const tx = Math.sin(idle.current * 0.3) * 0.12 + mouse.x * 0.18;
      const ty = 0.6 + Math.cos(idle.current * 0.25) * 0.05 + mouse.y * 0.1;
      camera.position.lerp(new THREE.Vector3(tx, ty, 7.5), 0.04);
      camera.lookAt(0, 0.35, 0);
    }
  });
  return null;
}

export default function DeskScene() {
  return (
    <Canvas
      className="desk-canvas"
      shadows
      camera={{ position: [0, 0.6, 7.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#060906"]} />
      <fog attach="fog" args={["#060906", 8, 16]} />
      <ambientLight intensity={0.22} color="#cfffe0" />
      <directionalLight position={[4, 6, 5]} intensity={0.5} castShadow shadow-mapSize={[1024, 1024]} />
      {/* desk lamp — warm amber from above-left */}
      <pointLight position={[-3, 3.2, 2.2]} intensity={1.2} distance={12} color="#ffb35c" />
      {/* dim phosphor-green wash behind the desk */}
      <pointLight position={[0, 0.4, -3.2]} intensity={0.8} color={PHOSPHOR} />
      <MatrixRain />
      <Desk />
      <Monitor />
      <StarGlow />
      <Console />
      <GameBoy />
      <FilmCamera />
      <FloppyStack />
      <Mug />
      <CameraRig />
    </Canvas>
  );
}
