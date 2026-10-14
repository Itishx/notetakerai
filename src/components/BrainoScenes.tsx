import { ReactNode, useEffect, useRef, useState } from "react";
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
const Doc = () => (
  <div className="bs-doc">
    <h4>Section 4.2: Indemnification</h4>
    <p>The Licensee shall indemnify and hold harmless the Licensor from any and all claims,</p>
    <p className="bs-mark">liabilities, damages and expenses arising out of the Licensee's use of the Software,</p>
    <p>except to the extent caused by the Licensor's gross negligence or wilful misconduct.</p>
  </div>
);
const Mail = () => (
  <div className="bs-mail">
    <div className="bs-mail-in"><b>Rohan</b><p>Hey, any update on the deck? We needed it yesterday.</p></div>
    <div className="bs-mail-out"><small>Draft by Braino</small><p>Hi Rohan, sorry for the wait. It's 90% there and you'll have it by 5 today. Thanks for your patience!</p><span>Send</span></div>
  </div>
);
const Chat = () => (
  <div className="bs-chat">
    <div className="bs-chat-head"><i />Riya</div>
    <p className="bs-chat-them">where are you??</p>
    <p className="bs-chat-me">Running 10 minutes late, sorry! On my way.<small>Sent by Braino ✓✓</small></p>
  </div>
);
const Notes = () => (
  <div className="bs-notes">
    <div className="bs-notes-live"><i />Live · Marketing 101</div>
    <ul>
      <li>Positioning = the one spot you own in a customer's head</li>
      <li>Pick a fight with a category, not a company</li>
      <li>Assignment: 2 page brief, due Friday</li>
    </ul>
  </div>
);
const Music = () => (
  <div className="bs-music">
    <div className="bs-music-art" />
    <div><b>Weightless</b><p>Marconi Union</p><div className="bs-music-bar"><i /></div></div>
  </div>
);
const Form = () => (
  <div className="bs-form">
    {[["Full name", "Itish Pande"], ["Email", "itish@affctve.com"], ["City", "Bengaluru"], ["Phone", "+91 98••• •••21"]].map(([l, v], i) => (
      <label key={l} style={{ animationDelay: `${i * 0.35}s` }}><span>{l}</span><em>{v}</em></label>
    ))}
    <button type="button">Submit<small>Waiting for your yes</small></button>
  </div>
);
const Flights = () => (
  <div className="bs-flights">
    {[["IndiGo", "6:05", "₹4,212"], ["Akasa", "7:40", "₹4,390"], ["Air India", "9:15", "₹4,875"], ["Vistara", "11:00", "₹5,120"]].map(([a, t, p], i) => (
      <div key={a} className={i === 0 ? "is-best" : ""}><b>{a}</b><span>BLR → BOM · {t}</span><em>{p}</em>{i === 0 && <small>Cheapest</small>}</div>
    ))}
  </div>
);

const SCENES: Scene[] = [
  { app: "Preview", ask: "Braino, what does this even mean?", steps: ["Read the clause on your screen", "If you get sued for how you used it, you pay", "Unless they messed up badly"], point: { sel: ".bs-mark", say: "This bit. If you get sued, you pay." }, title: "Explains anything on your screen", p: "Stuck on something? Just ask. He already sees it, so there's nothing to copy, paste or explain.", screen: <Doc /> },
  { app: "Mail", ask: "Reply to Rohan, but nicer.", steps: ["Opened Rohan's email", "Wrote a kinder reply in your voice", "Waiting for your yes to send"], point: { sel: ".bs-mail-out span", say: "Read it, then tap Send" }, title: "Replies to your emails", p: "He reads the thread and drafts the reply in your voice. You read it, you hit send.", screen: <Mail /> },
  { app: "WhatsApp", ask: "Tell Riya I'm running late.", steps: ["Found Riya in WhatsApp", "Wrote: running 10 minutes late", "Sent"], point: { sel: ".bs-chat-me", say: "Sent. She knows." }, title: "Sends your messages", p: "Say who and what. He sends it on WhatsApp, to the right person, in a second.", screen: <Chat /> },
  { app: "Live Notes", ask: "Take notes for this class.", steps: ["Listening and writing as it goes", "Three key ideas saved", "Assignment due Friday, noted"], point: { sel: ".bs-notes li:nth-child(3)", say: "Due Friday. Don't forget this one." }, title: "Takes your meeting notes", p: "Meetings and lectures, written down while you listen. The notes are ready the moment it ends.", screen: <Notes /> },
  { app: "Chrome", ask: "Fill this form for me.", steps: ["Read the form", "Filled four fields from what he knows", "Stopped at Submit, waiting for your yes"], point: { sel: ".bs-form button", say: "Check it, then tap here" }, title: "Fills your forms", p: "Everything he knows about you, filled in. He stops at submit so you can check it.", screen: <Form /> },
  { app: "Google Flights", ask: "Cheapest flight to Mumbai on Friday?", steps: ["Searched Friday flights to Mumbai", "IndiGo, 6:05 am, \u20b94,212", "The cheapest of 23"], point: { sel: ".bs-flights .is-best em", say: "This one. \u20b94,212" }, title: "Finds the best deal", p: "He reads the page so you don't have to scroll through forty results.", screen: <Flights /> },
  { app: "Spotify", ask: "Play something calm.", steps: ["Opened Spotify", "Playing Weightless by Marconi Union", "Turned the volume down a little"], point: { sel: ".bs-music-bar", say: "Calm. Volume down a bit." }, title: "Handles the little things", p: "Music, timers, tabs, apps. All the tiny clicks of your day, gone.", screen: <Music /> },
];

/* The home page's own notch (NotchSheet) on the home page's own screen: it
   listens first, then drops open with the steps ticking off, over the app
   he is working in. */
function SceneRow({ s, n, flip }: { s: Scene; n: number; flip: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>();
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
    <div ref={ref} className={"bs-row" + (flip ? " is-flip" : "") + (inView ? " is-in" : "") + (work ? " is-said" : "")}>
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

export function BrainoScenes() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <section className="bs" id="does">
      <div className="bs-wrap">
        <div ref={ref} className={"bs-head" + (inView ? " is-in" : "")}>
          <div className="bs-head-notch">{inView && <NotchSheet className="ns-glow" label="Listening" done={false}>Hey Braino...</NotchSheet>}</div>
          <h2 className="aff-h1 bs-h">Just ask.<br /><em>He's right there.</em></h2>
          <p>Seven things he does today, on the screen you're already on.</p>
        </div>
        {SCENES.map((s, i) => <SceneRow key={s.title} s={s} n={i + 1} flip={i % 2 === 1} />)}
      </div>
    </section>
  );
}
