import React, { ReactNode, useEffect, useRef, useState } from "react";
import { MacMenuBar, NotchSheet } from "@/pages/aff-figures";
import { BrainoMascot } from "@/components/BrainoMascot";

/* ============================================================================
   BrainoScenes — what he does, one capability at a time (2026-10-13).

   Each section is the same little play: a voice wave, what you said typing
   into a bubble, his "On it.", a two-line explanation, and a Mac window on the
   other side showing it happen. Sections alternate sides as you scroll. The
   windows are drawn in code so they stay sharp and play only when on screen;
   any one of them can be swapped for a real recording later (`video`).
   ============================================================================ */

/* `point`: the thing in the app he lands on (a selector inside the window,
   measured when he jumps, so the ring sits exactly on it) and his line. */
type Scene = { app: string; ask: string; steps: string[]; point: { sel: string; say: string }; title: string; p: string; screen: ReactNode; video?: string };

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

function Typed({ text, go, onDone }: { text: string; go: boolean; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (n >= text.length) { onDone(); return; }
    const t = window.setTimeout(() => setN(n + 1), 34);
    return () => window.clearTimeout(t);
  }, [go, n, text.length, onDone]);
  return <>{text.slice(0, n)}{n < text.length && <i className="bs-caret" aria-hidden="true" />}</>;
}

/* ── The windows ── */
/* ── The apps (2026-10-15) ── Each one is a real-looking Mac app filling the
   screen. Everything inside waits (paused) until he says "On it", then plays:
   the highlight, the typing, the ticks, the waveform, the fills. */
const D = (ms: number) => ({ animationDelay: `${ms}ms` });

const Doc = () => (
  <div className="ap ap-preview">
    <aside className="ap-thumbs">{[0, 1, 2, 3].map((k) => <i key={k} className={k === 1 ? "on" : ""}><b /><b /><b /></i>)}</aside>
    <div className="ap-page-wrap">
      <article className="ap-page">
        <small>Licence agreement · Page 2 of 4</small>
        <h4>4.2 Indemnification</h4>
        <p>The Licensee shall indemnify and hold harmless the Licensor from any and all claims,
          <mark className="ap-mark" style={D(200)}> liabilities, damages and expenses arising out of the Licensee's use of the Software,</mark> except
          to the extent caused by the Licensor's gross negligence or wilful misconduct.</p>
        <h4>4.3 Limitation of liability</h4>
        <p className="ap-dim">In no event shall either party be liable for indirect or consequential damages arising under this Agreement.</p>
        <div className="ap-plain" style={D(1300)}><span>In plain words</span>If someone sues because of how you used the app, you pay. Unless they really messed up.</div>
      </article>
    </div>
  </div>
);

const Mail = () => (
  <div className="ap ap-mail">
    <aside className="ap-boxes"><b>Mailboxes</b><span className="on">Inbox <em>3</em></span><span>Drafts</span><span>Sent</span><span>Archive</span></aside>
    <div className="ap-list">
      <div className="on"><b>Rohan Mehta</b><span>The deck?</span><i>Any update on the deck? We needed it…</i></div>
      <div><b>Priya</b><span>Friday review</span><i>Does Friday 3 pm still work for you?</i></div>
      <div><b>Mesa Nexus</b><span>New assignment</span><i>Market sizing is due on Thursday.</i></div>
    </div>
    <div className="ap-read">
      <div className="ap-from"><span className="ap-av">R</span><div><b>Rohan Mehta</b><small>to me · 9:41 AM</small></div></div>
      <p>Hey, any update on the deck? We needed it yesterday.</p>
      <div className="ap-draft" style={D(100)}>
        <small>Your reply · drafted by Braino</small>
        <p className="ap-type">Hi Rohan, sorry for the wait! It's 90% there and you'll have it by 5 today. Thanks for your patience.</p>
        <button type="button" className="ap-send">Send</button>
      </div>
    </div>
  </div>
);

