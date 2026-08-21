"use client";

import { useEffect, useRef, useState } from "react";
import { playPostBeep } from "../intro/sound";

// POST/BIOS flourish over the Professional console: device enumeration with a
// memory count-up. Renders inside .monitor-screen (under the CRT overlay, over
// the desktop) for ~2.4s, then calls onDone. Never mounted under
// prefers-reduced-motion — Experience jumps straight to the desktop instead.

const MEM_KB = 264;
const MEM_AT = 300;   // when the count-up starts
const MEM_DUR = 620;  // count-up length
const DONE_AT = 2400;

type Line = { at: number; text: string; ok?: boolean };

// Index 2 is the memory line; its count-up is rendered specially below.
const LINES: Line[] = [
  { at: 0, text: "RR-BIOS v2.6 · RAMOS ENGINEERING" },
  { at: 150, text: "CPU0  : RP2040 · 2× CORTEX-M0+ @ 133MHZ", ok: true },
  { at: MEM_AT, text: "MEM   : SRAM", ok: true },
  { at: 1010, text: "FLASH : 2048K QSPI XIP", ok: true },
  { at: 1150, text: "UART0 : 115200-8N1", ok: true },
  { at: 1290, text: "BUS   : I2C0 · SPI0 · PIO0-1", ok: true },
  { at: 1430, text: "SENS  : IMU · ENV · MIC", ok: true },
  { at: 1590, text: "NET   : MQTT/TLS UPLINK", ok: true },
  { at: 1810, text: "BOOT  : LOADING PROFILE — RAPHAEL RAMOS" },
  { at: 2110, text: "READY." },
];

export default function PostScreen({ onDone }: { onDone: () => void }) {
  const [now, setNow] = useState(0);
  const doneRef = useRef(false);
  const beeped = useRef({ start: false, ready: false });

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const ms = t - start;
      setNow(ms);
      if (!beeped.current.start && ms >= 60) { beeped.current.start = true; playPostBeep(990); }
      if (!beeped.current.ready && ms >= 2110) { beeped.current.ready = true; playPostBeep(1320, 0.05); }
      if (ms < DONE_AT) raf = requestAnimationFrame(step);
      else if (!doneRef.current) { doneRef.current = true; onDone(); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const memKb = Math.round(Math.min(1, Math.max(0, (now - MEM_AT) / MEM_DUR)) * MEM_KB);
  const memDone = now >= MEM_AT + MEM_DUR;

  return (
    <div className="post-screen" aria-hidden>
      {LINES.map((l, i) => {
        if (now < l.at) return null;
        const isMem = i === 2;
        return (
          <div className="post-line" key={l.at}>
            <span className="post-text">
              {isMem ? `MEM   : ${memKb}K SRAM` : l.text}
            </span>
            {l.ok && (!isMem || memDone) && (
              <>
                <span className="post-dots" />
                <span className="post-ok">OK</span>
              </>
            )}
          </div>
        );
      })}
      <span className="post-cursor" />
    </div>
  );
}
