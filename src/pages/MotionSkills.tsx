import { useEffect, useRef } from "react";
import "./motion-skills.css";

/* ============================================================================
   /motion-skills — "Claude's Motion Skill Guide". Not a teaser, not shipped
   in any film — a standalone reference page documenting every kinetic-
   typography technique discovered across /notch, /aware and /dontblink this
   build cycle, each one actually demonstrated live (not just described),
   so both the user and any future Claude session can look at ONE page and
   see exactly how (and why) each effect works instead of re-deriving it.

   Canonical source for the base stomp/match-cut definition is
   docs/braino-design.md §10 — this page covers everything discovered SINCE:
   fuses, shimmer, big-reveals, back-to-back cuts, word chunking, staged
   multi-phase reveals, and — most important for future-Claude — the
   self-bounding cut trap that caused three separate "stuck white screen"
   bugs this session before the fix pattern was nailed down.
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// A demo tile's own clock: 0 -> periodMs -> 0, forever. Every demo below is
// a pure function of this one number — same philosophy as the real engine's
// render(t), just looped instead of scrubbable.
function useLoopClock(periodMs: number, onFrame: (elapsed: number) => void) {
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) % periodMs;
      cbRef.current(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [periodMs]);
}

// ── Demo 1: The Stomp ────────────────────────────────────────────────────
function StompDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const words = ["Hey.", "You've", "got", "71", "seconds?"];
  useLoopClock(3200, (t) => {
    const host = ref.current;
    if (!host) return;
    const per = 480;
    const active = Math.floor(t / per);
    host.querySelectorAll<HTMLElement>(".ms-word").forEach((sp, i) => {
      sp.classList.toggle("in", i <= active);
    });
  });
  return (
    <div className="ms-frame ms-line" ref={ref}>
      {words.map((w, i) => <span key={i} className="ms-word">{w}</span>)}
    </div>
  );
}

// ── Demo 2: The Match Cut ────────────────────────────────────────────────
function MatchCutDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const invRef = useRef<HTMLDivElement>(null);
  useLoopClock(2600, (t) => {
    const wrap = wrapRef.current, inv = invRef.current;
    if (!wrap || !inv) return;
    const landed = t >= 900 && t < 2000;
    wrap.classList.toggle("ms-in", t >= 300);
    wrap.classList.toggle("ms-cut", landed);
    inv.style.opacity = landed ? "1" : "0";
  });
  return (
    <div className="ms-frame">
      <div className="ms-line ms-cutline" ref={wrapRef}><span className="ms-word ms-cutword">Perfect.</span></div>
      <div className="ms-invert" ref={invRef} />
    </div>
  );
}

// ── Demo 3: The Fuse ("+" convention) ────────────────────────────────────
function FuseDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLoopClock(2800, (t) => {
    const host = ref.current;
    if (!host) return;
    host.querySelector(".ms-fa")?.classList.toggle("in", t >= 300);
    host.querySelector(".ms-fb")?.classList.toggle("in", t >= 1100);
  });
  return (
    <div className="ms-frame ms-line" ref={ref}>
      <span className="ms-word ms-fa">Chat</span><span className="ms-word ms-fuse ms-fb">GPT.</span>
    </div>
  );
}

// ── Demo 4: Shimmer Sweep on a fuse landing ──────────────────────────────
function ShimmerDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLoopClock(3000, (t) => {
    const host = ref.current;
    if (!host) return;
    const a = host.querySelector<HTMLElement>(".ms-sa");
    const b = host.querySelector<HTMLElement>(".ms-sb");
    a?.classList.toggle("in", t >= 300);
    const landed = t >= 1000;
    b?.classList.toggle("in", landed);
    if (landed && b && !b.classList.contains("ms-shimmer-play")) {
      b.classList.add("ms-shimmer-play");
    }
    if (!landed && b) b.classList.remove("ms-shimmer-play");
  });
  return (
    <div className="ms-frame ms-line" ref={ref}>
      <span className="ms-word ms-sa">Braino</span><span className="ms-word ms-fuse ms-sb">Notch</span>
    </div>
  );
}

// ── Demo 5: Big Reveal ───────────────────────────────────────────────────
function BigRevealDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLoopClock(2600, (t) => {
    const host = ref.current;
    if (!host) return;
    const a = host.querySelector<HTMLElement>(".ms-ba");
    const b = host.querySelector<HTMLElement>(".ms-bb");
    a?.classList.toggle("in", t >= 200 && t < 900);
    b?.classList.toggle("in", t >= 900);
    host.classList.toggle("ms-big", t >= 900);
  });
  return (
    <div className="ms-frame ms-line" ref={ref}>
      <span className="ms-word ms-ba">Don't</span><span className="ms-word ms-bb">Blink.</span>
    </div>
  );
}

// ── Demo 6: Back-to-back cuts (the "x2" pattern) ─────────────────────────
function DoubleCutDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const invRef = useRef<HTMLDivElement>(null);
  useLoopClock(3000, (t) => {
    const wrap = wrapRef.current, inv = invRef.current;
    if (!wrap || !inv) return;
    const w1 = wrap.querySelector<HTMLElement>(".ms-d1");
    const w2 = wrap.querySelector<HTMLElement>(".ms-d2");
    w1?.classList.toggle("in", t >= 300);
    w2?.classList.toggle("in", t >= 900);
    const cut1 = t >= 300 && t < 900;
    const cut2 = t >= 900 && t < 1500;
    wrap.classList.toggle("ms-cut", cut1 || cut2);
    inv.style.opacity = (cut1 || cut2) ? "1" : "0";
  });
  return (
    <div className="ms-frame">
      <div className="ms-line ms-cutline" ref={wrapRef}>
        <span className="ms-word ms-d1">Control</span><span className="ms-word ms-d2">x2</span>
      </div>
      <div className="ms-invert" ref={invRef} />
    </div>
  );
}

// ── Demo 7: Word Chunking (the "x2x2" formula) ───────────────────────────
function ChunkDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLoopClock(3400, (t) => {
    const host = ref.current;
    if (!host) return;
    const per = 420;
    const active = Math.floor(clamp(t, 0, per * 6) / per);
    host.querySelectorAll<HTMLElement>(".ms-word").forEach((sp, i) => sp.classList.toggle("in", i <= active));
  });
  return (
    <div className="ms-frame ms-line" ref={ref}>
      <span className="ms-word">Mo</span><span className="ms-word ms-fuse">re</span>
      <span className="ms-word">Hu</span><span className="ms-word ms-fuse">man,</span>
      <span className="ms-word">Le</span><span className="ms-word ms-fuse">ss</span>
    </div>
  );
}

// ── Demo 9: Staged multi-phase reveal (dozing -> eyes -> expand -> dance) ─
function StagedDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useLoopClock(4200, (t) => {
    const pill = ref.current;
    if (!pill) return;
    let label = "dozing", scale = 0.65;
    if (t < 800) { label = "dozing"; scale = 0.65; }
    else if (t < 1600) { label = "eyes open"; scale = 0.65; }
    else if (t < 2400) { label = "expanding"; scale = 0.65 + ((t - 1600) / 800) * (1.15 - 0.65); }
    else { label = "dancing"; scale = 1.15; }
    pill.style.transform = `scale(${scale.toFixed(3)})`;
    pill.textContent = label;
    pill.classList.toggle("ms-awake", t >= 800);
    pill.classList.toggle("ms-dance", t >= 2400);
  });
  return (
    <div className="ms-frame ms-staged">
      <div className="ms-pill" ref={ref}>dozing</div>
    </div>
  );
}

type Section = {
  id: string;
  title: string;
  tag: string;
  body: string[];
  code: string;
  demo: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "engine",
    title: "The Core Engine",
    tag: "foundation",
    body: [
      "Every film in this family — /notch, /aware, /dontblink — is one requestAnimationFrame loop calling a single render(t) function, where t is elapsed milliseconds. Every visual is computed as a pure function of t: opacity, which word is revealed, whether a match cut is firing. Nothing is stateful animation-library timeline stuff.",
      "The payoff: the whole film is scrubbable for free. Drag the timeline slider to any ms and render(t) draws the exact right frame — no seeking, no replay-from-zero. This is why frame-number bug reports work in this codebase (\"fix frame 698\") — every frame is addressable.",
    ],
    code: `const render = (t) => {
  wordEl.style.opacity = ramp(t, sceneStart, sceneStart+100)
    * (1 - ramp(t, sceneEnd-250, sceneEnd));
  kinetic(wordEl, sceneStart, perWordMs, t);   // which words are "in"
};
requestAnimationFrame(function loop() {
  render(manualT);           // manualT: wall-clock OR scrubber value
  requestAnimationFrame(loop);
});`,
    demo: <div className="ms-note">No isolated demo — every demo on this page IS an instance of this engine, just on a fixed loop instead of a scrubber.</div>,
  },
  {
    id: "stomp",
    title: "The Stomp",
    tag: "base reveal — every word, every video",
    body: [
      "A word never fades or slides in. It HITS at full size instantly with a hot brightness flash that decays — like a stamp striking paper. Zero motion, zero scale change.",
      "This is the baseline for every single word in every film. Pacing (word-to-word timing) and reveal style (the stomp itself) are two separate knobs — slowing a scene down means widening the per-word ms, never swapping the stomp for a softer fade.",
    ],
    code: `.word.in { animation: wordIn .16s cubic-bezier(.16,1,.3,1) both; }
@keyframes wordIn {
  0%   { opacity: 1; filter: brightness(2.2); text-shadow: 0 0 22px rgba(255,255,255,.9); }
  100% { opacity: 1; filter: brightness(1); text-shadow: none; }
}`,
    demo: <StompDemo />,
  },
  {
    id: "matchcut",
    title: "The Match Cut",
    tag: "escalation — a stomp big enough to flip the frame",
    body: [
      "A match cut is when a word/phrase landing is important enough that the ENTIRE FRAME inverts (background/text swap) on that exact landing, instead of just the word flashing. It reads as a camera cut, not a text animation.",
      "Three ingredients, always together: (1) a full-frame invert overlay that flips opacity 0→1 the instant the target lands, (2) the word's own stomp animation suppressed during the flip (.invert-flash .word.in{animation:none!important} — competing effects read as two things, not one cut), (3) a ring-burst or equivalent one-shot flourish, fired once per landing via a fired* guard boolean.",
      "Landing detection is self-bounding: seqIdx.get(host)===targetPhraseIdx && kinCache.get(host)?.last===lastWordIdx. This goes false automatically the instant the NEXT phrase starts — see the gotcha section below for the one case where this isn't true.",
    ],
    code: `const landed = seqIdx.get(host) === targetIdx
  && (kinCache.get(host)?.last ?? -1) === lastWordIdxOfThatPhrase;
host.classList.toggle("invert-flash", landed);
invertOverlay.style.opacity = landed ? "1" : "0";`,
    demo: <MatchCutDemo />,
  },
  {
    id: "fuse",
    title: 'The Fuse — "+" convention',
    tag: "two stomps become one word",
    body: [
      'A word prefixed with "+" pulls flush against whatever landed right before it — no gap, margin-left:-.2em — so two separate stomps read as one fused word. "Chat" + "+GPT." becomes "ChatGPT." on screen, but it\'s still two independent landing events underneath.',
      'Always display:inline-block (never display:none pre-reveal) — this reserves its width from the moment the phrase begins and reveals via visibility/opacity instead, so the word BEFORE it doesn\'t visibly jump sideways when the fused word appears. Getting this backwards is exactly what "made Braino jump left the moment Notch landed" the first time this was built.',
      "The fuse landing IS the natural spot for a match cut — the reveal and the cut are the same beat, not two mechanics glued together.",
    ],
    code: `.word.fuse {
  display: inline-block; margin-left: -.2em;
  visibility: hidden; opacity: 0;
}
.word.fuse.in { visibility: visible; opacity: 1; }`,
    demo: <FuseDemo />,
  },
  {
    id: "shimmer",
    title: "Shimmer Sweep",
    tag: "a fuse landing that deserves extra shine",
    body: [
      "For the handful of fuses that ARE the payoff (BrainoNotch, \"As\"+\"k.\", IOMI) — a gradient text fill with an animated background-position sweeps a glint across the word once, retriggered by removing/reflowing/re-adding the animation class (plain CSS animations don't replay on a class re-add otherwise).",
      'GOTCHA: if the fuse lands during a match cut, the standard .invert-flash .word.in{animation:none!important} suppression rule will silently kill this shimmer too — same selector, same specificity. Fix: write a MORE specific override (extra class) placed AFTER the suppression rule in the stylesheet, so equal-specificity source order breaks in your favor. This exact bug shipped three separate times this session before the pattern below was locked in.',
    ],
    code: `// retrigger a CSS animation that already played once
fuseEl.classList.remove("shimmer-play");
void fuseEl.offsetWidth;              // force reflow
fuseEl.classList.add("shimmer-play");

/* the override that survives .invert-flash suppression —
   same specificity as the suppression rule, placed AFTER it */
