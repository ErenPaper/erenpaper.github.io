"use client";

import { useEffect, useRef } from "react";
import { playNeedleDrop } from "../intro/sound";

/**
 * Vinyl-drop entry for Side B: a record lowers onto the platter, the tonearm
 * swings over, and the needle sets with a pop + crackle — then it hands off to
 * the warm cross-dissolve into the scrapbook. Pure CSS animation; the timeline
 * here just triggers the needle sound and the handoff.
 */
export default function VinylDrop({ onDone }: { onDone: () => void }) {
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    const s1 = window.setTimeout(() => playNeedleDrop(), 1250); // needle contacts
    const s2 = window.setTimeout(() => doneCb.current(), 2350);  // reel's playing → reveal
    return () => { window.clearTimeout(s1); window.clearTimeout(s2); };
  }, []);

  return (
    <div className="vinyl-drop" aria-hidden>
      <div className="vinyl-stage">
        <div className="vinyl-platter" />
        <div className="vinyl-record">
          <div className="vinyl-disc"><span className="vinyl-label" /></div>
        </div>
        <div className="vinyl-arm"><span className="vinyl-head" /></div>
      </div>
    </div>
  );
}
