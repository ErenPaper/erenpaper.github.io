"use client";

import { useEffect, useRef, useState } from "react";
import {
  profile, bio, links, experience, extracurriculars,
  projects, skills, certifications, type Project,
} from "../../data/portfolio";
import { useOS } from "../../store/windows";
import ProjectMedia from "../ProjectMedia";
import ProjectGraphic from "../ProjectGraphic";

// GitHub-style mark for the "has a repo" row flag.
function GitMark() {
  return (
    <svg className="ds-flag-svg" viewBox="0 0 16 16" width="11" height="11" aria-hidden>
      <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.03.08-2.13 0 0 .67-.21 2.2.82a7.5 7.5 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Small "what's inside" flags shown on a catalog row / build card. The GitHub
// mark opens the repo directly; with `onVideo`, the ▶ opens the row and plays
// the demo immediately. Without it (build cards) the marks are just indicators.
function projFlags(proj: Project, onVideo?: () => void) {
  const repo = proj.linksOut?.find((l) => /github/i.test(l.href));
  if (!proj.video && !proj.image && !repo) return null;
  return (
    <span className="ds-flags">
      {proj.video &&
        (onVideo ? (
          <button className="ds-flag ds-flag-link" title="Play demo" onClick={(e) => { e.stopPropagation(); onVideo(); }}>▶</button>
        ) : (
          <span className="ds-flag" title="Has a demo video">▶</span>
        ))}
      {proj.image && <span className="ds-flag" title="Has a screenshot">▦</span>}
      {repo && (
        <a
          className="ds-flag ds-flag-link"
          href={repo.href}
          target="_blank"
          rel="noreferrer"
          title="Open GitHub repo"
          onClick={(e) => e.stopPropagation()}
        >
          <GitMark />
        </a>
      )}
    </span>
  );
}


// Professional persona: a full-page, scrolling "engineering datasheet" — not a
// desktop. Reads top-to-bottom like a technical document, styled as a component
// datasheet / lab notebook (mono type, silkscreen dividers, datasheet project
// cards). Content comes from data/portfolio.ts. Personal keeps the retro OS.

const NAV = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "certs", label: "Certs" },
  { id: "beyond", label: "Beyond" },
];

// Active + planned builds power the "currently building" section.
const currentWork = projects.filter((p) => p.status === "progress" || p.status === "soon");

// Datasheet flourishes: a memory-map style address for the catalog + a part
// number for the DIP diagram. Both are stylistic labels, not real telemetry.
const addr = (i: number) => `0x${(0x40000000 + i * 0x400).toString(16).toUpperCase().padStart(8, "0")}`;
const partNo = (i: number) => `RR-${String(i + 1).padStart(2, "0")}`;
const statLabel = (s?: string) => (s === "soon" ? "PLAN" : s === "progress" ? "WIP" : "OK");
const statText = (s?: string) => (s === "soon" ? "Coming soon." : s === "progress" ? "In progress." : "Built and shipped.");

// Small catalog-row thumbnail: demo video frame, screenshot, or — when there's
// neither — a generative graphic hinting at what the project does.
function rowThumb(proj: Project) {
  if (proj.video) return <img src={`https://img.youtube.com/vi/${proj.video}/mqdefault.jpg`} alt="" loading="lazy" />;
  if (proj.image) return <img className="ds-thumb-shot" src={proj.image} alt="" loading="lazy" />;
  return <ProjectGraphic project={proj} className="pg-thumb" />;
}

function SilkDivider({ label }: { label: string }) {
  return (
    <div className="ps-divider" role="separator" aria-label={label}>
      <span className="ps-divider-line" />
      <span className="ps-divider-label">{label}</span>
      <span className="ps-divider-line" />
    </div>
  );
}

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