.host.invert-flash .word.shimmer-play {
  background-image: linear-gradient(96deg, #0B0B0C 30%, #FFF 48%, #F0A86B 52%, #0B0B0C 70%);
  background-size: 240% auto; -webkit-background-clip: text;
  background-clip: text; color: transparent;
  animation: glitterSweep 1s linear both !important;
}`,
    demo: <ShimmerDemo />,
  },
  {
    id: "big",
    title: "Big Reveal",
    tag: "one word, its own held beat, 3x size",
    body: [
      'A single word (or fused pair) jumps to roughly 3x the base font-size for its own moment — "Blink.", "As"+"k.", IOMI. Toggle a size class on the host when that phrase is active; the flex row recentres around it automatically.',
      "Reserve this for one or two moments per film — it's a full stop, not a running effect. Overusing it flattens the hierarchy it's meant to create.",
    ],
    code: `host.classList.toggle("word-big", seqIdx.get(host) === bigPhraseIdx);
/* .host.word-big { font-size: clamp(84px, 13.8vw, 174px); } */`,
    demo: <BigRevealDemo />,
  },
  {
    id: "doublecut",
    title: 'Back-to-Back Cuts — the "x2" pattern',
    tag: "two hard cuts, no breath between",
    body: [
      'For a beat that\'s inherently a double-tap ("Press Control x2", a stutter, a two-step reveal) — two match cuts fire in immediate succession, each on its own word landing. Same mechanism as a single match cut, just two independent landed booleans OR\'d into the same invert overlay, with a short tight gap (~90ms) between the two words so they read as one gesture, not two separate beats.',
    ],
    code: `const cut1 = seqIdx.get(host)===idxA && last===lastWordA;
const cut2 = seqIdx.get(host)===idxB && last===lastWordB;
host.classList.toggle("invert-flash", cut1 || cut2);
// GAPS[idxA] = 90 — tight, back-to-back, not the usual 260ms breathing room`,
    demo: <DoubleCutDemo />,
  },
  {
    id: "chunking",
    title: 'Word Chunking — the "x2x2" formula',
    tag: "auto-split long words into two stomps",
    body: [
      "A global helper splits any word ≥4 letters (skip-listing short connective words like \"your\"/\"that\"/\"when\") roughly in half, fusing the back half onto the front with the same \"+\" convention — automatically, across an entire script, without hand-writing every fuse pair.",
      "This is what makes a whole finale section (BIGGER_PHRASES) read as continuous rapid-fire cuts instead of one cut per multi-syllable word: \"More\" → \"Hu\"+\"man,\" → \"Less\" reads as 5 stomps, not 3.",
      "The index math has to stay honest across this: wordToChunks[originalWordIdx] and chunkToWord[chunkIdx] let downstream code (like the every-other-word alternating invert-flash) alternate per ORIGINAL WORD, not per chunk — otherwise a chunked phrase strobes twice as fast and reads as a flicker instead of a rhythm.",
    ],
    code: `const CHUNK_MIN_LEN = 4;
function chunkWord(word) {
  const m = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9']+)(.*)$/);
  if (!m || m[2].length < CHUNK_MIN_LEN) return [word];
  const cut = Math.floor(m[2].length / 2);
  return [m[1] + m[2].slice(0, cut), "+" + m[2].slice(cut) + m[3]];
}`,
    demo: <ChunkDemo />,
  },
  {
    id: "gotcha",
    title: "The Self-Bounding Cut Trap",
    tag: "read this before writing a new match cut",
    body: [
      'sequence() clamps its phrase index to the LAST phrase once elapsed time runs past a scene\'s own window: "if (idx===-1 && rel>=starts[last]) idx = phrases.length-1". That\'s correct behavior for keeping the last phrase visible — but it means a landed-boolean checking "is this the last phrase, at its last word" stays TRUE FOREVER once the film moves into the NEXT scene, because the clamped index never changes again.',
      'If that boolean drives .invert-flash (or any shared full-frame white overlay), the result is a screen that goes white and NEVER RECOVERS — for the rest of the film. This exact bug shipped at least three times this session: the "Hu"+"man." cut in /aware, and twice more in /dontblink\'s finale restructures.',
      "The fix is always the same: bound the landed check by an explicit t < (next scene's start time) — never rely on \"the phrase will change eventually\" for the LAST phrase in a scene. Every other phrase in a sequence is safe by construction (there IS a next phrase to move the index off of); only the final one needs the explicit guard.",
    ],
    code: `// WRONG — latches true forever once t passes into the next scene
const landed = seqIdx.get(host) === lastPhraseIdx && last === lastWordIdx;

// RIGHT — bounded by the next scene's own start time
const landed = t < T.nextScene
  && seqIdx.get(host) === lastPhraseIdx && last === lastWordIdx;`,
    demo: <div className="ms-note ms-warn">No demo — this is a bug pattern, not an effect. The fix is the one line above.</div>,
  },
  {
    id: "staged",
    title: "Staged Multi-Phase Reveal",
    tag: "one scene, several sub-beats in sequence",
    body: [
      'For a moment with real choreography (the closing notch: dozing → eyes open → expands downward → dancer fades in) — split the scene\'s elapsed time into fixed sub-windows and switch state/class per window, same render(t)-is-a-pure-function discipline as everything else, just with more branches.',
      "The \"expand downward\" part specifically needs a top-anchored transform-origin (not the usual center-anchored translate(-50%,-50%)) so growth reads as stretching down from a fixed point, not growing from the middle in both directions.",
    ],
    code: `const dt = t - sceneStart;
let cls = "dozing";
if (dt < 800) cls = "dozing";
else if (dt < 1600) cls = "awake";
else if (dt < 2400) { cls = "expanding"; scale = lerp(.65, 1.15, (dt-1600)/800); }
else cls = "dancing";`,
    demo: <StagedDemo />,
  },
];

