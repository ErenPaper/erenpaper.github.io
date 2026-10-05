// Build-time fetch of recently rated TV shows from Trakt, written to
// public/trakt.json for the Side B "recently finished" widget to read.
// Writes two files: trakt.json (finished = rated shows) and trakt-current.json
// (in progress = shows with a recent episode in your history).
// Runs in CI before `npm run build`. Fail-soft: with no TRAKT_CLIENT_ID, a
// private profile, or any API error it just skips, so a Trakt hiccup never
// breaks a deploy.
//
// "Finished" = a show you've rated on Trakt (rate a show when you wrap it).
// Needs a free Trakt API app for the Client ID (trakt.tv/oauth/applications)
// and a public profile. Reading public data needs no login or secret.

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "erenpaper";
const OUT = "public/trakt.json";
const OUT_CURRENT = "public/trakt-current.json";
const CURRENT_DAYS = 45;   // a show counts as "in progress" if watched this recently
const MAX = 12;
const KEY = process.env.TRAKT_CLIENT_ID;

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const headers = {
  "Content-Type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": KEY,
  "User-Agent": "erenpaper-portfolio-build",
};

async function get(path) {
  const res = await fetch(`https://api.trakt.tv/users/${USER}/${path}`, { headers });
  if (!res.ok) {
    const hint = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120);
    throw new Error(`HTTP ${res.status} ${hint}`.trim());
  }
  return res.json();
}

const showHref = (show) => (show.ids?.slug ? `https://trakt.tv/shows/${show.ids.slug}` : undefined);

mkdirSync("public", { recursive: true });

try {
  if (!KEY) throw new Error("TRAKT_CLIENT_ID not set");

  // Finished: shows you've rated, newest rating first.
  try {
    const rows = await get(`ratings/shows?limit=${MAX}`);
    rows.sort((a, b) => new Date(b.rated_at) - new Date(a.rated_at));
    const shows = rows.slice(0, MAX).map((r) => {
      const d = new Date(r.rated_at);
      return {
        title: r.show.title,
        rating: r.rating ? `${r.rating}/10` : undefined,
        date: `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        href: showHref(r.show),
      };
    });
    if (!shows.length) throw new Error("no rated shows (is the profile public?)");
    writeFileSync(OUT, JSON.stringify(shows, null, 2));
    console.log(`trakt: wrote ${shows.length} finished show(s) → ${OUT}`);
  } catch (e) {
    console.warn(`trakt: finished list skipped (${e.message})`);
  }

  // In progress: shows with an episode watched recently, latest episode each.
  try {
    const eps = await get("history/episodes?limit=40");
    const cutoff = Date.now() - CURRENT_DAYS * 86400000;
    const seen = new Set();
    const current = [];
    for (const h of eps) {   // history is newest first
      if (new Date(h.watched_at).getTime() < cutoff) break;
      if (seen.has(h.show.ids.trakt)) continue;
      seen.add(h.show.ids.trakt);
      const sn = String(h.episode.season).padStart(2, "0");
      const en = String(h.episode.number).padStart(2, "0");
      current.push({ title: h.show.title, date: `S${sn}E${en}`, href: showHref(h.show) });
      if (current.length >= 6) break;
    }
    writeFileSync(OUT_CURRENT, JSON.stringify(current, null, 2));
    console.log(`trakt: wrote ${current.length} in-progress show(s) → ${OUT_CURRENT}`);
  } catch (e) {
    console.warn(`trakt: in-progress list skipped (${e.message})`);
  }
} catch (e) {
  console.warn(`trakt: skipped (${e.message}) — widget falls back to the other sources`);
}
