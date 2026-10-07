"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTracks, SCALES, ROOTS, type Beat, type Pattern, type Res, RESOLUTIONS, TICKS, MAX_BARS, KEY_ROWS, BASS_ROWS,
  barsOf, trigger, masterChain, tickDur, swingOffset, renderWav, encodeBeat, decodeBeat, emptyPattern,
  starterPattern, randomPattern, remapScale, homeRow, rowNear, defaultSynths, type Synth, type Synths, type Wave, WAVES, KNOBS,
  KEY_PRESETS, BASS_PRESETS,
} from "./beatSynth";
import { SubHead } from "./SectionHead";

// Side B beat maker: a piano-roll step grid of synthesized keys, bass and drums,
// with a tiny synth panel and a live wave/spectrum visualizer. Patterns are 1–16
// bars stored at 1/32 resolution and viewed one bar at a time at 1/8, 1/16 or
// 1/32 — coarser views never drop the finer notes, they show as dots. Beats save
// as share links (?beat=), browser "tapes", or an offline-rendered .wav.

type Tape = { name: string; code: string; at: number };
type Group = "keys" | "bass" | "drums";
type Roll = "keys" | "bass";
const TAPES_KEY = "sideb-tapes";

const loadTapes = (): Tape[] => {
  try { return JSON.parse(localStorage.getItem(TAPES_KEY) || "[]"); } catch { return []; }
};
const storeTapes = (t: Tape[]) => { try { localStorage.setItem(TAPES_KEY, JSON.stringify(t)); } catch {} };

// Rows visible before a section scrolls (each opens at C4 / C2 — see homeRow).
const VISIBLE: Record<Roll, number> = { keys: 11, bass: 8 };

const WAVE_ICON: Record<Wave, string> = {
  sine: "M1 7 Q4 -1 7 7 T13 7 T19 7 T25 7",
  triangle: "M1 7 L4 2 L10 12 L16 2 L22 12 L25 7",
  sawtooth: "M1 12 L9 2 L9 12 L17 2 L17 12 L25 2",
  square: "M1 12 L1 2 L7 2 L7 12 L13 12 L13 2 L19 2 L19 12 L25 12",
  fm: "M1 7 Q2.5 1 4 7 T7 7 Q10 -1 13 7 Q14 10 15 7 T19 7 Q22 1 25 7",
};
const WAVE_NAME: Record<Wave, string> = { sine: "sine", triangle: "tri", sawtooth: "saw", square: "square", fm: "fm" };
const sameSynth = (a: Synth, b: Synth) => a.wave === b.wave && KNOBS.every((k) => Math.abs(a[k] - b[k]) < 1);

