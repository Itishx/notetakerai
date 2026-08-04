import { formatMs } from "@/lib/teaserScript";

/* ============================================================================
   TeaserTransport — the PUBLIC play/pause/scrub/timer bar for a teaser film.
   Dumb + controlled: it owns no clock of its own. The page's own rAF loop
   remains the single source of truth for time; this just reflects it and
   forwards intent (seek/play/restart) back into the page's existing local
   seek()/setPlaying() functions. Reuses the .nt-scrubber/.nt-scrub/.nt-play/
   .nt-time classes from notch-teaser.css, with a --public modifier so it's
   always visible (the original .nt-scrubber is a hover-revealed DEV toolbar,
   gated by body.nt-controls — this is a separate, viewer-facing bar).
   ============================================================================ */

export default function TeaserTransport({
  durationMs,
  currentMs,
  playing,
  onSeek,
  onTogglePlay,
  onRestart,
  compact = false,
}: {
  durationMs: number;
  currentMs: number;
  playing: boolean;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onRestart?: () => void;
  compact?: boolean;
}) {
  const pct = durationMs > 0 ? Math.min(100, Math.max(0, (currentMs / durationMs) * 100)) : 0;

  return (
    <div
      className={"nt-scrubber nt-scrubber--public" + (compact ? " nt-scrubber--compact" : "")}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="nt-play"
        aria-label={playing ? "Pause" : "Play"}
        onClick={onTogglePlay}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      {onRestart && (
        <button type="button" aria-label="Restart" onClick={onRestart}>↺</button>
      )}
      <input
        type="range"
        className="nt-scrub"
        style={{ ["--p" as string]: `${pct}%` }}
        min={0}
        max={Math.max(1, durationMs)}
        step={16}
        value={Math.min(currentMs, durationMs)}
        aria-label="Seek"
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="nt-time">{formatMs(currentMs)} / {formatMs(durationMs)}</span>
    </div>
  );
}
