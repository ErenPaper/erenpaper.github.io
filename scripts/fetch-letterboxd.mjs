// Build-time fetch of recently-watched Letterboxd films, written to
// public/letterboxd.json for the Side B "recently finished" widget to read.
// Runs in CI before `npm run build`. Fail-soft: any error just skips (the widget
// falls back to AniList + the typed list) so a Letterboxd hiccup never breaks a
// deploy.
//
// Source is the /films/ page (all WATCHED films, newest first, with ratings) —
// NOT the RSS feed, which only carries diary entries (films logged with a date).
// We still read the RSS to enrich watched-dates for the films that do have them.

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "erenpaper";
const FILMS = `https://letterboxd.com/${USER}/films/`;
const FEED = `https://letterboxd.com/${USER}/rss/`;
const OUT = "public/letterboxd.json";
const MAX = 12;

// Letterboxd stores ratings as 1–10 half-star units; 8 → ★★★★, 9 → ★★★★½.
const stars = (half) => {
  const n = Number(half) / 2;
  if (!n) return undefined;
  return "★".repeat(Math.floor(n)) + (n % 1 >= 0.5 ? "½" : "");
};

const decode = (s = "") =>
  s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'")
   .replace(/&quot;/g, '"').replace(/&#0?38;/g, "&");

// Review text from an RSS <description>: drop the poster paragraph, turn the
// remaining paragraphs into plain text, and trim to a short snippet.
const NOTE_MAX = 160;
const reviewText = (desc = "") => {
  const text = decode(
    desc
      .replace(/<p>\s*<img[^>]*>\s*<\/p>/g, "")
      .replace(/<\/p>\s*<p>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&#8217;/g, "\u2019").replace(/&#8220;|&#8221;/g, '"')
  ).replace(/\s+/g, " ").trim();
  if (text.length <= NOTE_MAX) return text;
  return text.slice(0, NOTE_MAX).replace(/\s+\S*$/, "") + "\u2026";
};

const attr = (block, name) => {
  const m = block.match(new RegExp(`data-${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};

try {
  // 1) Watched dates from the RSS diary, keyed by film slug (link ends /film/<slug>/…).
  const dateBySlug = {};
  const noteBySlug = {};
  try {
    const rss = await fetch(FEED, { headers: { "User-Agent": "portfolio-build" } });
    if (rss.ok) {
      const xml = await rss.text();
      for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const link = (item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
        const slug = (link.match(/\/film\/([^/]+)\//) || [])[1];
        const watched = (item.match(/<letterboxd:watchedDate>([^<]*)/) || [])[1];
        // Newest review text per film; spoiler-flagged reviews are never shown.
        const title = (item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
        const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/) || [])[1];
        if (slug && !noteBySlug[slug] && !/contains spoilers/i.test(title)) {
          const note = reviewText(desc);
          if (note) noteBySlug[slug] = note;
        }
        if (slug && watched && !dateBySlug[slug]) {
          dateBySlug[slug] = new Date(watched)
            .toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
        }
      }
    }
  } catch { /* diary is optional enrichment — ignore */ }

  // 2) The watched films grid (newest first), with per-film ratings.
  const res = await fetch(FILMS, { headers: { "User-Agent": "portfolio-build" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const films = [];
  const seen = new Set();
  for (const [, li] of html.matchAll(/<li class="griditem">([\s\S]*?)<\/li>/g)) {
    const slug = attr(li, "item-slug");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const half = (li.match(/rated-(\d+)/) || [])[1];
    films.push({
      title: attr(li, "item-name") || slug,
      rating: half ? stars(half) : undefined,
      date: dateBySlug[slug] || "",
      ...(noteBySlug[slug] && { note: noteBySlug[slug] }),
      href: `https://letterboxd.com${attr(li, "item-link") || `/film/${slug}/`}`,
    });
    if (films.length >= MAX) break;
  }

  if (!films.length) throw new Error("no films parsed (markup may have changed)");

  mkdirSync("public", { recursive: true });
  writeFileSync(OUT, JSON.stringify(films, null, 2));
  console.log(`letterboxd: wrote ${films.length} film(s) → ${OUT}`);
} catch (e) {
  console.warn(`letterboxd: skipped (${e.message}) — widget falls back to AniList + typed list`);
}
