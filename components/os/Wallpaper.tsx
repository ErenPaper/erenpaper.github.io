"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Galaxy starfield ported from the classic site (public/classic/script.js
// initBackground). Reads data-theme/data-persona to pick palette + blending.
export default function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 18;

    // Light Pro theme is the only "bright" mode; personal stays dark/warm.
    const isLight = () =>
      root.getAttribute("data-theme") === "light" && root.getAttribute("data-persona") !== "personal";

    const starTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0.0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.7)");
      g.addColorStop(0.55, "rgba(255,255,255,0.18)");
      g.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const SPREAD = 50;
    const DISC = 0.85;

    function makeLayer(count: number, size: number, color: number, opacity: number) {
      const pos = new Float32Array(count * 3);
      const baseY = new Float32Array(count);
      const phase = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * SPREAD;
        const y = (Math.random() - 0.5) * SPREAD * DISC;
        const z = (Math.random() - 0.5) * SPREAD;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        baseY[i] = y; phase[i] = Math.random() * Math.PI * 2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size, color, map: starTex, transparent: true, opacity,
        sizeAttenuation: true, depthWrite: false,
        blending: isLight() ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      return { pts: new THREE.Points(geo, mat), mat, geo, baseY, phase, count };
    }

    const group = new THREE.Group();
    scene.add(group);

    const accentColor = root.getAttribute("data-persona") === "personal" ? 0xe63946 : 0x57ff8a;
    const dust = makeLayer(isTouch ? 1100 : 3000, 0.1, isLight() ? 0x666666 : 0x9fb0d8, 0.4);
    const stars = makeLayer(isTouch ? 260 : 650, 0.2, isLight() ? 0x333333 : 0xffffff, 0.5);
    const bright = makeLayer(isTouch ? 45 : 95, 0.38, isLight() ? 0x222222 : 0xffffff, 0.55);
    const accent = makeLayer(isTouch ? 24 : 70, 0.42, accentColor, 0.5);
    [dust, stars, bright, accent].forEach((l) => group.add(l.pts));

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    const onMove = (e: MouseEvent) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    };
    if (!isTouch) window.addEventListener("mousemove", onMove);

    const clock = new THREE.Clock();
    let raf = 0;
    function frame() {
      const t = clock.getElapsedTime();
      if (!isTouch) {
        const arr = dust.geo.attributes.position.array as Float32Array;
        for (let i = 0; i < dust.count; i++) {
          arr[i * 3 + 1] = dust.baseY[i] + Math.sin(t * 0.45 + dust.phase[i]) * 0.4;
        }
        dust.geo.attributes.position.needsUpdate = true;
      }
      group.rotation.y = t * 0.016;
      stars.mat.opacity = 0.5 * (0.78 + Math.sin(t * 1.3) * 0.22);
      curX += (targetX - curX) * 0.04;
      curY += (targetY - curY) * 0.04;
      camera.position.x = curX * 6;
      camera.position.y = -curY * 4;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    frame();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const applyTheme = () => { canvas.style.opacity = isLight() ? "0.35" : "1"; };
    applyTheme();
    const mo = new MutationObserver(applyTheme);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-persona"] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
      [dust, stars, bright, accent].forEach((l) => { l.geo.dispose(); l.mat.dispose(); });
      starTex.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas id="os-wallpaper" ref={canvasRef} aria-hidden />;
}
