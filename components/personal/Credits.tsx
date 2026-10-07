"use client";

import { useEffect, useRef, useState } from "react";
import { experience, extracurriculars, profile, type Experience } from "../../data/portfolio";
import SectionHead from "./SectionHead";

// Work history and the off-the-bench stuff, as rolling film end credits — the
// Side B way to show a résumé. The roll is a real scroll box nudged along each
// frame, so visitors can skim it themselves: scrolling, dragging or keys take
// over, and the roll resumes a few seconds after they let go. It also pauses on
// hover or with the button; with reduced motion it never auto-rolls. The full
// résumé is on Side A.

const SPEED = 46;       // px per second while rolling
const RESUME_MS = 3500; // idle time after a manual scroll before rolling again

function Block({ heading, items }: { heading: string; items: Experience[] }) {
  return (
    <div className="sb-cr-block">
      <p className="sb-cr-head">{heading}</p>
      {items.map((x) => (
        <div className="sb-cr-item" key={x.company + x.role}>
          <span className="sb-cr-role">{x.role}</span>
          <span className="sb-cr-co">{x.company}</span>
          <span className="sb-cr-date">{x.date} · {x.location}</span>
        </div>
      ))}
    </div>
  );
}

export default function Credits({ onFlip }: { onFlip: () => void }) {
  const [paused, setPaused] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);
  const hold = useRef({ hover: false, until: 0, paused: false });
  hold.current.paused = paused;

  useEffect(() => {
    const el = winRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, last = performance.now(), pos = el.scrollTop;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const h = hold.current;
      if (!h.paused && !h.hover && now > h.until) {
        const max = el.scrollHeight - el.clientHeight;
        pos = pos >= max - 1 ? 0 : pos + SPEED * dt; // loop back to the top after THE END
        el.scrollTop = pos;
      } else {
        pos = el.scrollTop; // follow wherever the visitor scrolled to
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // any manual input takes over for a few seconds
    const takeOver = () => { hold.current.until = performance.now() + RESUME_MS; };
    const evs = ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"] as const;
    evs.forEach((e) => el.addEventListener(e, takeOver, { passive: true }));
    return () => { cancelAnimationFrame(raf); evs.forEach((e) => el.removeEventListener(e, takeOver)); };
  }, []);

  return (
    <section className="sb-section" id="sb-credits">
      <SectionHead ch={4} title="the credits" note="day jobs & the stuff off the bench" />
      <div className={`sb-cr${paused ? " paused" : ""}`}>
        <div
          className="sb-cr-window"
          ref={winRef}
          tabIndex={0}
          aria-label="End credits — scroll to skim"
          onPointerEnter={(e) => { if (e.pointerType === "mouse") hold.current.hover = true; }}
          onPointerLeave={() => { hold.current.hover = false; }}
        >
          <div className="sb-cr-roll">
            <p className="sb-cr-pre">a</p>
            <p className="sb-cr-big">{profile.name.toUpperCase()}</p>
            <p className="sb-cr-pre">production</p>
            <div className="sb-cr-item sb-cr-star">
              <span className="sb-cr-role">starring</span>
              <span className="sb-cr-co">{profile.name}</span>
              <span className="sb-cr-date">as me</span>
            </div>
            <Block heading="the day jobs" items={experience} />
            <Block heading="off the bench" items={extracurriculars} />
            <p className="sb-cr-end">THE END</p>
          </div>
        </div>
        <div className="sb-cr-controls">
          <button className="sb-btn" onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
            {paused ? "▶ roll credits" : "❚❚ pause"}
          </button>
          <span className="sb-cr-hint">scroll to skim</span>
          <button className="sb-flip-link" onClick={onFlip}>the full résumé is on Side A ↻</button>
        </div>
      </div>
    </section>
  );
}
