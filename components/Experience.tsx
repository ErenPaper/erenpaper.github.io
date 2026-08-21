"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../store/windows";
import BootScreen from "./os/BootScreen";
import PostScreen from "./os/PostScreen";
import Landing from "./intro/Landing";
import ProSite from "./pro/ProSite";
import PersonalSite from "./personal/PersonalSite";
import { initAudioUnlock, playLockClick, playPowerDown, playWarpRise } from "./intro/sound";

// The 3D scene is client-only and lazy so it never blocks first paint / SSR.
const DeskScene = dynamic(() => import("./three/DeskScene"), { ssr: false });

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

// Camera-shutter transition into the OS: bars close (200ms), hold black
// (100ms) while the fly-in starts underneath, then reopen (300ms).
type Shutter = "idle" | "closed" | "opening";

// Matrix phosphor bloom: when the dolly gets close to the CRT, a single green
// "pixel" expands from the centre until it swallows the viewport, the OS
// swaps in underneath, then the circle contracts to reveal it.
//   mounted → overlay in the DOM at radius 0 (no transition yet)
//   open    → radius animates 0 → 130vw (500ms); phase flips to "os" at the end
//   shrink  → radius animates back to 0 (400ms) over the running OS
type Bloom = "idle" | "mounted" | "open" | "shrink";

// Star zoom ("Professional"): the camera dives at the bright star on the CRT,
// the white bloom swells until it fills the viewport (open), holds fully opaque
// while the pro console + POST mount underneath (hold), then dissolves to
// reveal them (fade). Holding avoids catching a frame of the 3D scene
// unmounting mid-fade. One continuous shot; no page navigation.
type StarBloom = "idle" | "mounted" | "open" | "hold" | "fade";

// Main-menu return: "out" collapses the CRT picture to a line over black,
// the scene swap happens in the dark, then "in" fades the landing back up.
type Cycle = "idle" | "out" | "in";

