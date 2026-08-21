"use client";

import type { CSSProperties } from "react";
import type { Project } from "../data/portfolio";

// Generative "what it does" graphic for projects with no demo video or
// screenshot. Picks an archetype from the project's tag/tech and renders a
// small animated SVG (logic waveform, network packets, Morse dots/dashes, a
// data scatter, a phone ping, or print layers). Pure SVG + CSS — animation is
// driven by classes in global.css and stops under reduced-motion.
export function projCategory(p: { tag: string; tech: string[] }): string {
  const t = (p.tag + " " + p.tech.join(" ")).toLowerCase();
  if (/imaging|exif|pillow|datestamp|camera|\bphoto\b/.test(t)) return "photo";
  if (/rtos|morse|interrupt|timer/.test(t)) return "morse";
  if (/logic|cpu|fpga|vhdl/.test(t)) return "logic";
  if (/network|socket|tcp|udp|file sharing|systems/.test(t)) return "network";
  if (/tinyml|\bml\b|data|scikit|anomaly|tensor|impulse/.test(t)) return "data";
  if (/mobile|android|social|firebase|places|app/.test(t)) return "mobile";
  if (/3d|cad|print|bmo|hardware/.test(t)) return "build";
  return "signal";
}

const sv = (i: number) => ({ ["--i" as string]: i } as CSSProperties);

export default function ProjectGraphic({ project, className = "" }: { project: Project; className?: string }) {
  const cat = projCategory(project);
  return (
    <span className={`pg pg-${cat} ${className}`} data-cat={cat} aria-hidden>
      <svg viewBox="0 0 120 68" preserveAspectRatio="xMidYMid meet">
        {cat === "morse" &&
          [0, 1, 2, 3, 4].map((i) => (
            <rect key={i} className="pg-el" x={14 + i * 20} y={30} width={i % 2 ? 15 : 7} height={8} rx={2} style={sv(i)} />
          ))}

        {cat === "logic" && (
          <polyline className="pg-wave" points="0,46 16,46 16,22 36,22 36,46 56,46 56,22 76,22 76,46 96,46 96,22 120,22" />
        )}

        {cat === "network" && (
          <>
            <line className="pg-track" x1="8" y1="34" x2="112" y2="34" />
            <rect className="pg-packet" x="4" y="29" width="12" height="10" rx="2" />
          </>
        )}

        {cat === "data" && (
          <>
            <line className="pg-axis" x1="16" y1="8" x2="16" y2="58" />
            <line className="pg-axis" x1="16" y1="58" x2="110" y2="58" />
            {([[32, 46], [46, 40], [60, 30], [74, 34], [88, 22], [100, 26]] as const).map(([x, y], i) => (
              <circle key={i} className="pg-dot" cx={x} cy={y} r="3.2" style={sv(i)} />
            ))}
          </>
        )}

        {cat === "mobile" && (
          <>
            <rect className="pg-phone" x="47" y="12" width="26" height="44" rx="5" />
            <circle className="pg-ping" cx="60" cy="34" r="6" />
          </>
        )}

        {cat === "build" &&
          [0, 1, 2].map((i) => (
            <rect key={i} className="pg-layer" x="44" y={44 - i * 10} width="32" height="8" rx="1" style={sv(i)} />
          ))}

        {cat === "photo" && (
          <>
            <rect className="pg-frame" x="16" y="9" width="88" height="50" rx="3" />
            <circle className="pg-sun" cx="40" cy="26" r="7" />
            <path className="pg-hills" d="M18 51 L42 33 L60 45 L80 29 L102 51 Z" />
            <text className="pg-stamp" x="99" y="52" textAnchor="end">&apos;25 8 14</text>
          </>
        )}

        {cat === "signal" && <path className="pg-sine" d="M0 34 Q15 14 30 34 T60 34 T90 34 T120 34" />}
      </svg>
    </span>
  );
}
