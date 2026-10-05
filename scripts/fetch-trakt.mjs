// Build-time fetch of your Trakt TV activity, written to two files for the Side B
// widgets. Runs in CI before `npm run build`. Fail-soft: with no TRAKT_CLIENT_ID,
// a private profile, or any API error it just skips, so a Trakt hiccup never
// breaks a deploy.
//
//   public/trakt.json          finished shows  (recently finished)
//   public/trakt-current.json  shows in progress (currently watching)
//
// A show is FINISHED when the number of distinct regular episodes you've watched
// is at least the number it has aired (specials ignored) — no rating needed. Its
// date is the last episode you watched. Shows you rated but have no watch history
// for are kept too, dated by the rating. A show is IN PROGRESS when it isn't
// finished and you watched an episode in the last CURRENT_DAYS days.
//
// Needs a free Trakt API app for the Client ID (trakt.tv/oauth/applications) and a
// public profile. Reading public data needs no login or secret.

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "erenpaper";
const OUT = "public/trakt.json";
const OUT_CURRENT = "public/trakt-current.json";
const MAX = 12;            // finished shows kept
const CANDIDATES = 40;     // most recently watched shows to examine
const CURRENT_DAYS = 45;   // "in progress" = watched an episode this recently
const KEY = process.env.TRAKT_CLIENT_ID;

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const monthYear = (iso) => {
  const d = new Date(iso);
  return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const headers = {
  "Content-Type": "application/json",
  "trakt-api-version": "2",
  "trakt-api-key": KEY,
  "User-Agent": "erenpaper-portfolio-build",
};

async function get(path) {
  const res = await fetch(`https://api.trakt.tv/${path}`, { headers });
  if (!res.ok) {
    const hint = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120);
    throw new Error(`HTTP ${res.status} ${hint}`.trim());
  }
  return res.json();
}

const showHref = (show) => (show.ids?.slug ? `https://trakt.tv/shows/${show.ids.slug}` : undefined);

// Regular episodes only (season 0 = specials), each with its last watch time.
function watchedEpisodes(entry) {
  const eps = [];
  for (const season of entry.seasons ?? []) {
    if (season.number === 0) continue;
    for (const ep of season.episodes ?? []) {
      if (ep.plays > 0) eps.push({ season: season.number, number: ep.number, at: ep.last_watched_at });
    }
  }
  return eps;
}

mkdirSync("public", { recursive: true });

try {
  if (!KEY) throw new Error("TRAKT_CLIENT_ID not set");

  const watched = await get(`users/${USER}/watched/shows`);
  watched.sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at));

  // Ratings by show id, to attach a rating to a finished show (and to keep rated
  // shows that have no watch history).
  let ratings = [];
  try {
    ratings = await get(`users/${USER}/ratings/shows`);
  } catch (e) {
    console.warn(`trakt: ratings skipped (${e.message})`);
  }
  const ratingById = new Map(ratings.map((r) => [r.show.ids.trakt, r]));

  const finished = [];
  const current = [];
  const cutoff = Date.now() - CURRENT_DAYS * 86400000;

  for (const entry of watched.slice(0, CANDIDATES)) {
    const id = entry.show.ids.trakt;
    const eps = watchedEpisodes(entry);
    if (!eps.length) continue;

    let aired = 0;
    try {
      aired = (await get(`shows/${id}?extended=full`)).aired_episodes ?? 0;
    } catch (e) {
      console.warn(`trakt: could not check "${entry.show.title}" (${e.message})`);
      continue;
    }

    const distinct = new Set(eps.map((e) => `${e.season}x${e.number}`)).size;
    const latest = eps.reduce((a, b) => (new Date(b.at) > new Date(a.at) ? b : a));
    const rating = ratingById.get(id)?.rating;

    if (aired > 0 && distinct >= aired) {
      finished.push({
        title: entry.show.title,
        rating: rating ? `${rating}/10` : undefined,
        date: monthYear(entry.last_watched_at),
        href: showHref(entry.show),
        at: entry.last_watched_at,
      });
    } else if (new Date(latest.at).getTime() >= cutoff) {
      const sn = String(latest.season).padStart(2, "0");
      const en = String(latest.number).padStart(2, "0");
      current.push({ title: entry.show.title, date: `S${sn}E${en}`, href: showHref(entry.show), at: latest.at });
    }
  }

  // Rated shows with no watch history still count as finished.
  const watchedIds = new Set(watched.map((w) => w.show.ids.trakt));
  for (const r of ratings) {
    if (watchedIds.has(r.show.ids.trakt)) continue;
    finished.push({
      title: r.show.title,
      rating: r.rating ? `${r.rating}/10` : undefined,
      date: monthYear(r.rated_at),
      href: showHref(r.show),
      at: r.rated_at,
    });
  }

  const byNewest = (a, b) => new Date(b.at) - new Date(a.at);
  const strip = ({ at, ...rest }) => rest;
  finished.sort(byNewest);
  current.sort(byNewest);

  writeFileSync(OUT, JSON.stringify(finished.slice(0, MAX).map(strip), null, 2));
  writeFileSync(OUT_CURRENT, JSON.stringify(current.slice(0, 6).map(strip), null, 2));
  console.log(`trakt: wrote ${Math.min(finished.length, MAX)} finished → ${OUT}, ${Math.min(current.length, 6)} in progress → ${OUT_CURRENT}`);
} catch (e) {
  console.warn(`trakt: skipped (${e.message}) — widget falls back to the other sources`);
}