const Chat = () => (
  <div className="ap ap-wa">
    <aside className="ap-chats">
      <div className="ap-search">Search</div>
      {[["Riya", "where are you??", "on"], ["Mom", "Did you eat?", ""], ["Arjun", "ship it monday", ""], ["Forge 27", "Ananya: deck review at 4", ""]].map(([n, m, c]) => (
        <div key={n} className={"ap-chat " + c}><span className="ap-av">{n[0]}</span><div><b>{n}</b><i>{m}</i></div></div>
      ))}
    </aside>
    <div className="ap-convo">
      <div className="ap-convo-head"><span className="ap-av">R</span><b>Riya</b><small>online</small></div>
      <div className="ap-bubbles">
        <p className="them">hey, we're all here<small>9:58</small></p>
        <p className="them">where are you??<small>10:02</small></p>
        <p className="me ap-sent" style={D(300)}>Running 10 minutes late, sorry! On my way 🏃<small>10:02 <span className="ap-ticks">✓✓</span></small></p>
      </div>
      <div className="ap-compose"><span>Type a message</span></div>
    </div>
  </div>
);

const Notes = () => (
  <div className="ap ap-notes">
    <div className="ap-live">
      <div className="ap-live-head"><span className="ap-rec" />Live · Marketing 101<small>23:14</small></div>
      <div className="ap-wave">{Array.from({ length: 34 }).map((_, k) => <i key={k} style={{ animationDelay: `${(k % 7) * 90}ms` }} />)}</div>
      <p className="ap-said"><b>Prof. Rao</b> Positioning is the one spot you own in a customer's head…</p>
      <p className="ap-said ap-dim"><b>Prof. Rao</b> …so pick a fight with a category, not a company.</p>
    </div>
    <div className="ap-sheet">
      <small>Notes · written by Braino</small>
      <ul>
        <li style={D(200)}>Positioning = the one spot you own in a customer's head</li>
        <li style={D(900)}>Pick a fight with a category, not a company</li>
        <li className="ap-due" style={D(1600)}>Assignment: 2 page brief <span className="ap-chip">📅 Due Friday</span></li>
      </ul>
    </div>
  </div>
);

const Form = () => (
  <div className="ap ap-web">
    <div className="ap-tabs"><span className="on">Program application</span><span>Gmail</span></div>
    <div className="ap-url"><i>🔒</i>apply.forge27.in/application</div>
    <div className="ap-formcard">
      <h4>Apply to the program</h4>
      {[["Full name", "Itish Pande"], ["Email", "itish@affctve.com"], ["City", "Bengaluru"], ["What are you building?", "Braino, an everyday Mac companion"]].map(([l, v], k) => (
        <label key={l}><span>{l}</span><em style={D(250 + k * 450)}>{v}</em></label>
      ))}
      <button type="button" className="ap-submit">Submit<small>waiting for your yes</small></button>
    </div>
  </div>
);

const Flights = () => (
  <div className="ap ap-fl">
    <div className="ap-fl-head"><b>Bengaluru</b><span>→</span><b>Mumbai</b><em>Fri, 17 Oct · 1 adult</em></div>
    <div className="ap-fl-chart">{[52, 61, 48, 70, 44, 58, 66].map((h, k) => <i key={k} className={k === 4 ? "on" : ""} style={{ height: `${h}%`, ...D(k * 70) }}><small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][k]}</small></i>)}</div>
    <div className="ap-fl-rows">
      {[["IndiGo", "#1a4fa3", "6:05 – 7:50", "Nonstop", "₹4,212"], ["Akasa Air", "#f26b21", "7:40 – 9:25", "Nonstop", "₹4,390"], ["Air India", "#c8102e", "9:15 – 11:05", "Nonstop", "₹4,875"]].map(([a, c, t, n, pr], k) => (
        <div key={a} className={"ap-fl-row" + (k === 0 ? " is-best" : "")} style={D(300 + k * 150)}>
          <span className="ap-logo" style={{ background: c }}>{a[0]}</span><b>{a}</b><span>{t}</span><i>{n}</i><em>{pr}</em>
          {k === 0 && <small>Cheapest</small>}
        </div>
      ))}
    </div>
  </div>
);

const Music = () => (
  <div className="ap ap-sp">
    <aside className="ap-sp-side"><b>Your Library</b>{["Deep Focus", "Chill Lofi", "Weightless", "Liked Songs"].map((t, k) => <span key={t} className={k === 2 ? "on" : ""}><i />{t}</span>)}</aside>
    <div className="ap-sp-main">
      <div className="ap-sp-hero"><div className="ap-sp-art" /><div><small>Playlist</small><h4>Weightless</h4><p>Marconi Union · calm, slow, 8 min</p></div></div>
      <div className="ap-eq">{Array.from({ length: 22 }).map((_, k) => <i key={k} style={{ animationDelay: `${(k % 5) * 120}ms` }} />)}</div>
      <div className="ap-sp-bar"><span>▶︎</span><div className="ap-sp-prog"><i /></div><span className="ap-vol">🔈<b><i /></b></span></div>
    </div>
  </div>
);

