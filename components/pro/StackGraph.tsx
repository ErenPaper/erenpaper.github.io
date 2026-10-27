"use client";

import { useMemo, useState } from "react";
import {
  siPython, siC, siCplusplus, siRaspberrypi, siEdgeimpulse, siTensorflow, siMqtt,
  siReact, siTypescript, siFirebase, siSupabase, siMongodb, siSqlite, siOpenjdk,
  siKicad, siScikitlearn, siPandas, siArduino, siLinux, siDocker, siTailscale, siHomeassistant,
} from "simple-icons";
import { projects } from "../../data/portfolio";

// A "netlist" of the stack: nodes are technologies, traces join two of them for
// every project that used both. Core skills are the big pads in the middle.
// Hover a node to light its traces; click to filter the project catalog.

type Icon = { path: string };
type N = { id: string; label: string; match: string[]; icon?: Icon; core?: boolean; abbr?: string };

// Order matters: neighbours in this list sit next to each other on the outer
// ring, so it's grouped embedded → systems → cloud/apps → analysis.
const NODES: N[] = [
  { id: "c", label: "C", match: ["C", "C / C++"], icon: siC, core: true },
  { id: "cpp", label: "C++", match: ["C++", "C / C++"], icon: siCplusplus, core: true },
  { id: "pico", label: "RP2040 / Pico", match: ["RP2040", "RP2040 PIO"], icon: siRaspberrypi, core: true },
  { id: "py", label: "Python", match: ["Python"], icon: siPython, core: true },

  { id: "upy", label: "MicroPython", match: ["MicroPython"], abbr: "µPy" },
  { id: "edge", label: "Edge Impulse", match: ["Edge Impulse"], icon: siEdgeimpulse },
  { id: "tfl", label: "TF Lite", match: ["TensorFlow Lite", "TinyML"], icon: siTensorflow },
  { id: "i2s", label: "I2S / PIO", match: ["I2S", "WS2812B", "Quadrature Decode"], abbr: "I2S" },
  { id: "pwm", label: "PWM / ADC", match: ["PWM", "ADC"], abbr: "PWM" },
  { id: "kicad", label: "KiCad", match: ["KiCad"], icon: siKicad },
  { id: "vhdl", label: "VHDL", match: ["VHDL", "FPGA"], abbr: "VHDL" },
  { id: "arduino", label: "Arduino", match: ["Arduino"], icon: siArduino },

  { id: "linux", label: "Linux", match: ["Linux"], icon: siLinux },
  { id: "docker", label: "Docker", match: ["Docker"], icon: siDocker },
  { id: "ts", label: "Tailscale", match: ["Tailscale", "WireGuard"], icon: siTailscale },
  { id: "ha", label: "Home Assistant", match: ["Home Assistant"], icon: siHomeassistant },
  { id: "sock", label: "Sockets", match: ["TCP Sockets", "UDP Sockets"], abbr: "TCP" },
  { id: "thr", label: "pthreads", match: ["pthreads"], abbr: "pthr" },
  { id: "fifo", label: "Named pipes", match: ["Named Pipes (FIFO)"], abbr: "FIFO" },

  { id: "aws", label: "AWS IoT", match: ["AWS IoT"], abbr: "AWS" },
  { id: "mqtt", label: "MQTT", match: ["MQTT/TLS"], icon: siMqtt },
  { id: "rn", label: "React Native", match: ["React Native"], icon: siReact },
  { id: "tsc", label: "TypeScript", match: ["TypeScript"], icon: siTypescript },
  { id: "fb", label: "Firebase", match: ["Firebase"], icon: siFirebase },
  { id: "sb", label: "Supabase", match: ["Supabase"], icon: siSupabase },
  { id: "mongo", label: "MongoDB", match: ["MongoDB"], icon: siMongodb },
  { id: "sqlite", label: "SQLite", match: ["SQLite"], icon: siSqlite },
  { id: "java", label: "Java", match: ["Java"], icon: siOpenjdk },

  { id: "matlab", label: "MATLAB", match: ["MATLAB"], abbr: "ML" },
  { id: "skl", label: "scikit-learn", match: ["Scikit-learn"], icon: siScikitlearn },
  { id: "pd", label: "Pandas", match: ["Pandas"], icon: siPandas },
];