export default function ProSite() {
  const { theme, setTheme } = useOS();
  const [openProj, setOpenProj] = useState<number | null>(null);
  const [autoPlayIdx, setAutoPlayIdx] = useState<number | null>(null);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(`ps-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toMenu = () => window.dispatchEvent(new Event("os-exit"));

  // Click a skill → highlight matching projects and open the first one. `scroll`
  // jumps to the catalog (from the far-away Skills section); the in-place
  // "trace by" chips at the catalog pass false so filtering doesn't bounce.
  const pickSkill = (s: string, scroll = false) => {
    const next = skillFilter === s ? null : s;
    setSkillFilter(next);
    if (next) {
      const idx = projects.findIndex((p) => p.tech.includes(next));
      setOpenProj(idx >= 0 ? idx : null);
      if (scroll) document.getElementById("ps-projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setOpenProj(null);
    }
  };
  const matchCount = skillFilter ? projects.filter((p) => p.tech.includes(skillFilter)).length : 0;
  const toggle = (i: number) => { setAutoPlayIdx(null); setOpenProj((cur) => (cur === i ? null : i)); };
  // Open a row with its demo already playing (from the ▶ flag).
  const openVideo = (i: number) => { setOpenProj(i); setAutoPlayIdx(i); };

  // Close the About popover on Escape.
  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAboutOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aboutOpen]);

  // Scroll-reveal: sections rise in as they enter view (skipped for reduced motion).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = rootRef.current?.querySelectorAll(".ps-section");
    if (!els) return;
    if (reduce) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="pro-site" ref={rootRef}>
      <div className="ps-pcb" aria-hidden />

      {/* ── top nav / part header bar ── */}
      <nav className="ps-nav">
        <button className="ps-brand" onClick={toMenu} title="Back to main menu">
          <span className="ps-brand-mark">rr</span>
          <span className="ps-brand-part">RR-01 · REV C</span>
        </button>
        <ul className="ps-links">
          {NAV.map((n) => (
            <li key={n.id}><a href={`#ps-${n.id}`} onClick={go(n.id)}>{n.label}</a></li>
          ))}
        </ul>
        <div className="ps-nav-right">
          <button className="ps-btn ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? "☾" : "☀"}
          </button>
          <a className="ps-btn ghost" href={profile.resume} target="_blank" rel="noreferrer">Résumé ↗</a>
          <a className="ps-btn solid" href={`mailto:${links.email}`}>Get in touch</a>
          <button className="ps-btn" onClick={toMenu}>⌂ Menu</button>
        </div>
      </nav>

      <main className="ps-main">
        {/* ── datasheet title block ── */}
        <header className="ps-hero" id="ps-top">
          <div className="ps-hero-main">
            <p className="ps-eyebrow">{profile.eyebrow}</p>
            <h1 className="ps-name">{profile.name}</h1>
            <p className="ps-title">
              {profile.title}
              <span className="ps-eit" title="Engineer-in-Training · APEGA">EIT</span>
            </p>
            <p className="ps-tagline">{profile.tagline}</p>
            <div className="ps-status">
              <span className="ps-led on" /> BUILD OK
              <span className="ps-sep">·</span> CLASS OF 2026
              <span className="ps-sep">·</span> EDMONTON, AB
            </div>
            <div className="ps-cta">
              <a className="ps-btn solid" href="#ps-projects" onClick={go("projects")}>View projects</a>
            </div>
          </div>
          <aside className="ps-hero-spec">
            <button className="ps-photo" onClick={() => setAboutOpen(true)} aria-haspopup="dialog" title="About me">
              <img src={profile.photo} alt={profile.name} />
              <span className="ps-photo-badge">ⓘ About me</span>
            </button>
            <div className="ps-photo-cap">RR-01 · R. RAMOS · tap photo for bio</div>
          </aside>
        </header>

        {/* ── experience ── */}
        <section className="ps-section" id="ps-experience">
          <SilkDivider label="01 · EXPERIENCE" />
          {experience.map((x) => (
            <article className="ps-xp" key={x.company + x.role}>
              <div className="ps-xp-head">
                <div>
                  <h3>{x.company}</h3>
                  <p className="ps-xp-role">{x.role}</p>
                </div>
                <div className="ps-xp-meta">{x.date}<br />{x.location}</div>
              </div>
              <ul>{x.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              <div className="ps-tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </article>
          ))}
        </section>

        {/* ── projects · catalog + datasheet (currently-building leads it off) ── */}
        <section className="ps-section" id="ps-projects">
          <SilkDivider label="02 · PROJECTS" />
          {currentWork.length > 0 && (
            <div className="ps-bench" id="ps-now">
              <span className="ps-bench-label"><span className="ps-led on" /> ON THE BENCH NOW</span>
              <div className="ps-bench-items">
                {currentWork.map((proj) => (
                  <span className={`ps-bench-chip s-${proj.status ?? "shipped"}`} key={proj.title}>
                    <span className="ps-bench-dot" aria-hidden />
                    <span className="ps-bench-name">{proj.title}</span>
                    <span className="ps-bench-state">{proj.status === "progress" ? "IN PROGRESS" : "PLANNED"}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="ps-lead">
            Selected work — capstone and firmware/hardware first (mostly RP2040), then systems and ML.
            Open any project for the full breakdown; close it to drop back to the list.
          </p>
          {skillFilter && (
            <div className="ps-filterbar">
              <span className="ps-led on" />
              <span className="ps-filter-text">
                SKILL <b>{skillFilter}</b> · {matchCount} {matchCount === 1 ? "part" : "parts"}
              </span>
              <button className="ps-filter-clear" onClick={() => setSkillFilter(null)}>clear ✕</button>
            </div>
          )}
          <div className="ds-list">
            <div className="ds-row ds-head" aria-hidden>
              <span /><span>ADDR</span><span>PART</span><span>FUNCTION</span><span>STAT</span>
            </div>
            {projects.map((proj, i) => {
              const match = skillFilter ? proj.tech.includes(skillFilter) : null;
              return (
              <div key={proj.title} className={match === false ? "ds-dim" : match ? "ds-match" : undefined}>
                <div
                  className="ds-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
                  aria-expanded={openProj === i}
                >
                  <span className="ds-thumb">{rowThumb(proj)}</span>
                  <span className="ds-addr">{addr(i)}</span>
                  <span className="ds-part">
                    <span className="ds-part-name">{proj.title}</span>
                    {projFlags(proj, () => openVideo(i))}
                  </span>
                  <span className="ds-func">{proj.tag}</span>
                  <span className={`ds-stat s-${proj.status ?? "shipped"}`}>{statLabel(proj.status)}</span>
                </div>
                {openProj === i && (
                  <div className="ds-sheet ps-sheet-inline">
                    <div className="ds-title-row">
                      <h3>{proj.title}</h3>
                      <div className="ds-title-actions">
                        <span className="ds-rev">REV {String.fromCharCode(65 + (i % 3))}</span>
                        <button className="ds-close" onClick={() => setOpenProj(null)}>✕ close</button>
                      </div>
                    </div>
                    <p className="ds-sub">{proj.context ?? proj.tag}</p>

                    {proj.video || proj.image ? (
                      <ProjectMedia project={proj} autoPlay={autoPlayIdx === i} />
                    ) : (
                      <div className="ps-graphic"><ProjectGraphic project={proj} /></div>
                    )}
                    {proj.brief && <p className="ps-brief">{proj.brief}</p>}

                    <div className="ps-sheet-cols">
                      <PinDiagram tech={proj.tech} part={partNo(i)} />
                      <table className="ds-specs">
                        <tbody>
                          <tr><th>FUNCTION</th><td>{proj.tag}</td></tr>
                          {proj.stats && <tr><th>KEY METRICS</th><td>{proj.stats.join(" · ")}</td></tr>}
                          <tr><th>INTERFACES</th><td>
                            <div className="ps-tags">{proj.tech.map((t) => <span key={t}>{t}</span>)}</div>
                          </td></tr>
                          <tr><th>STATUS</th><td>{statText(proj.status)}</td></tr>
                          <tr><th>ADDRESS</th><td className="ds-addr">{addr(i)}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {proj.built && (
                      <div className="ps-built">
                        <div className="ps-built-head">WHAT I BUILT</div>
                        <ul>{proj.built.map((b, k) => <li key={k}>{b}</li>)}</ul>
                      </div>
                    )}
                    {proj.insight && (
                      <p className="ps-insight"><span>WHAT I LEARNED</span>{proj.insight}</p>
                    )}
                    {proj.linksOut && (
                      <div className="ps-proj-links">
                        {proj.linksOut.map((l) => (
                          <a key={l.href} className="ps-btn ghost" href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </section>

        {/* ── skills · instrument bars (click to trace where a skill was used) ── */}
        <section className="ps-section" id="ps-skills">
          <SilkDivider label="03 · SKILLS" />
          <p className="ps-lead">Tap a skill to trace it back to the projects that use it.</p>
          <div className="ps-skill-grid">
            {skills.map((c) => (
              <div className="ps-skill-panel" key={c.name}>
                <div className="ps-skill-head">
                  <span>{c.name}</span>
                  <span className="ps-led on" />
                </div>
                <div className="ps-chips">
                  {c.skills.map((s) => {
                    const usable = projects.some((p) => p.tech.includes(s));
                    return (
                      <button
                        key={s}
                        className={`ps-chip-btn${skillFilter === s ? " active" : ""}${usable ? "" : " inert"}`}
                        onClick={() => usable && pickSkill(s, true)}
                        title={usable ? `Show projects using ${s}` : undefined}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── certifications & licenses ── */}
        <section className="ps-section" id="ps-certs">
          <SilkDivider label="04 · CERTIFICATIONS & LICENSES" />
          <div className="ps-cert-grid">
            {certifications.map((c) => (
              <div className={`ps-cert${c.tag ? " lic" : ""}`} key={c.name}>
                <div className="ps-cert-top">
                  <span className="ps-cert-name">{c.name}</span>
                  {c.tag && <span className="ps-cert-badge">{c.tag}</span>}
                </div>
                <div className="ps-cert-meta">{c.issuer} · {c.date}</div>
                {c.credentialId && <div className="ps-cert-id">CREDENTIAL {c.credentialId}</div>}
                {c.note && <p className="ps-cert-note">{c.note}</p>}
                {c.credential && (
                  <a className="ps-cert-link" href={c.credential} target="_blank" rel="noreferrer">View certificate ↗</a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── beyond engineering ── */}
        <section className="ps-section" id="ps-beyond">
          <SilkDivider label="05 · BEYOND ENGINEERING" />
          <p className="ps-lead">Leadership, community, and performance — the work that happens off the bench.</p>
          {extracurriculars.map((x) => (
            <article className="ps-xp" key={x.company + x.role}>
              <div className="ps-xp-head">
                <div>
                  <h3>{x.company}</h3>
                  <p className="ps-xp-role">{x.role}</p>
                </div>
                <div className="ps-xp-meta">{x.date}<br />{x.location}</div>
              </div>
              <ul>{x.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              <div className="ps-tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </article>
          ))}
        </section>

        {/* ── footer (contact lives here now) ── */}
        <footer className="ps-footer" id="ps-contact">
          <div className="ps-foot-contact">
            <a href={`mailto:${links.email}`}>{links.email}</a>
            <a href={links.linkedin.url} target="_blank" rel="noreferrer">LinkedIn ↗</a>
            <a href={links.github.url} target="_blank" rel="noreferrer">GitHub ↗</a>
          </div>
          <div className="ps-foot-meta">
            <span>RR-01 · RAPHAEL RAMOS</span>
            <span>© 2026 · REV C · ALL SYSTEMS NOMINAL</span>
          </div>
        </footer>
      </main>

      {aboutOpen && (
        <div className="ps-about-modal" role="dialog" aria-modal="true" aria-label="About Raphael Ramos" onClick={() => setAboutOpen(false)}>
          <div className="ps-about-card" onClick={(e) => e.stopPropagation()}>
            <button className="ps-about-close" onClick={() => setAboutOpen(false)} aria-label="Close">✕</button>
            <p className="ps-about-eyebrow">{"// ABOUT"}</p>
            <h3>{profile.name}</h3>
            {bio.map((p, i) => <p key={i} className="ps-about-p">{p}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