const SCENES: Scene[] = [
  { app: "Preview", ask: "Braino, what does this even mean?", steps: ["Read the clause on your screen", "If you get sued for how you used it, you pay", "Unless they messed up badly"], point: { sel: ".ap-mark", say: "This bit. If you get sued, you pay." }, title: "Explains anything on your screen", p: "Stuck on something? Just ask. He already sees it, so there's nothing to copy, paste or explain.", screen: <Doc /> },
  { app: "Mail", ask: "Reply to Rohan, but nicer.", steps: ["Opened Rohan's email", "Wrote a kinder reply in your voice", "Waiting for your yes to send"], point: { sel: ".ap-send", say: "Read it, then tap Send" }, title: "Replies to your emails", p: "He reads the thread and drafts the reply in your voice. You read it, you hit send.", screen: <Mail /> },
  { app: "WhatsApp", ask: "Tell Riya I'm running late.", steps: ["Found Riya in WhatsApp", "Wrote: running 10 minutes late", "Sent"], point: { sel: ".ap-sent", say: "Sent. She knows." }, title: "Sends your messages", p: "Say who and what. He sends it on WhatsApp, to the right person, in a second.", screen: <Chat /> },
  { app: "Live Notes", ask: "Take notes for this class.", steps: ["Listening and writing as it goes", "Three key ideas saved", "Assignment due Friday, noted"], point: { sel: ".ap-chip", say: "Due Friday. Don't forget this one." }, title: "Takes your meeting notes", p: "Meetings and lectures, written down while you listen. The notes are ready the moment it ends.", screen: <Notes /> },
  { app: "Chrome", ask: "Fill this form for me.", steps: ["Read the form", "Filled four fields from what he knows", "Stopped at Submit, waiting for your yes"], point: { sel: ".ap-submit", say: "Check it, then tap here" }, title: "Fills your forms", p: "Everything he knows about you, filled in. He stops at submit so you can check it.", screen: <Form /> },
  { app: "Google Flights", ask: "Cheapest flight to Mumbai on Friday?", steps: ["Searched Friday flights to Mumbai", "IndiGo, 6:05 am, \u20b94,212", "The cheapest of 23"], point: { sel: ".ap-fl-row.is-best em", say: "This one. \u20b94,212" }, title: "Finds the best deal", p: "He reads the page so you don't have to scroll through forty results.", screen: <Flights /> },
  { app: "Spotify", ask: "Play something calm.", steps: ["Opened Spotify", "Playing Weightless by Marconi Union", "Turned the volume down a little"], point: { sel: ".ap-vol", say: "Calm. Volume down a bit." }, title: "Handles the little things", p: "Music, timers, tabs, apps. All the tiny clicks of your day, gone.", screen: <Music /> },
];

/* The home page's own notch (NotchSheet) on the home page's own screen: it
   listens first, then drops open with the steps ticking off, over the app
   he is working in. */
