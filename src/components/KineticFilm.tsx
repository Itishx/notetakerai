import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import TeaserTransport from "./TeaserTransport";
import ScriptEditor from "./ScriptEditor";
import { analyzeTrack, snapToBeat } from "@/lib/beatSync";
import { buildKineticTimeline, cleanToken, clamp, ramp, type KBeat } from "@/lib/kineticFilm";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";
import type { ScriptLine } from "@/lib/teaserScript";
import "@/pages/notch-teaser.css";

/* ============================================================================
   KineticFilm — the generic, data-driven player behind the newer teaser
   films (Braino Split, Braino OS). Same visual grammar as the flagship "Don't
   Blink" film (word-stamp reveals, "+token" fuses, match-cut invert flash,
   one dead-centre spot), driven by a plain `beats: KBeat[]` array instead of
   a bespoke hand-authored closure per film — and EDITABLE in place via
   ScriptEditor: the `beats` prop only seeds the initial script, live edits
   live in `liveBeats` and drive everything from there on.

   Starts on the wall clock IMMEDIATELY, same as every flagship film — audio
   fetch/decode/beat-analysis is a progressive enhancement layered on top
   once it resolves (`trackLoaded`), never a gate in front of the first
   frame.
   ============================================================================ */

const DEFAULT_CADENCE = 300;
const DEFAULT_GAP = 260;
const STROBE_PERIOD = 90; // one on/off cycle during a 3x strobe cut