export default function BeatMaker() {
  const [pattern, setPattern] = useState<Pattern>(starterPattern);
  const [bpm, setBpm] = useState(86);
  const [swing, setSwing] = useState(0.35);
  const [scale, setScale] = useState(0);
  const [root, setRoot] = useState(0);
  const [synths, setSynths] = useState<Synths>(defaultSynths);
  const [synthTab, setSynthTab] = useState<Roll>("keys");
  const [viz, setViz] = useState<"wave" | "spectrum">("wave");
  const [res, setRes] = useState<Res>(16);
  const [bar, setBar] = useState(0); // the bar being viewed/edited
  const [folded, setFolded] = useState<Record<Group, boolean>>({ keys: false, bass: false, drums: false });
  const [playing, setPlaying] = useState(false);
  const [playTick, setPlayTick] = useState(-1);
  const [cue, setCue] = useState(0); // start marker, as an absolute tick
  const [loopBar, setLoopBar] = useState(false); // loop just the bar being viewed
  const [tapes, setTapes] = useState<Tape[]>([]);
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const tracks = useMemo(() => buildTracks(scale, root), [scale, root]);
  const bars = barsOf(pattern);
  const span = TICKS / res; // ticks per visible cell
  const octave = SCALES[scale].steps.length; // rows per octave

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodyRef = useRef<Record<Roll, HTMLDivElement | null>>({ keys: null, bass: null });
  const audio = useRef<{ ac: AudioContext; bus: AudioNode; analyser: AnalyserNode } | null>(null);
  const live = useRef({ pattern, bpm, swing, tracks, synths, viz, bar, loopBar });
  live.current = { pattern, bpm, swing, tracks, synths, viz, bar, loopBar };
  const jump = useRef<number | null>(null); // a pending "play from here" while playing
  const timer = useRef<number | null>(null);
  const raf = useRef(0);
  const paint = useRef<boolean | null>(null); // drag-paint value while the pointer is down

  const say = (msg: string) => { setToast(msg); window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600); };

  const ensure = () => {
    if (!audio.current) {
      try {
        const ac = new AudioContext();
        const analyser = ac.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -95;
        analyser.maxDecibels = -20;
        audio.current = { ac, bus: masterChain(ac, analyser), analyser };
      } catch { return null; }
    }
    if (audio.current.ac.state === "suspended") void audio.current.ac.resume();
    return audio.current;
  };
  const audition = (r: number) => {
    const a = ensure();
    if (a) trigger(a.ac, a.bus, a.ac.currentTime + 0.01, live.current.tracks[r], live.current.synths);
  };

  // ── transport: classic look-ahead scheduler ──
  const start = () => {
    const a = ensure();
    if (!a) return;
    let next = a.ac.currentTime + 0.06;
    let k = cue % live.current.pattern[0].length;
    if (live.current.loopBar && Math.floor(k / TICKS) !== live.current.bar) k = live.current.bar * TICKS;
    jump.current = null;
    const queue: { k: number; t: number }[] = [];
    timer.current = window.setInterval(() => {
      const { pattern: p, bpm: b, swing: sw, tracks: trs, synths: syn, bar: vb, loopBar: lb } = live.current;
      if (jump.current !== null) { k = jump.current; jump.current = null; queue.length = 0; }
      while (next < a.ac.currentTime + 0.12) {
        // loop range: the whole beat, or only the bar on screen (follows the bar tabs)
        const lo = lb ? vb * TICKS : 0, hi = lb ? lo + TICKS : p[0].length;
        if (k < lo || k >= hi) k = lo;
        const t = next + swingOffset(k, b, sw);
        trs.forEach((tr, r) => { if (p[r][k]) trigger(a.ac, a.bus, t, tr, syn); });
        queue.push({ k, t });
        next += tickDur(b);
        k++;
      }
    }, 25);
    const draw = () => {
      let cur = -1;
      while (queue.length && queue[0].t <= a.ac.currentTime) cur = queue.shift()!.k;
      if (cur >= 0) setPlayTick(cur);
      raf.current = requestAnimationFrame(draw);
    };
    raf.current = requestAnimationFrame(draw);
    setPlaying(true);
  };
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    setPlayTick(-1);
  };

  // Stop + release audio when leaving Side B.
  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    cancelAnimationFrame(raf.current);
    void audio.current?.ac.close();
  }, []);

  // ── visualizer: oscilloscope or spectrum off the master bus, only while on screen ──
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let id = 0;
    let tbuf: Float32Array<ArrayBuffer> | null = null;
    let fbuf: Uint8Array<ArrayBuffer> | null = null;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,.06)"; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (h * i) / 4); g.lineTo(w, (h * i) / 4); g.stroke(); }
      const a = audio.current;
      if (live.current.viz === "wave") {
        g.strokeStyle = "#6ec6c0"; g.lineWidth = 2; g.shadowColor = "#6ec6c0"; g.shadowBlur = 8;
        g.beginPath();
        if (a) {
          if (!tbuf) tbuf = new Float32Array(a.analyser.fftSize);
          a.analyser.getFloatTimeDomainData(tbuf);
          const n = 1024;
          let s0 = 0;
          for (let i = 1; i < tbuf.length - n; i++) if (tbuf[i - 1] < 0 && tbuf[i] >= 0) { s0 = i; break; }
          let peak = 0;
          for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(tbuf[s0 + i]));
          const sc = (h * 0.42) / Math.max(peak, 0.06);
          for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * w, y = h / 2 - tbuf[s0 + i] * sc; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        } else { g.moveTo(0, h / 2); g.lineTo(w, h / 2); }
        g.stroke(); g.shadowBlur = 0;
      } else if (a) {
        if (!fbuf) fbuf = new Uint8Array(a.analyser.frequencyBinCount);
        a.analyser.getByteFrequencyData(fbuf);
        const lo = Math.log10(35), hi = Math.log10(12000);
        const binHz = a.ac.sampleRate / a.analyser.fftSize;
        const n = Math.max(32, Math.floor(w / 6)), bw = w / n;
        const grad = g.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "#e07a4a"); grad.addColorStop(0.5, "#e6b450"); grad.addColorStop(1, "#6ec6c0");
        g.fillStyle = grad;
        for (let b = 0; b < n; b++) {
          const f0 = 10 ** (lo + ((hi - lo) * b) / n), f1 = 10 ** (lo + ((hi - lo) * (b + 1)) / n);
          let m = 0;
          for (let k = Math.floor(f0 / binHz); k <= Math.ceil(f1 / binHz) && k < fbuf.length; k++) m = Math.max(m, fbuf[k]);
          const bh = (m / 255) * (h - 4);
          if (bh > 0.5) g.fillRect(b * bw + 0.5, h - bh, Math.max(1, bw - 1.5), bh);
        }
      }
      id = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([en]) => {
      cancelAnimationFrame(id);
      if (en.isIntersecting) id = requestAnimationFrame(draw);
    });
    io.observe(cv);
    return () => { io.disconnect(); cancelAnimationFrame(id); };
  }, []);

  // ── piano-roll scrolling ──
  const pitch = (el: HTMLDivElement) => {
    const rows = el.children;
    return rows.length > 1 ? (rows[1] as HTMLElement).offsetTop - (rows[0] as HTMLElement).offsetTop : 25;
  };
  const scrollHome = (g: Roll) => {
    const el = bodyRef.current[g];
    if (el) el.scrollTop = homeRow(live.current.tracks, g, VISIBLE[g]) * pitch(el);
  };
  const scrollOct = (g: Roll, dir: -1 | 1) => {
    const el = bodyRef.current[g];
    if (el) el.scrollBy({ top: dir * octave * pitch(el), behavior: "smooth" });
  };
  // Re-centre a roll whenever it (re)opens. scrollHome only touches refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!folded.keys) scrollHome("keys"); }, [folded.keys]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!folded.bass) scrollHome("bass"); }, [folded.bass]);
  // …and when the scale changes, since each scale fits a different number of notes per octave.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollHome("keys"); scrollHome("bass"); }, [scale]);

  // Load saved tapes, and a shared beat from ?beat= if there is one.
  useEffect(() => {
    setTapes(loadTapes());
    const code = new URLSearchParams(window.location.search).get("beat");
    const got = code && decodeBeat(code);
    if (got) {
      applyBeat(got);
      say("someone sent you a beat — hit play ▶");
      window.setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── grid editing (click or drag to paint) ──
  // Switching a cell on sets its first tick; switching it off clears the whole
  // cell, including any finer notes hiding inside it.
  const setCell = (r: number, c: number, on: boolean) => {
    const at = bar * TICKS + c * span;
    setPattern((p) => {
      const cellOn = p[r][at];
      const hidden = p[r].slice(at + 1, at + span).some(Boolean);
      if (on ? cellOn : !cellOn && !hidden) return p;
      const next = p.map((row) => row.slice());
      if (on) next[r][at] = true;
      else for (let i = at; i < at + span; i++) next[r][i] = false;
      return next;
    });
    if (on && timer.current === null) audition(r);
  };
  useEffect(() => {
    const up = () => { paint.current = null; };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);

  // ── bars ──
  const addBar = () => {
    if (bars >= MAX_BARS) return;
    setPattern((p) => p.map((row) => [...row, ...row.slice(bar * TICKS, bar * TICKS + TICKS)]));
    setBar(bars);
  };
  const removeBar = () => {
    if (bars <= 1) return;
    setPattern((p) => p.map((row) => [...row.slice(0, bar * TICKS), ...row.slice((bar + 1) * TICKS)]));
    setBar((b) => Math.min(b, bars - 2));
  };
  const reset = (p: Pattern) => { setPattern(p); setBar((b) => Math.min(b, barsOf(p) - 1)); setCue((c) => (c < p[0].length ? c : 0)); };

  // ── start marker ──
  const cueAt = (tick: number) => {
    setCue(tick);
    if (timer.current !== null) jump.current = tick; // jump there right away
  };

  // ── synth panel ──
  const cur = synths[synthTab];
  const presets = synthTab === "keys" ? KEY_PRESETS : BASS_PRESETS;
  // `hear` plays a test note (when stopped) so a change is audible and shows on the scope.
  const setSynth = (patch: Partial<Synth>, hear = false) => {
    const next = { ...synths, [synthTab]: { ...synths[synthTab], ...patch } };
    setSynths(next);
    live.current.synths = next;
    if (hear && timer.current === null) {
      // test note: C5 for keys, C2 for bass (an octave above each section's lowest note)
      const t = live.current.tracks;
      const low = t[synthTab === "keys" ? KEY_ROWS - 1 : KEY_ROWS + BASS_ROWS - 1].midi!;
      audition(rowNear(t, synthTab, low + (synthTab === "keys" ? 24 : 12)));
    }
  };

  // ── saving ──
  const beat: Beat = { pattern, bpm, swing, scale, root, res, synths };
  const code = encodeBeat(beat);
  function applyBeat(b: Beat) {
    setPattern(b.pattern); setBpm(b.bpm); setSwing(b.swing); setScale(b.scale); setRoot(b.root);
    setRes(b.res); setSynths(b.synths); setBar(0);
  }
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?v=os&beat=${code}`;
    try { await navigator.clipboard.writeText(url); setShareUrl(null); say("link copied — send it to someone"); }
    catch { setShareUrl(url); }
  };
  const saveTape = () => {
    const label = name.trim() || `tape ${tapes.length + 1}`;
    const next = [{ name: label, code, at: Date.now() }, ...tapes.filter((t) => t.name !== label)].slice(0, 12);
    setTapes(next); storeTapes(next); setName("");
    say(`saved “${label}” to your tapes`);
  };
  const loadTape = (t: Tape) => {
    const got = decodeBeat(t.code);
    if (!got) { say("that tape is from an older version — sorry!"); return; }
    applyBeat(got);
    say(`loaded “${t.name}”`);
  };
  const dropTape = (t: Tape) => { const next = tapes.filter((x) => x !== t); setTapes(next); storeTapes(next); };
  const download = async () => {
    setRendering(true);
    try {
      const blob = await renderWav(beat);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `side-b-beat-${bpm}bpm.wav`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say("bounced to .wav");
    } catch { say("couldn't render audio in this browser"); }
    setRendering(false);
  };

  // ── grid ──
  const groupRows: Record<Group, number[]> = {
    keys: Array.from({ length: KEY_ROWS }, (_, i) => i),
    bass: Array.from({ length: BASS_ROWS }, (_, i) => KEY_ROWS + i),
    drums: tracks.map((_, i) => i).slice(KEY_ROWS + BASS_ROWS),
  };
  const notesIn = (g: Group) => {
    let n = 0;
    for (const r of groupRows[g]) for (let k = bar * TICKS; k < (bar + 1) * TICKS; k++) if (pattern[r][k]) n++;
    return n;
  };

  const renderRow = (r: number) => {
    const tr = tracks[r];
    return (
      <div className={`sb-beat-row${tr.isRoot ? " root" : ""}`} key={tr.id}>
        <span className="sb-beat-label">{tr.label}</span>
        {Array.from({ length: res }, (_, c) => {
          const at = bar * TICKS + c * span;
          const on = pattern[r][at];
          const hidden = !on && pattern[r].slice(at + 1, at + span).some(Boolean);
          const now = playing && playTick >= at && playTick < at + span;
          return (
            <button
              key={c}
              aria-pressed={on}
              aria-label={`${tr.label}, bar ${bar + 1}, step ${c + 1}`}
              className={`sb-cell${on ? " on" : ""}${hidden ? " sub" : ""}${now ? " now" : ""}${c % (res / 4) === 0 ? " beat" : ""}`}
              onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); paint.current = !(on || hidden); setCell(r, c, !(on || hidden)); }}
              onPointerEnter={() => { if (paint.current !== null) setCell(r, c, paint.current); }}
            />
          );
        })}
      </div>
    );
  };

  const renderGroup = (g: Group) => {
    const n = notesIn(g);
    const roll = g === "drums" ? null : g;
    return (
      <div className={`sb-grp g-${g}${folded[g] ? " folded" : ""}`} key={g}>
        <div className="sb-grp-head">
          <button className="sb-grp-toggle" onClick={() => setFolded((f) => ({ ...f, [g]: !f[g] }))} aria-expanded={!folded[g]}>
            <span className="sb-grp-caret" aria-hidden>{folded[g] ? "▸" : "▾"}</span> {g}
          </button>
          <span className="sb-grp-count">{n ? `${n} note${n === 1 ? "" : "s"} in bar ${bar + 1}` : "empty"}</span>
          {roll && !folded[g] && (
            <span className="sb-grp-oct">
              <button onClick={() => scrollOct(roll, -1)} aria-label={`${g}: up an octave`} title="Up an octave">▲</button>
              <button onClick={() => scrollOct(roll, 1)} aria-label={`${g}: down an octave`} title="Down an octave">▼</button>
            </span>
          )}
        </div>
        {!folded[g] && (
          <div
            className={`sb-grp-body${roll ? " scrolls" : ""}`}
            ref={roll ? (el) => { bodyRef.current[roll] = el; } : undefined}
            style={roll ? { ["--vis" as string]: VISIBLE[roll] } : undefined}
          >
            {groupRows[g].map(renderRow)}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="sb-block sb-beats" id="sb-beats" ref={rootRef}>
      <SubHead title="● rec — make a beat" note="you found the blank tape. it's all synthesized — go wild" />
      <p className="sb-beat-intro">
        Click (or drag) to fill the grid and hit play — click the timeline to start from any point, or loop
        just one bar while you work on it. Scroll the keys and bass for more notes, shape the sound
        on the little synth, and watch it on the scope. Every note is in the scale — stick to the pentatonics and nothing can sound wrong.
        Save it as a tape, send someone the link, or bounce it to a .wav.
      </p>

      <div className="sb-beat">
        <div className="sb-beat-transport">
          <button className={`sb-beat-play${playing ? " on" : ""}`} onClick={playing ? stop : start} aria-label={playing ? "Stop" : "Play"}>
            {playing ? "■" : "▶"}
          </button>
          <label className="sb-beat-knob">
            <span>tempo</span>
            <input type="range" min={60} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
            <b>{bpm}</b>
          </label>
          <label className="sb-beat-knob">
            <span>swing</span>
            <input type="range" min={0} max={100} value={Math.round(swing * 100)} onChange={(e) => setSwing(Number(e.target.value) / 100)} />
            <b>{Math.round(swing * 100)}%</b>
          </label>
          <label className="sb-beat-knob">
            <span>key</span>
            <select value={root} onChange={(e) => setRoot(Number(e.target.value))}>
              {ROOTS.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </label>
          <label className="sb-beat-knob">
            <span>scale</span>
            <select
              value={scale}
              onChange={(e) => {
                const to = Number(e.target.value);
                setPattern((p) => remapScale(p, root, scale, to));
                setScale(to);
              }}
            >
              <optgroup label="can't go wrong">
                {SCALES.map((sc, i) => sc.group === "easy" && <option key={sc.name} value={i}>{sc.name}</option>)}
              </optgroup>
              <optgroup label="full scales">
                {SCALES.map((sc, i) => sc.group === "full" && <option key={sc.name} value={i}>{sc.name}</option>)}
              </optgroup>
            </select>
          </label>
          <div className="sb-beat-tools">
            <button className="sb-btn" onClick={() => reset(starterPattern(scale))} title="Replace the grid with a one-bar demo beat">demo beat</button>
            <button className="sb-btn" onClick={() => reset(randomPattern(bars, scale, root))} title="Keep the drums, write a random melody and bass line in this key">🎲 random tune</button>
            <button className="sb-btn" onClick={() => reset(emptyPattern(bars))}>clear</button>
          </div>
        </div>

        {/* the little synth + scope */}
        <div className="sb-synth">
          <div className="sb-synth-ctrl">
            <div className="sb-synth-top">
              <div className="sb-beat-voices" role="tablist" aria-label="Synth to edit">
                {(["keys", "bass"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={synthTab === t} className={`sb-beat-voice${synthTab === t ? " on" : ""}`} onClick={() => setSynthTab(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="sb-synth-presets">
                {Object.entries(presets).map(([n, p]) => (
                  <button key={n} className={`sb-chip${sameSynth(cur, p) ? " on" : ""}`} onClick={() => setSynth({ ...p }, true)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="sb-synth-waves" role="radiogroup" aria-label="Waveform">
              {WAVES.map((w) => (
                <button key={w} role="radio" aria-checked={cur.wave === w} className={`sb-wave${cur.wave === w ? " on" : ""}`} onClick={() => setSynth({ wave: w }, true)} title={WAVE_NAME[w]}>
                  <svg viewBox="0 0 26 14" aria-hidden><path d={WAVE_ICON[w]} /></svg>
                  <span>{WAVE_NAME[w]}</span>
                </button>
              ))}
            </div>
            <div className="sb-synth-knobs">
              {KNOBS.filter((k) => !(k === "detune" && cur.wave === "fm")).map((k) => (
                <label key={k} className="sb-synth-knob">
                  <span>{k}</span>
                  <input type="range" min={0} max={100} value={Math.round(cur[k])} onChange={(e) => setSynth({ [k]: Number(e.target.value) })} onPointerUp={() => setSynth({}, true)} />
                </label>
              ))}
            </div>
          </div>
          <div className="sb-scope">
            <div className="sb-scope-head">
              <span>{viz === "wave" ? "scope" : "spectrum"}</span>
              <div className="sb-beat-voices" role="radiogroup" aria-label="Visualizer mode">
                {(["wave", "spectrum"] as const).map((m) => (
                  <button key={m} role="radio" aria-checked={viz === m} className={`sb-beat-voice${viz === m ? " on" : ""}`} onClick={() => setViz(m)}>{m}</button>
                ))}
              </div>
            </div>
            <canvas ref={canvasRef} className="sb-scope-canvas" role="img" aria-label="Live visualizer of the beat" />
          </div>
        </div>

        <div className="sb-beat-bars">
          <span className="sb-beat-k">bars</span>
          <div className="sb-beat-tabs" role="tablist" aria-label="Bars">
            {Array.from({ length: bars }, (_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={bar === i}
                className={`sb-beat-tab${bar === i ? " on" : ""}${playing && Math.floor(playTick / TICKS) === i ? " live" : ""}${cue > 0 && Math.floor(cue / TICKS) === i ? " cued" : ""}`}
                onClick={() => setBar(i)}
              >
                {i + 1}
              </button>
            ))}
            {bars < MAX_BARS && <button className="sb-beat-tab add" onClick={addBar} title="Add a bar (copies this one)">+</button>}
            {bars > 1 && <button className="sb-beat-tab add" onClick={removeBar} title="Remove this bar">−</button>}
          </div>
          <span className="sb-beat-k sb-beat-k-res">loop</span>
          <div className="sb-beat-voices" role="radiogroup" aria-label="Loop">
            <button role="radio" aria-checked={!loopBar} className={`sb-beat-voice${!loopBar ? " on" : ""}`} onClick={() => setLoopBar(false)}>whole beat</button>
            <button role="radio" aria-checked={loopBar} className={`sb-beat-voice${loopBar ? " on" : ""}`} onClick={() => setLoopBar(true)}>this bar</button>
          </div>
          <span className="sb-beat-k">grid</span>
          <div className="sb-beat-voices" role="radiogroup" aria-label="Grid resolution">
            {RESOLUTIONS.map((r) => (
              <button key={r} role="radio" aria-checked={res === r} className={`sb-beat-voice${res === r ? " on" : ""}`} onClick={() => setRes(r)}>
                1/{r}
              </button>
            ))}
          </div>
        </div>

        <div className="sb-beat-scroll">
          <div className={`sb-beat-grid r${res}`} aria-label={`Beat grid, bar ${bar + 1} of ${bars}`} onContextMenu={(e) => e.preventDefault()} style={{ ["--cols" as string]: res }}>
            <div className="sb-beat-row sb-ruler" aria-label="Timeline — click to set where playback starts">
              <button className="sb-ruler-home" onClick={() => cueAt(0)} title="Start from the beginning" aria-label="Start from the beginning">⏮</button>
              {Array.from({ length: res }, (_, c) => {
                const at = bar * TICKS + c * span;
                const beatLen = res / 4;
                const isCue = cue >= at && cue < at + span;
                return (
                  <button
                    key={c}
                    className={`sb-ruler-cell${c % beatLen === 0 ? " beat" : ""}${isCue ? " cue" : ""}`}
                    onClick={() => cueAt(at)}
                    title={`Play from bar ${bar + 1}, beat ${Math.floor(c / beatLen) + 1}`}
                    aria-label={`Play from bar ${bar + 1}, step ${c + 1}`}
                  >
                    {c % beatLen === 0 ? `${bar + 1}.${c / beatLen + 1}` : ""}
                  </button>
                );
              })}
            </div>
            {renderGroup("keys")}
            {renderGroup("bass")}
            {renderGroup("drums")}
          </div>
        </div>

        <div className="sb-beat-save">
          <div className="sb-beat-save-row">
            <input
              className="sb-beat-name"
              placeholder="name this tape…"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTape(); }}
            />
            <button className="sb-btn" onClick={saveTape}>💾 save tape</button>
            <button className="sb-btn" onClick={share}>🔗 copy link</button>
            <button className="sb-btn" onClick={download} disabled={rendering}>{rendering ? "bouncing…" : "⤓ .wav"}</button>
          </div>
          {shareUrl && <input className="sb-beat-share" readOnly value={shareUrl} onFocus={(e) => e.target.select()} aria-label="Share link" />}
          {tapes.length > 0 && (
            <div className="sb-tapes">
              <span className="sb-tapes-label">your tapes</span>
              {tapes.map((t) => (
                <span className="sb-tape-chip" key={t.name + t.at}>
                  <button onClick={() => loadTape(t)} title="Load this tape">▭ {t.name}</button>
                  <button className="x" onClick={() => dropTape(t)} aria-label={`Delete ${t.name}`}>✕</button>
                </span>
              ))}
            </div>
          )}
          <p className="sb-beat-note">Tapes live in this browser only — use the link to share or keep one anywhere.</p>
        </div>
        {toast && <div className="sb-beat-toast" role="status">{toast}</div>}
      </div>
    </section>
  );
}
