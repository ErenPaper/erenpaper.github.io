# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Raphael Ramos's personal portfolio at `erenpaper.github.io` (a GitHub user page served at the domain root, so **no `basePath`**). It's a Next.js app that renders a fake "desktop OS" portfolio with two in-app personas: **Professional** (an engineering/embedded-themed console) and **Personal** (a retro/arcade OS). The original hand-written portfolio still lives at `public/classic/` and is copied into the export, but **nothing links to it anymore** — it's kept on disk only.

## Commands

```bash
npm run dev      # local dev server (next dev)
npm run build    # static export → ./out  (output: 'export')
npm run lint     # next lint
```

There is no test suite. `npm run build` is the closest thing to a full check — it must succeed because deploys run it.

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm ci && npm run build` and publishes `./out` via GitHub Pages. **The Pages source must be set to "GitHub Actions"** in repo settings (not "deploy from branch"), or the workflow's artifact is ignored. `public/.nojekyll` keeps Pages from stripping `_next/` directories.

## Architecture

### Two sites in one repo
- **Desktop-OS app** — the Next.js app (`app/`, `components/`, `store/`, `data/`). This is the whole experience now.
- **Classic site** — `public/classic/` (`index.html`, `style.css`, `script.js`), the older static portfolio. Excluded from TypeScript (`tsconfig.json` `exclude`) and copied as-is into the export, but **unlinked** — do not add links to it.

### Phase machine (the intro → OS flow)
`store/windows.ts` (Zustand, hook `useOS`) holds a `phase: "intro" | "entering" | "leaving" | "os"`. The flow lives in `components/Experience.tsx` (the only thing `app/page.tsx` renders):
1. **`intro`** — `components/os/BootScreen.tsx` (PS2-style boot, first load only) then `components/intro/Landing.tsx` over a lazy 3D scene (`components/three/DeskScene.tsx`, react-three-fiber, `ssr: false`). The menu text is CSS-positioned over the 3D monitor's screen area (vh-sized so it reads as on-screen pixels). User picks "Professional" (→ `leave()`) or "Personal" (→ `enter()`). Landing also runs a faint ambient room-tone (`startAmbient` in `components/intro/sound.ts` — all SFX are synthesized Web Audio, no files).
2. **`entering`** (Personal) — the 3D camera dollies into the monitor; the rig fires a `crt-bloom` window event near the screen, `Experience` runs the phosphor bloom, flips to `os` (persona `personal`), and plays a `.crt-poweron` flash. If WebGL is unavailable or `prefers-reduced-motion`, `Experience` skips straight to `os`.
3. **`leaving`** (Professional) — letterbox bars snap in, a warp-rise SFX plays, and the camera dives at the bright target star on the CRT texture (`TARGET_STAR` in `DeskScene.tsx`) while `.warp-streaks`/`.chroma-split` overlays ramp up; the rig fires `star-zoom`, `Experience` expands `.star-bloom` to a whiteout, then calls `arrivePro()` (persona `pro`, phase `os`) and dissolves the starlight over a POST/BIOS flourish (`components/os/PostScreen.tsx`). **No page navigation.** No WebGL / reduced motion calls `arrivePro()` immediately.
4. **`os`** — `components/os/OS.tsx` renders the desktop *inside* a CSS CRT shell (`.monitor-frame`/`.monitor-screen` in `Experience.tsx`), so `.desktop`/`#os-wallpaper` are `position: absolute`, not `fixed`. Deep links: `?v=os` → personal desktop, `?v=pro` → engineering console (both via `enterDirect`). The MenuBar's "Main Menu" dispatches an `os-exit` window event; `Experience` plays a power-cycle beat and calls `exitToDesk()`.

### Personas & theming
`persona` is a real axis now: **`pro`** = the Professional engineering console (phosphor-green/amber, mono type, PCB-grid `ProWallpaper`, datasheet-style Projects, hex addresses in window bars), **`personal`** = the retro OS (dark arcade palette, red + PS2-blue accents, starfield `Wallpaper`, heavier scanlines). Both are mirrored to `data-persona` on `<html>` (palette variables) and on `.desktop` (structural skin) — all in `styles/global.css`. `theme` ("dark"/"light") only affects the pro persona (light = paper-datasheet look), persists to `localStorage`; `app/layout.tsx` re-applies persona/theme in an inline `<head>` script before paint.

### The windowing system
`store/windows.ts` is the single source of OS state: open `windows`, z-order (`topZ`), focus/minimize/maximize, drag (`move`) and resize. Windows are React-rnd instances rendered by `components/os/Window.tsx`. Key behavior: `open(appId, meta)` focuses an existing window for that app instead of opening a duplicate (one window per app).

### Apps
Apps are declared once in `components/apps/registry.tsx` as `AppDef`s (id, title, emoji icon, default size, `personas`, `dockOrder`, optional `desktop` flag). Their React bodies live in `components/apps/apps.tsx`. `appMap` indexes them by id; `MenuBar`, `Dock`, and `Desktop` all read from the `APPS` array. **To add an app:** add a component to `apps.tsx`, then register it in `registry.tsx`.

### Content
All portfolio copy (bio, experience, projects, skills, links) is centralized in `data/portfolio.ts` and consumed by the app components. Edit content there, not in the JSX. (The unlinked classic site has its own stale copy in `public/classic/index.html`.)

## Conventions
- Path alias `@/*` → repo root (`tsconfig.json`).
- Anything using hooks, the store, browser APIs, framer-motion, or three is a Client Component (`"use client"`). `app/layout.tsx` is the only server component of note.
- The static export can't use Next's image optimization or server features (`images.unoptimized`, `trailingSlash: true`). Reference assets by absolute path from `public/` (e.g. `/assets/...`).
