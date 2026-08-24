// Build-time scrape of my Letterboxd WATCHLIST (the "want to watch" list), written
// to public/letterboxd-watchlist.json for the Side B "up next" widget to read.
// Unlike the diary, the watchlist is NOT in the RSS feed — it only exists as HTML
// on the public watchlist page, so this parses the poster grid. Runs in CI before
// `npm run build`. Fail-soft: any error just skips (the widget hides) so a
// Letterboxd hiccup or markup change never breaks a deploy.

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "erenpaper";
const PAGE = `https://letterboxd.com/${USER}/watchlist/`;
const OUT = "public/letterboxd-watchlist.json";
const MAX = 12;

// Slug → readable title fallback: "spider-man-brand-new-day" → "Spider Man Brand New Day".
const titleFromSlug = (slug) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const decode = (s = "") =>
  s.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&")
   .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#0?38;/g, "&");

const attr = (block, name) => {
  const m = block.match(new RegExp(`data-${name}="([^"]*)"`));
  return m ? decode(m[1]) : undefined;
};

try {
  const res = await fetch(PAGE, { headers: { "User-Agent": "portfolio-build" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const films = [];
  const seen = new Set();
  // Each watchlist poster is a <div class="react-component" ... data-item-slug="..."
  // data-item-name="Title (Year)" ...>. Watchlist order is newest-added first.
  for (const [, block] of html.matchAll(/<div class="react-component"([^>]*)>/g)) {
    const slug = attr(block, "item-slug");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    films.push({
      title: attr(block, "item-name") || titleFromSlug(slug),
      href: `https://letterboxd.com${attr(block, "item-link") || `/film/${slug}/`}`,
    });
    if (films.length >= MAX) break;
  }

  if (!films.length) throw new Error("no films parsed (markup may have changed)");

  mkdirSync("public", { recursive: true });
  writeFileSync(OUT, JSON.stringify(films, null, 2));
  console.log(`letterboxd watchlist: wrote ${films.length} film(s) → ${OUT}`);
} catch (e) {
  console.warn(`letterboxd watchlist: skipped (${e.message}) — widget will hide`);
}