function SceneRow({ s, n, flip, style }: { s: Scene; n: number; flip: boolean; style?: React.CSSProperties }) {
  /* Starts when the card has landed in its place in the deck (its top at its
     sticky line), not when it first peeks in, so the notch plays on a card
     you can see whole. */
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const check = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const line = parseFloat(getComputedStyle(el).top) || 0;
      const sticky = getComputedStyle(el).position === "sticky";
      if (sticky ? r.top <= line + 24 && r.bottom > 0 : r.top < window.innerHeight * 0.55) setInView(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [inView]);
  const app = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  /* listen, then work with the steps, then fold back to a small "Done" so
     the app underneath is the picture. */
  const [work, setWork] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!inView) return;
    const a = window.setTimeout(() => setWork(true), 1900);
    const b = window.setTimeout(() => setDone(true), 1900 + 600 + s.steps.length * 700 + 900);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [inView, s.steps.length]);
  useEffect(() => {
    if (!done || !app.current) return;
    const el = app.current.querySelector(s.point.sel);
    if (!el) return;
    const a = app.current.getBoundingClientRect(), b = el.getBoundingClientRect();
    setAt({ x: b.left - a.left + Math.min(b.width / 2, 60), y: b.top - a.top + b.height / 2 });
  }, [done, s.point.sel]);
  return (
    <div ref={ref} style={style} className={"bs-row" + (flip ? " is-flip" : "") + (inView ? " is-in" : "") + (work ? " is-said" : "")}>
      <div className="bs-talk">
        <div className="bs-meta"><span className="bs-n">{String(n).padStart(2, "0")}</span><span className="bs-app-tag">{s.app}</span></div>
        <h3>{s.title}</h3>
        <p className="bs-p">{s.p}</p>
        <p className="bs-said">You say <b>{"\u201c"}{s.ask}{"\u201d"}</b></p>
      </div>
      <div className="bs-stage">
      <div className="ao-viz ao-viz-screen bs-viz">
        <div className="vz vz-screen bs-wall">
          <MacMenuBar app={s.app} />
          <div className="bs-app" ref={app}>
            {s.video ? <video src={s.video} autoPlay muted loop playsInline /> : s.screen}
            {/* Then he jumps out of the notch onto the thing he means. */}
            {/* He is on the screen from the start, in the corner, and walks
                over to the thing he means once it is done. */}
            {inView && (
              <div className={"bs-point" + (at ? " is-there" : "") + (at && at.x > (app.current?.offsetWidth ?? 0) * 0.6 ? " is-left" : "")}
                style={at ? { left: at.x, top: at.y } : { left: "88%", top: "78%" }}>
                <span className="bs-buddy"><BrainoMascot size={54} /></span>
              </div>
            )}
          </div>
          {inView && (<div className="bs-notch">
            <NotchSheet
              className={"ns-big ns-glow " + (done ? "ns-listen bs-ns-done" : work ? "ns-work" : "ns-listen")} label={done ? "Braino" : work ? "Working on it" : "Listening"} done={done}
              extra={work && !done ? (
                <ol className="ns-steps">
                  {s.steps.map((t, i) => <li key={t} style={{ animationDelay: `${0.6 + i * 0.7}s` }} className={/waiting|yes/.test(t) ? "is-ask" : ""}><span className="vz-tick" />{t}</li>)}
                </ol>
              ) : undefined}
            >{done ? s.steps[s.steps.length - 1] : `\u201c${s.ask}\u201d`}</NotchSheet>
          </div>)}
        </div>
      </div>
      </div>
    </div>
  );
}

/* The boxes stack into one deck as you scroll (2026-10-14): each sticks a
   little lower than the last, and as the next slides over it, it settles
   back, a touch smaller and dimmer. */
function useStack(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const rows = [...(root.current?.querySelectorAll<HTMLElement>(".bs-row") || [])];
      rows.forEach((row, i) => {
        const next = rows[i + 1];
        if (!next) { row.style.transform = ""; row.style.filter = ""; return; }
        const a = row.getBoundingClientRect(), b = next.getBoundingClientRect();
        const cover = Math.min(1, Math.max(0, (a.bottom - b.top) / a.height));
        row.style.transform = `scale(${1 - cover * 0.06})`;
        row.style.filter = `brightness(${1 - cover * 0.18})`;
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    tick();
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [root]);
}

export function BrainoScenes() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const deck = useRef<HTMLElement>(null);
  useStack(deck);
  return (
    <section className="bs bs-deck" id="does" ref={deck}>
      <div className="bs-wrap">
        <div ref={ref} className={"bs-head" + (inView ? " is-in" : "")}>
          <div className="bs-head-notch">{inView && <NotchSheet className="ns-glow" label="Listening" done={false}>Hey Braino...</NotchSheet>}</div>
          <h2 className="aff-h1 bs-h">Just ask.<br /><em>He's right there.</em></h2>
          <p>Seven things he does today, on the screen you're already on.</p>
        </div>
        {SCENES.map((s, i) => <SceneRow key={s.title} s={s} n={i + 1} flip={i % 2 === 1} style={{ top: `calc(84px + ${i * 14}px)`, zIndex: i + 1 }} />)}
      </div>
    </section>
  );
}
