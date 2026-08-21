"use client";

import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import { useOS, type WinState } from "../../store/windows";
import { appMap } from "../apps/registry";

// Stable fake base address per app for the pro persona's title bars.
function appHex(appId: string) {
  const h = Array.from(appId).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  return `0x${h.toString(16).toUpperCase().padStart(8, "0").slice(-8)}`;
}

export default function Window({ win, isMobile }: { win: WinState; isMobile: boolean }) {
  const { focus, close, minimize, toggleMax, move, resize, topZ } = useOS();
  const def = appMap[win.appId];
  if (!def || win.minimized) return null;
  const Body = def.Component;
  const active = win.z === topZ;

  // Mobile: every window is a full-screen sheet. The Rnd parent
  // (.desktop-surface) already starts below the menu bar, so maximized
  // simply fills the parent.
  const maximized = win.maximized || isMobile;
  const pos = maximized
    ? { x: 0, y: 0, width: "100%", height: "100%" }
    : { x: win.x, y: win.y, width: win.w, height: win.h };

  return (
    <Rnd
      size={{ width: pos.width as number | string, height: pos.height as number | string }}
      position={{ x: pos.x, y: pos.y }}
      bounds="parent"
      dragHandleClassName="win-bar"
      disableDragging={maximized}
      enableResizing={!maximized}
      minWidth={320}
      minHeight={220}
      style={{ zIndex: win.z }}
      onMouseDown={() => focus(win.id)}
      onDragStop={(_e, d) => move(win.id, d.x, d.y)}
      onResizeStop={(_e, _dir, ref, _delta, p) =>
        resize(win.id, ref.offsetWidth, ref.offsetHeight, p.x, p.y)
      }
    >
      <motion.div
        className="win"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        <div
          className={`win-bar${active ? " is-active" : ""}`}
          onDoubleClick={() => !isMobile && toggleMax(win.id)}
        >
          <div className="traffic">
            <button className="t-close" onClick={() => close(win.id)} aria-label="Close" />
            <button className="t-min" onClick={() => minimize(win.id)} aria-label="Minimize" />
            <button className="t-max" onClick={() => !isMobile && toggleMax(win.id)} aria-label="Maximize" />
          </div>
          <span className="win-title">{win.title}</span>
          {/* pro persona decorations — hidden by CSS elsewhere */}
          <span className="win-hex" aria-hidden>{appHex(win.appId)}</span>
          <span className="win-led" aria-hidden />
        </div>
        <div className="win-body">
          <Body />
        </div>
      </motion.div>
    </Rnd>
  );
}
