import { useCallback, useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { saveBlob, supportedVideoType } from "@/lib/artboardExport";
import "./speak-teaser.css";

/* SPEAK — the five second story teaser.
 *
 * It keeps the Don't Blink DNA from NotchTeaser.tsx (ONE dead-centre spot that
 * every line takes its turn in, SF Pro Display at 600 with -.025em tracking,
 * white on pure black, no motion on any word, the fused second half of a word,
 * the white match cut) and changes exactly one thing on purpose: the first two
 * lines arrive as whole phrases on a soft fade instead of the split-and-fuse
 * build. The grammar change IS the punchline. Two fades set the promise, then
 * "Braino" lands in the real chunked stamp with the character beside it.
 *
 * Nothing is ever stacked. A line clears before the next one arrives.
 *
 * Why this one is drawn on a canvas rather than in DOM like the other films:
 * it has to leave the building as a file. The DOM recorder rasterises the node
 * through html-to-image once per frame, which measured about one frame per
 * second here, and a kinetic film at one frame per second is not a film. A
 * canvas records straight off its own compositor at the real frame rate, at
 * exactly 1080 x 1920, with no rasterise in the loop. The type spec, the
 * timings and the grammar are unchanged.
 *
 * drawFilm(ctx, t) is a pure function of time, so the film is scrubbable and
 * restartable from any point and the recording cannot drift from the preview.
 */
const W = 1080;
const H = 1920;

/* Every line owns the SAME dead-centre spot and they take turns in it. One
   line is on screen at a time: it fades in, holds, and clears before the next
   one arrives. Nothing ever sits below anything else. */
const T = {
  speak: 300,        // "Speak," fades in
  speakOut: 1480,    // and clears
  watch: 1820,       // "Watch it happen." takes the same spot
  watchOut: 3020,    // and clears
  braino: 3400,      // the grammar changes: the chunked stamp, same spot
  end: 5400,
} as const;

const FADE = 520;                  // a whole phrase fades in
const OUT = 220;                   // and leaves faster than it arrived
const PART_STARTS = [0, 260];      // "Bra" lands, then "ino" fuses onto it
const STAMP = 160;                 // the brightness hit decays this fast
const CUT_HOLD = 150;              // the match cut is a snap, not a linger
const TAIL = 600;                  // recorded past the end: the container loses a beat off the tail

const LINE_SIZE = 116;
const BRAND_SIZE = 168;
const WALKER_W = 250;
const WALKER_H = Math.round((WALKER_W * 142) / 116);   // the walker's own viewBox ratio
const ROW_GAP = 34;

const LINE_ONE = "Speak,";
const LINE_TWO = "Watch it happen.";
const BRAND = ["Bra", "ino"] as const;

const FONT = '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function setFont(ctx: Ctx, size: number) {
  ctx.font = `600 ${size}px ${FONT}`;
  // Tracking is part of the type spec, not a nicety. Browsers without canvas
  // letter-spacing simply render it untracked rather than breaking.
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(-0.025 * size).toFixed(2)}px`;
}

/** A whole phrase in the shared spot: fades in, holds, clears. */
function phraseAlpha(t: number, inAt: number, outAt: number) {
  if (t < inAt) return 0;
  if (t >= outAt) return 1 - clamp01((t - outAt) / OUT);
  return easeOut(clamp01((t - inAt) / FADE));
}

/** The whole film from an arbitrary time, deterministic, so preview and
    recording are the same picture. */
function drawFilm(ctx: Ctx, t: number, walker: HTMLImageElement | null) {
  const fuseAt = T.braino + PART_STARTS[1];
  const cut = t >= fuseAt && t < fuseAt + CUT_HOLD;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = cut ? "#ffffff" : "#000000";
  ctx.fillRect(0, 0, W, H);

  const ink = cut ? "#000000" : "#ffffff";
  const centre = W / 2;
  const middle = H / 2;

  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  ctx.textAlign = "center";

  setFont(ctx, LINE_SIZE);
  const one = phraseAlpha(t, T.speak, T.speakOut);
  if (one > 0) { ctx.globalAlpha = one; ctx.fillText(LINE_ONE, centre, middle); }
  const two = phraseAlpha(t, T.watch, T.watchOut);
  if (two > 0) { ctx.globalAlpha = two; ctx.fillText(LINE_TWO, centre, middle); }
  ctx.globalAlpha = 1;

  // The payoff takes the same spot. It is laid out from the FULL word every
  // frame, so the character and the "Bra" half never move when "ino" lands.
  const rel = t - T.braino;
  if (rel <= -1) return;
  let lit = -1;
  for (let i = 0; i < PART_STARTS.length; i += 1) if (rel >= PART_STARTS[i]) lit = i;

  setFont(ctx, BRAND_SIZE);
  const fullW = ctx.measureText(BRAND.join("")).width;
  const rowW = fullW + ROW_GAP + WALKER_W;
  const left = Math.round(centre - rowW / 2);

  // The character stands to the RIGHT of the wordmark, and his x is measured
  // from the full word, never from the half that happens to be lit, so he does
  // not shift when "ino" lands.
  if (walker) {
    ctx.globalAlpha = easeOut(clamp01(rel / 420));
    ctx.drawImage(walker, left + fullW + ROW_GAP, Math.round(middle - WALKER_H / 2), WALKER_W, WALKER_H);
    ctx.globalAlpha = 1;
  }

  if (lit >= 0) {
    const text = lit >= 1 ? BRAND.join("") : BRAND[0];
    // The stamp is a hit of brightness that decays, never a move or a scale.
    // Under the match cut it is suppressed: the frame flip IS the effect, and
    // two effects at once read as noise rather than as a cut.
    const landed = T.braino + PART_STARTS[lit];
    const glow = cut ? 0 : Math.max(0, 1 - (t - landed) / STAMP);
    ctx.textAlign = "left";
    ctx.fillStyle = ink;
    if (glow > 0) {
      ctx.shadowColor = `rgba(255,255,255,${(0.9 * glow).toFixed(3)})`;
      ctx.shadowBlur = 26 * glow;
    }
    ctx.fillText(text, left, middle);
    if (glow > 0) ctx.fillText(text, left, middle);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
}

export default function SpeakTeaser() {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const holder = useRef<HTMLDivElement | null>(null);
  const clock = useRef({ playing: true, t: 0, wall: 0, hold: false });
  const [scale, setScale] = useState(0.3);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const fit = useCallback(() => {
    const box = holder.current;
    if (!box) return;
    setScale(Math.max(0.12, Math.min(box.clientWidth / W, (window.innerHeight - 240) / H)));
  }, []);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext("2d") as Ctx | null;
    if (!ctx) return;

    let walker: HTMLImageElement | null = null;
    let raf = 0;
    let alive = true;
    const url = URL.createObjectURL(new Blob([BRAINO_WALKER_SVG], { type: "image/svg+xml" }));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clock.current.wall = performance.now();

    const loop = () => {
      const state = clock.current;
      if (state.playing) {
        state.t = performance.now() - state.wall;
        // While recording the film holds its last frame instead of wrapping:
        // a container drops a beat off the tail, and a loop back to "Speak,"
        // inside that beat would land in the file.
        if (state.t >= T.end) {
          if (state.hold) state.t = T.end - 1;
          else { state.wall = performance.now(); state.t = 0; }
        }
      }
      drawFilm(ctx, reduced ? T.end - 1 : state.t, walker);
      raf = requestAnimationFrame(loop);
    };

    const boot = async () => {
      // The type spec is the film. Draw nothing until the real face is loaded,
      // or the first frames render in a fallback and the recording keeps them.
      await Promise.all([
        document.fonts.load(`600 ${LINE_SIZE}px "SF Pro Display"`),
        document.fonts.load(`600 ${BRAND_SIZE}px "SF Pro Display"`),
      ]).catch(() => undefined);
      const image = new Image();
      image.src = url;
      await image.decode().catch(() => undefined);
      if (!alive) return;
      walker = image;
      clock.current.wall = performance.now();
      raf = requestAnimationFrame(loop);
    };
    void boot();

    return () => { alive = false; cancelAnimationFrame(raf); URL.revokeObjectURL(url); };
  }, []);

  const toggle = () => {
    const state = clock.current;
    state.playing = !state.playing;
    if (state.playing) state.wall = performance.now() - state.t;
    setPlaying(state.playing);
  };

  const restart = () => {
    clock.current.t = 0;
    clock.current.wall = performance.now();
    clock.current.playing = true;
    setPlaying(true);
  };

  const download = async () => {
    const node = canvas.current;
    if (!node || status) return;
    const type = supportedVideoType();
    if (!type) { setStatus("This browser cannot record video"); return; }
    try {
      setStatus("Recording…");
      clock.current.hold = true;
      restart();
      // Straight off the canvas compositor: no rasterise in the loop, so the
      // clip runs at the real frame rate and the file is exactly 1080 x 1920.
      const stream = node.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 12_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: type.mime }));
        recorder.onerror = () => reject(new Error("Recording failed"));
      });
      recorder.start();
      const startedAt = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const elapsed = performance.now() - startedAt;
          setStatus(`Recording… ${Math.min(100, Math.round((elapsed / (T.end + TAIL)) * 100))}%`);
          if (elapsed >= T.end + TAIL) resolve(); else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      clock.current.hold = false;
      saveBlob(await done, `braino-speak-teaser-1080x1920.${type.extension}`);
      setStatus("Downloaded");
      window.setTimeout(() => setStatus(null), 2400);
    } catch (error) {
      console.error("Teaser recording failed", error);
      clock.current.hold = false;
      setStatus("Recording failed");
    }
  };

  return (
    <main className="st-page">
      <nav className="st-nav"><a href="/instagraphics"><i /> braino</a><span>Teaser · 1080 × 1920</span></nav>

      <div className="st-holder" ref={holder}>
        <canvas
          className="st-canvas"
          ref={canvas}
          width={W}
          height={H}
          style={{ width: W * scale, height: H * scale }}
          aria-label="Braino teaser: Speak, watch it happen, Braino."
        />
      </div>

      <div className="st-controls">
        <button type="button" onClick={toggle}>{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={restart}>Restart</button>
        <button type="button" className="is-primary" onClick={download} disabled={Boolean(status) && status !== "Downloaded"}>
          {status ?? "Download video · 1080 × 1920"}
        </button>
        <span>5.4s · silent · story</span>
      </div>
    </main>
  );
}
