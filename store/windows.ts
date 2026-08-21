import { create } from "zustand";

export type Persona = "pro" | "personal";
export type Theme = "dark" | "light";

export type WinState = {
  id: string;        // unique instance id
  appId: string;     // which app
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
};

export type Phase = "intro" | "entering" | "leaving" | "os";

type Store = {
  windows: WinState[];
  topZ: number;
  persona: Persona;
  theme: Theme;
  booted: boolean;
  phase: Phase;

  setBooted: (v: boolean) => void;
  setPersona: (p: Persona) => void;
  setTheme: (t: Theme) => void;
  setPhase: (p: Phase) => void;
  enter: () => void;             // pick "Personal" on the menu → fly into the monitor (retro OS)
  enterDirect: (p?: Persona) => void; // deep-link straight into a desktop (skip the fly-in)
  leave: () => void;             // pick "Professional" → dive into the star on the CRT
  arrivePro: () => void;         // star-dive arrival → the engineering console desktop
  exitToDesk: () => void;        // back to the main menu (name screen)

  open: (appId: string, meta: { title: string; w: number; h: number }) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  toggleMax: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, w: number, h: number, x: number, y: number) => void;
};

let seq = 0;

export const useOS = create<Store>((set, get) => ({
  windows: [],
  topZ: 10,
  persona: "pro",
  theme: "dark",
  booted: false,
  phase: "intro",

  setBooted: (v) => set({ booted: v }),
  setPhase: (p) => set({ phase: p }),

  // "Personal" flies into the monitor and lands on the retro desktop.
  enter: () => {
    document.documentElement.setAttribute("data-persona", "personal");
    set({ persona: "personal", phase: "entering" });
  },

  enterDirect: (p: Persona = "personal") => {
    document.documentElement.setAttribute("data-persona", p);
    set({ persona: p, phase: "os", booted: true });
  },

  leave: () => set({ phase: "leaving" }),

  // "Professional" dives at the star and lands on the engineering console —
  // same windowing engine, pro persona/theme. No page navigation.
  arrivePro: () => {
    document.documentElement.setAttribute("data-persona", "pro");
    set({ persona: "pro", phase: "os", booted: true });
  },

  exitToDesk: () =>
    set({ phase: "intro", booted: false, windows: [], topZ: 10 }),

  setPersona: (p) => {
    try { localStorage.setItem("persona", p); } catch {}
    document.documentElement.setAttribute("data-persona", p);
    set({ persona: p });
  },

  setTheme: (t) => {
    try { localStorage.setItem("theme", t); } catch {}
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },

  open: (appId, meta) => {
    const { windows, topZ } = get();
    // If the app already has a window, just focus/un-minimize it.
    const existing = windows.find((w) => w.appId === appId);
    if (existing) {
      set({
        topZ: topZ + 1,
        windows: windows.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: topZ + 1 } : w
        ),
      });
      return;
    }
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const w = Math.min(meta.w, vw - 40);
    const h = Math.min(meta.h, vh - 120);
    // Cascade new windows a little so they don't stack exactly.
    const offset = (windows.length % 6) * 26;
    const x = Math.max(20, Math.round((vw - w) / 2) + offset - 60);
    const y = Math.max(44, Math.round((vh - h) / 2) + offset - 50);
    const id = `win-${++seq}`;
    set({
      topZ: topZ + 1,
      windows: [
        ...windows,
        { id, appId, title: meta.title, x, y, w, h, z: topZ + 1, minimized: false, maximized: false },
      ],
    });
  },

  close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),

  focus: (id) => {
    const { topZ, windows } = get();
    const target = windows.find((w) => w.id === id);
    if (target && target.z === topZ && !target.minimized) return;
    set({
      topZ: topZ + 1,
      windows: windows.map((w) => (w.id === id ? { ...w, z: topZ + 1, minimized: false } : w)),
    });
  },

  minimize: (id) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) }),

  toggleMax: (id) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) }),

  move: (id, x, y) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),

  resize: (id, w, h, x, y) =>
    set({ windows: get().windows.map((win) => (win.id === id ? { ...win, w, h, x, y } : win)) }),
}));
