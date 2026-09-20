"use client";

import { useEffect, useRef } from "react";

/**
 * POV light-cycle run into the Grid — a perspective corridor rushing toward the
 * viewer with glowing cyan trail-walls, accelerating until it hands off to the
 * derez flash (parent fires "star-zoom"). Canvas 2D, so it needs no WebGL.
 */
export default function GridRun({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) { doneCb.current(); return; }

    const CYAN = "#33e1ff";
    const DUR = 2200;         // total run (ms)
    const BRIGHT_AT = 1650;   // start the accelerate-brighten
    let raf = 0, start = 0, finished = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      const W = window.innerWidth, H = window.innerHeight;
      const cx = W / 2;
      const horizon = H * 0.4;

      // accelerating forward motion
      const speed = 0.0011 + Math.pow(t / DUR, 1.6) * 0.010;
      const scroll = (t * speed) % 1;

      // motion-blur trail
      ctx.fillStyle = "rgba(4,6,14,0.34)";
      ctx.fillRect(0, 0, W, H);

      ctx.lineCap = "round";

      // floor grid — horizontal lines emerging at the horizon and rushing down
      const rows = 24;
      ctx.shadowColor = CYAN;
      for (let k = 0; k < rows; k++) {
        const phase = (k / rows + scroll) % 1;
        const y = horizon + (H - horizon) * phase * phase;   // perspective ease
        const a = Math.min(1, phase * 1.5) * 0.55;
        ctx.strokeStyle = `rgba(51,225,255,${a})`;
        ctx.lineWidth = 1 + phase * 1.6;
        ctx.shadowBlur = 6 + phase * 6;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // verticals converging to the vanishing point (the corridor)
      ctx.shadowBlur = 4;
      const cols = 16;
      for (let i = -cols; i <= cols; i++) {
        const xb = cx + (i / cols) * W * 1.7;
        ctx.strokeStyle = "rgba(51,225,255,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, horizon); ctx.lineTo(xb, H); ctx.stroke();
      }

      // the two light-cycle trail-walls — bright, glowing, close to you
      ctx.shadowBlur = 30;
      ctx.lineWidth = 4;
      for (const s of [-1, 1]) {
        const xb = cx + s * W * 0.34;
        ctx.strokeStyle = "rgba(140,244,255,0.95)";
        ctx.beginPath(); ctx.moveTo(cx + s * 5, horizon); ctx.lineTo(xb, H); ctx.stroke();
      }

      // vanishing-point glow
      ctx.shadowBlur = 0;
      const g = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, H * 0.55);
      g.addColorStop(0, "rgba(150,245,255,0.55)");
      g.addColorStop(1, "rgba(150,245,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // accelerate-brighten near the end (hands off to the derez flash)
      if (t > BRIGHT_AT) {
        const f = Math.min(1, (t - BRIGHT_AT) / (DUR - BRIGHT_AT));
        ctx.fillStyle = `rgba(180,248,255,${f * 0.7})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t >= DUR) {
        if (!finished) { finished = true; doneCb.current(); }
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="grid-run" aria-hidden />;
}