const inlineWalkerSvg = (prefix: string) => BRAINO_WALKER_SVG
  .replace(/id="([^"]+)"/g, (_match, id: string) => `id="${prefix}-${id}"`)
  .replace(/url\(#([^)]+)\)/g, (_match, id: string) => `url(#${prefix}-${id})`)
  .replace(/href="#([^"]+)"/g, (_match, id: string) => `href="#${prefix}-${id}"`);

export default function KineticFilm({
  beats,
  cadence = DEFAULT_CADENCE,
  gap = DEFAULT_GAP,
  audioSrc,
  audioStartOffsetMs = 0,
  mutedBeatIds,
  heroSlots,
  endHoldMs = 1400,
  outro,
  pageClass,
  onEnd,
  editable = true,
  showCompositionGrid = false,
}: {
  beats: KBeat[];
  cadence?: number;
  gap?: number;
  audioSrc?: string;
  audioStartOffsetMs?: number;
  mutedBeatIds?: readonly string[];
  heroSlots?: Record<string, ReactNode>;
  endHoldMs?: number;
  outro?: ReactNode;
  pageClass?: string;
  onEnd?: () => void;
  editable?: boolean; // show the canvas grid/position toolbar (hide when embedded for clean playback)
  showCompositionGrid?: boolean;
}) {
  const [liveBeats, setLiveBeats] = useState(beats);
  useEffect(() => { setLiveBeats(beats); }, [beats]);
  // when an edit is tied to a specific line (ScriptEditor passes its index),
  // jump straight to that beat and hold there instead of restarting from 0.
  const pendingFocusIdx = useRef<number | null>(null);
  const handleScriptApply = (next: KBeat[], focusIdx?: number) => {
    pendingFocusIdx.current = focusIdx ?? null;
    setLiveBeats(next);
  };

  // canvas direct-manipulation: click the active line/graphic and drag it,
  // resize via the handle, toggle alignment gridlines. Known limitation —
  // this writes straight to liveBeats; if the script panel commits a text
  // edit on the SAME line afterward, its own position bookkeeping doesn't
  // know about a canvas drag that happened outside it and can reset it.
  const [canvasEdit, setCanvasEdit] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const dragState = useRef<{ idx: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeState = useRef<{ idx: number; startX: number; startY: number; baseScale: number } | null>(null);

  const { timings, total } = useMemo(() => buildKineticTimeline(liveBeats, cadence, gap), [liveBeats, cadence, gap]);
  const end = total + endHoldMs;

  const scriptLines: ScriptLine[] = useMemo(
    () => liveBeats.map((b, i) => ({
      tStart: timings[i].start,
      tEnd: timings[i].end,
      text: b.scriptText ?? b.words.map((w) => cleanToken(w).text).join(" "),
    })),
    [liveBeats, timings],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const heroRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const invertRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);

  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlayingState] = useState(true);
  const finalTimings = useRef(timings);
  finalTimings.current = timings;

  const activeIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < timings.length; i++) if (currentMs >= timings[i].start) idx = i; else break;
    return idx;
  }, [currentMs, timings]);

  useEffect(() => {
    document.body.classList.add("nt-page");
    return () => document.body.classList.remove("nt-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const audioEl = audioElRef.current;
    let trackLoaded = false;
    let audioAnchor = 0;

    const render = (t: number) => {
      const timings = finalTimings.current;
      let activeIdx = 0;
      for (let i = 0; i < timings.length; i++) if (t >= timings[i].start) activeIdx = i; else break;
      const activeBeat = liveBeats[activeIdx];
      if (audioEl) audioEl.muted = Boolean(activeBeat && mutedBeatIds?.includes(activeBeat.id));

      beatRefs.current.forEach((el, i) => { if (el) el.style.opacity = i === activeIdx ? "1" : "0"; });
      Object.entries(heroRefs.current).forEach(([key, el]) => {
        if (!el) return;
        const on = activeBeat?.hero === key;
        el.style.opacity = on ? "1" : "0";
        el.dataset.heroMode = on ? (activeBeat?.heroMode ?? "") : "";
      });

      timings.forEach((tm, bi) => {
        const words = wordRefs.current[bi];
        if (!words) return;
        tm.wordStarts.forEach((ws, wi) => {
          const el = words[wi];
          if (!el) return;
          el.classList.toggle("in", t >= ws);
        });
      });

      beatRefs.current.forEach((el, bi) => {
        if (!el) return;
        const beat = liveBeats[bi];
        const lastLand = timings[bi]?.wordStarts.at(-1);
        el.classList.toggle(
          "kf-iomi-reveal",
          Boolean(beat?.iomiReveal && lastLand != null && t >= lastLand && t < timings[bi].end),
        );
      });

      // Match-cut rule, verbatim from the flagship film: the invert flip IS
      // the effect. It begins on the payoff landing and remains inverted until
      // the next visual beat replaces the frame. No 140ms flash window.
      let flash = 0;
      let cuttingIdx = -1;
      timings.forEach((tm, bi) => {
        const beat = liveBeats[bi];
        if (!beat) return;
        if (beat.matchCutEveryWordEnd) {
          const wordEndIndices = tm.wordStarts
            .map((_, index) => index)
            .filter((index) => index === tm.wordStarts.length - 1 || !beat.words[index + 1]?.startsWith("+"));
          const landedIndex = wordEndIndices.findLast((index) => t >= tm.wordStarts[index]);
          const landedAt = landedIndex == null ? undefined : tm.wordStarts[landedIndex];
          if (landedAt != null && t < tm.end && t - landedAt < 140) {
            flash = 1;
            cuttingIdx = bi;
          }
          return;
        }
        if (beat.matchCutEveryToken) {
          const landedIndex = tm.wordStarts.findLastIndex((start) => t >= start);
          const landedAt = tm.wordStarts[landedIndex];
          if (landedAt != null && t < tm.end && t - landedAt < 140) {
            flash = 1;
            cuttingIdx = bi;
          }
          return;
        }
        const cutIndex = beat.matchCutLast ? tm.wordStarts.length - 1 : beat.matchCut ? tm.fuseIndex : -1;
        const cutStart = beat.cutEveryWord ? tm.wordStarts[0] : tm.wordStarts[cutIndex];
        if (cutStart == null || cutStart < 0) return;
        if (t < cutStart || t >= tm.end) return;
        const on = beat.strobeCount
          ? Math.floor(((t - cutStart) / Math.max(1, tm.end - cutStart)) * (beat.strobeCount * 2 - 1)) % 2 === 0
          : beat.strobe
            ? Math.floor((t - cutStart) / STROBE_PERIOD) % 2 === 0
            : true;
        if (on) { flash = 1; cuttingIdx = bi; }
      });
      if (invertRef.current) invertRef.current.style.opacity = String(flash);
      beatRefs.current.forEach((el, i) => { if (el) el.classList.toggle("invert-flash", i === cuttingIdx); });

      if (outroRef.current) outroRef.current.style.opacity = String(ramp(t, total + endHoldMs * 0.35, total + endHoldMs * 0.85));
    };

    if (reduced) {
      beatRefs.current.forEach((el, i) => { if (el) el.style.opacity = i === timings.length - 1 ? "1" : "0"; });
      wordRefs.current.forEach((words) => words?.forEach((el) => el?.classList.add("in")));
      if (outroRef.current) outroRef.current.style.opacity = "1";
      return;
    }

    let raf = 0;
    let playingRef = true;
    let manualT = 0;
    let startWall = performance.now();
    let lastStateT = -1000;

    // Browsers can reject the first autoplay request even though the film's
    // visual clock has already started. Retry on the first real interaction
    // so a teaser never continues silently after an autoplay block.
    const unlockAudio = () => {
      if (!audioEl || !audioSrc || !playingRef || !audioEl.paused) return;
      audioEl.currentTime = Math.max(0, (manualT + audioStartOffsetMs) / 1000);
      audioEl.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    // an edit just landed on a specific line — hold there instead of
    // restarting the whole film from the top.
    if (pendingFocusIdx.current != null) {
      const idx = pendingFocusIdx.current;
      pendingFocusIdx.current = null;
      manualT = clamp(timings[idx]?.start ?? 0, 0, end);
      playingRef = false;
      startWall = performance.now() - manualT;
      render(manualT);
      setCurrentMs(manualT);
      setPlayingState(false);
    }

    const seek = (ms: number) => {
      manualT = clamp(ms, 0, end);
      audioAnchor = 0;
      // Keep the wall clock anchored to the newly requested position. Without
      // this, the very next animation frame recalculates time from the old
      // start and appears to undo every progress-bar click while playing.
      if (playingRef) startWall = performance.now() - manualT;
      if (trackLoaded && audioEl) audioEl.currentTime = (manualT + audioStartOffsetMs) / 1000;
      render(manualT);
      setCurrentMs(manualT);
    };
    const setPlaying = (p: boolean) => {
      playingRef = p; setPlayingState(p);
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = (manualT + audioStartOffsetMs) / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };

    let ended = false;
    const loop = () => {
      if (playingRef) {
        if (trackLoaded && audioEl) {
          const at = audioEl.currentTime * 1000 - audioStartOffsetMs;
          const wall = performance.now();
          if (audioAnchor === 0 || Math.abs(wall - audioAnchor - at) > 250) audioAnchor = wall - at;
          else audioAnchor += (wall - at - audioAnchor) * 0.06;
          manualT = wall - audioAnchor;
        } else {
          manualT = performance.now() - startWall;
        }
        if (manualT >= end) {
          if (!ended) { ended = true; onEnd?.(); }
          manualT = 0; startWall = performance.now();
          if (trackLoaded && audioEl) { audioEl.currentTime = audioStartOffsetMs / 1000; audioEl.play().catch(() => {}); }
        }
      }
      render(manualT);
      if (manualT - lastStateT > 50 || manualT < lastStateT) { setCurrentMs(manualT); lastStateT = manualT; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    (root as any).__kfSeek = seek;
    (root as any).__kfSetPlaying = setPlaying;

    // audio is a progressive enhancement — fetched/decoded/beat-analyzed in
    // the background, never blocking the first frame. Every designated snap
    // is nudged onto its nearest detected pulse in sequence.
    let cancelled = false;
    if (audioSrc) {
      (async () => {
        try {
          const res = await fetch(audioSrc);
          const buf = await res.arrayBuffer();
          const a = await analyzeTrack(buf, Date.now());
          if (cancelled) return;
          const snapIndices = liveBeats.map((b, i) => b.snap ? i : -1).filter((i) => i >= 0);
          if (snapIndices.length && a.beats.length) {
            const adjusted = timings.map((tm) => ({ ...tm, wordStarts: [...tm.wordStarts] }));
            snapIndices.forEach((snapIdx) => {
              const current = adjusted[snapIdx].start;
              const nearest = snapToBeat(current + audioStartOffsetMs, a.beats, 0) - audioStartOffsetMs;
              const delta = clamp(nearest - current, -180, 180);
              if (!delta) return;
              for (let i = snapIdx; i < adjusted.length; i++) {
                adjusted[i].start += delta;
                adjusted[i].end += delta;
                adjusted[i].wordStarts = adjusted[i].wordStarts.map((w) => w + delta);
              }
              if (snapIdx > 0) adjusted[snapIdx - 1].end = adjusted[snapIdx].start;
            });
            finalTimings.current = adjusted;
          }
          if (audioEl) {
            audioEl.src = audioSrc; audioEl.load();
            audioEl.currentTime = (manualT + audioStartOffsetMs) / 1000;
            if (playingRef) await audioEl.play().catch(() => {});
            trackLoaded = true;
          }
        } catch { /* film still plays on its own wall-clock, unsynced */ }
      })();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [liveBeats, timings, total, endHoldMs, end, audioSrc, audioStartOffsetMs, mutedBeatIds, onEnd]);

  const onSeek = (ms: number) => (rootRef.current as any)?.__kfSeek?.(ms);
  const onTogglePlay = () => (rootRef.current as any)?.__kfSetPlaying?.(!playing);
  const onRestart = () => (rootRef.current as any)?.__kfSeek?.(0);

  const toggleCanvasEdit = () => {
    const next = !canvasEdit;
    setCanvasEdit(next);
    if (next) (rootRef.current as any)?.__kfSetPlaying?.(false); // hold still to position things
  };

  const updateBeat = (idx: number, patch: Partial<KBeat>) => {
    setLiveBeats((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (!canvasEdit) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const b = liveBeats[activeIdx];
    dragState.current = { idx: activeIdx, startX: e.clientX, startY: e.clientY, baseX: b?.offsetX ?? 0, baseY: b?.offsetY ?? 0 };
  };
  const onDragPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { idx, startX, startY, baseX, baseY } = dragState.current;
    updateBeat(idx, { offsetX: baseX + (e.clientX - startX), offsetY: baseY + (e.clientY - startY) });
  };
  const onDragPointerUp = () => { dragState.current = null; };

  const onResizePointerDown = (e: React.PointerEvent) => {
    if (!canvasEdit) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const b = liveBeats[activeIdx];
    resizeState.current = { idx: activeIdx, startX: e.clientX, startY: e.clientY, baseScale: b?.scale ?? 1 };
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!resizeState.current) return;
    const { idx, startX, startY, baseScale } = resizeState.current;
    const delta = ((e.clientX - startX) + (e.clientY - startY)) / 2;
    updateBeat(idx, { scale: clamp(baseScale + delta / 120, 0.3, 3) });
  };
  const onResizePointerUp = () => { resizeState.current = null; };

  return (
    <div ref={rootRef} className={"nt-frame" + (pageClass ? ` ${pageClass}` : "")}>
      <div className="nt-stage">
        {showCompositionGrid && (
          <div className="kf-composition-grid" aria-hidden="true">
            <i className="kf-grid-safe" />
            <i className="kf-grid-v kf-grid-v1" /><i className="kf-grid-v kf-grid-v2" /><i className="kf-grid-v kf-grid-v3" />
            <i className="kf-grid-h kf-grid-h1" /><i className="kf-grid-h kf-grid-h2" /><i className="kf-grid-h kf-grid-h3" />
            <span>50 / 50</span>
          </div>
        )}
        {liveBeats.map((b, bi) => (
          <div
            key={b.id}
            data-beat-id={b.id}
            ref={(el) => { beatRefs.current[bi] = el; }}
            className={"kf-line" + (b.big ? " kf-line-big" : "") + (b.graphic ? " kf-line-graphic" : "")}
            style={{ opacity: 0 }}
          >
            {b.graphic && <img className="kf-graphic-img" src={b.graphic} alt="" />}
            {(() => {
              const groups: { token: string; index: number }[][] = [];
              b.words.forEach((token, index) => {
                const fused = token.startsWith("+");
                if (fused && groups.length) groups[groups.length - 1].push({ token, index });
                else groups.push([{ token, index }]);
              });
              return groups.map((group, gi) => (
                <span className="kf-word" key={gi}>
                  {group.map(({ token: w, index: wi }) => {
                    const { text, fuse, emph, big } = cleanToken(w);
                    const inlineBraino = text === "@braino";
                    const timingHold = text === "@hold";
                    return (
                      <span
                        key={wi}
                        ref={(el) => { (wordRefs.current[bi] ??= [])[wi] = el; }}
                        className={"nt-word" + (fuse ? " nt-fuse" : "") + (emph ? " nt-emph" : "") + (b.iomiReveal ? " kf-iomi-letter" : "")}
                        style={big ? { fontSize: "1.6em" } : undefined}
                      >
                        {inlineBraino
                          ? <span
                              className="kf-inline-braino"
                              role="img"
                              aria-label="Braino"
                              dangerouslySetInnerHTML={{ __html: inlineWalkerSvg(`kf-${bi}-${wi}`) }}
                            />
                          : timingHold
                            ? <span className="kf-timing-hold" aria-hidden="true" />
                            : text}
                      </span>
                    );
                  })}
                </span>
              ));
            })()}
          </div>
        ))}
        {heroSlots && Object.entries(heroSlots).map(([key, node]) => (
          <div key={key} ref={(el) => { heroRefs.current[key] = el; }} className="kf-hero" style={{ opacity: 0 }}>
            {node}
          </div>
        ))}
        <div ref={invertRef} className="nt-invert2" style={{ opacity: 0 }} />
        {outro && <div ref={outroRef} className="kf-outro" style={{ opacity: 0 }}>{outro}</div>}
      </div>
      {audioSrc && <audio ref={audioElRef} className="nt-audio" preload="auto" />}
      {editable && (
        <ScriptEditor beats={liveBeats} onApply={handleScriptApply} scriptLines={scriptLines} currentMs={currentMs} />
      )}
      <TeaserTransport durationMs={end} currentMs={currentMs} playing={playing} onSeek={onSeek} onTogglePlay={onTogglePlay} onRestart={onRestart} />
    </div>
  );
}
