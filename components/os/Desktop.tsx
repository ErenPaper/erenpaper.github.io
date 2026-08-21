"use client";

import { useOS } from "../../store/windows";
import { APPS } from "../apps/registry";

export default function Desktop() {
  const { persona, open } = useOS();
  const icons = APPS.filter((a) => a.desktop && a.personas.includes(persona));

  return (
    <div className="desktop-icons">
      {icons.map((a) => (
        <button
          key={a.id}
          className="desktop-icon"
          onDoubleClick={() => open(a.id, { title: a.title, w: a.w, h: a.h })}
          onClick={() => open(a.id, { title: a.title, w: a.w, h: a.h })}
        >
          <span className="ico" aria-hidden>{a.icon}</span>
          <span>{a.title}</span>
        </button>
      ))}
    </div>
  );
}
