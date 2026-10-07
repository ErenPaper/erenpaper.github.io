// Synthesized lo-fi kit for the Side B beat maker — no samples. Every voice
// schedules onto any BaseAudioContext, so the same code plays live and renders
// offline to a .wav. Keys and bass share one small subtractive/FM synth whose
// settings (wave, envelope, tone, resonance, detune) are part of the beat.

export type Track = {
  id: string;
  label: string;
  kind: "kick" | "snare" | "clap" | "hat" | "ohat" | "keys" | "bass";
  midi?: number;
  isRoot?: boolean; // the scale's root note — highlighted to keep your bearings
};

// Scales as semitone offsets from the root. Index 0 (minor pent) is the default
// and the scale the starter beat is written in. `group` drives the dropdown.
export const SCALES: { name: string; steps: number[]; group: "easy" | "full" }[] = [
  { name: "minor pentatonic", steps: [0, 3, 5, 7, 10], group: "easy" },
  { name: "major pentatonic", steps: [0, 2, 4, 7, 9], group: "easy" },
  { name: "blues", steps: [0, 3, 5, 6, 7, 10], group: "easy" },
  { name: "japanese", steps: [0, 1, 5, 7, 8], group: "easy" },
  { name: "major", steps: [0, 2, 4, 5, 7, 9, 11], group: "full" },
  { name: "minor", steps: [0, 2, 3, 5, 7, 8, 10], group: "full" },
  { name: "dorian", steps: [0, 2, 3, 5, 7, 9, 10], group: "full" },
  { name: "mixolydian", steps: [0, 2, 4, 5, 7, 9, 10], group: "full" },
  { name: "harmonic minor", steps: [0, 2, 3, 5, 7, 8, 11], group: "full" },
];
export const ROOTS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

// Keys span ~4 octaves (pentatonic) from the 3rd octave; bass ~4 from the 1st.
// Only part of each is visible at once — the sections scroll like a piano roll.
export const KEY_ROWS = 21;
export const BASS_ROWS = 20;
export const DRUMS = ["ohat", "hat", "clap", "snare", "kick"] as const;
export const ROWS = KEY_ROWS + BASS_ROWS + DRUMS.length;

const nameOf = (midi: number) => `${ROOTS[midi % 12]}${Math.floor(midi / 12) - 1}`;
// The n-th note of a scale above a base midi note, climbing octaves as needed.
const degree = (base: number, steps: number[], n: number) => base + 12 * Math.floor(n / steps.length) + steps[n % steps.length];

// Rows top → bottom: keys (high → low), bass (high → low), then drums.
export function buildTracks(scale: number, root: number): Track[] {
  const steps = SCALES[scale].steps;
  const keyBase = 48 + root - (root > 6 ? 12 : 0);
  const bassBase = keyBase - 24;
  const row = (kind: "keys" | "bass", base: number, i: number) => {
    const midi = degree(base, steps, i);
    return { id: `${kind[0]}${i}`, label: nameOf(midi), kind, midi, isRoot: i % steps.length === 0 };
  };
  return [
    ...Array.from({ length: KEY_ROWS }, (_, i) => row("keys", keyBase, i)).reverse(),
    ...Array.from({ length: BASS_ROWS }, (_, i) => row("bass", bassBase, i)).reverse(),
    { id: "ohat", label: "open hat", kind: "ohat" },
    { id: "hat", label: "hat", kind: "hat" },
    { id: "clap", label: "clap", kind: "clap" },
    { id: "snare", label: "snare", kind: "snare" },
    { id: "kick", label: "kick", kind: "kick" },
  ];
}

// Patterns are stored at 1/32-note resolution; the grid can view them at 1/8,
// 1/16 or 1/32 without losing anything. Length is 1–16 bars of 4/4.
export const TICKS = 32; // per bar
export const MAX_BARS = 16;
export const RESOLUTIONS = [8, 16, 32] as const;
export type Res = (typeof RESOLUTIONS)[number];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// ── the synth ──
export const WAVES = ["sine", "triangle", "sawtooth", "square", "fm"] as const;
export type Wave = (typeof WAVES)[number];
// All knobs are 0–100; see the mappings in synth() below.
export type Synth = { wave: Wave; attack: number; decay: number; tone: number; reso: number; detune: number };
export const KNOBS = ["attack", "decay", "tone", "reso", "detune"] as const;

