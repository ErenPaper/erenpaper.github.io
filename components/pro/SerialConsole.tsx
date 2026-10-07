"use client";

import { useEffect, useRef, useState } from "react";
import {
  profile, bio, links, experience, projects, skills, certifications, availability, interests,
} from "../../data/portfolio";

// Hidden "UART" serial console for the Professional datasheet — the site is a
// part (RR-01), so you talk to it over serial. A tiny fake filesystem (ls / cd /
// cat / open) mirrors the page content, plus a few easter eggs. Toggled with the
// ` key or the UART button in the nav.

type Line = { text: string; kind?: "cmd" | "err" | "ok" | "dim" };
type File = { type: "file"; read: () => string[]; open?: () => void };
type Dir = { type: "dir"; children: Record<string, Node> };
type Node = File | Dir;

type Props = {
  open: boolean;
  setOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  onOpenProject: (index: number) => void;
  onSection: (id: string) => void;
  onAbout: () => void;
  onSynth: () => void;
};

const slug = (s: string) =>
  s.split(/ — | \(/)[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BOOT: Line[] = [
  { text: "uart0: 115200 8N1 — connected", kind: "dim" },
  { text: "RR-01 bootloader · rev C · " + profile.title.toLowerCase(), kind: "dim" },
  { text: `status: ${availability.status.toLowerCase()} — ${availability.roles.toLowerCase()}`, kind: "ok" },
  { text: "type 'help' to list commands." },
];

const DAD_JOKES = [
  "I'd tell you a UDP joke, but you might not get it.",
  "I'd tell you a TCP joke, but I'd have to keep repeating it until you got it.",
  "Why do embedded engineers hate the beach? Too many floating inputs.",
  "My resistor kept failing exams. It just couldn't handle the current material.",
  "There are 10 kinds of people: those who read binary and those who don't.",
];

const HELP = [
  "navigation   ls [dir] · cd <dir> · pwd · cat <file> · open <file|dir>",
  "about me     whoami · neofetch · cat about.txt · contact",
  "misc         clear · history · joke · exit",
  "             …and a few undocumented ones. it's firmware, after all.",
  "tip          <tab> completes names, ↑/↓ recalls commands",
];

export default function SerialConsole({ open, setOpen, onOpenProject, onSection, onAbout, onSynth }: Props) {
  const [lines, setLines] = useState<Line[]>(BOOT);
  const [cwd, setCwd] = useState<string[]>([]);
  const [val, setVal] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // ── the filesystem, built from the same data the page renders ──
  const root: Dir = {
    type: "dir",
    children: {
      "about.txt": { type: "file", read: () => bio, open: onAbout },
      "contact.txt": {
        type: "file",
        read: () => [`email     ${links.email}`, `linkedin  ${links.linkedin.url}`, `github    ${links.github.url}`],
        open: () => { window.location.href = `mailto:${links.email}`; },
      },
      "resume.pdf": {
        type: "file",
        read: () => ["cat: resume.pdf: binary file — try 'open resume.pdf'"],
        open: () => window.open(profile.resume, "_blank", "noreferrer"),
      },
      "rr-02.bin": {
        type: "file",
        read: () => ["cat: rr-02.bin: binary file (ELF, armv6m) — try running it: ./rr-02.bin"],
        open: onSynth,
      },
      "skills.txt": { type: "file", read: () => skills.map((c) => `${c.name.padEnd(24)} ${c.skills.join(", ")}`) },
      "certs.txt": { type: "file", read: () => certifications.map((c) => `${c.name} — ${c.issuer} (${c.date})`) },
      projects: {
        type: "dir",
        children: Object.fromEntries(
          projects.map((p, i) => [
            `${slug(p.title)}.ds`,
            {
              type: "file",
              read: () => [
                p.title.toUpperCase(),
                `  ${p.context ?? p.tag}`,
                ...(p.brief ? ["", p.brief] : []),
                ...(p.stats ? ["", `  metrics: ${p.stats.join(" · ")}`] : []),
                `  stack:   ${p.tech.join(", ")}`,
                ...(p.linksOut ?? []).map((l) => `  link:    ${l.href}`),
                "",
                `(open ${slug(p.title)}.ds for the full datasheet)`,
              ],
              open: () => onOpenProject(i),
            } satisfies File,
          ])
        ),
      },
      experience: {
        type: "dir",
        children: Object.fromEntries(
          experience.map((x) => [
            `${slug(x.company)}.log`,
            {
              type: "file",
              read: () => [`${x.role} @ ${x.company}`, `  ${x.date} · ${x.location}`, "", ...x.bullets.map((b) => `- ${b}`)],
              open: () => onSection("experience"),
            } satisfies File,
          ])
        ),
      },
    },
  };
  const dirSection: Record<string, string> = { projects: "projects", experience: "experience" };

  // Resolve a path (absolute, relative, ~, ., ..) against the cwd.
  const resolve = (path: string): { node: Node | null; parts: string[] } => {
    let parts = path.startsWith("/") || path.startsWith("~") ? [] : [...cwd];
    for (const seg of path.replace(/^~/, "").split("/").filter(Boolean)) {
      if (seg === ".") continue;
      if (seg === "..") { parts.pop(); continue; }
      parts = [...parts, seg];
    }
    let node: Node = root;
    for (const p of parts) {
      if (node.type !== "dir" || !node.children[p]) return { node: null, parts };
      node = node.children[p];
    }
    return { node, parts };
  };

  const prompt = `recruiter@rr-01:~${cwd.length ? "/" + cwd.join("/") : ""}$`;

  const run = (raw: string) => {
    const cmd = raw.trim();
    const out: Line[] = [{ text: `${prompt} ${cmd}`, kind: "cmd" }];
    const say = (text: string, kind?: Line["kind"]) => out.push({ text, kind });
    const [base, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");

    switch (base) {
      case "": break;
      case "help": HELP.forEach((h) => say(h)); break;
      case "pwd": say("/home/recruiter" + (cwd.length ? "/" + cwd.join("/") : "")); break;
      case "ls": {
        const { node } = resolve(arg || ".");
        if (!node) say(`ls: cannot access '${arg}': No such file or directory`, "err");
        else if (node.type === "file") say(arg);
        else say(Object.entries(node.children).map(([n, c]) => (c.type === "dir" ? n + "/" : n)).join("   "));
        break;
      }
      case "cd": {
        const { node, parts } = resolve(arg || "~");
        if (!node) say(`cd: ${arg}: No such file or directory`, "err");
        else if (node.type === "file") say(`cd: ${arg}: Not a directory`, "err");
        else setCwd(parts);
        break;
      }
      case "cat": case "less": case "more": {
        if (!arg) { say(`${base}: missing file operand`, "err"); break; }
        const { node } = resolve(arg);
        if (!node) say(`${base}: ${arg}: No such file or directory`, "err");
        else if (node.type === "dir") say(`${base}: ${arg}: Is a directory`, "err");
        else node.read().forEach((t) => say(t));
        break;
      }
      case "open": case "xdg-open": {
        if (!arg) { say("open: missing operand — try 'open resume.pdf'", "err"); break; }
        const { node, parts } = resolve(arg);
        const section = dirSection[parts[parts.length - 1]];
        if (!node) say(`open: ${arg}: No such file or directory`, "err");
        else if (node.type === "dir" && section) { say(`jumping to ${section}…`, "ok"); onSection(section); }
        else if (node.type === "file" && node.open) { say(`opening ${parts[parts.length - 1]}…`, "ok"); node.open(); }
        else say(`open: ${arg}: nothing to open — try 'cat'`, "err");
        break;
      }
      case "contact": (root.children["contact.txt"] as File).read().forEach((t) => say(t)); break;
      case "whoami": say("recruiter (probably). the person you're looking for is raphael — try 'neofetch'."); break;
      case "neofetch":
        [
          `  ┌────────┐   ${profile.name.toLowerCase()}@rr-01`,
          "  │ ▪ RR-01│   ──────────────────",
          `  │  ▪▪▪▪  │   role     ${profile.title}`,
          `  │ ▪    ▪ │   focus    ${profile.eyebrow}`,
          "  └┬┬┬┬┬┬┬┘   uni      University of Alberta, 2026",
          `              licence  EIT · APEGA`,
          `              status   ${availability.status}`,
          `              hobbies  ${interests.slice(0, 4).join(" · ")}`,
        ].forEach((t) => say(t));
        break;
      case "uname": say(args.includes("-a") ? "RR-01 rev-C armv6m-raphael #2026 SMP GNU/Hireable" : "RR-01"); break;
      case "date": say(new Date().toString()); break;
      case "echo": say(arg); break;
      case "history": hist.forEach((h, i) => say(`${String(i + 1).padStart(4)}  ${h}`)); break;
      case "joke": case "dadjoke": say(DAD_JOKES[Math.floor(Math.random() * DAD_JOKES.length)]); break;
      case "clear": setLines([]); return;
      case "exit": case "quit": case "logout": setOpen(false); return;

      // ── easter eggs ──
      case "sudo":
        if (/^hire\b/.test(arg)) {
          say("[sudo] password for recruiter: ********");
          say("access granted. opening a line to raphael…", "ok");
          setTimeout(() => { window.location.href = `mailto:${links.email}?subject=${encodeURIComponent("Let's talk")}`; }, 700);
        } else {
          say("recruiter is not in the sudoers file. This incident will be reported.", "err");
          say("(hint: there is exactly one thing sudo will let you do here)", "dim");
        }
        break;
      case "hire": case "hire-me": say("permission denied — try 'sudo hire raphael'", "err"); break;
      case "rm":
        if (/-\w*r\w*f|-\w*f\w*r/.test(arg) && /(^|\s)(\/|~|\*)(\s|$)/.test(arg)) {
          ["Kernel panic - not syncing: Attempted to kill init!", "CPU: 0 PID: 1 Comm: raphael Not tainted 6.0.0-rr01", "---[ end Kernel panic ]---"].forEach((t) => say(t, "err"));
          say("just kidding. the filesystem is read-only. rebooting anyway…", "dim");
          setLines((l) => [...l, ...out]);
          setTimeout(() => { setCwd([]); setLines(BOOT); }, 1800);
          return;
        }
        say(`rm: cannot remove '${arg || "?"}': Read-only file system`, "err");
        break;
      case "make":
        if (arg === "coffee") say("make: *** No rule to make target 'coffee'.  Stop.", "err");
        else if (arg === "love") say("make: *** No rule to make target 'love'.  Not war?", "err");
        else say("make: Nothing to be done for 'all'.");
        break;
      case "vim": case "vi": case "nano": case "emacs": say(`${base}: editor disabled — nobody leaves vim, and I need you to finish reading.`, "err"); break;
      case "ping": say(`PING ${arg || "raphael"}: 64 bytes, time=<24h — replies to every email.`, "ok"); break;
      case "gpio":
        say("button: 1 (pressed)");
        say("button: 1 (pressed)");
        say("button: 1 (pressed) — check it's wired to GND, not 3.3V. ask me how I know.", "dim");
        break;
      case "./rr-02.bin": case "rr-02": case "synth": case "play": case "piano":
        say("flashing rr-02.bin → signal generator… ok", "ok");
        setTimeout(onSynth, 350);
        break;
      case "hello": case "hi": case "hey": say("hi! 👋 type 'help' to look around."); break;
      default: say(`sh: ${base}: command not found (try 'help')`, "err");
    }
    setLines((l) => [...l, ...out]);
  };

  // Tab: complete the last word against the matching directory's entries.
  const complete = () => {
    const words = val.split(/\s+/);
    const last = words[words.length - 1];
    if (words.length < 2) return;
    const slash = last.lastIndexOf("/");
    const dirPath = slash >= 0 ? last.slice(0, slash + 1) : "";
    const stem = last.slice(slash + 1);
    const { node } = resolve(dirPath || ".");
    if (!node || node.type !== "dir") return;
    const hits = Object.keys(node.children).filter((n) => n.startsWith(stem));
    if (hits.length === 1) {
      const isDir = node.children[hits[0]].type === "dir";
      words[words.length - 1] = dirPath + hits[0] + (isDir ? "/" : "");
      setVal(words.join(" "));
    } else if (hits.length > 1) {
      setLines((l) => [...l, { text: `${prompt} ${val}`, kind: "cmd" }, { text: hits.join("   ") }]);
    }
  };

  // ` toggles the console (unless typing in some other field); Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typingElsewhere = (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && t !== inputRef.current;
      if (e.key === "`" && !typingElsewhere) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [lines, open]);

  return (
    <div className={`uart${open ? " open" : ""}`} aria-hidden={!open} onClick={() => inputRef.current?.focus()}>
      <div className="uart-bar">
        <span><span className="ps-led on" /> /dev/ttyACM0 · 115200 baud</span>
        <button className="uart-close" onClick={() => setOpen(false)} aria-label="Close serial console">✕</button>
      </div>
      <div className="uart-out" role="log">
        {lines.map((l, i) => <div key={i} className={l.kind ? `u-${l.kind}` : undefined}>{l.text || " "}</div>)}
        <div ref={endRef} />
      </div>
      <form
        className="uart-in"
        onSubmit={(e) => {
          e.preventDefault();
          run(val);
          if (val.trim()) setHist((h) => [...h, val.trim()]);
          setHistIdx(null);
          setVal("");
        }}
      >
        <span className="uart-ps1">{prompt}</span>
        <input
          ref={inputRef}
          value={val}
          tabIndex={open ? 0 : -1}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") { e.preventDefault(); complete(); }
            else if (e.key === "ArrowUp" && hist.length) {
              e.preventDefault();
              const i = histIdx === null ? hist.length - 1 : Math.max(0, histIdx - 1);
              setHistIdx(i); setVal(hist[i]);
            } else if (e.key === "ArrowDown" && histIdx !== null) {
              e.preventDefault();
              const i = histIdx + 1;
              if (i >= hist.length) { setHistIdx(null); setVal(""); } else { setHistIdx(i); setVal(hist[i]); }
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Serial console input"
        />
      </form>
    </div>
  );
}
