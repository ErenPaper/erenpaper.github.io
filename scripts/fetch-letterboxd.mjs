// Build-time fetch of recent Letterboxd films from the public RSS feed, written
// to public/letterboxd.json for the Side B "recently watched" widget to read.
// Runs in CI before `npm run build`. Fail-soft: any error just skips (leaves the
// widget on the hand-typed list) so a Letterboxd hiccup never breaks a deploy.

import { writeFileSync, mkdirSync } from "node:fs";

const USER = "erenpaper";
const FEED = `https://letterboxd.com/${USER}/rss/`;
const OUT = "public/letterboxd.json";
const MAX = 6;

const stars = (r) => {
  const n = parseFloat(r);
  if (!n) return undefined;
  return "★".repeat(Math.floor(n)) + (n - Math.floor(n) >= 0.5 ? "½" : "");
};

const pick = (block, tag) => {
  const m = block.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : undefined;
};

try {
  const res = await fetch(FEED, { headers: { "User-Agent": "portfolio-build" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const films = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = pick(block, "letterboxd:filmTitle");
    if (!title) continue; // skip non-film items (lists, etc.)
    const year = pick(block, "letterboxd:filmYear");
    const watched = pick(block, "letterboxd:watchedDate");
    films.push({
      title: year ? `${title} (${year})` : title,
      rating: stars(pick(block, "letterboxd:memberRating")),
      date: watched
        ? new Date(watched).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
        : "",
      href: pick(block, "link"),
    });
    if (films.length >= MAX) break;
  }

  mkdirSync("public", { recursive: true });
  writeFileSync(OUT, JSON.stringify(films, null, 2));
  console.log(`letterboxd: wrote ${films.length} film(s) → ${OUT}`);
} catch (e) {
  console.warn(`letterboxd: skipped (${e.message}) — widget will use the typed list only`);
}
