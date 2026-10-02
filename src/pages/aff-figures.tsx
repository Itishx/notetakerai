import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./aff-figures.css";

/* The figures drawn in code (2026-09-30). First made for /affectiveos, now
   shared so the homepage and the store use the same ones. Anything timed here
   is typical, not a benchmark; the pages say so in the caption. */

/* A figure under a heading: a square hairline frame holding one of the
   visualizations below, caption centred beneath. */
export function Viz({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="ao-pic">
      <div className="ao-viz">{children}</div>
      <p className="ao-cap">{caption}</p>
    </figure>
  );
}

/* ── Visualizations that fill the article's figures (2026-09-30) ───────── */

/* Voice to action, looping: a sound wave, the words you said, and the steps
   ticking off the way they do in the notch. With `tabs`, the reader picks the
   request and the steps replay for it. */
const REQUESTS = [
  { k: "Write a post", d: "Opens LinkedIn, writes it in your voice, stops before Post.", said: "Open LinkedIn and write a post about our launch.", steps: ["Opening LinkedIn", "Starting a new post", "Writing it in your voice", "Stopped before Post, waiting for your yes"] },
  { k: "Share a video", d: "Finds the video and sends it to the right person.", said: "Find Tanmay Bhat's latest video and send it to John.", steps: ["Found the latest video on YouTube", "Took its link", "Opened John in WhatsApp", "Sent it"] },
  { k: "Compare prices", d: "Checks both stores and tells you which is cheaper.", said: "Compare AirPods 4 prices on Amazon and Flipkart.", steps: ["Searched both stores", "Amazon: ₹11,900", "Flipkart: ₹11,990", "Amazon is ₹90 cheaper today"] },
  { k: "Your week", d: "Reads your timetable and tells you what is due.", said: "What's due this week?", steps: ["Checked your timetable", "Two things due", "Thursday, 11:59 pm: the finance case", "Friday: the venture deck"] },
]

/* Braino's everyday jobs, for the homepage demo (row mode). */
const BRAINO_REQUESTS = [
  { k: "Clear your inbox", d: "Reads the thread, writes the reply in your voice, waits for your yes.", said: "Reply to Priya that Friday works for the review.", steps: ["Opened the thread with Priya", "Wrote the reply in your voice", "Added Friday, 3 pm to the reply", "Waiting for your yes to send"] },
  { k: "Plan your day", d: "Your classes, what is due and who is waiting, in one answer.", said: "What's on my plate today?", steps: ["Class at 9:30: Venture Building", "The deck is due at 5 pm", "John is waiting on a reply", "Want me to block an hour for the deck?"] },
  { k: "Send the file", d: "Finds the file you mean and sends it to the right person.", said: "Send John the deck from last week.", steps: ["Found \u201cLaunch deck v3.pdf\u201d in Downloads", "Opened John in WhatsApp", "Attached the deck", "Sent"] },
  { k: "Take the notes", d: "Writes down a call or a lecture while you listen.", said: "Take notes in this lecture.", steps: ["Listening and writing as it goes", "Three key ideas saved", "Two things you have to do", "Notes ready when the class ends"] },
];