export const KEY_PRESETS: Record<string, Synth> = {
  keys: { wave: "triangle", attack: 4, decay: 58, tone: 20, reso: 8, detune: 26 },
  pluck: { wave: "square", attack: 0, decay: 20, tone: 34, reso: 45, detune: 34 },
  bell: { wave: "fm", attack: 2, decay: 72, tone: 60, reso: 0, detune: 0 },
  pad: { wave: "sawtooth", attack: 62, decay: 92, tone: 22, reso: 14, detune: 72 },
};
export const BASS_PRESETS: Record<string, Synth> = {
  sub: { wave: "sine", attack: 2, decay: 46, tone: 20, reso: 0, detune: 0 },
  saw: { wave: "sawtooth", attack: 2, decay: 40, tone: 26, reso: 30, detune: 10 },
  square: { wave: "square", attack: 2, decay: 34, tone: 22, reso: 18, detune: 0 },
  acid: { wave: "sawtooth", attack: 0, decay: 24, tone: 44, reso: 86, detune: 0 },
};

// Rough loudness match so switching waves doesn't jump in volume.
const WAVE_LEVEL: Record<Wave, number> = { sine: 0.24, triangle: 0.2, sawtooth: 0.1, square: 0.085, fm: 0.15 };

function synth(ctx: BaseAudioContext, out: AudioNode, t: number, midi: number, p: Synth, level: number, sub: boolean) {
  const f = hz(midi);
  const A = 0.003 + (p.attack / 100) ** 2 * 0.8;
  const D = 0.08 + (p.decay / 100) ** 1.5 * 2.6;
  const end = t + A + D + 0.05;
  const peak = level * WAVE_LEVEL[p.wave];
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(peak, t + A);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + A + D);
  amp.connect(out);
  const run = (o: OscillatorNode) => { o.start(t); o.stop(end); };

  if (p.wave === "fm") {
    // glassy FM: sine carrier, 3.5× modulator whose depth decays (tone = brightness)
    const car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = f * 3.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(f * (0.4 + (p.tone / 100) * 3.5), t);
    depth.gain.exponentialRampToValueAtTime(f * 0.03, t + A + D * 0.6);
    mod.connect(depth).connect(car.frequency);
    car.connect(amp);
    run(car); run(mod);
  } else {
    // subtractive: (detuned) oscillators → resonant low-pass with a closing envelope
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.Q.value = 0.5 + (p.reso / 100) * 14;
    const fc = Math.min(18000, f * (1 + (p.tone / 100) ** 1.4 * 15));
    lp.frequency.setValueAtTime(Math.min(18000, fc * 2.5), t);
    lp.frequency.exponentialRampToValueAtTime(fc, t + A + Math.max(0.05, D * 0.4));
    lp.connect(amp);
    const cents = (p.detune / 100) * 25;
    const spread = cents > 0.5 ? [-cents, cents] : [0];
    for (const c of spread) {
      const o = ctx.createOscillator(); o.type = p.wave; o.frequency.value = f; o.detune.value = c;
      const g = ctx.createGain(); g.gain.value = 1 / spread.length;
      o.connect(g).connect(lp); run(o);
    }
    // triangle gets electric-piano overtones — the warm "keys" character
    if (p.wave === "triangle") {
      for (const [mult, lvl] of [[2, 0.35], [3, 0.08]] as const) {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
        const g = ctx.createGain(); g.gain.value = lvl;
        o.connect(g).connect(lp); run(o);
      }
    }
  }
  // bass keeps a clean sine sub underneath whatever the wave is
  if (sub) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = p.wave === "sine" ? 0 : 0.5 / WAVE_LEVEL[p.wave] * WAVE_LEVEL.sine;
    if (g.gain.value > 0) { o.connect(g).connect(amp); run(o); }
  }
}

export type Synths = { keys: Synth; bass: Synth };

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  const src = ctx.createBufferSource();
  src.buffer = b;
  return src;
}

// Exponential decay envelope from `peak` at t (with a tiny attack) to silence.
function env(ctx: BaseAudioContext, t: number, peak: number, decay: number, attack = 0.002) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
  const g = env(ctx, t, 0.95, 0.5, 0.003);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 0.6);
  // a soft beater click on top
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500;
  n.connect(bp).connect(env(ctx, t, 0.18, 0.012)).connect(out);
  n.start(t); n.stop(t + 0.03);
}

function snare(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const n = noise(ctx);
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1400;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
  n.connect(hp).connect(lp).connect(env(ctx, t, 0.42, 0.17)).connect(out);
  n.start(t); n.stop(t + 0.25);
  const o = ctx.createOscillator(); o.type = "triangle";
  o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  o.connect(env(ctx, t, 0.3, 0.09)).connect(out);
  o.start(t); o.stop(t + 0.15);
}

