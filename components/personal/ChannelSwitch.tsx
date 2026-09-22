"use client";

import { useEffect, useRef } from "react";
import { playChannelChange } from "../intro/sound";

/**
 * CRT channel-switch entry for Side B: a burst of TV snow with a rolling
 * vertical-hold slip that slows and settles to dark, then hands off to the
 * reveal. Canvas 2D; cheap scaled small-noise for the snow.
 */
export default function ChannelSwitch({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) { doneCb.current(); return; }
    playChannelChange();

    const DUR = 950;
    let raf = 0, start = 0, finished = false;

    // small offscreen noise buffer, scaled up for cheap TV snow
    const nc = document.createElement("canvas");
    nc.width = 220; nc.height = 140;
    const nctx = nc.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize);

    const drawNoise = () => {
      const img = nctx.createImageData(nc.width, nc.height);
      const dd = img.data;
      for (let i = 0; i < dd.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        dd[i] = dd[i + 1] = dd[i + 2] = v; dd[i + 3] = 255;
      }
      nctx.putImageData(img, 0, 0);
    };

    const draw = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      const W = window.innerWidth, H = window.innerHeight, p = t / DUR;

      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, W, H);

      // TV snow — intensity swells, then dips at the very end as it settles
      drawNoise();
      const snow = Math.min(1, 0.5 + p * 0.8) * (p > 0.85 ? (1 - (p - 0.85) / 0.15) : 1);
      ctx.globalAlpha = Math.max(0, snow) * 0.7;
      ctx.drawImage(nc, -Math.random() * 22, -Math.random() * 22, W + 44, H + 44);
      ctx.globalAlpha = 1;

      // rolling vertical-hold bars — bright bands sweeping down, slowing to a lock
      const speed = 1.7 - p * 1.25;
      const rollY = (t * speed / 1000) % 1;
      for (let k = 0; k < 2; k++) {
        const y = ((rollY + k * 0.5) % 1) * H;
        const bh = H * 0.14;
        const grad = ctx.createLinearGradient(0, y - bh, 0, y + bh);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, "rgba(228,240,255,0.16)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - bh, W, bh * 2);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, y, W, 2);
      }

      // settle to dark for a clean handoff to the reveal
      if (p > 0.8) { ctx.fillStyle = `rgba(5,5,7,${(p - 0.8) / 0.2})`; ctx.fillRect(0, 0, W, H); }

      if (t >= DUR) { if (!finished) { finished = true; doneCb.current(); } return; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="channel-switch" aria-hidden />;
}