export default function MotionSkills() {
  useEffect(() => {
    document.body.classList.add("ms-page");
    return () => document.body.classList.remove("ms-page");
  }, []);

  return (
    <div className="ms-root">
      <header className="ms-header">
        <div className="ms-kicker">internal reference — not shipped in any film</div>
        <h1>Claude's Motion Skill Guide</h1>
        <p className="ms-sub">
          Every kinetic-typography technique discovered across <code>/notch</code>, <code>/aware</code> and{" "}
          <code>/dontblink</code>, described and actually demonstrated live — so the next pass (mine or
          anyone's) starts from what's already proven instead of re-deriving it from scratch.
        </p>
        <nav className="ms-toc">
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
        </nav>
      </header>

      <main className="ms-sections">
        {SECTIONS.map((s) => (
          <section className="ms-section" id={s.id} key={s.id}>
            <div className="ms-section-head">
              <span className="ms-tag">{s.tag}</span>
              <h2>{s.title}</h2>
            </div>
            <div className="ms-section-body">
              <div className="ms-text">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
                <pre className="ms-code"><code>{s.code}</code></pre>
              </div>
              <div className="ms-demo">{s.demo}</div>
            </div>
          </section>
        ))}
      </main>

      <footer className="ms-footer">
        Canonical base definition (the stomp + match cut) lives in <code>docs/braino-design.md</code> §10 —
        this page is everything discovered since. Update both when the convention changes.
      </footer>
    </div>
  );
}
