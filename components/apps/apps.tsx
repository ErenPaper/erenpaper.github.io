"use client";

import { useEffect, useRef, useState } from "react";
import {
  profile, bio, links, experience, extracurriculars,
  projects, skills, interests, type Experience,
} from "../../data/portfolio";
import { useOS } from "../../store/windows";
import ProjectMedia from "../ProjectMedia";

/* ---------- shared bits ---------- */
function Tags({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <div className="tag-row">
      {items.map((t) => (
        <span className={`tag${accent ? " accent" : ""}`} key={t}>{t}</span>
      ))}
    </div>
  );
}

function XpList({ items }: { items: Experience[] }) {
  return (
    <div>
      {items.map((x) => (
        <div className="xp" key={x.company + x.role}>
          <div className="xp-head">
            <div>
              <div className="xp-co">{x.company}</div>
              <div className="xp-role">{x.role}</div>
            </div>
            <div className="xp-meta">{x.date}<br />{x.location}</div>
          </div>
          <ul>{x.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          <Tags items={x.tags} />
        </div>
      ))}
    </div>
  );
}

/* ---------- About ---------- */
export function AboutApp() {
  return (
    <div className="app">
      <p className="eyebrow">{profile.eyebrow}</p>
      <h1>{profile.name}</h1>
      <p style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{profile.title}</p>
      <div className="divider" />
      <div className="about-flex">
        <img src={profile.aboutPhoto} alt={profile.name} />
        <div className="about-copy">
          {bio.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Experience ---------- */
export function ExperienceApp() {
  return (
    <div className="app">
      <h2>Experience</h2>
      <XpList items={experience} />
    </div>
  );
}

/* ---------- Projects ---------- */
// Pro persona renders the catalog like a parts list + per-project datasheet
// (pin diagram, specs table, revision); personal keeps the card grid.
const projAddr = (i: number) => `0x${(0x40000000 + i * 0x400).toString(16).toUpperCase().padStart(8, "0")}`;
const projStatus = (s?: string) =>
  s === "soon" ? "Coming soon." : s === "progress" ? "In progress." : "Built and shipped.";

function PinDiagram({ tech, part }: { tech: string[]; part: string }) {
  const left = tech.filter((_, i) => i % 2 === 0);
  const right = tech.filter((_, i) => i % 2 === 1);
  return (
    <div className="dip" aria-hidden>
      <div className="dip-col dip-left">
        {left.map((t, i) => (
          <span className="dip-pin" key={t}><em>{t}</em><i /><b>{i * 2 + 1}</b></span>
        ))}
      </div>
      <div className="dip-body">
        <span className="dip-notch" />
        <span className="dip-part">{part}</span>
      </div>
      <div className="dip-col dip-right">
        {right.map((t, i) => (
          <span className="dip-pin" key={t}><b>{i * 2 + 2}</b><i /><em>{t}</em></span>
        ))}
      </div>
    </div>
  );
}

export function ProjectsApp() {
  const persona = useOS((s) => s.persona);
  const [active, setActive] = useState<number | null>(null);
  const p = active != null ? projects[active] : null;

  if (persona === "pro") {
    return (
      <div className="app">
        <h2>Projects</h2>
        <p style={{ marginBottom: 16 }}>
          Part catalog — capstone, firmware &amp; hardware builds first (mostly RP2040), then systems and ML.
        </p>
        {p && active != null ? (
          <div className="ds-sheet">
            <button className="tag accent" onClick={() => setActive(null)} style={{ cursor: "pointer", marginBottom: 14 }}>← back to catalog</button>
            <div className="ds-title-row">
              <h3>{p.title}</h3>
              <span className="ds-rev">REV {String.fromCharCode(65 + (active % 3))}</span>
            </div>
            <p className="ds-sub">{p.tag}</p>
            <PinDiagram tech={p.tech} part={`RR-${String(active + 1).padStart(2, "0")}`} />
            <table className="ds-specs">
              <tbody>
                <tr><th>FUNCTION</th><td>{p.tag}</td></tr>
                {p.stats && <tr><th>KEY METRICS</th><td>{p.stats.join(" · ")}</td></tr>}
                <tr><th>INTERFACES</th><td><Tags items={p.tech} accent /></td></tr>
                <tr><th>STATUS</th><td>{projStatus(p.status)}</td></tr>
                <tr><th>ADDRESS</th><td className="ds-addr">{projAddr(active)}</td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-list">
            <div className="ds-row ds-head" aria-hidden>
              <span>ADDR</span><span>PART</span><span>FUNCTION</span><span>STAT</span>
            </div>
            {projects.map((proj, i) => (
              <button className="ds-row" key={proj.title} onClick={() => setActive(i)}>
                <span className="ds-addr">{projAddr(i)}</span>
                <span className="ds-part">{proj.title}</span>
                <span className="ds-func">{proj.tag}</span>
                <span className={`ds-stat s-${proj.status ?? "shipped"}`}>
                  {proj.status === "soon" ? "PLAN" : proj.status === "progress" ? "WIP" : "OK"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <h2>Projects</h2>
      <p style={{ marginBottom: 16 }}>
        Capstone, firmware &amp; hardware builds first — mostly RP2040 work — then systems and ML projects below.
      </p>
      {p ? (
        <div className="proj-detail">
          <button className="tag accent" onClick={() => setActive(null)} style={{ cursor: "pointer", marginBottom: 14 }}>← back</button>
          <span className="pt">{p.context ?? p.tag}</span>
          <h3 style={{ fontSize: 22, margin: "6px 0 10px" }}>{p.title}</h3>
          {p.stats && (
            <div className="proj-stats">{p.stats.map((s) => <span key={s}>{s}</span>)}</div>
          )}
          <ProjectMedia project={p} />
          {p.brief && <p>{p.brief}</p>}
          {p.built && (
            <>
              <h4 style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", margin: "14px 0 8px", letterSpacing: 1 }}>WHAT I BUILT</h4>
              <ul className="proj-built">{p.built.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </>
          )}
          {p.insight && <p className="proj-insight">{p.insight}</p>}
          {!p.brief && <p>{projStatus(p.status)}</p>}
          <Tags items={p.tech} accent />
          {p.linksOut && (
            <div className="proj-links">
              {p.linksOut.map((l) => (
                <a key={l.href} className="tag accent" href={l.href} target="_blank" rel="noreferrer" style={{ cursor: "pointer" }}>{l.label}</a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="proj-grid">
          {projects.map((proj, i) => (
            <div
              key={proj.title}
              className={`proj-card${proj.featured ? " featured" : ""}${proj.status !== "shipped" ? " soon" : ""}`}
              onClick={() => setActive(i)}
            >
              <span className="pt">{proj.tag}</span>
              <h3>{proj.title}</h3>
              {proj.stats && <div className="proj-stats">{proj.stats.map((s) => <span key={s}>{s}</span>)}</div>}
              <Tags items={proj.tech} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Skills ---------- */
export function SkillsApp() {
  return (
    <div className="app">
      <h2>Skills</h2>
      {skills.map((c) => (
        <div className="skill-cat" key={c.name}>
          <h4>{c.name}</h4>
          <Tags items={c.skills} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Beyond (extracurriculars) ---------- */
export function BeyondApp() {
  return (
    <div className="app">
      <h2>Beyond Engineering</h2>
      <p style={{ marginBottom: 16 }}>Leadership, community, and performance — the work that happens off the bench.</p>
      <XpList items={extracurriculars} />
    </div>
  );
}

/* ---------- Hobbies (personal) ---------- */
export function HobbiesApp() {
  return (
    <div className="app">
      <h2>Hobbies</h2>
      <p style={{ marginBottom: 16 }}>
        The analog half — film, cartridges, and keys. When I&apos;m not chasing down a firmware bug, this is where I am.
      </p>
      <h4 style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: 10 }}>WHAT I&apos;M INTO</h4>
      <div className="interest-grid">
        {interests.map((i) => <span className="interest" key={i}>{i}</span>)}
      </div>
      <div className="divider" />
      <h4 style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: 12 }}>COMMUNITY &amp; PERFORMANCE</h4>
      <XpList items={extracurriculars.filter((x) => x.tags.includes("Piano") || x.tags.includes("Community"))} />
    </div>
  );
}

/* ---------- Contact ---------- */
export function ContactApp() {
  return (
    <div className="app">
      <h2>Contact</h2>
      <p style={{ marginBottom: 16 }}>Always happy to talk hardware, firmware, or a good dad joke.</p>
      <div className="contact-grid">
        <a className="contact-row" href={`mailto:${links.email}`}>
          <span className="cl">email</span><span className="cv">{links.email}</span>
        </a>
        <a className="contact-row" href={links.linkedin.url} target="_blank" rel="noreferrer">
          <span className="cl">linkedin</span><span className="cv">{links.linkedin.label}</span>
        </a>
        <a className="contact-row" href={links.github.url} target="_blank" rel="noreferrer">
          <span className="cl">github</span><span className="cv">{links.github.label}</span>
        </a>
      </div>
    </div>
  );
}

/* ---------- Resume ---------- */
export function ResumeApp() {
  return (
    <div className="app" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Résumé</h2>
        <a className="tag accent" href={profile.resume} target="_blank" rel="noreferrer" style={{ alignSelf: "center" }}>open ↗</a>
      </div>
      <iframe className="resume-frame" src={profile.resume} title="Résumé" style={{ flex: 1 }} />
    </div>
  );
}

/* ---------- Terminal ---------- */
const APP_CMDS: Record<string, string> = {
  about: "AboutApp", experience: "ExperienceApp", projects: "ProjectsApp",
  skills: "SkillsApp", beyond: "BeyondApp", hobbies: "HobbiesApp",
  contact: "ContactApp", resume: "ResumeApp",
};

export function TerminalApp() {
  const open = useOS((s) => s.open);
  const [lines, setLines] = useState<string[]>([
    "raphael-os v1.0 — type 'help' to begin.",
  ]);
  const [val, setVal] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    const out: string[] = [`$ ${cmd}`];
    const [base, arg] = cmd.split(/\s+/);
    switch (base) {
      case "help":
        out.push("commands: help, whoami, about, projects, skills, contact, resume, open <app>, clear");
        break;
      case "whoami":
        out.push(`${profile.name} — ${profile.title}. ${profile.eyebrow}`);
        break;
      case "about": out.push(bio[0]); break;
      case "projects": out.push(projects.map((p) => `• ${p.title}`).join("\n")); break;
      case "skills": out.push(skills.map((c) => `${c.name}: ${c.skills.join(", ")}`).join("\n")); break;
      case "contact": out.push(`email: ${links.email}\ngithub: ${links.github.url}\nlinkedin: ${links.linkedin.url}`); break;
      case "open": {
        const key = (arg || "").toLowerCase();
        if (APP_CMDS[key]) { out.push(`opening ${key}…`); openByCmd(key, open); }
        else out.push(`unknown app: ${arg || "(none)"} — try: ${Object.keys(APP_CMDS).join(", ")}`);
        break;
      }
      case "resume": out.push("opening résumé…"); openByCmd("resume", open); break;
      case "clear": setLines([]); return;
      case "": break;
      default: out.push(`command not found: ${base}`);
    }
    setLines((l) => [...l, ...out]);
  };

  return (
    <div className="term">
      <div className="term-out">
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith("$") ? "cmd" : undefined}>{l}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="term-in" onSubmit={(e) => { e.preventDefault(); run(val); setVal(""); }}>
        <span className="ps1">raphael@os ~$</span>
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} />
      </form>
    </div>
  );
}

// Terminal "open <app>" needs the registry; kept here to avoid a cycle.
function openByCmd(key: string, open: ReturnType<typeof useOS.getState>["open"]) {
  const meta: Record<string, { id: string; title: string; w: number; h: number }> = {
    about: { id: "about", title: "About Me", w: 560, h: 460 },
    experience: { id: "experience", title: "Experience", w: 640, h: 560 },
    projects: { id: "projects", title: "Projects", w: 760, h: 600 },
    skills: { id: "skills", title: "Skills", w: 600, h: 540 },
    beyond: { id: "beyond", title: "Beyond Engineering", w: 640, h: 560 },
    hobbies: { id: "hobbies", title: "Hobbies", w: 640, h: 560 },
    contact: { id: "contact", title: "Contact", w: 480, h: 380 },
    resume: { id: "resume", title: "Résumé", w: 720, h: 640 },
  };
  const m = meta[key];
  if (m) open(m.id, { title: m.title, w: m.w, h: m.h });
}
