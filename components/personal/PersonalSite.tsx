"use client";

import { useEffect, useState } from "react";
import { sideB, shelves, band, recentlyWatched, tracks, type Watch, type Track } from "../../data/personal";
import { links, profile, experience, projects } from "../../data/portfolio";
import ProjectMedia from "../ProjectMedia";

// "Side B" — the warm, analog personal space: the human counterpart to the
// engineering datasheet. A mobile-first magazine/scrapbook that shows both the
// life stuff (a growing feed: music / vlogs / photos / notes) AND the work
// (experience + projects), all in a film/vinyl aesthetic. Content is data-
// driven (data/personal.ts + data/portfolio.ts) so it grows by adding entries.

/* ── decorative filmstrip divider ── */
function Filmstrip() {
  return (
    <div className="sb-filmstrip" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => <span key={i} />)}
    </div>
  );
}

/* ── projects, warm "instant photo" cards that expand ── */
function ProjectsShowcase() {
  const [open, setOpen] = useState<number | null>(null);
  const shown = projects.filter((p) => p.status !== "soon");
  return (
    <div className="sb-proj-grid">
      {shown.map((p) => {
        const idx = projects.indexOf(p);
        const isOpen = open === idx;
        return (
          <div className={`sb-proj${isOpen ? " open" : ""}`} key={p.title}>
            <button className="sb-proj-head" onClick={() => setOpen(isOpen ? null : idx)} aria-expanded={isOpen}>
              <span className="sb-proj-title">{p.title}</span>
              <span className="sb-proj-tag">{p.tag}</span>
            </button>
            {isOpen && (
              <div className="sb-proj-body">
                <ProjectMedia project={p} />
                {p.brief && <p>{p.brief}</p>}
                <div className="sb-proj-tech">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
                {p.linksOut && (
                  <div className="sb-proj-links">
                    {p.linksOut.map((l) => (
                      <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── recently finished — live AniList (completed) + build-time Letterboxd + typed log ── */
const ANILIST_QUERY = `query ($n: String) {
  MediaListCollection(userName: $n, type: ANIME, status: COMPLETED, sort: FINISHED_ON_DESC) {
    lists { entries { score(format: POINT_10) completedAt { year month }
      media { title { english romaji } siteUrl } } }
  }
}`;

const MON = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const finDate = (c?: { year: number | null; month: number | null }) =>
  c?.year ? `${c.month ? MON[c.month] + " " : ""}${c.year}` : "";

function RecentlyWatched() {
  const [films, setFilms] = useState<Watch[]>([]);
  const [anime, setAnime] = useState<Watch[]>([]);

  useEffect(() => {
    let ok = true;
    // Letterboxd films: /letterboxd.json is generated at build time from the RSS
    // (may not exist locally) — ignore if it isn't there.
    fetch("/letterboxd.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ok && Array.isArray(d)) {
          setFilms(d.slice(0, 3).map((f: { title: string; rating?: string; date: string; href?: string }) => ({ ...f, kind: "film" as const })));
        }
      })
      .catch(() => {});

    // Anime: live from the AniList API (currently-watching, with progress + score).
    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { n: "erenpaper" } }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        type AniEntry = { score: number; completedAt: { year: number | null; month: number | null }; media: { title: { english?: string; romaji?: string }; siteUrl: string } };
        const entries: AniEntry[] = (d?.data?.MediaListCollection?.lists ?? []).flatMap((l: { entries: AniEntry[] }) => l.entries);
        if (!ok || !entries.length) return;
        setAnime(entries.slice(0, 3).map((e) => ({
          title: e.media.title.english || e.media.title.romaji || "Untitled",
          kind: "anime" as const,
          rating: e.score ? `${e.score}/10` : undefined,
          date: finDate(e.completedAt),
          href: e.media.siteUrl,
        })));
      })
      .catch(() => {});

    return () => { ok = false; };
  }, []);

  const items = [...anime, ...films, ...recentlyWatched].slice(0, 6);
  if (items.length === 0) return null;

  return (
    <section className="sb-section" id="sb-watched">
      <h2 className="sb-h2">recently finished <span className="sb-h2-note">latest i&apos;ve wrapped</span></h2>
      <div className="sb-watched">
        {items.map((w, i) => (
          <div className={`sb-watch k-${w.kind}`} key={w.title + i}>
            <span className="sb-watch-kind">{w.kind}</span>
            <div className="sb-watch-body">
              <span className="sb-watch-title">
                {w.href ? <a href={w.href} target="_blank" rel="noreferrer">{w.title}</a> : w.title}
              </span>
              {w.note && <span className="sb-watch-note">{w.note}</span>}
            </div>
            <div className="sb-watch-meta">
              {w.rating && <span className="sb-watch-rating">{w.rating}</span>}
              <span className="sb-watch-date">{w.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── up next — my live Letterboxd watchlist (scraped at build time) ── */
type WatchlistFilm = { title: string; href: string };

function Watchlist() {
  const [films, setFilms] = useState<WatchlistFilm[]>([]);

  useEffect(() => {
    let ok = true;
    // /letterboxd-watchlist.json is generated at build time from my public
    // watchlist page (may be empty locally) — ignore if it's missing/empty.
    fetch("/letterboxd-watchlist.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (ok && Array.isArray(d)) setFilms(d.slice(0, 10)); })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  if (!films.length) return null;

  return (
    <section className="sb-section" id="sb-watchlist">
      <h2 className="sb-h2">
        up next <span className="sb-h2-note">what&apos;s on my watchlist</span>
      </h2>
      <div className="sb-watchlist">
        {films.map((f, i) => (
          <a className="sb-wl" key={f.href + i} href={f.href} target="_blank" rel="noreferrer">
            <span className="sb-wl-title">{f.title}</span>
            <span className="sb-wl-arrow" aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── music I make — piano / Cubase, via SoundCloud / YouTube / mp3 ── */
function TrackCard({ t }: { t: Track }) {
  const sc = t.soundcloud
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.soundcloud)}&color=%23e07a4a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`
    : null;
  return (
    <article className="sb-track">
      <div className="sb-track-head">
        {t.kind && <span className="sb-track-kind">{t.kind}</span>}
        <span className="sb-track-title">{t.title}</span>
        {t.date && <span className="sb-track-date">{t.date}</span>}
      </div>
      {t.youtube && <ProjectMedia project={{ title: t.title, tag: "", tech: [], video: t.youtube }} />}
      {sc && <iframe className="sb-track-sc" title={t.title} height="120" scrolling="no" frameBorder="no" allow="autoplay" src={sc} />}
      {t.audio && <audio className="sb-track-audio" controls src={t.audio} />}
      {t.note && <p className="sb-track-note">{t.note}</p>}
      {!t.youtube && !sc && !t.audio && t.href && (
        <a className="sb-link" href={t.href} target="_blank" rel="noreferrer">Listen ↗</a>
      )}
    </article>
  );
}

function MusicTracks() {
  const shown = tracks.filter((t) => t.title);
  if (!shown.length) return null;
  return (
    <section className="sb-section" id="sb-music">
      <h2 className="sb-h2">music i make <span className="sb-h2-note">piano &amp; cubase</span></h2>
      <div className="sb-tracks">
        {shown.map((t, i) => <TrackCard t={t} key={t.title + i} />)}
      </div>
    </section>
  );
}

export default function PersonalSite() {
  const toMenu = () => window.dispatchEvent(new Event("os-exit"));
  const go = (id: string) => (ev: React.MouseEvent) => {
    ev.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="personal-site">
      <div className="sb-grain" aria-hidden />
      <div className="sb-vignette" aria-hidden />

      <nav className="sb-nav">
        <button className="sb-brand" onClick={toMenu} title="Back to main menu">rr</button>
        <span className="sb-nav-label">{sideB.kicker}</span>
        <ul className="sb-nav-links">
          <li><a href="#sb-watched" onClick={go("sb-watched")}>Watching</a></li>
          <li><a href="#sb-watchlist" onClick={go("sb-watchlist")}>Up Next</a></li>
          <li><a href="#sb-work" onClick={go("sb-work")}>The Work</a></li>
        </ul>
        <button className="sb-btn" onClick={toMenu}>⌂ Menu</button>
      </nav>

      <main className="sb-main">
        {/* hero */}
        <header className="sb-hero">
          <div className="sb-hero-photo">
            <span className="sb-sprockets" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
            <img src={profile.aboutPhoto} alt={profile.name} />
            <span className="sb-sprockets" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
            <span className="sb-tape sb-tape-tl" aria-hidden />
            <span className="sb-tape sb-tape-br" aria-hidden />
            <span className="sb-hero-cap">the b-side</span>
          </div>
          <div className="sb-hero-text">
            <p className="sb-kicker">{sideB.kicker} · {new Date().getFullYear()}</p>
            <h1 className="sb-title">{sideB.title}</h1>
            <p className="sb-intro">{sideB.intro}</p>
            <a className="sb-vinyl" href={band.href} target="_blank" rel="noreferrer">
              <span className="sb-disc" aria-hidden><i /></span>
              <div className="sb-vinyl-meta">
                <span className="sb-vinyl-k">NOW SPINNING</span>
                <span className="sb-vinyl-t">{band.name} — our family band ↗</span>
              </div>
            </a>
          </div>
        </header>

        <Filmstrip />

        {/* shelves — living lists (real, not claims) */}
        <section className="sb-section" id="sb-shelves">
          <h2 className="sb-h2">on my shelves <span className="sb-h2-note">the lists I actually keep</span></h2>
          <div className="sb-shelves">
            {shelves.map((s) => (
              <a className="sb-shelf" key={s.label} href={s.href} target="_blank" rel="noreferrer">
                <span className="sb-shelf-label">{s.label}</span>
                <span className="sb-shelf-handle">{s.handle}</span>
                <span className="sb-shelf-arrow" aria-hidden>↗</span>
              </a>
            ))}
          </div>
        </section>

        <RecentlyWatched />

        <Watchlist />

        {/* the family band — real, featured */}
        <section className="sb-section" id="sb-band">
          <div className="sb-band">
            <span className="sb-band-disc" aria-hidden><i /></span>
            <div className="sb-band-text">
              <span className="sb-band-kicker">FAMILY BAND · SINCE {band.since}</span>
              <h3 className="sb-band-name">{band.name}</h3>
              <p>{band.blurb}</p>
              <a className="sb-link" href={band.href} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
            </div>
          </div>
        </section>

        <MusicTracks />

        <Filmstrip />

        {/* the work — experience + projects, warm-styled */}
        <section className="sb-section" id="sb-work">
          <h2 className="sb-h2">the work <span className="sb-h2-note">yes, i build things too</span></h2>

          <h3 className="sb-h3">where i&apos;ve been</h3>
          <div className="sb-xp-list">
            {experience.map((x) => (
              <article className="sb-xp" key={x.company + x.role}>
                <div className="sb-xp-dot" aria-hidden />
                <div className="sb-xp-main">
                  <div className="sb-xp-head">
                    <span className="sb-xp-co">{x.company}</span>
                    <span className="sb-xp-date">{x.date}</span>
                  </div>
                  <div className="sb-xp-role">{x.role} · {x.location}</div>
                  <p>{x.bullets[0]}</p>
                </div>
              </article>
            ))}
          </div>

          <h3 className="sb-h3">things i&apos;ve made</h3>
          <ProjectsShowcase />
        </section>

        {/* footer */}
        <footer className="sb-footer">
          <p className="sb-foot-line">say hi —</p>
          <div className="sb-foot-links">
            <a href={`mailto:${links.email}`}>{links.email}</a>
            <a href={links.linkedin.url} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={links.github.url} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <p className="sb-foot-sub">Side B · more soon</p>
        </footer>
      </main>
    </div>
  );
}
