"use client";

import { useState } from "react";
import type { Project } from "../data/portfolio";

// Click-to-load YouTube facade: shows the thumbnail until clicked, then swaps
// in the embed with autoplay. Avoids loading an iframe per project up front
// (fast, and safe for the static export — no server needed). Falls back to a
// screenshot for projects that have an image instead of a video.
// `autoPlay` skips the facade (used when opened via the row's ▶ flag).
export default function ProjectMedia({ project, autoPlay = false }: { project: Project; autoPlay?: boolean }) {
  const [play, setPlay] = useState(autoPlay);

  if (project.video) {
    return (
      <div className="pm">
        {play ? (
          <iframe
            className="pm-frame"
            src={`https://www.youtube.com/embed/${project.video}?autoplay=1&rel=0`}
            title={`${project.title} demo`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            className="pm-facade"
            onClick={() => setPlay(true)}
            aria-label={`Play ${project.title} demo`}
            style={{ backgroundImage: `url(https://img.youtube.com/vi/${project.video}/hqdefault.jpg)` }}
          >
            <span className="pm-play" aria-hidden>▶</span>
            <span className="pm-badge" aria-hidden>DEMO</span>
          </button>
        )}
      </div>
    );
  }

  if (project.image) {
    // Letterbox so portrait screenshots aren't cropped to a 16:9 slice.
    return (
      <div className="pm pm-shot">
        <img className="pm-img" src={project.image} alt={`${project.title} screenshot`} />
      </div>
    );
  }

  return null;
}