export function VoiceToAction({ tabs = false, notch = false, row = false }: { tabs?: boolean; notch?: boolean; row?: boolean }) {
  const LIST = row ? BRAINO_REQUESTS : REQUESTS;
  const [n, setN] = useState(0);
  const [held, setHeld] = useState(false);
  /* Row mode: the examples as columns under the screen, stepping on their
     own (one full listen-then-work cycle each) until you pick one. */
  useEffect(() => {
    if (!row || held) return;
    const t = window.setTimeout(() => setN((n + 1) % LIST.length), 6200);
    return () => window.clearTimeout(t);
  }, [row, held, n]);
  const r = LIST[n];
  /* The real notch's order: it listens first (your words, small), then it
     drops open to show the work. Replays on every request picked. */
  const [phase, setPhase] = useState<"listen" | "work">("listen");
  useEffect(() => {
    if (!notch) return;
    setPhase("listen");
    const t = window.setTimeout(() => setPhase("work"), 1900);
    return () => window.clearTimeout(t);
  }, [n, notch]);
  if (notch) return (
    <div className="vz-v2a-wrap">
      {/* The same request, told the way it really happens: all of it inside
          the notch, hanging from the top of the screen. */}
      <div className="vz vz-screen vz-wall" role="img" aria-label={`You say: ${r.said} Then: ${r.steps.join(", ")}.`} key={n}>
        <MacMenuBar app={r.k === "WhatsApp" ? "WhatsApp" : "Chrome"} />
        <NotchSheet
          className={"ns-big ns-glow " + (phase === "listen" ? "ns-listen" : "ns-work")} label={phase === "listen" ? "Listening" : "Working on it"} done={false}
          extra={phase === "listen" ? undefined : (
            <>
              <ol className="ns-steps">
                {r.steps.map((t, i) => <li key={t} style={{ animationDelay: `${0.6 + i * 0.7}s` }} className={/waiting|yes/.test(t) ? "is-ask" : ""}><span className="vz-tick" />{t}</li>)}
              </ol>
            </>
          )}
        >“{r.said}”</NotchSheet>
        <div className="vz-screen-foot">
          {tabs && !row && (
            <div className="vz-tabs" role="tablist" aria-label="Try a request">
              {LIST.map((q, i) => <button key={q.k} role="tab" aria-selected={i === n} className={i === n ? "on" : ""} onClick={() => setN(i)}>{q.k}</button>)}
            </div>
          )}
          <p className="vz-screen-meta"><span className="vz-live" />Understood in 0.05 s, then done on your real screen</p>
        </div>
      </div>
      {row && (
        <ol className="vz-row" onMouseLeave={() => setHeld(false)}>
          {LIST.map((q, i) => (
            <li key={q.k} className={i === n ? "on" : ""}>
              <button type="button" onMouseEnter={() => { setN(i); setHeld(true); }} onFocus={() => { setN(i); setHeld(true); }} onClick={() => { setN(i); setHeld(true); }} aria-pressed={i === n}>
                {i === n && !held && <span className="vz-row-bar" key={n} aria-hidden="true" />}
                <b>{q.k}</b>
                <span>{q.d}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
  return (
    <div className="vz-v2a-wrap">
      {tabs && (
        <div className="vz-tabs" role="tablist" aria-label="Try a request">
          {LIST.map((q, i) => <button key={q.k} role="tab" aria-selected={i === n} className={i === n ? "on" : ""} onClick={() => setN(i)}>{q.k}</button>)}
        </div>
      )}
      <div className="vz vz-v2a" role="img" aria-label={`You say: ${r.said} Then: ${r.steps.join(", ")}.`} key={n}>
        <div className="vz-v2a-left">
          <div className="vz-wave" aria-hidden="true">{Array.from({ length: 28 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 90}ms` }} />)}</div>
          <p className="vz-said">“{r.said}”</p>
          <p className="vz-meta"><span className="vz-live" />Heard in the notch · understood in 0.05 s</p>
        </div>
        <ol className="vz-steps">
          {r.steps.map((t, i) => <li key={t} style={{ animationDelay: `${0.6 + i * 0.7}s` }} className={/waiting|yes/.test(t) ? "is-ask" : ""}><span className="vz-tick" />{t}</li>)}
        </ol>
      </div>
    </div>
  );
}

/* Under "How it compares": the table as a capability matrix. */
export function CapabilityMatrix() {
  const caps = ["Sees", "Hears", "Talks", "Acts", "Remembers", "Asks first", "On your Mac"];
  const rows: [string, number[]][] = [
    ["AffectiveOS", [2, 2, 2, 2, 2, 2, 2]],
    ["Chat assistants", [1, 1, 1, 0, 1, 0, 0]],
    ["Dictation apps", [0, 1, 0, 0, 0, 0, 2]],
    ["Cloud agents", [1, 0, 0, 1, 1, 1, 0]],
  ];
  return (
    <div className="vz vz-matrix" role="img" aria-label="AffectiveOS covers all seven capabilities; chat assistants, dictation apps and cloud agents each cover some, partly.">
      <div className="vz-mx-head"><span />{caps.map((c) => <span key={c}>{c}</span>)}</div>
      {rows.map(([name, v]) => (
        <div className={"vz-mx-row" + (name === "AffectiveOS" ? " is-us" : "")} key={name}>
          <span className="vz-mx-name">{name}</span>
          {v.map((x, i) => <span key={i} className="vz-mx-cell"><i className={x === 2 ? "full" : x === 1 ? "half" : "none"} /></span>)}
        </div>
      ))}
      <div className="vz-mx-legend"><span><i className="full" />Yes</span><span><i className="half" />Partly</span><span><i className="none" />No</span></div>
    </div>
  );
}

/* Under "Speed": one request, broken down. Typical, not a benchmark. */
export function RequestWaterfall() {
  const rows: [string, number, number, string, string][] = [
    ["Hearing you", 0, 34, "while you speak", "hear"],
    ["Reflex decides", 34, 3, "0.05 s", "reflex"],
    ["Thinking plans", 37, 22, "about 2 s", "think"],
    ["Hands act", 59, 32, "on your real screen", "hands"],
    ["Asks, then tells you", 91, 9, "one breath", "ask"],
  ];
  return (
    <div className="vz vz-fall" role="img" aria-label="A typical request: hearing while you speak, the reflex in 0.05 seconds, thinking in about 2 seconds, the hands acting, then asking and telling you.">
      {rows.map(([name, start, len, note, k]) => (
        <div className="vz-fall-row" key={name}>
          <span className="vz-fall-name">{name}</span>
          <span className="vz-fall-track"><i className={"is-" + k} style={{ left: `${start}%`, width: `${len}%` }} /></span>
          <span className="vz-fall-note">{note}</span>
        </div>
      ))}
      <div className="vz-fall-row vz-fall-axis"><span /><span className="vz-fall-ends"><span>you start speaking</span><span>done</span></span><span /></div>
    </div>
  );
}

/* Under "Privacy": where things live. */
export function DataMap() {
  return (
    <div className="vz vz-map" role="img" aria-label="Your memory, screen text and activity stay on your Mac; only the request needed for thinking is sent; private windows and password apps are never recorded.">
      <div className="vz-map-col is-mac"><p>Stays on your Mac</p><ul><li>What it remembers about you</li><li>The text it read on your screen</li><li>Your day, as a timeline</li></ul></div>
      <div className="vz-map-col is-cloud"><p>Sent to think</p><ul><li>The request itself</li><li>Only the context that job needs</li></ul></div>
      <div className="vz-map-col is-never"><p>Never recorded</p><ul><li>Private browser windows</li><li>Password managers</li></ul></div>
    </div>
  );
}

/* Under "Availability": Braino in the notch. */
/* A macOS menu bar across the top of a wallpaper (2026-10-01): the Apple
   mark, the front app in bold and its menus on the left; Wi-Fi, battery,
   Control Centre and the clock on the right. The notch sits in the middle,
   between the two halves, exactly where the real one splits the bar. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}
export function MacMenuBar({ app = "Chrome", menus = ["File", "Edit", "View", "History", "Window", "Help"] }: { app?: string; menus?: string[] }) {
  const now = useClock();
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="mmb" aria-hidden="true">
      <div className="mmb-left">
        <svg className="mmb-apple" viewBox="0 0 14 17"><path d="M11.6 9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7C3.4 4.5 2.1 5.3 1.4 6.6 0 9.1 1 12.8 2.4 14.8c.7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3 0 0-2-.8-2-3.5zM9.7 3.1c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1z" fill="currentColor"/></svg>
        <b>{app}</b>
        {menus.map((m) => <span key={m}>{m}</span>)}
      </div>
      <div className="mmb-right">
        <svg viewBox="0 0 16 12" className="mmb-ico"><path d="M8 11.5 6.2 9.4a2.6 2.6 0 0 1 3.6 0zM3.4 6.7a6.6 6.6 0 0 1 9.2 0l-1.3 1.4a4.7 4.7 0 0 0-6.6 0zM.6 3.8a10.6 10.6 0 0 1 14.8 0L14 5.2a8.6 8.6 0 0 0-12 0z" fill="currentColor"/></svg>
        <span className="mmb-batt"><i /></span>
        <svg viewBox="0 0 16 12" className="mmb-ico"><rect x="1" y="1" width="6" height="4" rx="2" fill="currentColor"/><rect x="9" y="1" width="6" height="4" rx="2" fill="none" stroke="currentColor"/><rect x="1" y="7" width="6" height="4" rx="2" fill="none" stroke="currentColor"/><rect x="9" y="7" width="6" height="4" rx="2" fill="currentColor"/></svg>
        <span>{day}</span>
        <span>{time}</span>
      </div>
    </div>
  );
}

/* The notch as the Mac app draws it (braino-mac.css, nf-answer-open): ONE
   black sheet, square at the top where it meets the housing, rounded only
   where it leaves it. His eyes sit in the housing strip; what he says is in
   the same shape underneath, with the small BRAINO label and a Done pill.
   Never a second pill under the first. */
export function NotchSheet({ children, done = true, className = "", label = "Braino", extra }: { children?: ReactNode; done?: boolean; className?: string; label?: string; extra?: ReactNode }) {
  return (
    <div className={"ns " + className}>
      <div className="ns-eyes" aria-hidden="true" />
      <div className="ns-row">
        <span className="ns-say"><small>{label}</small>{children != null && <strong>{children}</strong>}</span>
        {done && <span className="ns-done" aria-hidden="true">Done</span>}
      </div>
      {extra && <div className="ns-extra">{extra}</div>}
    </div>
  );
}

export function NotchScene() {
  return (
    <div className="vz vz-notch vz-wall" role="img" aria-label="Braino in the MacBook notch, saying good morning.">
      <MacMenuBar app="Finder" menus={["File", "Edit", "View", "Go", "Window", "Help"]} />
      <NotchSheet>Good morning, Itish. Two WhatsApps, and your first class is at 9:30.</NotchSheet>
    </div>
  );
}


/* Steps by hand vs one sentence, for everyday jobs. Illustrative. */
export function EffortChart() {
  const rows: [string, number][] = [["Send a link to a friend", 6], ["Reply to an email", 7], ["Fill a form", 9], ["Compare two prices", 11], ["Find a file you saw last week", 8]];
  const max = 12;
  return (
    <svg viewBox="0 0 980 330" className="ao-svg" role="img" aria-label="Everyday jobs take six to eleven steps by hand and one sentence by voice.">
      {rows.map(([job, n], i) => {
        const y = 40 + i * 56;
        const w = (n / max) * 560;
        return (
          <g key={job}>
            <text x="300" y={y + 15} className="ao-row-label">{job}</text>
            <rect x="320" y={y} width={w} height="12" rx="6" fill="color-mix(in srgb, var(--a-ink) 22%, transparent)" />
            <text x={320 + w + 10} y={y + 11} className="ao-box-t ao-small ao-left">{n} steps</text>
            <rect x="320" y={y + 18} width={560 / max} height="12" rx="6" fill="var(--ao-blue)" />
            <text x={320 + 560 / max + 10} y={y + 29} className="ao-box-t ao-small ao-left">1 sentence</text>
          </g>
        );
      })}
    </svg>
  );
}


/* Real timings from the private beta, said plainly (2026-10-02). From the
   same measurements as /affectiveos; the video share is a logged run. */
export function RealSpeed() {
  const rows: [string, number, string][] = [
    ["\u201cWhat's due this week?\u201d", 0.5, "0.5 s"],
    ["\u201cTell John I'll be late\u201d on WhatsApp", 1, "about 1 s"],
    ["Fill a form from what he knows", 1, "about 1 s"],
    ["Draft a reply to an email thread", 5, "under 5 s"],
    ["Find a video and send it to a friend", 9.5, "9.5 s"],
  ];
  const max = 10;
  return (
    <ol className="rs">
      {rows.map(([job, sec, label]) => (
        <li key={job}>
          <span className="rs-job">{job}</span>
          <span className="rs-track"><i style={{ width: `${Math.max(3, (sec / max) * 100)}%` }} /></span>
          <span className="rs-t">{label}</span>
        </li>
      ))}
    </ol>
  );
}

/* The same comparison laid out for a half-width column: the job name above
   its two bars, so the type stays readable at a smaller width. */
export function EffortChartCompact() {
  const rows: [string, number][] = [["Send a link to a friend", 6], ["Reply to an email", 7], ["Fill a form", 9], ["Compare two prices", 11], ["Find a file you saw last week", 8]];
  const max = 12;
  return (
    <ol className="ecc">
      {rows.map(([job, n]) => (
        <li key={job}>
          <span className="ecc-job">{job}</span>
          <span className="ecc-bar is-hand"><i style={{ width: `${(n / max) * 100}%` }} /><em>{n} steps</em></span>
          <span className="ecc-bar is-voice"><i style={{ width: `${(1 / max) * 100}%` }} /><em>1 sentence</em></span>
        </li>
      ))}
    </ol>
  );
}
