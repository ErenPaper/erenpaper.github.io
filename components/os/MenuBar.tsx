"use client";

import { useEffect, useState } from "react";
import { useOS } from "../../store/windows";

export default function MenuBar() {
  const { theme, setTheme, persona } = useOS();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("en-US", {
          weekday: "short", hour: "numeric", minute: "2-digit",
        })
      );
    tick();
    const t = setInterval(tick, 1000 * 20);
    return () => clearInterval(t);
  }, []);

  // Experience owns the power-cycle transition back to the main menu.
  const exit = () => window.dispatchEvent(new Event("os-exit"));

  return (
    <div className="menubar">
      <button className="mb-logo" onClick={exit} title="Back to main menu">rr</button>
      <span className="mb-item mb-strong">Raphael Ramos</span>
      <span className="mb-item mb-role">
        {persona === "pro" ? "ENG CONSOLE" : "PERSONAL"}
      </span>

      <div className="mb-right">
        {persona === "pro" && (
          <button className="mb-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {theme === "dark" ? "☾" : "☀"}
          </button>
        )}
        <button className="mb-btn" onClick={exit} title="Back to the main menu">⌂ Main Menu</button>
        <span className="mb-clock">{clock}</span>
      </div>
    </div>
  );
}
