"use client";

import { useEffect, useRef, useState } from "react";
import { sideB, shelves, band, recentlyWatched, currentlyWatching, tracks, type Watch, type Track } from "../../data/personal";
import { links, profile } from "../../data/portfolio";
import BeatMaker from "./BeatMaker";
import BuildLog from "./BuildLog";
import Credits from "./Credits";
import SectionHead, { SubHead } from "./SectionHead";
import { playChannelChange } from "../intro/sound";
import ProjectMedia from "../ProjectMedia";

// "Side B" — the personal side: the human counterpart to the engineering
// datasheet, styled like a Super 8 reel shot on a camcorder and browsed on a
// PS2 (VT323 on-screen-display type, scanlines, film sprockets, a memory-card
// browser for builds, end credits for the résumé). Content is data-driven
// (data/personal.ts + data/portfolio.ts) so it grows by adding entries.

/* ── decorative filmstrip divider ── */
function Filmstrip() {
  return (
    <div className="sb-filmstrip" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => <span key={i} />)}
    </div>
  );
}

/* ── camcorder viewfinder over the hero photo: REC + a running timecode
   (the photo already carries its own orange datestamp) ── */
function Viewfinder() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const tc = `${Math.floor(secs / 3600)}:${String(Math.floor(secs / 60) % 60).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div className="sb-vf" aria-hidden>
      <span className="sb-vf-c tl" /><span className="sb-vf-c tr" /><span className="sb-vf-c bl" /><span className="sb-vf-c br" />
      <span className="sb-vf-rec"><i /> REC</span>
      <span className="sb-vf-tc">SP {tc}</span>
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

const ANILIST_CURRENT = `query ($n: String) {
  MediaListCollection(userName: $n, type: ANIME, status: CURRENT, sort: UPDATED_TIME_DESC) {
    lists { entries { progress media { title { english romaji } episodes siteUrl } } }
  }
}`;

const MON = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const finDate = (c?: { year: number | null; month: number | null }) =>
  c?.year ? `${c.month ? MON[c.month] + " " : ""}${c.year}` : "";

// Show every rating as stars out of 5. "8/10" -> ★★★★, "9/10" -> ★★★★½ (whole
// numbers out of 10 map exactly onto half-stars, so nothing is lost). Ratings
// already in stars pass through unchanged.
const asStars = (rating?: string) => {
  const m = rating?.match(/^(\d+(?:\.\d+)?)\/10$/);
  if (!m) return rating;
  const half = Math.round(Number(m[1]));
  return "★".repeat(Math.floor(half / 2)) + (half % 2 ? "½" : "");
};

function RecentlyWatched() {
  const [films, setFilms] = useState<Watch[]>([]);
  const [anime, setAnime] = useState<Watch[]>([]);
  const [shows, setShows] = useState<Watch[]>([]);

  useEffect(() => {
    let ok = true;
    // Trakt shows: /trakt.json is generated at build time (needs TRAKT_CLIENT_ID);
    // ignore if it isn't there.
    fetch("/trakt.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ok && Array.isArray(d)) {
          setShows(d.slice(0, 4).map((f: { title: string; rating?: string; date: string; href?: string }) => ({ ...f, kind: "tv" as const })));
        }
      })
      .catch(() => {});

    // Letterboxd films: /letterboxd.json is generated at build time from the RSS
    // (may not exist locally) — ignore if it isn't there.
    fetch("/letterboxd.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ok && Array.isArray(d)) {
          setFilms(d.slice(0, 5).map((f: { title: string; rating?: string; date: string; href?: string }) => ({ ...f, kind: "film" as const })));
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
        setAnime(entries.slice(0, 4).map((e) => ({
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

  // Six slots with a guaranteed share per type (2 TV, 2 film, 2 anime) so none
  // can crowd out another; any slot a type can't fill goes to the others.
  const seen = new Set<string>();
  const fresh = (list: Watch[]) => list.filter((w) => {
    const k = w.title.toLowerCase().replace(/[^a-z0-9]/g, "");   // ignore case/punctuation
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const groups = [fresh([...recentlyWatched, ...shows]), fresh(films), fresh(anime)];
  const items: Watch[] = groups.flatMap((g) => g.slice(0, 2));
  for (const g of groups) {
    for (const w of g.slice(2)) if (items.length < 6) items.push(w);
  }
  if (items.length === 0) return null;

  return (
    <div className="sb-block" id="sb-watched">
      <SubHead title="just finished" note="latest i've wrapped" />
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
              {w.rating && <span className="sb-watch-rating">{asStars(w.rating)}</span>}
              <span className="sb-watch-date">{w.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── currently watching — live AniList (in-progress) + typed TV/docuseries ── */
function CurrentlyWatching() {
  const [anime, setAnime] = useState<Watch[]>([]);
  const [shows, setShows] = useState<Watch[]>([]);

  useEffect(() => {
    let ok = true;
    // Trakt in-progress shows: /trakt-current.json is generated at build time.
    fetch("/trakt-current.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ok && Array.isArray(d)) {
          setShows(d.slice(0, 4).map((f: { title: string; date: string; href?: string }) => ({ ...f, kind: "tv" as const })));
        }
      })
      .catch(() => {});

    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_CURRENT, variables: { n: "erenpaper" } }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        type AniEntry = { progress: number; media: { title: { english?: string; romaji?: string }; episodes: number | null; siteUrl: string } };
        const entries: AniEntry[] = (d?.data?.MediaListCollection?.lists ?? []).flatMap((l: { entries: AniEntry[] }) => l.entries);
        if (!ok || !entries.length) return;
        setAnime(entries.slice(0, 3).map((e) => ({
          title: e.media.title.english || e.media.title.romaji || "Untitled",
          kind: "anime" as const,
          date: e.media.episodes ? `EP ${e.progress} / ${e.media.episodes}` : `EP ${e.progress}`,
          href: e.media.siteUrl,
        })));
      })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  const items = [...currentlyWatching, ...shows, ...anime].slice(0, 6);
  if (items.length === 0) return null;

  return (
    <div className="sb-block" id="sb-watching">
      <SubHead title="mid-way through" note="currently watching" />
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
              <span className="sb-watch-date">{w.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
    <div className="sb-block" id="sb-watchlist">
      <SubHead title="up next" note="what's on my watchlist" />
      <div className="sb-watchlist">
        {films.map((f, i) => (
          <a className="sb-wl" key={f.href + i} href={f.href} target="_blank" rel="noreferrer">
            <span className="sb-wl-title">{f.title}</span>
            <span className="sb-wl-arrow" aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── music I make — audio tracks are cassettes (label + spinning reels) over a
   J-card that holds the note and player (SoundCloud / mp3); tracks with a video
   (e.g. a DAW session) are VHS tapes whose sleeve holds the video ── */
function TrackCard({ t, side }: { t: Track; side: string }) {
  const [playing, setPlaying] = useState(false);
  const sc = t.soundcloud
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.soundcloud)}&color=%23e07a4a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`
    : null;
  const hasPlayer = !!(t.youtube || sc || t.audio);
  return (
    <article className={`sb-mix${t.youtube ? " vhs" : ""}${playing ? " playing" : ""}${hasPlayer ? "" : " blank"}`}>
      <div className="sb-cass">
        <div className="sb-cass-label">
          <span className="sb-cass-side">{t.youtube ? "VHS" : side}</span>
          <span className="sb-cass-title">{t.title}</span>
          <span className="sb-cass-meta">{[t.kind, t.date].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="sb-cass-window" aria-hidden>
          <span className="sb-cass-reel" />
          <span className="sb-cass-ribbon" />
          <span className="sb-cass-reel" />
        </div>
        <span className="sb-cass-foot" aria-hidden><i /><i /><i /><i /></span>
      </div>
      <div className="sb-jcard">
        {t.youtube && <ProjectMedia project={{ title: t.title, tag: "", tech: [], video: t.youtube }} />}
        {sc && <iframe className="sb-jcard-sc" title={t.title} height="120" scrolling="no" frameBorder="no" allow="autoplay" src={sc} />}
        {t.audio && (
          <audio className="sb-jcard-audio" controls src={t.audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
        )}
        {t.note && <p className="sb-jcard-note">{t.note}</p>}
        {!hasPlayer && t.href && <a className="sb-link" href={t.href} target="_blank" rel="noreferrer">Listen ↗</a>}
      </div>
    </article>
  );
}

// The easter egg: an unlabelled blank tape at the end of the row. "Insert" it
// and the beat maker opens underneath (its label flips to ● REC).
function BlankTape({ open, onInsert }: { open: boolean; onInsert: () => void }) {
  return (
    <button className={`sb-mix sb-blank-tape${open ? " playing rec" : ""}`} onClick={onInsert} aria-expanded={open} title={open ? "Recording…" : "A blank tape?"}>
      <div className="sb-cass">
        <div className="sb-cass-label">
          <span className="sb-cass-side">{open ? "●" : ""}</span>
          <span className="sb-cass-title">{open ? "REC — your tape" : ""}</span>
          <span className="sb-cass-meta">C-60</span>
        </div>
        <div className="sb-cass-window" aria-hidden>
          <span className="sb-cass-reel" />
          <span className="sb-cass-ribbon" />
          <span className="sb-cass-reel" />
        </div>
        <span className="sb-cass-foot" aria-hidden><i /><i /><i /><i /></span>
      </div>
    </button>
  );
}

function MusicTracks({ beatOpen, onInsert }: { beatOpen: boolean; onInsert: () => void }) {
  const shown = tracks.filter((t) => t.title);
  return (
    <div className="sb-block" id="sb-music">
      <SubHead title="music i make" note="piano & cubase" />
      <div className="sb-tracks">
        {shown.map((t, i) => <TrackCard t={t} side={i % 2 ? "B" : "A"} key={t.title + i} />)}
        <BlankTape open={beatOpen} onInsert={onInsert} />
      </div>
    </div>
  );
}

// On wide screens the whole window becomes a camcorder viewfinder: corner
// brackets, ▶ PLAY, battery, the channel you're on, and a datestamp — it fills
// the side margins with something that actually says where you are.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function ScreenFrame({ channel }: { channel: string }) {
  const d = new Date();
  return (
    <div className="sb-frame" aria-hidden>
      <span className="sb-frame-c tl" /><span className="sb-frame-c tr" /><span className="sb-frame-c bl" /><span className="sb-frame-c br" />
      <span className="sb-frame-play">▶ PLAY</span>
      <span className="sb-frame-batt"><i /><i /><i /><i /></span>
      <span className="sb-frame-ch">{channel}</span>
      <span className="sb-frame-date">{MONTHS[d.getMonth()]} {String(d.getDate()).padStart(2, "0")} {d.getFullYear()}</span>
    </div>
  );
}

