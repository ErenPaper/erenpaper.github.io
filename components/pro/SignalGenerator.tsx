"use client";

import { useEffect, useRef, useState } from "react";

// RR-02 · Signal Generator — a playable Web Audio synth styled as a datasheet
// part. Piano on one side, signals on the other: a live (zero-crossing
// triggered) oscilloscope and a log-frequency FFT spectrum with harmonic
// markers, plus a low-pass filter so you can watch harmonics get cut. All
// synthesized, no audio files. Computer keys only play while it's on screen.

type Wave = "sine" | "square" | "sawtooth" | "triangle";

const WAVES: { id: Wave; label: string; gain: number }[] = [
  { id: "sine", label: "SINE", gain: 0.34 },
  { id: "triangle", label: "TRI", gain: 0.34 },
  { id: "square", label: "SQR", gain: 0.13 },
  { id: "sawtooth", label: "SAW", gain: 0.17 },
];

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

// Semitones above the base C, with the usual DAW "musical typing" layout.
const KEYS = [
  { semi: 0, key: "a" }, { semi: 1, key: "w" }, { semi: 2, key: "s" }, { semi: 3, key: "e" },
  { semi: 4, key: "d" }, { semi: 5, key: "f" }, { semi: 6, key: "t" }, { semi: 7, key: "g" },
  { semi: 8, key: "y" }, { semi: 9, key: "h" }, { semi: 10, key: "u" }, { semi: 11, key: "j" },
  { semi: 12, key: "k" }, { semi: 13, key: "o" }, { semi: 14, key: "l" }, { semi: 15, key: "p" },
  { semi: 16, key: ";" },
];
const WHITES = KEYS.filter((k) => ![1, 3, 6, 8, 10].includes(k.semi % 12));
const BLACKS = KEYS.filter((k) => [1, 3, 6, 8, 10].includes(k.semi % 12));
// Index of the white key each black key sits to the right of.
const blackSlot = (semi: number) => WHITES.findIndex((w) => w.semi === semi - 1);

