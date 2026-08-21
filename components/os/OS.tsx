"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useOS } from "../../store/windows";
import { appMap } from "../apps/registry";
import MenuBar from "./MenuBar";
import Desktop from "./Desktop";
import Dock from "./Dock";
import Wallpaper from "./Wallpaper";
import ProWallpaper from "./ProWallpaper";
import Window from "./Window";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function OS() {
  const { windows, open, persona } = useOS();
  const isMobile = useIsMobile();

  // Open the About window once the desktop appears.
  useEffect(() => {
    if (windows.length === 0) {
      const a = appMap["about"];
      open(a.id, { title: a.title, w: a.w, h: a.h });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="desktop" data-persona={persona}>
      {persona === "pro" ? <ProWallpaper /> : <Wallpaper />}
      <MenuBar />
      <div className="desktop-surface">
        <Desktop />
        <AnimatePresence>
          {windows.map((w) => (
            <Window key={w.id} win={w} isMobile={isMobile} />
          ))}
        </AnimatePresence>
      </div>
      <Dock />
    </div>
  );
}
