"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { playBootHum, playChime } from "../intro/sound";

// PlayStation-style boot (ms):
// 0 black · 200 hum + bars begin streaking upward (staggered 0–350, 400 each) ·
// 600 bars fade as the logo appears · 400 held beat ·
// 1300–2500 line fills (caption fades up at 60%) · 2950 exit.
const BARS_FADE = 600;
const LOGO_IN = 600;
const LINE_START = 1300;
const LINE_DUR = 1200;
const EXIT_AT = 2950;

const BAR_COUNT = 10;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const done = useRef(false);
  const finish = useCallback(() => { if (!done.current) { done.current = true; onDone(); } }, [onDone]);

  // Semi-random bar positions/stagger, fixed for the life of the component.
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        left: `${(i + 0.15 + Math.random() * 0.7) * (100 / BAR_COUNT)}%`,
        delay: (i / (BAR_COUNT - 1)) * 0.35 * (0.7 + Math.random() * 0.3),
      })),
    []
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { finish(); return; }

    const hum = setTimeout(playBootHum, 200);
    const chime = setTimeout(playChime, LOGO_IN);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = now - start;
      setPct(Math.min(1, Math.max(0, (t - LINE_START) / LINE_DUR)));
      if (t < EXIT_AT) raf = requestAnimationFrame(step);
      else finish();
    };
    raf = requestAnimationFrame(step);
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); clearTimeout(hum); clearTimeout(chime); window.removeEventListener("keydown", onKey); };
  }, [finish]);

  return (
    <motion.div
      className="boot"
      onClick={finish}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeIn" }}
    >
      {/* light streaks racing upward, PS2-style */}
      <motion.div
        className="boot-bars"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: BARS_FADE / 1000, duration: 0.15 }}
      >
        {bars.map((b, i) => (
          <motion.i
            key={i}
            className="boot-bar-streak"
            style={{ left: b.left }}
            initial={{ y: "100vh" }}
            animate={{ y: "-100vh" }}
            transition={{ delay: 0.2 + b.delay, duration: 0.4, ease: "easeIn" }}
          />
        ))}
      </motion.div>

      <motion.div
        className="boot-logo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: LOGO_IN / 1000, duration: 0.3, ease: "easeOut" }}
      >
        rr
      </motion.div>

      <div className="boot-line" style={{ opacity: pct > 0 ? 1 : 0 }}>
        <i style={{ width: `${pct * 100}%` }} />
      </div>

      <motion.div
        className="boot-caption"
        initial={{ opacity: 0, y: 4 }}
        animate={pct >= 0.6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        RAPHAEL RAMOS · v1.0
      </motion.div>

      <span className="boot-skip">click or press any key to skip</span>
    </motion.div>
  );
}