function clap(ctx: BaseAudioContext, out: AudioNode, t: number) {
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  // three quick hand-slaps, then the tail
  for (const [dt, p] of [[0, 0.5], [0.011, 0.45], [0.022, 0.55]] as const) {
    g.gain.setValueAtTime(p, t + dt);
    g.gain.exponentialRampToValueAtTime(0.05, t + dt + 0.009);
  }
  g.gain.setValueAtTime(0.4, t + 0.031);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  n.connect(bp).connect(g).connect(out);
  n.start(t); n.stop(t + 0.25);
}

function hat(ctx: BaseAudioContext, out: AudioNode, t: number, open: boolean) {
  const n = noise(ctx);
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7200;
  n.connect(hp).connect(env(ctx, t, open ? 0.16 : 0.2, open ? 0.28 : 0.045)).connect(out);
  n.start(t); n.stop(t + (open ? 0.35 : 0.08));
}

export function trigger(ctx: BaseAudioContext, out: AudioNode, t: number, track: Track, synths: Synths) {
  switch (track.kind) {
    case "kick": return kick(ctx, out, t);
    case "snare": return snare(ctx, out, t);
    case "clap": return clap(ctx, out, t);
    case "hat": return hat(ctx, out, t, false);
    case "ohat": return hat(ctx, out, t, true);
    case "keys": return synth(ctx, out, t, track.midi!, synths.keys, 0.75, false);
    case "bass": return synth(ctx, out, t, track.midi!, synths.bass, 1.7, true);
  }
}

// Master bus: tape-ish low-pass + gentle saturation → compressor → room reverb.
export function masterChain(ctx: BaseAudioContext, tap?: AudioNode) {
  const input = ctx.createGain();
  input.gain.value = 0.9;
  const tape = ctx.createBiquadFilter(); tape.type = "lowpass"; tape.frequency.value = 9000;
  const sat = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
  sat.curve = curve;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;

  // generated impulse response: 2s of decaying stereo noise
  const len = Math.floor(ctx.sampleRate * 2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.2;
  const out = ctx.createGain(); out.gain.value = 0.85;

  input.connect(tape).connect(sat).connect(comp);
  comp.connect(out);
  comp.connect(verb).connect(wet).connect(out);
  out.connect(ctx.destination);
  if (tap) out.connect(tap);
  return input;
}

export type Pattern = boolean[][]; // [track][tick], length = bars × TICKS
export type Beat = { pattern: Pattern; bpm: number; swing: number; scale: number; root: number; res: Res; synths: Synths };

export const barsOf = (p: Pattern) => Math.max(1, Math.round(p[0].length / TICKS));
export const tickDur = (bpm: number) => 60 / bpm / 8;
// Swing pushes every off-beat 16th (and the 32nds inside it) late by up to ~40% of a 16th.
export const swingOffset = (tick: number, bpm: number, swing: number) => (Math.floor(tick / 2) % 2 ? swing * tickDur(bpm) * 2 * 0.4 : 0);

// Render the pattern offline (looped to roughly 4 bars) and encode a 16-bit stereo WAV.
export async function renderWav({ pattern, bpm, swing, scale, root, synths }: Beat): Promise<Blob> {
  const tracks = buildTracks(scale, root);
  const ticks = pattern[0].length;
  const loops = Math.max(1, Math.round(4 / barsOf(pattern)));
  const rate = 44100;
  const tail = 3;
  const len = Math.ceil((tickDur(bpm) * ticks * loops + tail) * rate);
  const ctx = new OfflineAudioContext(2, len, rate);
  const bus = masterChain(ctx);
  for (let l = 0; l < loops; l++) {
    for (let k = 0; k < ticks; k++) {
      const t = 0.05 + (l * ticks + k) * tickDur(bpm) + swingOffset(k, bpm, swing);
      tracks.forEach((tr, r) => { if (pattern[r][k]) trigger(ctx, bus, t, tr, synths); });
    }
  }
  const buf = await ctx.startRendering();
  return encodeWav(buf);
}

function encodeWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels, n = buf.length, bytes = n * ch * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, 36 + bytes, true); str(8, "WAVE");
  str(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true);
  str(36, "data"); view.setUint32(40, bytes, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}