type Channel = "watching" | "music" | "builds" | "credits";
const CHANNELS: { id: Channel; label: string }[] = [
  { id: "watching", label: "watching" },
  { id: "music", label: "music" },
  { id: "builds", label: "build log" },
  { id: "credits", label: "credits" },
];

export default function PersonalSite() {
  const toMenu = () => window.dispatchEvent(new Event("os-exit"));
  const flip = () => window.dispatchEvent(new CustomEvent("os-flip", { detail: "pro" }));
  // The page is a TV: one channel on screen at a time, with a burst of static between.
  const [ch, setCh] = useState<Channel>("watching");
  const [flash, setFlash] = useState(false);
  const [beatOpen, setBeatOpen] = useState(false);
  const tvRef = useRef<HTMLDivElement>(null);
  const tune = (c: Channel) => {
    // switching from the sticky bar while deep in a channel jumps back to its top
    const el = tvRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (c === ch) return;
    playChannelChange();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
    setCh(c);
  };
  // A shared beat link (?beat=…) tunes straight to Music with the blank tape in.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("beat")) { setCh("music"); setBeatOpen(true); }
  }, []);
  const insertTape = () => {
    setBeatOpen((v) => !v);
    if (!beatOpen) window.setTimeout(() => document.getElementById("sb-beats")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  return (
    <div className="personal-site">
      <div className="sb-grain" aria-hidden />
      <div className="sb-scan" aria-hidden />
      <div className="sb-leak sb-leak-a" aria-hidden />
      <div className="sb-leak sb-leak-b" aria-hidden />
      <div className="sb-vignette" aria-hidden />
      <ScreenFrame channel={`CH ${String(CHANNELS.findIndex((c) => c.id === ch) + 1).padStart(2, "0")} · ${CHANNELS.find((c) => c.id === ch)!.label}`} />

      <nav className="sb-nav">
        <button className="sb-brand" onClick={toMenu} title="Back to main menu">rr</button>
        <span className="sb-nav-label">{sideB.kicker}</span>
        <button className="sb-btn sb-nav-push" onClick={flip} title="Flip to Side A — the professional side">↻ Side A</button>
        <button className="sb-btn" onClick={toMenu}>⌂ Menu</button>
      </nav>

      <main className="sb-main">
        {/* hero */}
        <header className="sb-hero">
          <div className="sb-hero-photo">
            <span className="sb-sprockets" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
            <div className="sb-hero-frame">
              <img src={profile.aboutPhoto} alt={profile.name} />
              <Viewfinder />
            </div>
            <span className="sb-sprockets" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
            <span className="sb-tape sb-tape-tl" aria-hidden />
            <span className="sb-tape sb-tape-br" aria-hidden />
            <span className="sb-hero-cap">the b-side</span>
          </div>
          <div className="sb-hero-text">
            <p className="sb-kicker">{sideB.kicker} · {new Date().getFullYear()}</p>
            <h1 className="sb-title" data-text={sideB.title}>{sideB.title}</h1>
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

        {/* the TV: channel switcher + one channel on screen at a time */}
        <div className="sb-tv" id="sb-tv" ref={tvRef}>
          <div className="sb-tv-bar" role="tablist" aria-label="Channels">
            {CHANNELS.map((c, i) => (
              <button key={c.id} role="tab" aria-selected={ch === c.id} className={`sb-tv-ch${ch === c.id ? " on" : ""}`} onClick={() => tune(c.id)}>
                <span className="sb-tv-num">CH {String(i + 1).padStart(2, "0")}</span>
                <span className="sb-tv-name">{c.label}</span>
              </button>
            ))}
          </div>

          <div className="sb-tv-screen" role="tabpanel">
            {flash && <div className="sb-static" aria-hidden />}

            {/* kept mounted (just hidden) so the live watch lists don't re-fetch on every switch */}
            <section className="sb-section" id="sb-ch-watching" hidden={ch !== "watching"}>
                <SectionHead ch={1} title="watching" note="what's on my screen" />
                <div className="sb-block">
                  <SubHead title="my lists" note="the ones i actually keep" />
                  <div className="sb-shelves">
                    {shelves.map((s) => (
                      <a className="sb-shelf" key={s.label} href={s.href} target="_blank" rel="noreferrer">
                        <span className="sb-shelf-label">{s.label}</span>
                        <span className="sb-shelf-handle">{s.handle}</span>
                        <span className="sb-shelf-arrow" aria-hidden>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
                <CurrentlyWatching />
                <RecentlyWatched />
                <Watchlist />
              </section>

            {ch === "music" && (
              <section className="sb-section" id="sb-ch-music">
                <SectionHead ch={2} title="music" note="the band, piano & cubase" />
                <div className="sb-block" id="sb-band">
                  <SubHead title="the band" note={`the family band, since ${band.since}`} />
                  <div className="sb-band">
                    {band.photo ? (
                      <div className="sb-band-photo">
                        <span className="sb-sprockets" aria-hidden>{Array.from({ length: 10 }).map((_, i) => <i key={i} />)}</span>
                        <img src={band.photo} alt={`${band.name} performing live`} />
                        <span className="sb-sprockets" aria-hidden>{Array.from({ length: 10 }).map((_, i) => <i key={i} />)}</span>
                        <span className="sb-tape sb-tape-tl" aria-hidden />
                        <span className="sb-tape sb-tape-br" aria-hidden />
                        <span className="sb-band-cap">the band · &rsquo;{band.since.slice(2)}</span>
                      </div>
                    ) : (
                      <span className="sb-band-disc" aria-hidden><i /></span>
                    )}
                    <div className="sb-band-text">
                      <h4 className="sb-band-name">{band.name}</h4>
                      <p>{band.blurb}</p>
                      <a className="sb-link" href={band.href} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>
                    </div>
                  </div>
                </div>
                <MusicTracks beatOpen={beatOpen} onInsert={insertTape} />
                {beatOpen && <BeatMaker />}
              </section>
            )}

            {ch === "builds" && <BuildLog onFlip={flip} />}
            {ch === "credits" && <Credits onFlip={flip} />}
          </div>
        </div>

        {/* footer */}
        <footer className="sb-footer">
          <p className="sb-foot-line">say hi —</p>
          <div className="sb-foot-links">
            <a href={`mailto:${links.email}`}>{links.email}</a>
            <a href={links.linkedin.url} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={links.github.url} target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <p className="sb-foot-sub">Side B · <button className="sb-flip-link" onClick={flip}>flip to Side A ↻</button></p>
        </footer>
      </main>
    </div>
  );
}
