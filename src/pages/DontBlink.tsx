/* /launch — "Don't blink", ~18s, for 16 10 2026.
 *
 * Same DNA as NotchTeaser (.claude/skills/kinetic-teaser-video): one dead
 * centre spot, one size, words ACCUMULATE inside a phrase and phrases hard-cut
 * in the same place. Reuses notch-teaser.css so the type is literally the same
 * block, and the real NotchFace rather than a mock of one.
 *
 * The script is built on ONE contrast, which is why every line pulls the same
 * direction: three things that WAIT, then the one already awake. An earlier
 * cut was four two-word hits ("Your inbox. Gone.") and it read as a teaser
 * without being one — cadence with no idea underneath, and "Your Mac. His."
 * lands nearer malware than feature.
 *
 * render(t) is a pure function of t, so the film is scrubbable and restartable
 * from any point. Nothing may depend on history that t cannot reconstruct.
 */

import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "./notch-teaser.css";
import "./dont-blink.css";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* CHUNKING, hand-authored, the way IntroTeaser and NotchTeaser do it.
 *
 * There was a formula here that split every word of four-plus letters down the
 * middle. It was wrong twice over. Their films chunk RARELY — five pairs in
 * 1543 lines — and they split on MEANING, not on character count:
 *
 *     do|ing.    un|der    Fast|er.    As|k.    Bli|nk.
 *
 * The head is a chunk you can already read and the tail is usually the suffix,
 * so the second stamp completes a word rather than finishing a spelling. A
 * formula gave "Bra"/"ino.", "Th"/"is", "one"/"'s" — a machine spelling words
 * out, which is exactly what it read as.
 *
 * So these are chosen. "wait"+"s.", "open"+"ed.", "ask"+"ed." are the Fast|er
 * pattern. "al"+"ready" and "a"+"wake." are the real morpheme boundaries.
 * "Brain"+"o." is the best of them, because the word Brain is already sitting
 * inside the name and the split just shows you. Words with no natural break
 * ("told.", "This", "app") stay whole.
 */

/* ── The script ─────────────────────────────────────────────────────────── */

// The triple. Same shape three times, tightening each time: that acceleration
// is the energy, and it argues the point rather than decorating it.
const WAIT_PHRASES = [
  ["Every", "app", "wait", "+s."],
  ["To", "be", "open", "+ed."],
  ["To", "be", "ask", "+ed."],
  ["To", "be", "told."],
];
// The "To be ..." lines are SLOWER than the opener, not faster. They were 330
// / 310 / 290 on the theory that a triple should accelerate, but these are
// three-word lines where the last word is the whole point ("opened", "asked",
// "told") — rushing to it is what made them read as one blurred line rather
// than three separate refusals. The acceleration lives in the trailing gaps
// below instead, which tighten 260 -> 150 across the triple.
const WAIT_SW = [300, 320, 310, 295];
const WAIT_GAPS: number[] = []; WAIT_GAPS[0] = 260; WAIT_GAPS[1] = 230; WAIT_GAPS[2] = 210; WAIT_GAPS[3] = 150;
// Back to the house GAP after an over-correction: asked to kill a pause, I
// stripped these to 90 and the whole opening started reading as a stutter.
// The last one stays tighter than the rest so the boot still interrupts.

// The hinge. Everything before waits, everything after is already happening,
// and the boot is what the sentence turns on rather than a graphic over it.
const BOOT_DUR = 1150;

// The turn, and the last word builds: "awa" lands, "+ke." completes it. The
// sentence arrives, then the word that matters assembles.
/* "awake." lands WHOLE, and this is the fix for the line reading as if it ends
   early. Split as "a" + "+wake." the head is itself a word, so the line passed
   through "This one's already a" on its way, and before that it sat on "This
   one's already" — a complete-looking sentence — for a quarter of a second.
   The eye finishes it there and the rest looks like a stutter.
   A chunk is only safe when the head is NOT a word on its own: "al" is
   nonsense, so "This one's al" is visibly unfinished and the eye waits. */
