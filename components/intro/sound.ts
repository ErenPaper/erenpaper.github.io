// Synthesized UI sounds for the boot/landing sequence — no audio files.
// One shared AudioContext; browsers keep it suspended until a user gesture,
// so sounds silently no-op until the first pointerdown/keydown unlocks it.

let ctx: AudioContext | null = null;

export function initAudioUnlock(): () => void {
  const unlock = () => {
    if (!ctx) {
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (ctx.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

function live(): AudioContext | null {
  return ctx && ctx.state === "running" ? ctx : null;
}

/** Low sine sweep 60→120 Hz over 800ms — the CRT warm-up. */
export function playBootHum() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.linearRampToValueAtTime(120, t + 0.8);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.85);
}

/** 880 Hz chime, fast attack / slow decay — fires when the logo lands. */
export function playChime() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.55);
}

/** 20ms white-noise tick for menu hover. */
export function playHoverTick() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.02), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(0.03, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  src.connect(gain).connect(ac.destination);
  src.start(t);
}

/** Descending 260→30 Hz sweep, 550ms — the CRT power-off thunk. */
export function playPowerDown() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.6);
}

/** 220 Hz confirmation tone, 300ms fade — fires on selection. */
export function playSelect() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

/** Rising whoosh for the Professional star dive: a low sawtooth and a band of
 *  noise both sweeping up over ~1.7s, opening a lowpass as they go. */
export function playWarpRise() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const dur = 1.7;

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + dur);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + dur);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.035, t + dur * 0.8);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);

  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(200, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.85);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(ng).connect(ac.destination);
  src.start(t);
}

/** Mechanical lock/click on arrival: a 12ms noise tick plus a low thump. */
export function playLockClick() {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;

  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.012), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(0.08, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  src.connect(tg).connect(ac.destination);
  src.start(t);

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(170, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

/** Short square-wave beep — the POST/BIOS voice. */
export function playPostBeep(freq = 990, dur = 0.07) {
  const ac = live();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.035, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* ---- Ambient room tone for the main menu: faint mains hum + air. ----
   Very quiet by design. startAmbient() no-ops until the context is unlocked
   (Landing retries on the first gesture); stopAmbient() fades it out. */
let ambient: { stop: () => void } | null = null;

export function startAmbient() {
  const ac = live();
  if (!ac || ambient) return;
  const t = ac.currentTime;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.014, t + 2.2);
  master.connect(ac.destination);

  const hum = ac.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 55;
  const hum2 = ac.createOscillator();
  hum2.type = "triangle";
  hum2.frequency.value = 110.7; // slightly detuned octave → gentle beating
  const hum2g = ac.createGain();
  hum2g.gain.value = 0.35;
  hum.connect(master);
  hum2.connect(hum2g).connect(master);

  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const air = ac.createBufferSource();
  air.buffer = buf;
  air.loop = true;
  const airLp = ac.createBiquadFilter();
  airLp.type = "lowpass";
  airLp.frequency.value = 240;
  const airG = ac.createGain();
  airG.gain.value = 0.5;
  air.connect(airLp).connect(airG).connect(master);

  hum.start(t);
  hum2.start(t);
  air.start(t);

  ambient = {
    stop() {
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      [hum, hum2, air].forEach((n) => { try { n.stop(now + 0.55); } catch {} });
      window.setTimeout(() => master.disconnect(), 700);
    },
  };
}

export function stopAmbient() {
  ambient?.stop();
  ambient = null;
}