const W = 860, H = 560, CX = W / 2, CY = H / 2;

export default function StackGraph({ onPick, active }: { onPick: (tech: string) => void; active: string | null }) {
  const [hover, setHover] = useState<string | null>(null);

  const { pos, edges, used } = useMemo(() => {
    // which nodes does each project touch?
    const touch = projects.map((p) => NODES.filter((n) => n.match.some((m) => p.tech.includes(m))).map((n) => n.id));
    const weight = new Map<string, number>();
    const usedIds = new Set<string>();
    touch.forEach((ids) => {
      ids.forEach((i) => usedIds.add(i));
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        const k = [ids[a], ids[b]].sort().join("|");
        weight.set(k, (weight.get(k) ?? 0) + 1);
      }
    });
    const live = NODES.filter((n) => usedIds.has(n.id));
    const core = live.filter((n) => n.core);
    const rest = live.filter((n) => !n.core);
    const p: Record<string, { x: number; y: number }> = {};
    core.forEach((n, i) => {
      const a = (i / core.length) * Math.PI * 2 - Math.PI / 4;
      p[n.id] = { x: CX + Math.cos(a) * 92, y: CY + Math.sin(a) * 66 };
    });
    rest.forEach((n, i) => {
      const a = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
      p[n.id] = { x: CX + Math.cos(a) * 340, y: CY + Math.sin(a) * 222 };
    });
    const e = [...weight.entries()]
      .filter(([k]) => k.split("|").every((id) => p[id]))
      .map(([k, w]) => { const [a, b] = k.split("|"); return { a, b, w }; });
    return { pos: p, edges: e, used: live };
  }, []);

  const focus = hover;
  const near = new Set<string>(focus ? [focus] : []);
  if (focus) edges.forEach((e) => { if (e.a === focus) near.add(e.b); if (e.b === focus) near.add(e.a); });

  return (
    <div className="sg-wrap">
      <svg className="sg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Technology graph: lines join technologies used together in the same project">
        <g className="sg-edges">
          {edges.map((e) => {
            const a = pos[e.a], b = pos[e.b];
            const lit = focus && (e.a === focus || e.b === focus);
            return <path key={e.a + e.b} d={`M${a.x},${a.y} L${b.x},${b.y}`} className={`sg-edge${lit ? " lit" : ""}${focus && !lit ? " dim" : ""}`} strokeWidth={0.8 + e.w * 0.7} />;
          })}
        </g>
        {used.map((n) => {
          const { x, y } = pos[n.id];
          const r = n.core ? 34 : 22;
          const dim = focus && !near.has(n.id);
          const sel = active && n.match.includes(active);
          return (
            <g
              key={n.id}
              className={`sg-node${n.core ? " core" : ""}${dim ? " dim" : ""}${sel ? " sel" : ""}`}
              transform={`translate(${x},${y})`}
              tabIndex={0}
              role="button"
              aria-label={`${n.label} — show projects`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(n.match.find((m) => projects.some((p) => p.tech.includes(m))) ?? n.match[0])}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(n.match.find((m) => projects.some((p) => p.tech.includes(m))) ?? n.match[0]); } }}
            >
              <circle r={r} className="sg-pad" />
              {n.core && <circle r={r + 6} className="sg-ring" />}
              {n.icon ? (
                <path d={n.icon.path} transform={`translate(${-(r * 0.55)},${-(r * 0.55)}) scale(${(r * 1.1) / 24})`} className="sg-icon" />
              ) : (
                <text className="sg-abbr" textAnchor="middle" dy="0.34em">{n.abbr}</text>
              )}
              <text className="sg-label" textAnchor="middle" y={r + 15}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <p className="sg-legend"><span className="sg-dot core" /> core <span className="sg-dot" /> also used · lines = used together in a project · tap a part to trace it</p>
    </div>
  );
}
