"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { playHoverTick, playSelect, startAmbient, stopAmbient } from "./sound";

const ROLES = [
  "Computer Engineer",
  "Firmware Developer",
  "Embedded Systems",
  "Edge ML & TinyML",
  "Hardware Tinkerer",
];

const GLYPHS = "!<>-_\\/[]{}=+*^?#";

// Matrix-style decode: characters resolve left→right while the unresolved
// tail cycles through random glyphs. Under reduced motion the text just
// appears. Re-runs whenever `text` changes (the role cycler relies on this).
function useDecode(text: string, delayMs = 0, stepMs = 28) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const solved = Math.floor((now - start) / stepMs);
        let s = text.slice(0, solved);
        for (let i = solved; i < text.length; i++) {
          s += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        setOut(s);
        if (solved < text.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, delayMs, stepMs]);
  return out;
}

const rise = (delay: number, duration = 0.4) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration, ease: "easeOut" as const },
});

type Sel = "pro" | "personal" | null;

// Beat between locking a selection in and the actual transition, so the
// status line has time to re-type before anything moves.
const SETUP_MS = 700;

// Both choices hand off to Experience: onPersonal runs the shutter + fly-in
// into the retro OS, onProfessional runs the star dive into the engineering
// console — both in-app, no page loads.
export default function Landing({
  onPersonal,
  onProfessional,
}: {
  onPersonal: () => void;
  onProfessional: () => void;
}) {
  const [role, setRole] = useState(0);
  const [sel, setSel] = useState<Sel>(null);

  const name = useDecode("Raphael Ramos", 300, 40);
  const roleText = useDecode(ROLES[role], 0, 24);
  const hintText = useDecode(
    sel === "pro"
      ? "BOOTING ENGINEERING CONSOLE"
      : sel === "personal"
        ? "ENTERING WORKSPACE"
        : "SELECT DESTINATION",
    sel ? 0 : 1100,
    20
  );

  // Subtle room tone under the menu. The AudioContext stays locked until the
  // first gesture, so retry shortly after any pointer/key press.
  useEffect(() => {
    startAmbient();
    const retry = () => window.setTimeout(startAmbient, 200);
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      stopAmbient();
    };
  }, []);

  useEffect(() => {
    if (sel) return; // freeze the cycler once a choice is locked in
    const t = setInterval(() => setRole((r) => (r + 1) % ROLES.length), 3000);
    return () => clearInterval(t);
  }, [sel]);

  const choose = (which: "pro" | "personal") => {
    if (sel) return;
    playSelect();
    setSel(which);
    window.setTimeout(() => {
      stopAmbient();
      if (which === "personal") onPersonal();
      else onProfessional();
    }, SETUP_MS);
  };

  return (
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="film-grain" />

      <div className="menu-center">
        <motion.div className="menu-logo" {...rise(0)}>rr</motion.div>

        <motion.h1 className="menu-name" {...rise(0.18, 0.5)}>
          {name || "\u00A0"}
        </motion.h1>

        <motion.div className="menu-role" {...rise(0.32)}>
          <span className="rp">&gt;</span> {roleText || "\u00A0"}
          <span className="type-cursor" />
        </motion.div>

        <div className="menu-options" data-sel={sel ?? undefined}>
          <motion.button
            className={`menu-option${sel === "pro" ? " selected" : ""}`}
            {...rise(0.5)}
            onMouseEnter={playHoverTick}
            onClick={() => choose("pro")}
          >
            <span className="mo-num">01</span>
            <span className="mo-label">Professional</span>
          </motion.button>

          <motion.button
            className={`menu-option${sel === "personal" ? " selected" : ""}`}
            {...rise(0.65)}
            onMouseEnter={playHoverTick}
            onClick={() => choose("personal")}
          >
            <span className="mo-num">02</span>
            <span className="mo-label">Personal</span>
          </motion.button>
        </div>

        <motion.div className="menu-hint" data-active={sel ? "" : undefined} {...rise(0.95)}>
          {hintText || "\u00A0"}
        </motion.div>
      </div>
    </motion.div>
  );
}
