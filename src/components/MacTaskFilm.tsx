import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./mac-task-film.css";

/* A live task, as a short story, on a MacBook Air sketch (2026-10-02).
 *
 * You are working on a deck. John messages: "Did you book the tickets for
 * Friday?" You don't stop; you tell the notch to handle it. Braino searches
 * the web in the background (no browser opens: the search lives in the
 * notch), picks the cheapest fare, opens WhatsApp, writes to John and sends
 * it, and the notch says it is done. He acts because you asked: he never
 * interrupts.
 *
 * One timeline of small state changes, so each beat is one line below and can
 * be retimed on its own. Drawn at a fixed 1200 x 760 and scaled to fit. */

type Mode = "idle" | "listen" | "search" | "work" | "done";
type S = {
  notif: boolean;
  notch: { mode: Mode; label: string; text: string; sources: string[]; fares: number; pick: boolean };
  wa: { open: boolean; draft: string; sent: boolean; ticks: 0 | 1 | 2; reply: boolean; press: boolean };
};

const START: S = {
  notif: false,
  notch: { mode: "idle", label: "", text: "", sources: [], fares: 0, pick: false },
  wa: { open: false, draft: "", sent: false, ticks: 0, reply: false, press: false },
};

const SAID = "Find the cheapest Friday flight to Delhi and send it to John.";
const MSG = "Cheapest Friday flight to Delhi: IndiGo, 6:10 am, ₹4,820. Want me to book it?";
const SOURCES = ["google.com/travel", "makemytrip.com", "goindigo.in"];
const FARES: [string, string, string][] = [
  ["IndiGo", "6:10 am, non-stop", "₹4,820"],
  ["Air India", "8:45 am, non-stop", "₹5,610"],
  ["Akasa Air", "11:20 am, non-stop", "₹5,940"],
];

type Step = [number, (s: S) => S];

function build(): { steps: Step[]; total: number } {
  const steps: Step[] = [];
  let t = 0;
  const at = (dt: number, f: (s: S) => S) => { t += dt; steps.push([t, f]); };
  const type = (per: number, text: string, set: (s: S, v: string) => S) => {
    for (let i = 1; i <= text.length; i++) { const v = text.slice(0, i); at(per, (s) => set(s, v)); }
  };
  const notch = (n: Partial<S["notch"]>) => (s: S) => ({ ...s, notch: { ...s.notch, ...n } });
  const wa = (w: Partial<S["wa"]>) => (s: S) => ({ ...s, wa: { ...s.wa, ...w } });

  // 1 · John asks, while you work on the deck
  at(900, (s) => ({ ...s, notif: true }));
  // 2 · you hand it to Braino
  at(2400, notch({ mode: "listen", label: "Listening", text: "" }));
  type(36, SAID, (s, v) => ({ ...s, notch: { ...s.notch, text: v } }));
  // 3 · he searches the web, in the background
  at(700, (s) => ({ ...notch({ mode: "search", label: "Searching the web", text: "Cheapest Friday flight, Bengaluru to Delhi" })(s), notif: false }));
  SOURCES.forEach(() => at(550, (s) => notch({ sources: SOURCES.slice(0, s.notch.sources.length + 1) })(s)));
  FARES.forEach(() => at(450, (s) => notch({ fares: s.notch.fares + 1 })(s)));
  at(700, notch({ pick: true, label: "Found it", text: "IndiGo, 6:10 am, ₹4,820. Cheapest of 14 fares." }));
  // 4 · WhatsApp, John's chat, the message
  at(1700, (s) => ({ ...notch({ mode: "work", label: "Writing to John", text: "On WhatsApp" })(s), wa: { ...s.wa, open: true } }));
  at(800, (s) => s);
  type(24, MSG, (s, v) => wa({ draft: v })(s));
  at(450, wa({ press: true }));
  at(250, wa({ press: false, sent: true, draft: "", ticks: 1 }));
  at(700, wa({ ticks: 2 }));
  // 5 · done, and John answers
  at(600, notch({ mode: "done", label: "Done", text: "Sent John the cheapest flight." }));
  at(1500, wa({ reply: true }));
  at(3400, (s) => s);
  return { steps, total: t + 600 };
}

const PLAN = build();