const AWAKE_PHRASES = [["This", "one's", "al", "+ready", "awake."]];
// Not a metronome. Eight identical beats is what made this line read as a
// machine reciting: the setup should move and the payoff should land. "This
// one's" goes past quickly because it is only there to carry you to "already
// awake", which then takes its time.
// Six stamps: This / one's / al / ready / a / wake. The setup moves, the two
// builds take their time, so it speaks instead of ticking.
const AWAKE_STARTS = [0, 200, 420, 620, 790];   // 790, not 1000: at 1000 the line sat on "This one's already" for 354ms, long enough to read as finished
const AWAKE_SW = 265;
const AWAKE_SPAN = AWAKE_STARTS[AWAKE_STARTS.length - 1] + 300;
const AWAKE_HOLD = 420;

// The name AFTER you know what it does, so it means something when you hear it,
// and CHUNKED: "Brai" lands, then "no." joins flush against it and completes
// the word in front of you. Two stamps, one word. That build is the mechanic;
// a flash on a whole word is just a flash.
const NAME_PHRASES = [["Brain", "+o."]];
const NAME_SW = 330;
const NAME_HOLD = 520;

// THE PAYLOAD, digit by digit.
//
// Six stamps: 16 · th · Octo · ber · 20 · 26, each its own match cut. The "+"
// fuses a chunk flush against the one before it so the groups still read as
// "16th October 2026" rather than six loose pieces — the space only falls
// where a chunk does NOT carry the prefix.
//
// The cadence is deliberately uneven, which a single `sw` cannot express, so
// the starts are written out. The date walks in at 400ms a digit, then 2026
// arrives at 190 — the year is the part that accelerates, so the film speeds
// up into its own last frame instead of landing flat.
const DATE_CHUNKS = ["16", "+th", "Octo", "+ber", "20", "+26"];
const DATE_SLOW = 400;
const DATE_FAST = 200;
// Everything up to the year walks; the year runs. Same rule as the digits it
// replaces, just fewer and longer stamps, so the split moves from index 4 to
// index 4 of six rather than of eight.
const DATE_FAST_FROM = 4;
const DATE_STARTS = DATE_CHUNKS.map((_, i) =>
  i < DATE_FAST_FROM ? i * DATE_SLOW : DATE_FAST_FROM * DATE_SLOW + (i - DATE_FAST_FROM) * DATE_FAST);
const DATE_SPAN = DATE_STARTS[DATE_STARTS.length - 1] + DATE_FAST;
const DATE_HOLD = 1500;
const STOMP_MS = 130;   // how long the frame stays inverted per stamp

// No tagline. "Don't blink." was the format's name doing duty as a line, and
// it says nothing about a launch — after a date has landed, another slogan is
// just more words. He stands there instead: one second of the actual character
// on an empty white frame, then black. The last thing you see is him, not copy
// about him.
const STAND_DUR = 1150;

const CUT_TAIL = 420;   // the black, held briefly so the cut reads as a decision

/* ── Timing ─────────────────────────────────────────────────────────────── */

const GAP = 260;
const phraseSw = (sw: number | number[], i: number) =>
  Array.isArray(sw) ? (sw[i] ?? sw[sw.length - 1]) : sw;
const phraseSeq = (phrases: string[][], sw: number | number[], gaps?: number[]) => {
  const starts: number[] = [];
  let acc = 0;
  phrases.forEach((ph, i) => {
    starts.push(acc);
    acc += ph.length * phraseSw(sw, i) + (gaps?.[i] ?? GAP);
  });
  return { starts, total: acc };
};

const WAIT_TOTAL = phraseSeq(WAIT_PHRASES, WAIT_SW, WAIT_GAPS).total;

