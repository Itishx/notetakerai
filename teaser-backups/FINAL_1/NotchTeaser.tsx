import { useEffect, useRef, useState } from "react";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import "./home-os.css";
import "./notch-teaser.css";

/* ============================================================================
   /notch-teaser — the Braino Notch teaser film. Fast kinetic typography (like
   the "don't blink" launch video) intercut with the REAL notch:
     1  cold open   "Braino has a new home."     (word-by-word, left-anchored)
     2  intro       "Introducing"
     3  WAKE-UP     the full boot sequence — the notch comes alive
     4  GREETING    the notch CAPTIONS "how you doing?" (play-less-than-i-do style)
     5  MODES       single-word thinking states in the notch, faster and faster:
                    Reading · Thinking · Pondering … → "Reading your screen"
     6  the line    "He now lives in the"
     7  MATCH CUT   "Notch" → "Braino" prepends → BrainoNotch, frame inverts B/W
     8  tagline     "Speak. Watch It Happen."     (accumulating)
     9  WINK        the island winks → black
   One rAF clock, deterministic render(t), fully scrubbable + MP3 beat-sync.
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const OPEN_WORDS = ["Braino", "has", "a", "new", "home."];
const SCREEN_WORDS = ["He", "can", "now", "see", "your", "screen."];
const LINE_WORDS = ["Since", "he", "now", "lives", "in", "the", "notch"];
const LINE2_WORDS = ["it's", "only", "fair", "we", "called", "him"];
const TAG_WORDS = ["Speak.", "Watch", "It", "Happen."];
const GREET_CAP = "how you doing?";
// the notch's whimsical working states — Claude-style verbs, ending on the punch
const MODE_WORDS = [
  "Thinking", "Reading", "Pondering", "Working", "Searching",
  "Percolating", "Clicking", "Noodling", "Writing", "Reading your screen",
];

// mode flicker schedule (fast, accelerating; the final punch-word holds)
const MODE_DURS = MODE_WORDS.map((_, i) =>
  i === MODE_WORDS.length - 1 ? 620 : Math.round(150 - (150 - 45) * (i / (MODE_WORDS.length - 2)))
);
const MODE_CUM: number[] = [];
{ let acc = 0; for (const d of MODE_DURS) { MODE_CUM.push(acc); acc += d; } }
const MODES_TOTAL = MODE_DURS.reduce((a, b) => a + b, 0);
const BOOT_LEN = 7700;    // verbatim boot beats; short hold after the greeting
const MATCHCUT = 1400;    // Notch pops → 420ms → BAM, inverted BrainoNotch
const WINK_TAIL = 4100;   // form → coral → WINK plays out fully → beat of black

// The WORDS get FASTER as the film progresses — each scene has its own cadence
// (ms per word), decreasing scene by scene. Animations are NOT part of this.
const SW = { open: 420, screen: 340, line: 280, line2: 230, tag: 190 };
// TEXT flows: sentence → sentence is a small FIXED beat, never the big hold.
const GAP = 360;

// SEE-YOUR-SCREEN runs three lines sequentially in the SAME spot; `sw` per word,
// `H` hold before each clears. Offsets so the scene scales with cadence + hold.
const screenTimes = (sw: number, _H: number) => {
  const mainEnd = SCREEN_WORDS.length * sw + GAP;
  const n1Start = mainEnd;
  const n1End = n1Start + 2 * sw + GAP;
  const n2Start = n1End;
  const total = n2Start + sw + GAP;
  return { mainEnd, n1Start, n1End, n2Start, total };
};

// Build the timeline. Word reveals use the per-scene SW cadence (untouched by
// duration fitting); the single HOLD `H` is what fills the film out to length.
// Animations (boot / match cut / wink / modes) keep fixed durations. snap() pins
// each scene start to the beat grid.
const buildTimeline = (H: number, snap?: (ms: number, down: boolean) => number) => {
  // ONLY the three big hits snap to the music (boot, the match cut, the wink) —
  // snapping every scene inserted up to a downbeat of dead air BETWEEN sentences
  // and shoved the ending on top of itself. Text chains EXACTLY.
  let last = -1;
  const S2 = (ms: number, doSnap = false) => {
    let v = doSnap && snap ? snap(ms, true) : Math.round(ms);
    if (v <= last + 120) v = Math.round(Math.max(ms, last + 120));  // strictly forward
    last = v;
    return v;
  };
  // TEXT chains tight (word beats + GAP); the hold H lives ONLY inside the
  // motion-graphics segments — they take their own time, the text never waits.
  const open = S2(250);
  const intro = S2(open + OPEN_WORDS.length * SW.open + GAP);
  const boot = S2(intro + SW.open + GAP, true);              // SNAP: the wake-up hits a downbeat
  const see = S2(boot + BOOT_LEN + H * 0.1);                 // "how you doing?" holds only a breath
  const screen = S2(see + H * 0.35);                         // the look-down, brief
  const modes = S2(screen + screenTimes(SW.screen, H).total);// ANIMATION: the thinking flicker
  const line = S2(modes + MODES_TOTAL + H * 0.4);
  const line2 = S2(line + LINE_WORDS.length * SW.line + GAP);
  const button = S2(line2 + LINE2_WORDS.length * SW.line2 + GAP);       // chains TIGHT — same speed as the flip
  const tag = S2(button + MATCHCUT + H * 0.35);              // punchy: the flip hits and holds one beat
  const wink = S2(tag + TAG_WORDS.length * SW.tag + H * 0.7, true);     // SNAP: the close lands on a downbeat
  const end = Math.round(wink + WINK_TAIL);
  return { open, intro, boot, see, screen, modes, line, line2, button, tag, wink, end };
};

// Solve the hold H so the whole film lands on `target` ms (end is linear in H).
const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

const TARGET_MS = 30000;                      // the film is 30s — full script, full animations
const DEFAULT_H = solveHold(TARGET_MS);
const DEFAULT_T = buildTimeline(DEFAULT_H);

export default function NotchTeaser() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* no floating mascot on the teaser stage */
  useEffect(() => {
    document.body.classList.add("nt-page");
    return () => document.body.classList.remove("nt-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const notch = q(".nt-notch .nf-face");
    const notchWrap = q(".nt-notch");
    const glowP = root.querySelector<SVGPathElement>(".nt-p-glow")!;
    const coreP = root.querySelector<SVGPathElement>(".nt-p-core")!;
    const shimmer = q(".nt-shimmer");
    const bloom = q(".nt-bloom");
    const openLine = q(".nt-open");
    const intro = q(".nt-intro");
    const screen = q(".nt-screen");
    const line = q(".nt-line");
    const line2 = q(".nt-line2");
    const tag = q(".nt-tag");
    const matchcut = q(".nt-matchcut");
    const invert = q(".nt-invert");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // T = live timeline (rebuilt onto the beat grid when a track is synced).
    // P = per-scene word cadence (accelerating). holdMs = the fill hold.
    let T = { ...DEFAULT_T };
    const P = { ...SW };
    let holdMs = DEFAULT_H;
    const audioEl = root.querySelector<HTMLAudioElement>(".nt-audio");
    const fileInput = root.querySelector<HTMLInputElement>(".nt-file");
    const logEl = root.querySelector<HTMLElement>(".nt-log");
    let trackLoaded = false;

    const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
    const len = coreP.getTotalLength();
    [glowP, coreP].forEach((p) => { p.style.strokeDasharray = String(len); p.style.strokeDashoffset = String(len); });

    // cached per-frame elements — NEVER querySelector inside render (jank)
    const scMain = screen.querySelector<HTMLElement>(".nt-screen-main")!;
    const note1 = screen.querySelector<HTMLElement>(".nt-note-1")!;
    const note2 = screen.querySelector<HTMLElement>(".nt-note-2")!;
    const capEl = notch.querySelector<HTMLElement>(".nf-cap-l");

    // the mode-word flicker index at elapsed time el (ms into the modes scene)
    const N = MODE_WORDS.length;
    const modeIndexAt = (el: number) => {
      let idx = 0;
      for (let i = 0; i < N; i++) if (el >= MODE_CUM[i]) idx = i;
      return clamp(idx, 0, N - 1);
    };

    // reset
    root.querySelectorAll<HTMLElement>(".nt-word").forEach((w) => w.classList.remove("in"));
    [notchWrap, bloom, intro, openLine, screen, line, line2, tag].forEach((el) => (el.style.opacity = "0"));
    matchcut.style.opacity = "0"; matchcut.classList.remove("braino");
    invert.style.opacity = "0";
    notch.className = "nf-face on home dozing";
    notchWrap.className = "nt-notch";

    if (reduced) { tag.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".nt-tag .nt-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0, lastCls = "", lastMode = -1, lastStatus = "__";
    let playing = true, manualT = 0, startWall = performance.now();
    const controls = root.querySelector<HTMLElement>(".nt-scrubber");
    const slider = root.querySelector<HTMLInputElement>(".nt-scrub");
    const playBtn = root.querySelector<HTMLButtonElement>(".nt-play");
    const timeLabel = root.querySelector<HTMLElement>(".nt-time");
    if (slider) slider.max = String(T.end);

    // ACCUMULATE one line, driven by the passed clock t (so it scrubs). Word
    // spans + last active index are cached per host — DOM writes only on change.
    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(".nt-word")), last: -2 }; kinCache.set(host, c); }
      const active = t - start < 0 ? -1 : Math.min(c.spans.length - 1, Math.floor((t - start) / per));
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };

    // The whole film from an ARBITRARY time t (ms) — deterministic → scrubbable.
    const render = (t: number) => {
      shimmer.style.opacity = "0";

      // ── TEXT scenes ──
      openLine.style.opacity = String(ramp(t, T.open, T.open + 120) * (1 - ramp(t, T.intro - 250, T.intro)));
      intro.style.opacity = String(ramp(t, T.intro, T.intro + 200) * (1 - ramp(t, T.boot - 250, T.boot)));
      screen.style.opacity = String(ramp(t, T.screen, T.screen + 110) * (1 - ramp(t, T.modes - 200, T.modes - 60)));
      line.style.opacity = String(ramp(t, T.line, T.line + 120) * (1 - ramp(t, T.line2 - 300, T.line2 - 100)));
      line2.style.opacity = String(ramp(t, T.line2, T.line2 + 120) * (1 - ramp(t, T.button - 220, T.button - 60)));
      tag.style.opacity = String(ramp(t, T.tag, T.tag + 120) * (1 - ramp(t, T.wink - 250, T.wink - 60)));
      kinetic(openLine, T.open, P.open, t);
      kinetic(line, T.line, P.line, t);
      kinetic(line2, T.line2, P.line2, t);
      kinetic(tag, T.tag, P.tag, t);
      // SEE-YOUR-SCREEN — three lines SEQUENTIALLY in the SAME dead-centre spot:
      // "He can now see your screen." clears → "(quite literally)" → "(always)".
      const st = screenTimes(P.screen, holdMs);   // offsets scale with cadence + hold
      scMain.style.opacity = String(ramp(t, T.screen, T.screen + 90) * (1 - ramp(t, T.screen + st.mainEnd, T.screen + st.mainEnd + 160)));
      note1.style.opacity = String(ramp(t, T.screen + st.n1Start, T.screen + st.n1Start + 110) * (1 - ramp(t, T.screen + st.n1End, T.screen + st.n1End + 160)));
      note2.style.opacity = String(ramp(t, T.screen + st.n2Start, T.screen + st.n2Start + 110));
      kinetic(scMain, T.screen, P.screen, t);
      kinetic(note1, T.screen + st.n1Start, P.screen, t);
      kinetic(note2, T.screen + st.n2Start, P.screen, t);

      const inBoot = t >= T.boot && t < T.see;
      const inSee = t >= T.see && t < T.screen;         // notch looks DOWN at the screen
      const inModes = t >= T.modes && t < T.line;       // notch thinks, word by word
      const inCut = t >= T.button && t < T.tag;         // BrainoNotch match cut (invert)
      const inWink = t >= T.wink;

      // ── the ONE island: boots, GREETS, LOOKS at the screen, thinks through its
      //    modes, returns for the closing wink. It never shares the stage with text. ──
      let islandOp = 0;
      if (t >= T.boot && t < T.screen) islandOp = ramp(t, T.boot, T.boot + 400) * (1 - ramp(t, T.screen - 500, T.screen - 200));
      else if (inModes) islandOp = ramp(t, T.modes, T.modes + 300) * (1 - ramp(t, T.line - 400, T.line - 150));
      // the close: form + wink, then a HARD CUT to black (no fade)
      else if (inWink) islandOp = ramp(t, T.wink + 200, T.wink + 500) * (t < T.wink + 3500 ? 1 : 0);
      notchWrap.style.opacity = String(islandOp);
      notchWrap.classList.toggle("seeing", inSee);
      notchWrap.classList.toggle("thinking", inModes);
      notchWrap.classList.toggle("eyes-only", inWink);

      // BOOT — VERBATIM to the Mac app runNotchBoot():
      //   dozing (eyes closed) → slow perimeter line (900→3600ms) → nf-auth
      //   "authenticating" → nf-coral wave → nf-auth-ok (green verdict, eyes
      //   open) → captioning + nf-wink, types "how you doing?" → stays.
      if (inBoot) {
        const bt = t - T.boot;
        const sh = ramp(bt, 900, 3600);                       // the very slow line, 2.7s
        shimmer.style.opacity = String(ramp(bt, 900, 1150) * (1 - ramp(bt, 3400, 3900)));
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(ramp(t, T.boot, T.boot + 200) * sh * (1 - ramp(bt, 5600, 6100)) * 0.9);
        let cls = "nf-face on home dozing", status = "", cap = "";
        if (bt >= 6160) {                                     // Beat 5: spread, wink, type hello
          cls = "nf-face on home awake captioning nf-wink";
          cap = GREET_CAP.slice(0, clamp(Math.floor((bt - 6160) / 55), 0, GREET_CAP.length));
        } else if (bt >= 5460) cls = "nf-face on home awake nf-auth-ok";      // Beat 4: green verdict, eyes open
        else if (bt >= 4700) cls = "nf-face on home dozing nf-coral";         // Beat 3b: coral wave
        else if (bt >= 3600) { cls = "nf-face on home dozing nf-auth"; status = "authenticating"; } // Beat 3
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; }
        if (status !== lastStatus) { setNotchStatus(notch, status); lastStatus = status; }
        if (capEl && capEl.textContent !== cap) capEl.textContent = cap;
      }

      // SEE — the caption drops and the notch looks DOWN at your screen, eyes
      // drifting low and darting around (the .seeing class drives the pupils)
      if (inSee) {
        const cls = "nf-face on home awake";
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }

      // MODES — VERBATIM to the Mac notch's thinking: the word lives in the
      // caption wing, notch in busy + captioning (the thinking pulse). The pill
      // holds a fixed width (.thinking) so the words flicker IN PLACE, very fast.
      if (inModes) {
        if (!notch.className.includes("busy")) {
          notch.className = "nf-face on home awake busy captioning"; lastCls = notch.className; setNotchStatus(notch, "");
          lastMode = -1;
        }
        const idx = modeIndexAt(t - T.modes);
        if (idx !== lastMode) {
          if (capEl) capEl.textContent = idx === N - 1 ? MODE_WORDS[idx] : `${MODE_WORDS[idx]}…`;
          lastMode = idx;
        }
      } else if (lastMode !== -1) {
        lastMode = -1;
      }

      // MATCH CUT — "Notch" holds centred, "Braino" prepends → "BrainoNotch" and
      // the whole frame INVERTS white↔black in one frame. that flip IS the cut.
      if (inCut) {
        const bt = t - T.button;
        const flipped = bt >= 420;
        matchcut.style.opacity = String(ramp(bt, 0, 120));
        matchcut.classList.toggle("braino", flipped);
        invert.style.opacity = flipped ? "1" : "0";
      } else {
        matchcut.style.opacity = "0";
        matchcut.classList.remove("braino");
        invert.style.opacity = "0";
      }

      // WINK — the island forms at dead centre with the perimeter shimmer, then
      // Braino's CORAL wave washes through (his colours, same as boot), his eyes
      // open, he WINKS, and it HARD-CUTS to black.
      if (inWink) {
        const rt = t - T.wink;
        const sh = ramp(rt, 250, 1350);
        shimmer.style.opacity = String(ramp(rt, 250, 500) * (1 - ramp(rt, 2700, 3200)));
        [glowP, coreP].forEach((el) => (el.style.strokeDashoffset = String(len * (1 - sh))));
        bloom.style.opacity = String(ramp(rt, 250, 550) * (1 - ramp(rt, 2700, 3300)) * 0.8);
        let cls = "nf-face on home awake";
        if (rt >= 2100) cls = "nf-face on home awake nf-wink";        // the wink — 0.6s, plays out FULLY
        else if (rt >= 1100) cls = "nf-face on home awake nf-coral";  // Braino's coral shimmer
        if (cls !== lastCls) { notch.className = cls; lastCls = cls; setNotchStatus(notch, ""); }
      }
    };

    // ── playback loop + scrubber ──
    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    const setPlaying = (p: boolean) => {
      playing = p;
      if (playBtn) playBtn.textContent = p ? "❚❚" : "▶";
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = manualT / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => {
      manualT = clamp(ms, 0, T.end);
      if (trackLoaded && audioEl) audioEl.currentTime = manualT / 1000;
    };

    let lastUi = 0;
    const loop = () => {
      if (playing) {
        manualT = trackLoaded && audioEl ? audioEl.currentTime * 1000 : performance.now() - startWall;
        if (manualT >= T.end) { manualT = T.end; setPlaying(false); }
      }
      render(manualT);
      // the glassy scrubber (backdrop blur) repaints on every update — throttle
      // its UI to ~8fps so the FILM keeps the full frame budget
      const now = performance.now();
      if (now - lastUi > 120) {
        lastUi = now;
        if (slider) {
          if (document.activeElement !== slider) slider.value = String(Math.round(manualT));
          slider.style.setProperty("--p", `${(manualT / T.end) * 100}%`);
        }
        if (timeLabel) timeLabel.textContent = fmt(manualT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const frame = q(".nt-frame");
    const onScrub = (e: Event) => { setPlaying(false); seek(+(e.target as HTMLInputElement).value); };
    const onPlay = () => { if (manualT >= T.end) { seek(0); } setPlaying(!playing); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); onPlay(); }
      else if (e.key === "ArrowRight") { setPlaying(false); seek(manualT + (e.shiftKey ? 1000 : 33)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); seek(manualT - (e.shiftKey ? 1000 : 33)); }
    };
    slider?.addEventListener("input", onScrub);
    playBtn?.addEventListener("click", onPlay);
    root.querySelector(".nt-step-back")?.addEventListener("click", () => { setPlaying(false); seek(manualT - 33); });
    root.querySelector(".nt-step-fwd")?.addEventListener("click", () => { setPlaying(false); seek(manualT + 33); });
    controls?.addEventListener("click", (e) => e.stopPropagation());
    frame.addEventListener("click", onPlay);
    addEventListener("keydown", onKey);
    const onFsChange = () => { if (document.fullscreenElement === frame) { seek(0); setPlaying(true); } };
    document.addEventListener("fullscreenchange", onFsChange);

    const log = (msg: string) => {
      if (logEl) logEl.textContent = msg;
      // eslint-disable-next-line no-console
      console.log("[BeatSync]", msg);
    };

    // Fit the film to the track: the WORDS keep their fast, accelerating cadence
    // (untouched); the HOLD is solved so the film spans the track, and every
    // scene start snaps to the nearest beat / downbeat so the cuts hit the music.
    const applyBeats = (a: BeatAnalysis) => {
      // HARD limit: the full film (wink + cut-to-black included) must land inside
      // min(45s, track). Beat-snapping pushes scenes LATER (up to a downbeat per
      // snap), so solve the hold, measure the snapped overshoot, and re-solve
      // with the drift absorbed — a couple of iterations converge.
      const target = Math.min(TARGET_MS, a.durationMs - 200);
      const snap = (ms: number, down: boolean) =>
        snapToBeat(ms, down ? a.downbeats : a.beats, Math.max(0, ms - 350));
      let goal = target;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;                // absorb the snap drift and re-solve
      }
      // belt-and-braces: keep the ending inside the limit, but NEVER pull the
      // wink back onto the tagline/match cut — the close must play out in order
      const lastOk = target - WINK_TAIL;
      const winkFloor = T.tag + TAG_WORDS.length * SW.tag + 400;
      if (T.wink > lastOk) T.wink = Math.round(Math.max(winkFloor, lastOk));
      T.end = T.wink + WINK_TAIL;
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
    };

    const onFile = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      log(`Analyzing "${file.name}"…`);
      setPlaying(false);
      try {
        const buf = await file.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        applyBeats(a);
        if (audioEl) { audioEl.src = URL.createObjectURL(file); audioEl.load(); }
        try {
          localStorage.setItem("nt-beatsync", JSON.stringify({ name: file.name, bpm: a.bpm, durationMs: a.durationMs, timeline: T }));
        } catch { /* storage blocked */ }
        log(`${file.name} · ${a.bpm} BPM · ${a.beats.length} beats · synced ✓`);
        seek(0); setPlaying(true);
      } catch (err) {
        log(`Couldn't analyze that file. ${(err as Error)?.message || ""}`);
      }
    };
    fileInput?.addEventListener("change", onFile);

    // AUTO-SYNC to the "Don't Blink" track on load. Analyse it, beat-snap the
    // film, then attempt to play (browsers may block autoplay until the user
    // clicks — the film stays ready and the play button / frame-click starts it).
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/dont-blink.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        if (slider) slider.max = String(T.end);
        seek(0); manualT = 0;
        // try to autoplay in sync; if the browser blocks it, leave the film
        // paused at 0 and ready — one click on the frame / play starts it
        if (audioEl) {
          audioEl.src = "/dont-blink.mp3"; audioEl.load(); audioEl.currentTime = 0;
          try {
            await audioEl.play();
            playing = true; if (playBtn) playBtn.textContent = "❚❚";
            log(`Don't Blink · ${a.bpm} BPM · synced ✓`);
          } catch {
            playing = false; if (playBtn) playBtn.textContent = "▶";
            log(`Don't Blink · ${a.bpm} BPM · synced ✓ — press play ▶`);
          }
        }
      } catch (err) {
        if (!cancelled) log(`Couldn't auto-sync Don't Blink (${(err as Error)?.message || "?"}). Upload a track to sync.`);
      }
    })();

    return () => {
      cancelled = true;
      fileInput?.removeEventListener("change", onFile);
      cancelAnimationFrame(raf);
      slider?.removeEventListener("input", onScrub);
      playBtn?.removeEventListener("click", onPlay);
      frame.removeEventListener("click", onPlay);
      removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [runId]);

  const replay = () => setRunId((n) => n + 1);
  const goFullscreen = () => {
    const frame = rootRef.current?.querySelector<HTMLElement>(".nt-frame");
    if (!frame) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else frame.requestFullscreen?.().catch(() => {});
  };

  const kineticLine = (cls: string, words: string[]) => (
    <div className={cls}>
      {words.map((w, i) => <span key={i} className="nt-word">{w}</span>)}
    </div>
  );

  return (
    <div className="nt-films">
      <section className="nt" ref={rootRef}>
        <div className="nt-frame">
          <div className="nt-stage">
            {kineticLine("nt-open", OPEN_WORDS)}
            <div className="nt-intro">Introducing</div>
            <div className="nt-screen">
              <div className="nt-screen-main">
                {SCREEN_WORDS.map((w, i) => <span key={i} className="nt-word">{w}</span>)}
              </div>
              <div className="nt-screen-note nt-note-1"><span className="nt-word">(quite</span><span className="nt-word">literally)</span></div>
              <div className="nt-screen-note nt-note-2"><span className="nt-word">(always)</span></div>
            </div>
            {kineticLine("nt-line", LINE_WORDS)}
            {kineticLine("nt-line2", LINE2_WORDS)}
            {kineticLine("nt-tag", TAG_WORDS)}

            {/* ONE island the whole way — boots, GREETS, thinks, winks */}
            <div className="nt-notch">
              <NotchFace className="on home dozing" />
              <svg className="nt-shimmer" viewBox="0 0 190 55" aria-hidden="true">
                <defs>
                  <linearGradient id="nt-glow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFFFFF" /><stop offset=".45" stopColor="#CFE0FF" />
                    <stop offset=".8" stopColor="#7AA2FF" /><stop offset="1" stopColor="#F0A86B" />
                  </linearGradient>
                </defs>
                <path className="nt-p nt-p-glow" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#nt-glow)" fill="none" />
                <path className="nt-p nt-p-core" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#nt-glow)" fill="none" />
              </svg>
            </div>
            <div className="nt-bloom" />

            {/* the finale match cut: "Notch" → Braino prepends → invert white/black */}
            <div className="nt-invert" />
            <div className="nt-matchcut"><span className="mc-b">Braino</span><span className="mc-n">Notch</span></div>
          </div>
        </div>
        <audio className="nt-audio" preload="auto" />

        {/* frame-by-frame scrubber */}
        <div className="nt-scrubber">
          <button className="nt-play" title="Play / Pause (space)">❚❚</button>
          <button className="nt-step-back" title="Back 1 frame (←)">◀|</button>
          <input className="nt-scrub" type="range" min="0" max={String(DEFAULT_T.end)} defaultValue="0" step="1" />
          <button className="nt-step-fwd" title="Forward 1 frame (→)">|▶</button>
          <span className="nt-time">0.00s</span>
          <button className="nt-replaybtn" onClick={replay} title="Restart">⟲</button>
          <button className="nt-fs" onClick={goFullscreen} title="Fullscreen">⛶</button>
          <label className="nt-upload" title="Upload an MP3 to beat-sync the text">
            ♪ Sync track
            <input className="nt-file" type="file" accept="audio/*" hidden />
          </label>
        </div>
        <div className="nt-log" />
      </section>
    </div>
  );
}