export default function Experience() {
  const { phase, setPhase, setBooted, persona, setTheme, enter, enterDirect, arrivePro, leave, exitToDesk } = useOS();
  const [webgl, setWebgl] = useState(true);
  const [ready, setReady] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [shutter, setShutter] = useState<Shutter>("idle");
  const [bloom, setBloom] = useState<Bloom>("idle");
  const [starBloom, setStarBloom] = useState<StarBloom>("idle");
  const [post, setPost] = useState(false);      // POST/BIOS flourish over the pro console
  const [powerOn, setPowerOn] = useState(false); // CRT power-on flourish over the personal OS
  const [cycle, setCycle] = useState<Cycle>("idle");
  const reduce = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // On mount: restore theme, detect WebGL, and honour deep-links
  // (?v=os → personal desktop, ?v=pro → engineering console).
  useEffect(() => {
    setWebgl(supportsWebGL());
    const t = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(t === "light" ? "light" : "dark");
    const params = new URLSearchParams(window.location.search);
    if (params.get("v") === "os") enterDirect("personal");
    if (params.get("v") === "pro") enterDirect("pro");
    setReady(true);
    return initAudioUnlock();
  }, [setTheme, enterDirect]);

  // When the camera can't fly (no WebGL / reduced motion), jump straight in.
  useEffect(() => {
    if (phase === "entering" && (!webgl || reduce)) {
      setBooted(true);
      setPhase("os");
    }
  }, [phase, webgl, reduce, setBooted, setPhase]);

  useEffect(() => {
    if (phase === "leaving" && (!webgl || reduce)) arrivePro();
  }, [phase, webgl, reduce, arrivePro]);

  // The camera rig fires "crt-bloom" when it's close enough to the screen.
  useEffect(() => {
    const onBloom = () => setBloom((b) => (b === "idle" ? "mounted" : b));
    window.addEventListener("crt-bloom", onBloom);
    return () => window.removeEventListener("crt-bloom", onBloom);
  }, []);

  // …and "star-zoom" when the dive at the target star gets close enough.
  useEffect(() => {
    const onStar = () => setStarBloom((s) => (s === "idle" ? "mounted" : s));
    window.addEventListener("star-zoom", onStar);
    return () => window.removeEventListener("star-zoom", onStar);
  }, []);

  // Safety net: if the dolly stalls (tab throttled, WebGL hiccup), force the
  // bloom rather than stranding the user mid-"entering" / mid-"leaving".
  useEffect(() => {
    if (phase !== "entering") return;
    const t = window.setTimeout(() => window.dispatchEvent(new Event("crt-bloom")), 6000);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(() => window.dispatchEvent(new Event("star-zoom")), 5000);
    return () => window.clearTimeout(t);
  }, [phase]);

  // mounted → open on the next frame so the 0 → 130vw transition actually runs.
  useEffect(() => {
    if (bloom !== "mounted") return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setBloom("open")));
    return () => cancelAnimationFrame(raf);
  }, [bloom]);

  useEffect(() => {
    if (starBloom !== "mounted") return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setStarBloom("open")));
    return () => cancelAnimationFrame(raf);
  }, [starBloom]);

  // Once the starlight covers the viewport: lock-click, swap the pro console
  // in underneath with its POST flourish, and dissolve the starlight over it.
  useEffect(() => {
    if (starBloom === "open") {
      // Once fully white, swap the pro console + POST in underneath and hold
      // the white opaque so the 3D scene unmount is never visible.
      const t = window.setTimeout(() => {
        playLockClick();
        arrivePro();
        setPost(true);
        setStarBloom("hold");
      }, 1050);
      return () => window.clearTimeout(t);
    }
    if (starBloom === "hold") {
      // POST is now mounted beneath the opaque white — dissolve to reveal it.
      const t = window.setTimeout(() => setStarBloom("fade"), 220);
      return () => window.clearTimeout(t);
    }
    if (starBloom === "fade") {
      const t = window.setTimeout(() => setStarBloom("idle"), 600);
      return () => window.clearTimeout(t);
    }
  }, [starBloom, arrivePro]);

  // open: once the circle covers the viewport, swap the OS in and contract,
  // with a CRT power-on flash as the arcade flourish.
  useEffect(() => {
    if (bloom === "open") {
      const t = window.setTimeout(() => {
        setBooted(true);
        setPhase("os");
        setBloom("shrink");
        setPowerOn(true);
      }, 520);
      return () => window.clearTimeout(t);
    }
    if (bloom === "shrink") {
      const t = window.setTimeout(() => setBloom("idle"), 450);
      return () => window.clearTimeout(t);
    }
  }, [bloom, setBooted, setPhase]);

  // Power-cycle beat on "Main Menu": MenuBar dispatches "os-exit", we collapse
  // the picture, swap scenes in the dark, and fade the landing back up.
  useEffect(() => {
    const onExit = () => {
      if (reduce) { exitToDesk(); return; }
      playPowerDown();
      setCycle("out");
      window.setTimeout(() => {
        exitToDesk();
        setCycle("in");
        window.setTimeout(() => setCycle("idle"), 450);
      }, 500);
    };
    window.addEventListener("os-exit", onExit);
    return () => window.removeEventListener("os-exit", onExit);
  }, [reduce, exitToDesk]);

  // Jump straight to the destination, cancelling whatever transition is mid-flight.
  const transitioning = phase === "entering" || phase === "leaving" || post;
  const skipTransition = useCallback(() => {
    if (phase === "entering") {
      setBloom("idle");
      setShutter("idle");
      setPowerOn(false);
      setBooted(true);
      setPhase("os");
    } else if (phase === "leaving") {
      setStarBloom("idle");
      setPost(false);
      arrivePro();
    } else if (post) {
      setPost(false);
    }
  }, [phase, post, arrivePro, setBooted, setPhase]);

  useEffect(() => {
    if (!transitioning) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skipTransition(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transitioning, skipTransition]);

  const startShutter = () => {
    if (reduce) { enter(); return; }
    setShutter("closed");
    window.setTimeout(() => {
      enter();
      setShutter("opening");
      window.setTimeout(() => setShutter("idle"), 350);
    }, 300);
  };

  // "Professional": fly at the star on the CRT. Without a camera to fly
  // (no WebGL / reduced motion) just arrive at the console directly.
  const startStarZoom = () => {
    if (!webgl || reduce) { arrivePro(); return; }
    playWarpRise();
    leave();
  };

  const showScene = ready && webgl && !reduce && phase !== "os";
  const barsOn = phase === "leaving" || starBloom === "open";
  const barsMounted = phase === "leaving" || starBloom !== "idle";

  return (
    <div className="experience" data-persona={persona}>
      {showScene && <DeskScene />}

      <AnimatePresence mode="wait">
        {ready && phase === "intro" && !bootDone && (
          <BootScreen key="boot" onDone={() => setBootDone(true)} />
        )}
        {ready && phase === "intro" && bootDone && (
          <Landing key="landing" onPersonal={startShutter} onProfessional={startStarZoom} />
        )}
      </AnimatePresence>

      {bloom !== "idle" && (
        <div
          className="phosphor-bloom"
          style={{
            clipPath: `circle(${bloom === "open" ? "130vw" : "0vw"} at 50% 50%)`,
            WebkitClipPath: `circle(${bloom === "open" ? "130vw" : "0vw"} at 50% 50%)`,
            transition:
              bloom === "mounted"
                ? "none"
                : `clip-path ${bloom === "open" ? 500 : 400}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
      )}

      {starBloom !== "idle" && (
        <div
          className="star-bloom"
          style={{
            opacity: starBloom === "open" || starBloom === "hold" ? 1 : 0,
            transition:
              starBloom === "mounted" || starBloom === "hold"
                ? "none"
                : starBloom === "fade"
                  ? "opacity 600ms ease"
                  : "opacity 950ms cubic-bezier(0.5, 0, 0.85, 0.5)",
          }}
        />
      )}

      {/* letterbox bars — snap in for the dive, release once the POST rolls */}
      {barsMounted && !reduce && (
        <>
          <div className={`letterbox letterbox-top${barsOn ? " on" : ""}`} aria-hidden />
          <div className={`letterbox letterbox-bottom${barsOn ? " on" : ""}`} aria-hidden />
        </>
      )}

      {shutter !== "idle" && (
        <>
          <motion.div
            className="shutter shutter-top"
            initial={{ height: 0 }}
            animate={{ height: shutter === "closed" ? "50.5vh" : 0 }}
            transition={{ duration: shutter === "closed" ? 0.2 : 0.3, ease: [0.7, 0, 0.2, 1] }}
          />
          <motion.div
            className="shutter shutter-bottom"
            initial={{ height: 0 }}
            animate={{ height: shutter === "closed" ? "50.5vh" : 0 }}
            transition={{ duration: shutter === "closed" ? 0.2 : 0.3, ease: [0.7, 0, 0.2, 1] }}
          />
        </>
      )}

      {/* Personal = the "Side B" scrapbook feed (full page, warm/analog). */}
      {phase === "os" && persona === "personal" && (
        <motion.div
          key="personal"
          className="personal-site-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <PersonalSite />
          {powerOn && (
            <div className="crt-poweron" onAnimationEnd={() => setPowerOn(false)} aria-hidden />
          )}
        </motion.div>
      )}

      {/* Professional = the full-page engineering datasheet (no monitor shell). */}
      {phase === "os" && persona === "pro" && (
        <motion.div
          key="pro"
          className="pro-site-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <ProSite />
        </motion.div>
      )}

      {/* POST/BIOS flourish — pro arrival only; overlays the full page. */}
      {post && <PostScreen onDone={() => setPost(false)} />}

      {cycle !== "idle" && <div className={`power-cycle ${cycle}`} aria-hidden />}

      {transitioning && (
        <button className="skip-btn" onClick={skipTransition}>Skip ⏭</button>
      )}
    </div>
  );
}