// One tunable hold flexes to hit the target; word cadences never move.
//
// The H multipliers are now DELIBERATELY small everywhere. They were up at
// 0.38 between the name and the date, which put 3.5 seconds of "Braino."
// sitting on screen doing nothing — at this pace a single second off reads as
// the film having crashed. Every beat that needs weight states it as an
// explicit *_HOLD instead, so the numbers are visible and tunable rather than
// falling out of whatever the target happens to be.
const buildTimeline = (H: number) => {
  let last = -1;
  const S = (ms: number) => {
    let v = Math.round(ms);
    if (v <= last + 100) v = Math.round(Math.max(ms, last + 100));
    last = v;
    return v;
  };
  const wait  = S(250);
  const boot  = S(wait + WAIT_TOTAL);          // no hold here at all: the turn interrupts the triple, it does not wait politely for it
  const awake = S(boot + BOOT_DUR);
  const name  = S(awake + AWAKE_SPAN + AWAKE_HOLD + H * 0.04);
  const date  = S(name + NAME_PHRASES[0].length * NAME_SW + NAME_HOLD + H * 0.06);
  const stand = S(date + DATE_SPAN + DATE_HOLD + H * 0.06);
  const black = S(stand + STAND_DUR);
  const end   = Math.round(black + CUT_TAIL);
  return { wait, boot, awake, name, date, stand, black, end };
};

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 100, 8000);
};

const TARGET_MS = 21000;
const H = solveHold(TARGET_MS);
const T = buildTimeline(H);

