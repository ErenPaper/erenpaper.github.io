// Content for "Side B" — the personal journal that counterweights the
// engineering datasheet. The rule here is SHOW, don't tell: everything is a
// real artifact (a list I keep, music my family makes, something I built),
// not a claimed interest. It grows by appending real entries — nothing fake.

export const sideB = {
  kicker: "SIDE B",
  title: "Off the clock",
  intro:
    "The other half — what I'm watching, the music my family makes, and how I spend time when I'm not at a bench.",
};

// Living lists I actually keep. These are links because they're real and
// updated — showing my taste rather than claiming it. Add more by dropping a
// row in here (Letterboxd for film, MyDramaList for dramas, etc.).
export type Shelf = { label: string; handle: string; href: string };
export const shelves: Shelf[] = [
  { label: "Anime", handle: "AniList · @erenpaper", href: "https://anilist.co/user/erenpaper/animelist" },
  { label: "Film", handle: "Letterboxd · @erenpaper", href: "https://letterboxd.com/erenpaper/" },
  { label: "TV", handle: "Trakt · @erenpaper", href: "https://trakt.tv/users/erenpaper" },
  { label: "Dramas", handle: "MyDramaList · @erenpaper", href: "https://mydramalist.com/profile/erenpaper" },
];

// The family band — real, personal, and running since 2010.
export const band = {
  name: "Sonic RMD",
  since: "2010",
  photo: "/assets/sonic-rmd.jpg",   // live shot; film-framed in the band section
  blurb:
    "The family band — we've been playing together since I was a kid, and it's the reason I ended up at a piano in the first place. Everything from covers to originals.",
  href: "https://www.youtube.com/@15robrap",
  channelId: "15robrap",
};

// Your own music — piano recordings, Cubase productions, whatever you make.
// Give ONE source per track: youtube (id), soundcloud (track URL), or audio
// (an mp3 in /public/assets). Empty entries are skipped.
export type Track = {
  title: string;
  kind?: string;    // "piano" · "original" · "cover" · "demo" …
  date?: string;
  note?: string;
  youtube?: string;
  soundcloud?: string;
  audio?: string;
  href?: string;
};

export const tracks: Track[] = [
  // Add a real track by giving ONE source (youtube / soundcloud / audio). Until
  // then this placeholder reads as a note to visitors, not a note to myself.
  { title: "Recordings on the way", kind: "piano", date: "2026", note: "Piano takes and a few Cubase sketches will land here as I finish them." },
];

// The watch logs. Anime auto-fills from AniList (completed + in-progress) and
// films auto-append from the Letterboxd diary at build time. These typed lists
// are manual overrides for what the trackers miss — TV, docuseries, K-dramas,
// or a movie not yet logged. `href` links the card to that title / your review.
export type Watch = {
  title: string;
  kind: "tv" | "film" | "anime" | "drama" | "doc";
  rating?: string;   // however you rate — "★★★★☆", "8/10", "loved it"
  date: string;      // "AUG 2026", a source ("NETFLIX"), or progress ("EP 2 / 4")
  note?: string;     // optional one-liner
  href?: string;     // optional link
};

// Completed things the trackers miss (newest first). Anime + Letterboxd films
// auto-append, so keep this for TV / docuseries / K-dramas / unlogged movies.
export const recentlyWatched: Watch[] = [
  { title: "Suits", kind: "tv", rating: "★★★★½", date: "APR 2026" },
];

// In-progress things — shown in the "currently watching" strip alongside live
// AniList (currently-watching anime). Add a row as you start something new.
export const currentlyWatching: Watch[] = [
  { title: "Crime Scene: The Vanishing at the Cecil Hotel", kind: "doc", date: "NETFLIX", note: "crime docuseries" },
];

export type FeedKind = "note" | "photo" | "music" | "video" | "link";

export type FeedEntry = {
  id: string;
  date: string;        // Super-8 style stamp, e.g. "FEB 2026"
  kind: FeedKind;
  title: string;
  body?: string;
  media?: string;      // image path (photo) or YouTube id (video)
  href?: string;       // for link entries
  linkLabel?: string;
  tag?: string;        // small category label
  soon?: boolean;      // reserved slot — renders as "coming soon"
};

// The journal. Newest first. Only real things (or clearly-labelled slots for
// stuff that's genuinely on the way, like trip edits).
export const feed: FeedEntry[] = [
  {
    id: "hello",
    date: "2026",
    kind: "note",
    title: "Starting a journal",
    body:
      "I wanted a corner that isn't a résumé — somewhere for the music my family makes, trips I've edited into little films, and whatever I'm chewing on. This is that. It fills in over time.",
    tag: "JOURNAL",
  },
  {
    id: "trips",
    date: "SOON",
    kind: "video",
    title: "Trip edits",
    body:
      "Little films I cut from places I've been — the vlog that's really a journal. They'll land here once they're edited.",
    tag: "TRAVEL",
    soon: true,
  },
];
