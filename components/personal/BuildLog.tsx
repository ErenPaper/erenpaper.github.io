"use client";

import { useRef, useState } from "react";
import { buildLog } from "../../data/personal";
import { projects, type Project } from "../../data/portfolio";
import ProjectMedia from "../ProjectMedia";
import ProjectGraphic from "../ProjectGraphic";
import SectionHead from "./SectionHead";

// The build log, as a PS2 memory-card browser: each build is a "save file"
// icon; selecting one shows its details underneath, the way the PS2 browser
// shows a save's name and date. Only the fun builds live here (data/personal.ts
// → buildLog); the full engineering catalog is on Side A.

const STATUS: Record<string, string> = { progress: "IN PROGRESS", soon: "COMING SOON", shipped: "COMPLETE" };

function Icon({ p }: { p: Project }) {
  if (p.video) return <img src={`https://img.youtube.com/vi/${p.video}/mqdefault.jpg`} alt="" loading="lazy" />;
  if (p.image) return <img src={p.image} alt="" loading="lazy" />;
  if (p.art) return <ProjectGraphic project={p} className="pg-thumb" />;
  return <span className="sb-mc-blank" aria-hidden>{p.title.slice(0, 1)}</span>;
}

export default function BuildLog({ onFlip }: { onFlip: () => void }) {
  const saves = buildLog
    .map((b) => ({ ...b, p: projects.find((x) => x.title === b.title) }))
    .filter((b): b is { title: string; note: string; p: Project } => !!b.p);
  const [sel, setSel] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  if (!saves.length) return null;
  // On a phone the details sit below a tall grid — bring them into view on pick.
  const pick = (i: number) => {
    setSel(i);
    const el = detailRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight - 120) {
      window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };
  const cur = saves[Math.min(sel, saves.length - 1)];
  const { p } = cur;
  const status = p.status ?? "shipped";

  return (
    <section className="sb-section" id="sb-builds">
      <SectionHead ch={3} title="build log" note="the fun stuff i'm making" />
      <div className="sb-mc">
        <div className="sb-mc-bar">
          <span>MEMORY CARD (PS2) / 1</span>
          <span>{saves.length} SAVES</span>
        </div>

        <div className="sb-mc-grid" role="listbox" aria-label="Builds">
          {saves.map((b, i) => (
            <button
              key={b.title}
              role="option"
              aria-selected={i === sel}
              className={`sb-mc-save s-${b.p.status ?? "shipped"}${i === sel ? " on" : ""}`}
              onClick={() => pick(i)}
              style={{ ["--d" as string]: `${(i % 4) * -0.7}s` }}
            >
              <span className="sb-mc-icon"><Icon p={b.p} /></span>
              <span className="sb-mc-name">{b.p.title.split(/ — | \(/)[0]}</span>
              {b.p.status && b.p.status !== "shipped" && <span className="sb-mc-badge">{b.p.status === "progress" ? "WIP" : "SOON"}</span>}
            </button>
          ))}
        </div>

        <div className="sb-mc-detail" aria-live="polite" ref={detailRef}>
          <div className="sb-mc-detail-head">
            <h3 className="sb-mc-title">{p.title}</h3>
            <span className={`sb-mc-status s-${status}`}>{STATUS[status]}</span>
          </div>
          <p className="sb-mc-meta">{p.context ?? p.tag}</p>
          <p className="sb-mc-note">{cur.note}</p>
          {(p.video || p.image) && <div className="sb-mc-media"><ProjectMedia key={p.title} project={p} /></div>}
          {p.brief && (
            <details className="sb-mc-more">
              <summary>the longer version</summary>
              <p>{p.brief}</p>
            </details>
          )}
          <div className="sb-mc-tech">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
          <div className="sb-mc-links">
            {p.linksOut?.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
            ))}
            <button className="sb-flip-link" onClick={onFlip}>full engineering write-ups on Side A ↻</button>
          </div>
        </div>
      </div>
    </section>
  );
}
