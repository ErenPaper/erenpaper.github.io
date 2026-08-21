"use client";

import type { ComponentType } from "react";
import type { Persona } from "../../store/windows";
import {
  AboutApp, ExperienceApp, ProjectsApp, SkillsApp, BeyondApp,
  HobbiesApp, ContactApp, ResumeApp, TerminalApp,
} from "./apps";

export type AppDef = {
  id: string;
  title: string;
  icon: string;          // emoji glyph
  w: number;
  h: number;
  Component: ComponentType;
  personas: Persona[];   // which persona(s) show this app
  desktop?: boolean;     // show as a desktop icon
  dockOrder: number;
};

// "pro" = the engineering console (Professional), "personal" = the retro OS.
export const APPS: AppDef[] = [
  { id: "about", title: "About Me", icon: "👤", w: 580, h: 480, Component: AboutApp, personas: ["pro", "personal"], desktop: true, dockOrder: 1 },
  { id: "experience", title: "Experience", icon: "💼", w: 660, h: 560, Component: ExperienceApp, personas: ["pro"], desktop: true, dockOrder: 2 },
  { id: "projects", title: "Projects", icon: "🛠️", w: 780, h: 600, Component: ProjectsApp, personas: ["pro", "personal"], desktop: true, dockOrder: 3 },
  { id: "skills", title: "Skills", icon: "⚙️", w: 620, h: 540, Component: SkillsApp, personas: ["pro"], dockOrder: 4 },
  { id: "beyond", title: "Beyond Engineering", icon: "🌟", w: 660, h: 560, Component: BeyondApp, personas: ["pro"], dockOrder: 5 },
  { id: "hobbies", title: "Hobbies", icon: "📼", w: 640, h: 560, Component: HobbiesApp, personas: ["personal"], desktop: true, dockOrder: 6 },
  { id: "resume", title: "Résumé", icon: "📄", w: 720, h: 640, Component: ResumeApp, personas: ["pro", "personal"], dockOrder: 7 },
  { id: "terminal", title: "Terminal", icon: "🖥️", w: 560, h: 380, Component: TerminalApp, personas: ["pro", "personal"], dockOrder: 8 },
  { id: "contact", title: "Contact", icon: "✉️", w: 480, h: 380, Component: ContactApp, personas: ["pro", "personal"], desktop: true, dockOrder: 9 },
];

export const appMap: Record<string, AppDef> = Object.fromEntries(APPS.map((a) => [a.id, a]));
