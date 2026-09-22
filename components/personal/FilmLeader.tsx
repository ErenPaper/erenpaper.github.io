"use client";

import { useEffect, useRef } from "react";
import { playPostBeep } from "../intro/sound";

/**
 * Super-8 / academy film-leader countdown for entering Side B: an aged warm
 * frame with concentric circles + crosshair, a sweeping hand, a 3-2-1 count,
 * grain and scratches, and a beep per number. When the reel "starts" it calls
 * onDone, handing off to the warm cross-dissolve into the scrapbook.
 */
export default function FilmLeader({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) { doneCb.current(); return; }

    const COUNT = 3;
    const PER = 820;                 // ms per number
    const DUR = PER * COUNT + 320;   // + a beat before handoff
    let raf = 0, start = 0, finished = false, lastNum = 0;

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
      const W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.33;

      const idx = Math.min(COUNT - 1, Math.floor(t / PER)); // 0,1,2
      const num = COUNT - idx;                              // 3,2,1
      const localT = (t - idx * PER) / PER;                 // 0..1 within a number
      if (num !== lastNum) { lastNum = num; playPostBeep(560 + num * 90, 0.05); }

      // aged film base with a tiny frame jitter
      const jx = (Math.random() - 0.5) * 1.8, jy = (Math.random() - 0.5) * 1.8;
      ctx.save();
      ctx.translate(jx, jy);
      ctx.fillStyle = "#2a2118";
      ctx.fillRect(-4, -4, W + 8, H + 8);
      const vg = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, Math.max(W, H) * 0.72);
      vg.addColorStop(0, "rgba(74,60,40,0.5)"); vg.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // concentric circles + crosshair
      ctx.strokeStyle = "rgba(240,225,195,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

      // sweeping hand — one full turn per number, wiped sector brightens
      const ang = -Math.PI / 2 + localT * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, ang); ctx.closePath();
      ctx.fillStyle = "rgba(255,225,170,0.12)"; ctx.fill();
      ctx.strokeStyle = "rgba(255,235,190,0.85)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); ctx.stroke();

      // the number
      ctx.fillStyle = "rgba(246,233,206,0.94)";
      ctx.font = `700 ${R * 1.05}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(num), cx, cy + R * 0.02);
      ctx.restore();

      // grain
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 44; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "#000" : "#fff";
        ctx.fillRect(Math.random() * W, Math.random() * H, 1.6, 1.6);
      }
      // occasional vertical scratches
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgba(255,250,235,0.22)"; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        if (Math.random() > 0.6) {
          const x = Math.random() * W;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 6, H); ctx.stroke();
        }
      }
      // film flicker
      if (Math.random() > 0.93) { ctx.fillStyle = "rgba(255,240,210,0.06)"; ctx.fillRect(0, 0, W, H); }
      ctx.globalAlpha = 1;

      if (t >= DUR) { if (!finished) { finished = true; doneCb.current(); } return; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="film-leader" aria-hidden />;
}