// ── share-link encoding ──
// "<bpm>.<swing%>.<scale>.<root>.<res>.<bars>.<keys synth>.<bass synth>.<rows>"
// synth = wave index + 5 knobs as 2-digit base36; rows = 8 hex per bar, "_"-joined,
// empty rows left blank so sparse beats stay short.
const encSynth = (p: Synth) => WAVES.indexOf(p.wave) + KNOBS.map((k) => Math.round(p[k]).toString(36).padStart(2, "0")).join("");
const decSynth = (s: string): Synth | null => {
  if (!/^[0-4][0-9a-z]{10}$/.test(s)) return null;
  const v = KNOBS.map((_, i) => Math.min(100, parseInt(s.slice(1 + i * 2, 3 + i * 2), 36)));
  return { wave: WAVES[Number(s[0])], attack: v[0], decay: v[1], tone: v[2], reso: v[3], detune: v[4] };
};

export function encodeBeat({ pattern, bpm, swing, scale, root, res, synths }: Beat) {
  const bars = barsOf(pattern);
  const rows = pattern.map((row) => {
    if (!row.some(Boolean)) return "";
    let out = "";
    for (let b = 0; b < bars; b++) {
      let bits = 0;
      for (let i = 0; i < TICKS; i++) if (row[b * TICKS + i]) bits |= 1 << i;
      out += (bits >>> 0).toString(16).padStart(8, "0");
    }
    return out;
  });
  return [bpm, Math.round(swing * 100), scale, root, res, bars, encSynth(synths.keys), encSynth(synths.bass), rows.join("_")].join(".");
}

export function decodeBeat(code: string): Beat | null {
  const parts = code.trim().split(".");
  if (parts.length !== 9) return null;
  const [bpm, sw, sc, rt, rs, br, ks, bs, rowStr] = parts;
  const n = (x: string) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN);
  const bars = n(br), res = n(rs) as Res;
  const keys = decSynth(ks), bass = decSynth(bs);
  const rows = rowStr.split("_");
  if (!(bars >= 1 && bars <= MAX_BARS) || !RESOLUTIONS.includes(res) || !keys || !bass || rows.length !== ROWS) return null;
  if (rows.some((r) => r !== "" && !new RegExp(`^[0-9a-f]{${bars * 8}}$`, "i").test(r))) return null;
  const clamp = (v: number, lo: number, hi: number) => (Number.isNaN(v) ? lo : Math.min(hi, Math.max(lo, v)));
  const pattern = rows.map((r) =>
    Array.from({ length: bars * TICKS }, (_, k) => {
      if (!r) return false;
      const b = Math.floor(k / TICKS);
      return !!(parseInt(r.slice(b * 8, b * 8 + 8), 16) & 2 ** (k % TICKS));
    })
  );
  return {
    pattern,
    bpm: clamp(n(bpm), 60, 160),
    swing: clamp(n(sw), 0, 100) / 100,
    scale: clamp(n(sc), 0, SCALES.length - 1),
    root: clamp(n(rt), 0, 11),
    res,
    synths: { keys, bass },
  };
}

export const emptyPattern = (bars = 1): Pattern => Array.from({ length: ROWS }, () => Array(bars * TICKS).fill(false));

// Row index helpers (keys/bass are listed high → low, so degree 0 is the lowest row).
export const keyRow = (deg: number) => KEY_ROWS - 1 - deg;
export const bassRow = (deg: number) => KEY_ROWS + BASS_ROWS - 1 - deg;
const drumRow = (id: (typeof DRUMS)[number]) => KEY_ROWS + BASS_ROWS + DRUMS.indexOf(id);
const tick16 = (s: number) => s * 2; // 16th-note step → tick

// Interval number (1 = root, 3 = third, …) of a semitone offset above the root —
// so a minor 3rd and a major 3rd both count as "3".
const INTERVAL = [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7];

// Move every note to the nearest pitch in another scale (same root), so
// switching scale keeps the root on the root instead of shifting notes by their
// position in the scale. A tie goes to the note that keeps the same interval
// (minor 3rd → major 3rd), then to the lower one. Drums are untouched.
export function remapScale(p: Pattern, root: number, from: number, to: number): Pattern {
  if (from === to) return p;
  const a = buildTracks(from, root), b = buildTracks(to, root);
  const out = p.map((row, r) => (a[r].midi === undefined ? row.slice() : row.map(() => false)));
  const iv = (midi: number) => INTERVAL[(((midi - root) % 12) + 12) % 12];
  a.forEach((tr, r) => {
    if (tr.midi === undefined || !p[r].some(Boolean)) return;
    let best = r, bd = Infinity, bSame = false;
    b.forEach((t2, r2) => {
      if (t2.kind !== tr.kind) return;
      const d = Math.abs(t2.midi! - tr.midi!);
      const same = iv(t2.midi!) === iv(tr.midi!);
      // rows run high → low, so on an otherwise-equal tie the later (lower) row wins
      if (d < bd || (d === bd && (same || !bSame))) { bd = d; best = r2; bSame = same; }
    });
    p[r].forEach((on, k) => { if (on) out[best][k] = true; });
  });
  return out;
}