export function MacTaskFilm() {
  const [s, setS] = useState<S>(START);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1200);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setS(PLAN.steps.reduce((acc, [, f]) => f(acc), START));
      return;
    }
    let timers: number[] = [];
    const run = () => {
      setS(START);
      timers = PLAN.steps.map(([t, f]) => window.setTimeout(() => setS((cur) => f(cur)), t));
      timers.push(window.setTimeout(run, PLAN.total));
    };
    run();
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const n = s.notch;
  return (
    <figure className="mtf" aria-label="John asks on WhatsApp whether you booked Friday's tickets. You tell Braino to find the cheapest Friday flight to Delhi and send it to John. He searches the web in the background, finds IndiGo at 6:10 am for ₹4,820, opens WhatsApp, writes to John and sends it.">
      <div className="mtf-fit" ref={box} style={{ height: 760 * scale }}>
        <div className="mtf-stage" style={{ transform: `scale(${scale})` }}>
          <div className="mtf-lid">
            <div className="mtf-screen">
              <div className="mtf-menu">
                <span className="mtf-apple" aria-hidden="true">
                  <svg viewBox="0 0 14 17" width="12" height="15"><path d="M11.6 9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7C3.4 4.5 2.1 5.3 1.4 6.6 0 9.1 1 12.8 2.4 14.8c.7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3 0 0-2-.8-2-3.5zM9.7 3.1c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1z" fill="currentColor" /></svg>
                </span>
                <b>{s.wa.open ? "WhatsApp" : "Keynote"}</b>
                {(s.wa.open ? ["File", "Edit", "View", "Chat", "Window"] : ["File", "Edit", "Insert", "Slide", "Window"]).map((m) => <span key={m}>{m}</span>)}
                <span className="mtf-menu-r">Fri 9:41 AM</span>
              </div>

              {/* What you were doing: a deck */}
              <div className={"mtf-win mtf-deck is-open" + (s.wa.open ? "" : " is-front")}>
                <div className="mtf-deck-top"><i /><i /><i /><b>Launch deck.key</b></div>
                <div className="mtf-deck-body">
                  <div className="mtf-deck-rail">{[0, 1, 2, 3].map((k) => <span key={k} className={k === 2 ? "on" : ""} />)}</div>
                  <div className="mtf-deck-slide"><p>Why now</p><span /><span /><span className="short" /></div>
                </div>
              </div>

              {/* John's message arrives */}
              <div className={"mtf-notif" + (s.notif ? " on" : "")}>
                <span className="mtf-notif-ico">
                  <svg viewBox="0 0 40 40" width="30" height="30"><rect width="40" height="40" rx="9" fill="#25D366" /><path d="M20 9.5a10.3 10.3 0 0 0-8.9 15.6L9.7 30.4l5.5-1.4A10.3 10.3 0 1 0 20 9.5z" fill="none" stroke="#fff" strokeWidth="2" /></svg>
                </span>
                <div><b>John</b><p>Did you book the tickets for Friday?</p></div>
                <small>now</small>
              </div>

              {/* WhatsApp for Mac */}
              <div className={"mtf-win mtf-wa" + (s.wa.open ? " is-open is-front" : "")}>
                <div className="mtf-wa-side">
                  <div className="mtf-wa-top"><i /><i /><i /><b>Chats</b></div>
                  <div className="mtf-wa-search"><em>Search</em></div>
                  {([["John", "Did you book the tickets for Friday?", true], ["Mom", "Call me when you land", false], ["Mesa batch", "Priya: deck review at 5", false]] as [string, string, boolean][]).map(([nm, last, on]) => (
                    <div key={nm} className={"mtf-wa-row" + (on ? " on" : "")}><span className="mtf-av">{nm[0]}</span><div><b>{nm}</b><small>{last}</small></div></div>
                  ))}
                </div>
                <div className="mtf-wa-main">
                  <div className="mtf-wa-head"><span className="mtf-av">J</span><b>John</b></div>
                  <div className="mtf-wa-msgs">
                    <p className="mtf-in">Did you book the tickets for Friday?</p>
                    {s.wa.sent && <p className="mtf-out">{MSG}<span className={"mtf-ticks t" + s.wa.ticks}>{s.wa.ticks === 2 ? "✓✓" : "✓"}</span></p>}
                    {s.wa.reply && <p className="mtf-in mtf-pop">Perfect, book it 🙌</p>}
                  </div>
                  <div className="mtf-wa-comp"><span>{s.wa.draft || <em>Type a message</em>}{s.wa.draft && <span className="mtf-caret" />}</span><i className={s.wa.press ? "press" : ""}>➤</i></div>
                </div>
              </div>

              {/* The notch */}
              <div className={"mtf-notch is-" + n.mode}>
                {n.mode !== "idle" && (
                  <div className="mtf-notch-in" key={n.mode}>
                    <p className="mtf-nk">{n.mode === "listen" && <i className="mtf-rec" />}{n.mode === "search" && !n.pick && <i className="mtf-spin" />}{n.label}</p>
                    <p className="mtf-nt">{n.mode === "listen" ? <>&ldquo;{n.text}&rdquo;</> : n.text}</p>
                    {n.mode === "search" && (
                      <>
                        <div className="mtf-src">{n.sources.map((x) => <span key={x}>{x}</span>)}</div>
                        <ol className="mtf-nfares">
                          {FARES.slice(0, n.fares).map(([a, tm, p], i) => (
                            <li key={a} className={i === 0 && n.pick ? "pick" : ""}><b>{a}</b><span>{tm}</span><strong>{p}</strong></li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mtf-base"><span /></div>
          <p className="mtf-cap">THE MACBOOK AIR YOU ALREADY OWN</p>
        </div>
      </div>
    </figure>
  );
}
