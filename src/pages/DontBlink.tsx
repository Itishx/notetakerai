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

/* ── The script ─────────────────────────────────────────────────────────
 *
 *     Stop using your Mac.
 *     [ the notch wakes ]
 *     Start talking to it.
 *     Braino.
 *     16th October 2026
 *
 * Two lines mirrored with the boot in the hinge, so you watch the turn happen
 * rather than being told about it. Nothing is explained: a teaser thirty days
 * out is for curiosity, and five earlier drafts failed by trying to sell in
 * twenty seconds, which is what adverts do.
 *
 * Both lines are built from St+, so the second sentence starts by rebuilding
 * the first one's opening in front of you and then going somewhere else. And
 * "using" is the one word here that cannot be split, because "Stop us" is a
 * whole sentence and the eye would finish the line there.
 *
 * CHUNKING is hand-picked, the way IntroTeaser and NotchTeaser do it
 * (seven pairs across 2628 lines), split on meaning rather than on letter
 * count. And the head must never be a word that completes a phrase on its own:
 * "using" cannot be split, because "Stop us" is a whole sentence and the eye
 * would finish it there. That exact trap is what made an earlier line read as
 * ending on "This one's already".
 */

const LINE1_PHRASES = [["St", "+op", "using", "your", "Mac."]];
const LINE1_SW = 330;
// Short. This line is the setup, not the punch: its words have accumulated as
// you read them, so by the time the full stop lands there is nothing left to
// read and any hold past the cut is just the film waiting. The second line
// gets the long hold, because that one is the turn.
const LINE1_HOLD = 300;

// "talk" + "ing" is the Fast|er pattern, and "Start talk" is visibly
// unfinished, so the eye waits for the rest.
const LINE2_PHRASES = [["St", "+art", "talk", "+ing", "to", "it."]];
const LINE2_SW = 300;
const LINE2_HOLD = 800;

// The boot IS the film's middle, not a transition inside it: six seconds of
// the real notch, beat for beat as the Mac app's own runNotchBoot runs.
const BOOT_DUR = 6200;

// The word Brain is already sitting inside the name; the split just shows you.
const NAME_PHRASES = [["Bra", "+ino."]];
const NAME_SW = 340;
const NAME_HOLD = 900;

/* The date is the only line that gets match cuts, and it gets one PER CHUNK.
 * It also walks before it runs: 16 / th / Octo / ber at 400ms, then 20 / 26 at
 * 200 — a date read aloud is not a metronome, and the year is the part you
 * already know is coming. */
const DATE_CHUNKS = ["16", "+th", "Octo", "+ber", "20", "+26"];
const DATE_SLOW = 400;
const DATE_FAST = 200;
const DATE_FAST_FROM = 4;
const DATE_STARTS = DATE_CHUNKS.map((_, i) =>
  i < DATE_FAST_FROM ? i * DATE_SLOW : DATE_FAST_FROM * DATE_SLOW + (i - DATE_FAST_FROM) * DATE_FAST);
const DATE_SPAN = DATE_STARTS[DATE_STARTS.length - 1] + DATE_FAST;
const DATE_HOLD = 1500;
const STOMP_MS = 130;

// He walks on, alone on white, and then the frame goes black under him.
const STAND_DUR = 1150;
const CUT_TAIL = 420;

/* ── Timing ─────────────────────────────────────────────────────────────── */

const GAP = 260;
const phraseSw = (sw: number | number[], i: number) =>
  Array.isArray(sw) ? (sw[i] ?? sw[sw.length - 1]) : sw;


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
  const line1 = S(250);
  const boot  = S(line1 + LINE1_PHRASES[0].length * LINE1_SW + LINE1_HOLD);
  const line2 = S(boot + BOOT_DUR);
  const name  = S(line2 + LINE2_PHRASES[0].length * LINE2_SW + LINE2_HOLD);
  const date  = S(name + NAME_PHRASES[0].length * NAME_SW + NAME_HOLD + H * 0.06);
  const stand = S(date + DATE_SPAN + DATE_HOLD + H * 0.06);
  const black = S(stand + STAND_DUR);
  const end   = Math.round(black + CUT_TAIL);
  return { line1, boot, line2, name, date, stand, black, end };
};

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 100, 8000);
};

const TARGET_MS = 18000;
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

    const line1El = $(".lt-line1");
    const line2El = $(".lt-line2");
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

    const show = (el: HTMLElement, on: boolean) => { el.style.opacity = on ? "1" : "0"; };

    const render = (t: number) => {
      show(line1El, t >= T.line1 && t < T.boot);
      show(line2El, t >= T.line2 && t < T.name);
      show(nameEl,  t >= T.name  && t < T.date);
      show(dateEl,  t >= T.date  && t < T.stand);
      show(graphic, t >= T.boot && t < T.line2);
      /* He stands, alone on white, then the frame goes black under him. */
      show(standEl, t >= T.stand && t < T.black);
      blackEl.style.opacity = t >= T.black ? "1" : "0";

      if (t >= T.line1 && t < T.boot)  sequence(line1El, LINE1_PHRASES, [0], T.line1, LINE1_SW, t);
      if (t >= T.line2 && t < T.name)  sequence(line2El, LINE2_PHRASES, [0], T.line2, LINE2_SW, t);
      if (t >= T.name  && t < T.date)  sequence(nameEl, NAME_PHRASES, [0], T.name, NAME_SW, t);
      if (t >= T.date  && t < T.stand) kineticStarts(dateEl, DATE_STARTS, T.date, t);

      /* The notch's own boot, driven off the same clock. setNotchStatus takes
         the host element, not just a string — it writes into the face's own
         .nf-status node. */
      const notch = graphic.querySelector<HTMLElement>(".nf");
      if (t >= T.boot && t < T.line2) {
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
      const stomp = (at: number) => t >= at && t < at + STOMP_MS;
      const dateRel = t - T.date;
      const inv =
        // The full stop of each sentence, and only the full stop. The cut is
        // what finishes the line, so the hold that follows sits on white and
        // the finished sentence is read on white rather than through a flash.
        stomp(T.line1 + (LINE1_PHRASES[0].length - 1) * LINE1_SW) ||
        stomp(T.line2 + (LINE2_PHRASES[0].length - 1) * LINE2_SW) ||
        (t >= T.date && t < T.stand &&
         DATE_STARTS.some((at) => dateRel >= at && dateRel < at + STOMP_MS));

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
            <div className="lt-line1" />
            <div className="lt-line2" />
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
