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


// Per-project scenes. A project opts in with `art: "<key>"` in data/portfolio.ts;
// anything without one falls back to the generic category graphic below.
function ArtScene({ art }: { art: string }) {
  switch (art) {
    case "pulse": // heartbeat trace + three nodes ageing ALIVE -> SUSPECT -> DOWN
      return (
        <>
          <path className="pg-ecg" d="M4 24 H36 L42 24 L47 8 L53 40 L58 20 L62 24 H116" />
          {[26, 60, 94].map((x, i) => (
            <g key={x}>
              <circle className={i === 2 ? "pg-node pg-node-fade" : "pg-node pg-node-ok"} cx={x} cy="54" r="5" style={sv(i)} />
              <line className="pg-axis" x1={x} y1="46" x2={x} y2="40" />
            </g>
          ))}
        </>
      );
    case "pipebus": // publisher -> broker hub -> three subscribers
      return (
        <>
          {[[104, 10], [104, 34], [104, 58]].map(([x, y], i) => (
            <g key={i}>
              <line className="pg-track" x1="60" y1="34" x2={x} y2={y} />
              <circle className={`pg-fan pg-fan-${i + 1}`} cx="60" cy="34" r="3" />
              <rect className="pg-sub" x={x - 4} y={y - 4} width="8" height="8" rx="2" />
            </g>
          ))}
          <line className="pg-track" x1="14" y1="34" x2="60" y2="34" />
          <circle className="pg-hub" cx="60" cy="34" r="8" />
          <circle className="pg-pub" cx="14" cy="34" r="4" />
        </>
      );
    case "objserver": // three clients -> one poll() loop -> server
      return (
        <>
          {[12, 34, 56].map((y, i) => (
            <g key={y}>
              <rect className="pg-sub" x="8" y={y - 4} width="8" height="8" rx="2" />
              <line className="pg-track" x1="16" y1={y} x2="84" y2="34" />
              <rect className="pg-req" x="18" y={y - 2} width="9" height="4" rx="1" style={{ ["--i" as string]: i, ["--dy" as string]: `${34 - y}px` } as CSSProperties} />
            </g>
          ))}
          <rect className="pg-server" x="84" y="14" width="22" height="40" rx="3" />
          <line className="pg-axis" x1="89" y1="24" x2="101" y2="24" />
          <line className="pg-axis" x1="89" y1="34" x2="101" y2="34" />
          <line className="pg-axis" x1="89" y1="44" x2="101" y2="44" />
        </>
      );
    case "scheduler": // thread lanes taking turns on shared resources
      return (
        <>
          {[14, 30, 46].map((y, lane) => (
            <g key={y}>
              <line className="pg-track" x1="8" y1={y + 4} x2="112" y2={y + 4} />
              {[0, 1, 2, 3].map((c) => (
                <rect key={c} className="pg-slot" x={12 + c * 25} y={y} width="20" height="8" rx="2" style={sv(c * 3 + lane)} />
              ))}
            </g>
          ))}
          <rect className="pg-lock" x="4" y="58" width="112" height="3" rx="1.5" />
        </>
      );
    case "pcb": // a board whose traces draw themselves in
      return (
        <>
          <rect className="pg-board" x="10" y="6" width="100" height="56" rx="4" />
          <rect className="pg-chip" x="18" y="16" width="26" height="36" rx="2" />
          <rect className="pg-chip" x="74" y="14" width="22" height="14" rx="2" />
          <path className="pg-trace" d="M44 22 H60 V21 H74" style={sv(0)} />
          <path className="pg-trace" d="M44 34 H66 V48 H100" style={sv(1)} />
          <path className="pg-trace" d="M44 46 H56 V56 H90" style={sv(2)} />
          {[[100, 48], [90, 56], [74, 21]].map(([x, y], i) => <circle key={i} className="pg-pad" cx={x} cy={y} r="2.4" style={sv(i)} />)}
        </>
      );
    case "cpu": // bits toggling across a register as data moves down a bus
      return (
        <>
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} className="pg-bit" x={8 + (i % 8) * 13} y={i < 8 ? 10 : 24} width="10" height="10" rx="2" style={sv(i)} />
          ))}
          <line className="pg-track" x1="8" y1="46" x2="112" y2="46" />
          <rect className="pg-bus" x="8" y="43" width="12" height="6" rx="2" />
          <rect className="pg-chip" x="86" y="54" width="26" height="9" rx="2" />
        </>
      );
    case "anomaly": // a cluster with a couple of outliers flagged
      return (
        <>
          <ellipse className="pg-region" cx="50" cy="38" rx="30" ry="18" />
          {([[38, 36], [44, 42], [50, 33], [56, 40], [62, 36], [48, 46], [58, 46], [42, 30]] as const).map(([x, y], i) => (
            <circle key={i} className="pg-dot" cx={x} cy={y} r="2.8" style={sv(i)} />
          ))}
          <circle className="pg-outlier" cx="98" cy="14" r="3.4" />
          <circle className="pg-flag" cx="98" cy="14" r="5" />
          <circle className="pg-outlier" cx="14" cy="58" r="3.4" />
        </>
      );
    case "dbapps": // relational rows vs a document
      return (
        <>
          {[12, 26, 40, 54].map((y, i) => <rect key={y} className="pg-row" x="8" y={y - 5} width="46" height="9" rx="2" style={sv(i)} />)}
          <path className="pg-arrow" d="M58 34 H74 M69 29 L74 34 L69 39" />
          <text className="pg-doc" x="94" y="42" textAnchor="middle">{"{ }"}</text>
        </>
      );
    case "spectrum": // noise floor with one tonal spike
      return (
        <>
          <line className="pg-axis" x1="10" y1="8" x2="10" y2="58" />
          <line className="pg-axis" x1="10" y1="58" x2="112" y2="58" />
          <path className="pg-floor" d="M10 50 L18 47 L26 51 L34 46 L42 50 L50 47 L58 52 L66 48 L74 51 L82 47 L90 50 L98 48 L112 51" />
          <line className="pg-spike" x1="70" y1="58" x2="70" y2="10" />
          <text className="pg-stamp" x="76" y="14">3 kHz</text>
        </>
      );
    case "swipe": // a card swiped left and right
      return (
        <>
          <rect className="pg-phone" x="44" y="6" width="32" height="56" rx="6" />
          <rect className="pg-card" x="49" y="16" width="22" height="30" rx="3" />
          <path className="pg-yes" d="M90 34 c-1-4 -7-4 -7 1 c0 3 4 5 7 8 c3-3 7-5 7-8 c0-5 -6-5 -7-1z" />
          <path className="pg-no" d="M26 33 l9 10 M35 33 l-9 10" />
        </>
      );
    default:
      return null;
  }
}

export default function ProjectGraphic({ project, className = "" }: { project: Project; className?: string }) {
  const art = project.art;
  const cat = art ?? projCategory(project);
  return (
    <span className={`pg pg-${cat} ${className}`} data-cat={cat} aria-hidden>
      <svg viewBox="0 0 120 68" preserveAspectRatio="xMidYMid meet">
        {art && <ArtScene art={art} />}
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
