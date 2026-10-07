// Side B section header, styled like a camcorder's on-screen display:
// "▶ CH 03  RECENTLY FINISHED  latest i've wrapped".
export default function SectionHead({ ch, title, note }: { ch: number; title: string; note?: string }) {
  return (
    <h2 className="sb-h2">
      <span className="sb-h2-osd" aria-hidden>
        <span className="sb-h2-play">▶</span> CH {String(ch).padStart(2, "0")}
      </span>
      <span className="sb-h2-title">{title}</span>
      {note && <span className="sb-h2-note">{note}</span>}
    </h2>
  );
}

// A smaller header for the parts inside a channel: "▸ JUST FINISHED  latest i've wrapped".
export function SubHead({ title, note }: { title: string; note?: string }) {
  return (
    <h3 className="sb-sub">
      <span className="sb-sub-title"><span aria-hidden>▸ </span>{title}</span>
      {note && <span className="sb-sub-note">{note}</span>}
    </h3>
  );
}