export default function DontBlink() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("nt-page");
    return () => document.body.classList.remove("nt-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (s: string) => root.querySelector<HTMLElement>(s)!;

    const waitEl = $(".lt-wait");
    const awakeEl = $(".lt-awake");
    const nameEl = $(".lt-name");
    const dateEl = $(".lt-date");
    const standEl = $(".lt-stand");
    const blackEl = $(".lt-black");
    const graphic = $(".lt-graphic");
    const invert = $(".lt-invert");

    /* These caches latch the LAST REACHED index on purpose, so revealed words
       stay revealed. That makes them history-dependent rather than t-dependent,
       which is exactly why they must be cleared on every restart: otherwise a
       new loop reads the previous playthrough's latched indices on frame 1. */
    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const seqIdx = new Map<HTMLElement, number>();
    const resetSceneCaches = () => { kinCache.clear(); seqIdx.clear(); };

    const kineticAt = (host: HTMLElement, active: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(":scope > .nt-word")), last: -2 }; kinCache.set(host, c); }
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      const c = kinCache.get(host);
      const len = c ? c.spans.length : host.querySelectorAll(".nt-word").length;
      const active = t - start < 0 ? -1 : Math.min(len - 1, Math.floor((t - start) / per));
      kineticAt(host, active);
    };
    /* Per-stamp offsets rather than one cadence, for a line whose rhythm is
       not uniform (the date walks, then the year runs). */
    const kineticStarts = (host: HTMLElement, starts: number[], sceneStart: number, t: number) => {
      const rel = t - sceneStart;
      let active = -1;
      for (let i = 0; i < starts.length; i++) if (rel >= starts[i]) active = i;
      kineticAt(host, active);
    };
    const sequence = (host: HTMLElement, phrases: string[][], starts: number[], sceneStart: number, sw: number | number[], t: number) => {
      const rel = t - sceneStart;
      let idx = -1;
      for (let i = 0; i < phrases.length; i++) {
        const s0 = starts[i];
        const s1 = i + 1 < phrases.length ? starts[i + 1] : Infinity;
        if (rel >= s0 && rel < s1) { idx = i; break; }
      }
      if (idx === -1 && rel >= starts[starts.length - 1]) idx = phrases.length - 1;
      if (idx < 0) return;
      if (seqIdx.get(host) !== idx) {
        host.innerHTML = phrases[idx].map((w) => {
          const fuse = w.startsWith("+");
          const text = fuse ? w.slice(1) : w;
          return `<span class="nt-word${fuse ? " nt-fuse" : ""}">${text}</span>`;
        }).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);
      }
      kinetic(host, sceneStart + starts[idx], phraseSw(sw, idx), t);
    };

    const WAIT_S = phraseSeq(WAIT_PHRASES, WAIT_SW, WAIT_GAPS).starts;
    const show = (el: HTMLElement, on: boolean) => { el.style.opacity = on ? "1" : "0"; };

    const render = (t: number) => {
      show(waitEl,  t >= T.wait  && t < T.boot);
      show(awakeEl, t >= T.awake && t < T.name);
      show(nameEl,  t >= T.name  && t < T.date);
      show(dateEl,  t >= T.date  && t < T.stand);
      show(graphic, t >= T.boot && t < T.awake);
      /* He stands, alone on white, then the frame goes black under him. */
      show(standEl, t >= T.stand && t < T.black);
      blackEl.style.opacity = t >= T.black ? "1" : "0";

      if (t >= T.wait  && t < T.boot)  sequence(waitEl, WAIT_PHRASES, WAIT_S, T.wait, WAIT_SW, t);
      if (t >= T.awake && t < T.name)  kineticStarts(awakeEl, AWAKE_STARTS, T.awake, t);
      if (t >= T.name  && t < T.date)  sequence(nameEl, NAME_PHRASES, [0], T.name, NAME_SW, t);
      if (t >= T.date  && t < T.stand) kineticStarts(dateEl, DATE_STARTS, T.date, t);

      /* The notch's own boot, driven off the same clock. setNotchStatus takes
         the host element, not just a string — it writes into the face's own
         .nf-status node. */
      const notch = graphic.querySelector<HTMLElement>(".nf");
      if (t >= T.boot && t < T.awake) {
        const p = (t - T.boot) / BOOT_DUR;
        graphic.classList.toggle("is-waking", p < 0.5);
        if (notch) setNotchStatus(notch, "");
      } else {
        graphic.classList.remove("is-waking");
      }

      /* ONE CUT PER NUMBER on the date, and nothing anywhere else.
       *
       * A pulse per chunk, not an alternation: alternating only fires on half
       * of them, which is what dropped the cuts on 6, ber and 26. A date wants
       * a hit on every piece, because every piece IS a beat.
       *
       * The pulse is short and the last one finishes ~1.4s before the line
       * clears, so the completed date still sits on WHITE — landing black on
       * the final chunk is what made an earlier cut read as ending
       * mid-sentence.
       *
       * Everything else in the film stays white. Flipping on every line meant
       * the frame strobed throughout and nothing read as a hit. */
      const dateRel = t - T.date;
      const inv =
        t >= T.date && t < T.stand &&
        DATE_STARTS.some((at) => dateRel >= at && dateRel < at + STOMP_MS);

      invert.style.opacity = inv ? "1" : "0";
    };

    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = now - t0;
      if (t > T.end) { resetSceneCaches(); setRunId((n) => n + 1); return; }
      render(t);
      raf = requestAnimationFrame(loop);
    };
    resetSceneCaches();
    render(0);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [runId]);

  return (
    <div className="nt lt" ref={rootRef}>
      <div className="nt-films">
        <div className="nt-frame">
          <div className="nt-stage">
            <div className="lt-graphic"><NotchFace /></div>
            <div className="lt-wait" />
            <div className="lt-awake">{AWAKE_PHRASES[0].map((w, i) => <span key={i} className={"nt-word" + (w.startsWith("+") ? " nt-fuse" : "")}>{w.replace("+", "")}</span>)}</div>
            <div className="lt-name" />
            <div className="lt-date">{DATE_CHUNKS.map((w, i) => <span key={i} className={"nt-word" + (w.startsWith("+") ? " nt-fuse" : "")}>{w.replace("+", "")}</span>)}</div>
            <div className="lt-stand" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
            <div className="lt-black" />
            <div className="lt-invert" />
          </div>
        </div>
      </div>
    </div>
  );
}