const midiOf = (octave: number, semi: number) => 12 * (octave + 1) + semi;
const freqOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const nameOf = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// Cutoff slider 0–100 → 150 Hz … 12 kHz on a log scale.
const cutoffHz = (v: number) => 150 * 80 ** (v / 100);
const fmtHz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`);

type Engine = { ac: AudioContext; filter: BiquadFilterNode; analyser: AnalyserNode };
type Voice = { osc: OscillatorNode; env: GainNode; midi: number };

export default function SignalGenerator() {
  const [wave, setWave] = useState<Wave>("square");
  const [octave, setOctave] = useState(4);
  const [cutoff, setCutoff] = useState(100);
  const [active, setActive] = useState<number[]>([]); // held semis
  const [last, setLast] = useState<number | null>(null); // last midi played

  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const voices = useRef(new Map<number, Voice>());
  const inView = useRef(false);
  // Mirrors so audio callbacks always see current settings.
  const waveRef = useRef(wave); waveRef.current = wave;
  const octRef = useRef(octave); octRef.current = octave;
  const cutRef = useRef(cutoff); cutRef.current = cutoff;
  const lastRef = useRef(last); lastRef.current = last;

  const ensure = (): Engine | null => {
    if (!engine.current) {
      try {
        const ac = new AudioContext();
        const filter = ac.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.value = 0.9;
        filter.frequency.value = cutoffHz(cutRef.current);
        const comp = ac.createDynamicsCompressor();
        const analyser = ac.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.72;
        analyser.minDecibels = -96;
        analyser.maxDecibels = -18;
        filter.connect(comp).connect(analyser).connect(ac.destination);
        engine.current = { ac, filter, analyser };
      } catch {
        return null;
      }
    }
    if (engine.current.ac.state === "suspended") void engine.current.ac.resume();
    return engine.current;
  };

  const noteOn = (semi: number) => {
    if (voices.current.has(semi)) return;
    const e = ensure();
    if (!e) return;
    const { ac, filter } = e;
    const w = WAVES.find((x) => x.id === waveRef.current)!;
    const midi = midiOf(octRef.current, semi);
    const osc = ac.createOscillator();
    osc.type = w.id;
    osc.frequency.value = freqOf(midi);
    const env = ac.createGain();
    const t = ac.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(w.gain, t + 0.012);
    env.gain.setTargetAtTime(w.gain * 0.7, t + 0.012, 0.25); // gentle decay to sustain
    osc.connect(env).connect(filter);
    osc.start(t);
    voices.current.set(semi, { osc, env, midi });
    setActive([...voices.current.keys()]);
    setLast(midi);
  };

  const noteOff = (semi: number) => {
    const v = voices.current.get(semi);
    const e = engine.current;
    if (!v || !e) return;
    const t = e.ac.currentTime;
    v.env.gain.cancelScheduledValues(t);
    v.env.gain.setValueAtTime(v.env.gain.value, t);
    v.env.gain.setTargetAtTime(0, t, 0.09);
    v.osc.stop(t + 0.6);
    voices.current.delete(semi);
    setActive([...voices.current.keys()]);
  };

  const allOff = () => [...voices.current.keys()].forEach(noteOff);

  // Live-update held notes when the waveform or filter changes.
  useEffect(() => {
    const w = WAVES.find((x) => x.id === wave)!;
    voices.current.forEach((v) => { v.osc.type = w.id; v.env.gain.setTargetAtTime(w.gain * 0.7, engine.current!.ac.currentTime, 0.03); });
  }, [wave]);
  useEffect(() => {
    const e = engine.current;
    if (e) e.filter.frequency.setTargetAtTime(cutoffHz(cutoff), e.ac.currentTime, 0.03);
  }, [cutoff]);

  // Musical typing — only while the panel is on screen and nothing else has focus.
  useEffect(() => {
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "range" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (!inView.current || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "z") { allOff(); setOctave((o) => Math.max(2, o - 1)); return; }
      if (k === "x") { allOff(); setOctave((o) => Math.min(6, o + 1)); return; }
      const hit = KEYS.find((x) => x.key === k);
      if (hit) { e.preventDefault(); noteOn(hit.semi); }
    };
    const up = (e: KeyboardEvent) => {
      const hit = KEYS.find((x) => x.key === e.key.toLowerCase());
      if (hit) noteOff(hit.semi);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", allOff);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", allOff);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw loop for scope + spectrum, running only while visible.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let frame = 0;
    let colors = { accent: "#57ff8a", accent2: "#ffb000", grid: "#16371f", dim: "#5a7a62" };
    const readColors = () => {
      const cs = getComputedStyle(root);
      const v = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
      colors = { accent: v("--accent", colors.accent), accent2: v("--accent-2", colors.accent2), grid: v("--border", colors.grid), dim: v("--text-dim", colors.dim) };
    };
    const fit = (c: HTMLCanvasElement) => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { g, w: c.clientWidth, h: c.clientHeight };
    };
    let tbuf: Float32Array | null = null;
    let fbuf: Uint8Array | null = null;

    const draw = () => {
      if (frame++ % 60 === 0) readColors();
      const e = engine.current;

      // ── scope ──
      const sc = scopeRef.current;
      if (sc) {
        const { g, w, h } = fit(sc);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = colors.grid; g.lineWidth = 1;
        for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((w * i) / 8, 0); g.lineTo((w * i) / 8, h); g.stroke(); }
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (h * i) / 4); g.lineTo(w, (h * i) / 4); g.stroke(); }
        g.strokeStyle = colors.accent; g.lineWidth = 2; g.shadowColor = colors.accent; g.shadowBlur = 6;
        g.beginPath();
        if (e) {
          const a = e.analyser;
          if (!tbuf || tbuf.length !== a.fftSize) tbuf = new Float32Array(a.fftSize);
          a.getFloatTimeDomainData(tbuf as Float32Array<ArrayBuffer>);
          const span = 1200;
          let start = 0;
          for (let i = 1; i < tbuf.length - span; i++) if (tbuf[i - 1] < 0 && tbuf[i] >= 0) { start = i; break; }
          let peak = 0;
          for (let i = 0; i < span; i++) peak = Math.max(peak, Math.abs(tbuf[start + i]));
          const scale = (h * 0.4) / Math.max(peak, 0.05);
          for (let i = 0; i < span; i++) {
            const x = (i / (span - 1)) * w, y = h / 2 - tbuf[start + i] * scale;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
        } else {
          g.moveTo(0, h / 2); g.lineTo(w, h / 2);
        }
        g.stroke();
        g.shadowBlur = 0;
      }

      // ── spectrum (log x, 40 Hz – 12 kHz) ──
      const sp = specRef.current;
      if (sp) {
        const { g, w, h } = fit(sp);
        g.clearRect(0, 0, w, h);
        const lo = Math.log10(40), hi = Math.log10(12000);
        const xOf = (f: number) => ((Math.log10(f) - lo) / (hi - lo)) * w;
        g.font = "9px ui-monospace, monospace"; g.fillStyle = colors.dim; g.strokeStyle = colors.grid; g.lineWidth = 1;
        for (const [f, label] of [[100, "100"], [1000, "1k"], [10000, "10k"]] as const) {
          const x = xOf(f);
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
          g.fillText(label, x + 3, h - 4);
        }
        if (e) {
          const a = e.analyser;
          if (!fbuf || fbuf.length !== a.frequencyBinCount) fbuf = new Uint8Array(a.frequencyBinCount);
          a.getByteFrequencyData(fbuf as Uint8Array<ArrayBuffer>);
          const binHz = e.ac.sampleRate / a.fftSize;
          const bars = Math.max(48, Math.floor(w / 5));
          const bw = w / bars;
          g.fillStyle = colors.accent;
          for (let b = 0; b < bars; b++) {
            const f0 = 10 ** (lo + ((hi - lo) * b) / bars), f1 = 10 ** (lo + ((hi - lo) * (b + 1)) / bars);
            let m = 0;
            for (let k = Math.floor(f0 / binHz); k <= Math.ceil(f1 / binHz) && k < fbuf.length; k++) m = Math.max(m, fbuf[k]);
            const bh = (m / 255) * (h - 14);
            if (bh > 0.5) g.fillRect(b * bw + 0.5, h - 14 - bh, Math.max(1, bw - 1.5), bh);
          }
          // Harmonic markers for the last note: f0, 2f0, 3f0 …
          const lm = lastRef.current;
          if (lm !== null && voices.current.size) {
            const fund = freqOf(lm);
            g.fillStyle = colors.accent2; g.strokeStyle = colors.accent2;
            for (let n = 1; n * fund < 12000 && n <= 16; n++) {
              const x = xOf(n * fund);
              g.globalAlpha = n === 1 ? 1 : 0.55;
              g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 6); g.stroke();
              if (n <= 3) g.fillText(n === 1 ? "f₀" : `${n}f₀`, x + 2, 14);
            }
            g.globalAlpha = 1;
          }
          // Filter cutoff marker
          const fc = cutoffHz(cutRef.current);
          if (cutRef.current < 99) {
            const x = xOf(fc);
            g.strokeStyle = colors.accent2; g.setLineDash([3, 3]);
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h - 14); g.stroke();
            g.setLineDash([]);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([en]) => {
      inView.current = en.isIntersecting;
      cancelAnimationFrame(raf);
      if (en.isIntersecting) { readColors(); raf = requestAnimationFrame(draw); }
      else allOff();
    }, { threshold: 0.25 });
    io.observe(root);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tear down the audio graph on unmount.
  useEffect(() => () => {
    voices.current.forEach((v) => { try { v.osc.stop(); } catch {} });
    voices.current.clear();
    void engine.current?.ac.close();
    engine.current = null;
  }, []);

  const press = (semi: number) => (e: React.PointerEvent) => { e.preventDefault(); noteOn(semi); };
  const release = (semi: number) => () => noteOff(semi);
  const keyProps = (semi: number) => ({
    onPointerDown: press(semi),
    onPointerUp: release(semi),
    onPointerLeave: release(semi),
    onPointerCancel: release(semi),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const shownMidi = last;
  return (
    <div className="sg" ref={rootRef}>
      <div className="sg-head">
        <span><span className="ps-led on" /> RR-02 · SIGNAL GENERATOR</span>
        <span className="sg-head-r">PLAYABLE · WEB AUDIO</span>
      </div>

      <div className="sg-displays">
        <figure className="sg-display">
          <canvas ref={scopeRef} className="sg-canvas" aria-label="Oscilloscope trace of the sound you're playing" role="img" />
          <figcaption>CH1 · TIME DOMAIN</figcaption>
        </figure>
        <figure className="sg-display">
          <canvas ref={specRef} className="sg-canvas" aria-label="Frequency spectrum of the sound you're playing" role="img" />
          <figcaption>FFT · 40 Hz – 12 kHz</figcaption>
        </figure>
      </div>

      <div className="sg-controls">
        <div className="sg-group" role="radiogroup" aria-label="Waveform">
          <span className="sg-label">WAVE</span>
          {WAVES.map((w) => (
            <button key={w.id} role="radio" aria-checked={wave === w.id} className={`sg-seg${wave === w.id ? " on" : ""}`} onClick={() => setWave(w.id)}>
              {w.label}
            </button>
          ))}
        </div>
        <div className="sg-group">
          <span className="sg-label">OCT</span>
          <button className="sg-seg" onClick={() => { allOff(); setOctave((o) => Math.max(2, o - 1)); }} aria-label="Octave down">−</button>
          <span className="sg-val">{octave}</span>
          <button className="sg-seg" onClick={() => { allOff(); setOctave((o) => Math.min(6, o + 1)); }} aria-label="Octave up">+</button>
        </div>
        <label className="sg-group sg-lpf">
          <span className="sg-label">LPF</span>
          <input type="range" min={0} max={100} value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} aria-label="Low-pass filter cutoff" />
          <span className="sg-val">{cutoff >= 99 ? "open" : fmtHz(cutoffHz(cutoff))}</span>
        </label>
        <div className="sg-readout" aria-live="polite">
          {shownMidi !== null ? <>{nameOf(shownMidi)} · {freqOf(shownMidi).toFixed(2)} Hz</> : "— play a note —"}
        </div>
      </div>

      <div className="sg-keys" style={{ ["--whites" as string]: WHITES.length }}>
        {WHITES.map((k) => (
          <button key={k.semi} className={`sg-white${active.includes(k.semi) ? " down" : ""}`} aria-label={nameOf(midiOf(octave, k.semi))} {...keyProps(k.semi)}>
            <span className="sg-kb">{k.key.toUpperCase()}</span>
          </button>
        ))}
        {BLACKS.map((k) => (
          <button
            key={k.semi}
            className={`sg-black${active.includes(k.semi) ? " down" : ""}`}
            style={{ ["--slot" as string]: blackSlot(k.semi) }}
            aria-label={nameOf(midiOf(octave, k.semi))}
            {...keyProps(k.semi)}
          >
            <span className="sg-kb">{k.key.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <p className="sg-hint">
        Type <kbd>A</kbd>–<kbd>;</kbd> to play (black keys on <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>P</kbd>),
        {" "}<kbd>Z</kbd>/<kbd>X</kbd> for octave — or just tap the keys. Try a square wave, then pull the LPF down.
      </p>
    </div>
  );
}