// The row whose pitch is nearest `midi` within a section — for placing notes by pitch.
export function rowNear(tracks: Track[], kind: "keys" | "bass", midi: number) {
  let best = -1, bd = Infinity;
  tracks.forEach((t, r) => {
    if (t.kind !== kind) return;
    const d = Math.abs(t.midi! - midi);
    if (d <= bd) { bd = d; best = r; }
  });
  return best;
}
// Lowest note of each section (in C: C3 for keys, C1 for bass).
const sectionBase = (tracks: Track[], kind: "keys" | "bass") => tracks[kind === "keys" ? KEY_ROWS - 1 : KEY_ROWS + BASS_ROWS - 1].midi!;

// A lo-fi starter (one bar) so the grid isn't intimidating. Written in C minor
// pentatonic, then moved onto whatever scale is selected.
export function starterPattern(scale = 0): Pattern {
  const p = emptyPattern(1);
  const set = (row: number, steps: number[]) => steps.forEach((s) => (p[row][tick16(s)] = true));
  const k = (d: number) => keyRow(d + 5);
  const b = (d: number) => bassRow(d + 5); // one octave up from the bottom of each section
  set(drumRow("kick"), [0, 7, 10]);
  set(drumRow("snare"), [4, 12]);
  set(drumRow("hat"), [0, 2, 4, 6, 8, 10, 12, 14]);
  set(drumRow("ohat"), [15]);
  set(b(0), [0]); set(b(1), [7]); set(b(2), [10]);
  set(k(0), [0]); set(k(3), [0, 11]); set(k(6), [0]);
  set(k(5), [3]); set(k(4), [6, 14]);
  set(k(2), [8]); set(k(7), [8]);
  set(k(8), [13]);
  return remapScale(p, 0, 0, scale);
}

// Random melody over the starter groove, for every bar — always in the scale.
// Keys stay between the 4th and 6th octave (the part you see by default); the
// bass plays one note at a time between the 2nd octave and a bit above it.
export function randomPattern(bars = 1, scale = 0, root = 0): Pattern {
  const tracks = buildTracks(scale, root);
  const groove = starterPattern(scale);
  const p = emptyPattern(bars);
  const kb = sectionBase(tracks, "keys"), bb = sectionBase(tracks, "bass");
  const keyRows = tracks.map((t, r) => r).filter((r) => tracks[r].kind === "keys" && tracks[r].midi! >= kb + 12 && tracks[r].midi! <= kb + 36);
  const bassRows = tracks.map((t, r) => r).filter((r) => tracks[r].kind === "bass" && tracks[r].midi! >= bb + 12 && tracks[r].midi! <= bb + 29).reverse(); // low → high
  for (let k = 0; k < bars * TICKS; k += 2) {
    for (const r of keyRows) if (Math.random() < 0.08) p[r][k] = true;
    DRUMS.forEach((id) => { const r = drumRow(id); p[r][k] = groove[r][k % TICKS]; });
  }
  // Bass: mostly on the beat, leaning on the low end.
  for (let k = 0; k < bars * TICKS; k += 2) {
    const s16 = (k % TICKS) / 2;
    const chance = s16 === 0 ? 0.95 : s16 % 4 === 0 ? 0.55 : s16 % 2 === 0 ? 0.12 : 0.04;
    if (Math.random() < chance) p[bassRows[Math.floor(Math.random() ** 1.6 * bassRows.length)]][k] = true;
  }
  return p;
}

// Which row each roll should be scrolled to: keys show C4 upward, bass C2 upward
// (in the current key), counted as a row offset inside that section.
export function homeRow(tracks: Track[], kind: "keys" | "bass", visible: number) {
  const bottom = rowNear(tracks, kind, sectionBase(tracks, kind) + 12);
  const first = kind === "keys" ? 0 : KEY_ROWS;
  return Math.max(0, bottom - (visible - 1) - first);
}

export const defaultSynths = (): Synths => ({ keys: { ...KEY_PRESETS.keys }, bass: { ...BASS_PRESETS.saw } });
