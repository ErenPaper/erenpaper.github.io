"use client";

import { useOS } from "../../store/windows";
import { APPS } from "../apps/registry";

export default function Dock() {
  const { persona, open, windows } = useOS();
  const items = APPS
    .filter((a) => a.personas.includes(persona))
    .sort((a, b) => a.dockOrder - b.dockOrder);
  const running = new Set(windows.map((w) => w.appId));

  return (
    <div className="dock-wrap">
      <div className="dock">
        {items.map((a) => (
          <button
            key={a.id}
            className="dock-item"
            onClick={() => open(a.id, { title: a.title, w: a.w, h: a.h })}
            aria-label={a.title}
          >
            <span aria-hidden>{a.icon}</span>
            <span className="dock-tip">{a.title}</span>
            {running.has(a.id) && <span className="run-dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
