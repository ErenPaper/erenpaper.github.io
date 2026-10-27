// Content for "Side B" — the personal journal that counterweights the
// engineering datasheet. The rule here is SHOW, don't tell: everything is a
// real artifact (a list I keep, music my family makes, something I built),
// not a claimed interest. It grows by appending real entries — nothing fake.

export const sideB = {
  kicker: "SIDE B",
  title: "hi, it's raph",
  intro:
    "see what else i can do...and find the easter egg to see what you can do :O",
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
// (an mp3 in /public/assets). Audio tracks show as cassettes; a track with a
// youtube video (e.g. a screen recording of a DAW session) shows as a VHS tape.
// Empty entries are skipped.
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
];

// The watch logs are fully automatic — nothing is typed by hand:
//   · TV     → Trakt (build time): finished = rated shows, in progress = recent episodes
//   · Films  → Letterboxd (build time)
//   · Anime  → AniList (live in the browser)
// See scripts/fetch-trakt.mjs and scripts/fetch-letterboxd.mjs.
export type Watch = {
  title: string;
  kind: "tv" | "film" | "anime" | "drama" | "doc";
  rating?: string;   // "★★★★☆", "8/10" — shown as stars out of 5
  date: string;      // "AUG 2026", or progress ("EP 2 / 4", "S02E05")
  note?: string;
  href?: string;
};

// Kept empty on purpose; the widgets still read these so a manual override is
// possible, but the site is meant to run on the automatic sources alone.
export const recentlyWatched: Watch[] = [];
export const currentlyWatching: Watch[] = [];

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

// The build log — the fun builds, shown on Side B as a PS2 memory-card browser.
// `title` must match a project in data/portfolio.ts (that's where the media,
// tech and links come from); `note` is the casual one-liner for this side.
// Order = order on the card. The rest of the catalog lives on Side A.
export type Build = { title: string; note: string };
export const buildLog: Build[] = [
  // on the bench now
  { title: "paradis — Self-Hosted Home Lab", note: "My home server: 18 containers in 12 stacks, reachable only over Tailscale, and a push notification when anything looks off." },
  { title: "BMO Build", note: "A 3D-printed BMO with real electronics inside. It's next on the bench." },
  { title: "RP2040 Motor-Controller Carrier Board", note: "Taking the motor controller off the breadboard and onto a board I designed myself." },
  { title: "Morse Code Decoder", note: "Tap out Morse and watch it turn into text, on an RP2040 running FreeRTOS. Planned next." },
  { title: "digicam-datestamp", note: "My old Nikon Coolpix shots never got that orange datestamp, so I wrote something that puts it back." },
  { title: "Group Dining Decision App (Dinnr)", note: "An app for the eternal group-chat question: where are we eating?" },
];

// Film roll — scans from my own 35mm shots. `n` matches /assets/film/NN.jpg
// (full) and NN-t.jpg (thumb). `frame` is the number on the negative.
export type Frame = { n: string; frame: string; place: "LA" | "TOR" | "HNL"; cap: string; portrait?: boolean };
export const filmRoll: Frame[] = [
  { n: "01", frame: "26A", place: "LA", cap: "rain on highland" },
  { n: "02", frame: "29A", place: "LA", cap: "hollywood blvd, red light" },
  { n: "03", frame: "15", place: "TOR", cap: "old city hall, down the canyon", portrait: true },
  { n: "04", frame: "31", place: "TOR", cap: "wrong side of the signal" },
  { n: "05", frame: "29", place: "TOR", cap: "spadina, wires everywhere" },
  { n: "06", frame: "30", place: "TOR", cap: "flight path" },
  { n: "07", frame: "23", place: "TOR", cap: "kensington market" },
  { n: "08", frame: "24", place: "HNL", cap: "mid-hop" },
  { n: "09", frame: "27", place: "HNL", cap: "no stopping or standing" },
  { n: "10", frame: "34", place: "HNL", cap: "dusk, waikiki" },
  { n: "11", frame: "35", place: "HNL", cap: "one way (x2)" },
  { n: "12", frame: "11", place: "HNL", cap: "everyone filming the sunset" },
  { n: "13", frame: "25", place: "HNL", cap: "stringing shells" },
  { n: "14", frame: "31", place: "HNL", cap: "after the rain" },
];
export const places = { LA: "Los Angeles", TOR: "Toronto", HNL: "Honolulu" } as const;
