// Build-time fetch of recently rated TV shows from Trakt, written to
// public/trakt.json for the Side B "recently finished" widget to read.
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
const MAX = 12;
const KEY = process.env.TRAKT_CLIENT_ID;

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

try {
  if (!KEY) throw new Error("TRAKT_CLIENT_ID not set");

  const res = await fetch(`https://api.trakt.tv/users/${USER}/ratings/shows?limit=${MAX}`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": KEY,
      "User-Agent": "erenpaper-portfolio-build",
    },
  });
  if (!res.ok) {
    const hint = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120);
    throw new Error(`HTTP ${res.status} ${hint}`.trim());
  }
  const rows = await res.json();

  // Newest rating first.
  rows.sort((a, b) => new Date(b.rated_at) - new Date(a.rated_at));

  const shows = rows.slice(0, MAX).map((r) => {
    const d = new Date(r.rated_at);
    return {
      title: r.show.title,
      rating: r.rating ? `${r.rating}/10` : undefined,
      date: `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      href: r.show.ids?.slug ? `https://trakt.tv/shows/${r.show.ids.slug}` : undefined,
    };
  });

  if (!shows.length) throw new Error("no rated shows (is the profile public?)");

  mkdirSync("public", { recursive: true });
  writeFileSync(OUT, JSON.stringify(shows, null, 2));
  console.log(`trakt: wrote ${shows.length} show(s) → ${OUT}`);
} catch (e) {
  console.warn(`trakt: skipped (${e.message}) — widget falls back to the other sources`);
}
