import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTION_ICONS,
  faviconFor,
  loadShortcuts,
  normalizeUrl,
  type Shortcut,
} from "@/lib/wallpaperShortcuts";

/* Wallpaper — the screen Braino puts up when you are not there.
 *
 * This page is the design bench for it. The real thing lives on the Mac, over
 * everything, when the machine has been idle a while or when you ask for it. So
 * everything here is built to be looked at from across a room: a date you read
 * without meaning to, a time you can see from the doorway, and the four things
 * you actually ask him for, close enough to the bottom edge to reach.
 *
 * The reference is the iPhone lock screen, which is the best version of this
 * anyone has made: almost nothing on it, and everything you need. What it gets
 * right is restraint, so the temptation here is to add a widget, and the answer
 * is no.
 */

type Look = {
  id: string;
  name: string;
  /* Painted behind everything. Layered radial gradients rather than an image,
     so it scales to any display and weighs nothing. */
  background: string;
  ink: string;
  inkSoft: string;
  /* The frosted pills at the bottom. Light content wants a dark glass and the
     other way round, or they disappear into the background. */
  glass: string;
  glassBorder: string;
  grain: number;
  vignette: string;
};

const LOOKS: Look[] = [
  {
    id: "aurora",
    name: "Aurora",
    background:
      "radial-gradient(120% 90% at 18% 12%, #cfe0f5 0%, transparent 58%)," +
      "radial-gradient(100% 80% at 82% 24%, #f3dbe6 0%, transparent 55%)," +
      "radial-gradient(120% 100% at 62% 96%, #d9e8dd 0%, transparent 60%)," +
      "linear-gradient(168deg, #f6f4f0 0%, #eae6e1 100%)",
    ink: "rgba(28,26,24,0.92)",
    inkSoft: "rgba(28,26,24,0.52)",
    glass: "rgba(255,255,255,0.42)",
    glassBorder: "rgba(255,255,255,0.7)",
    grain: 0.05,
    vignette: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(40,36,32,0.12) 100%)",
  },
  {
    id: "dusk",
    name: "Dusk",
    background:
      "radial-gradient(90% 70% at 50% 96%, #6b5d7a 0%, transparent 62%)," +
      "radial-gradient(70% 50% at 74% 16%, #3b4b6b 0%, transparent 60%)," +
      "linear-gradient(178deg, #10131f 0%, #1c1b2a 52%, #2b2436 100%)",
    ink: "rgba(255,252,248,0.95)",
    inkSoft: "rgba(255,252,248,0.58)",
    glass: "rgba(255,255,255,0.12)",
    glassBorder: "rgba(255,255,255,0.22)",
    grain: 0.08,
    vignette: "radial-gradient(110% 85% at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)",
  },
  {
    id: "paper",
    name: "Paper",
    background:
      "radial-gradient(140% 100% at 50% 0%, #fffdf9 0%, transparent 70%)," +
      "linear-gradient(180deg, #f7f4ee 0%, #efeae1 100%)",
    ink: "rgba(24,22,20,0.9)",
    inkSoft: "rgba(24,22,20,0.42)",
    glass: "rgba(255,255,255,0.55)",
    glassBorder: "rgba(30,26,22,0.08)",
    grain: 0.06,
    vignette: "radial-gradient(120% 95% at 50% 50%, transparent 62%, rgba(60,52,44,0.1) 100%)",
  },
  {
    id: "coral",
    name: "Coral",
    background:
      "radial-gradient(110% 80% at 26% 8%, #ffd0c4 0%, transparent 58%)," +
      "radial-gradient(90% 70% at 84% 84%, #c9544a 0%, transparent 62%)," +
      "linear-gradient(170deg, #f6a8a2 0%, #e8786e 52%, #b64a42 100%)",
    ink: "rgba(255,250,246,0.96)",
    inkSoft: "rgba(255,250,246,0.62)",
    glass: "rgba(255,255,255,0.2)",
    glassBorder: "rgba(255,255,255,0.34)",
    grain: 0.07,
    vignette: "radial-gradient(115% 90% at 50% 46%, transparent 52%, rgba(90,28,22,0.34) 100%)",
  },
  {
    id: "mind",
    name: "Mind",
    background:
      "radial-gradient(80% 60% at 50% 48%, #10314a 0%, transparent 66%)," +
      "linear-gradient(180deg, #02050a 0%, #050d16 100%)",
    ink: "rgba(226,247,255,0.95)",
    inkSoft: "rgba(180,214,236,0.55)",
    glass: "rgba(120,200,255,0.1)",
    glassBorder: "rgba(150,220,255,0.24)",
    grain: 0.09,
    vignette: "radial-gradient(110% 85% at 50% 48%, transparent 46%, rgba(0,0,0,0.6) 100%)",
  },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Ticked on the second so the minute never lands late, which is the kind of
    // thing you do not notice until it is wrong.
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export default function Wallpaper() {
  const [index, setIndex] = useState(0);
  /* Yours, not mine. Four ship; the rest you add under Settings in either
     dashboard, and this picks them up without a reload because the idle screen
     is usually open on another display while you edit. */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadShortcuts());
  useEffect(() => {
    const refresh = () => setShortcuts(loadShortcuts());
    window.addEventListener("braino:shortcuts-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("braino:shortcuts-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  /* Five looks were drawn and only one of them can be up, so they take turns.
     Keyed on the index rather than mounted once, so choosing one by hand
     restarts the ten seconds instead of being overwritten by a turn that was
     already halfway through. */
  useEffect(() => {
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % LOOKS.length), 10000);
    return () => window.clearTimeout(timer);
  }, [index]);

  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);
  const now = useClock();
  const look = LOOKS[index];

  const time = useMemo(
    () => now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M$/i, ""),
    [now],
  );
  const meridiem = useMemo(
    () => (now.getHours() >= 12 ? "PM" : "AM"),
    [now],
  );
  const date = useMemo(
    () => now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }),
    [now],
  );

  /* The switcher is for choosing a look, not for looking at. It fades out while
     you sit still, the way the real thing will have nothing on it at all. */
  const wake = useCallback(() => {
    setChromeVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2600);
  }, []);

  useEffect(() => {
    wake();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((i) => (i + 1) % LOOKS.length);
      if (event.key === "ArrowLeft") setIndex((i) => (i - 1 + LOOKS.length) % LOOKS.length);
      wake();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", wake);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", wake);
      window.clearTimeout(hideTimer.current);
    };
  }, [wake]);

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none" style={{ background: "#0b0b0d" }}>
      {/* Every look is mounted and cross-fades, so switching never flashes the
          page background through the gap. */}
      {LOOKS.map((entry, i) => (
        <div
          key={entry.id}
          aria-hidden={i !== index}
          className="absolute inset-0 transition-opacity duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ background: entry.background, opacity: i === index ? 1 : 0 }}
        />
      ))}

      {/* Grain. Without it a pure gradient reads as a screenshot of a gradient;
          with it, it reads as a surface. */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          opacity: look.grain,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: look.vignette }} />

      {/* The face of it. */}
      {/* Centred, because a Mac is not a phone.
          The phone puts the clock in the upper third and the actions at the
          bottom edge, which works on something tall and held in one hand. On a
          wide display that leaves the clock stranded high and a dead half-screen
          under it. Here the whole thing sits in the middle of the glass. */}
      <div className="relative flex h-full w-full flex-col items-center justify-center px-8">
        <p
          className="text-[15px] font-medium tracking-[0.02em] transition-colors duration-700"
          style={{ color: look.inkSoft }}
        >
          {date}
        </p>

        {/* The numerals are what should be centred, so the meridiem hangs off
            them rather than sharing the row. In the row it dragged the whole
            clock visibly left of centre. */}
        <div className="relative mt-1 transition-colors duration-700" style={{ color: look.ink }}>
          <span
            className="block"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "clamp(96px, 20vw, 288px)",
              lineHeight: 0.86,
              letterSpacing: "-0.022em",
            }}
          >
            {time}
          </span>
          <span
            className="absolute left-full top-[0.42em] ml-3 text-[14px] font-medium tracking-[0.18em]"
            style={{ color: look.inkSoft }}
          >
            {meridiem}
          </span>
        </div>

        <div className="mt-16 flex items-center gap-5">
          {shortcuts.map((shortcut) => {
            const icon = shortcut.action ? ACTION_ICONS[shortcut.action] : "";
            const favicon = shortcut.kind === "link" && !shortcut.emoji ? faviconFor(shortcut.url || "") : "";
            return (
              <button
                key={shortcut.id}
                type="button"
                title={shortcut.label}
                aria-label={shortcut.label}
                onClick={() => {
                  if (shortcut.kind === "link" && shortcut.url) {
                    window.open(normalizeUrl(shortcut.url), "_blank", "noopener");
                  }
                }}
                className="grid h-[66px] w-[66px] place-items-center overflow-hidden rounded-full backdrop-blur-xl transition-transform duration-300 hover:scale-[1.07] active:scale-95"
                style={{
                  background: look.glass,
                  border: `1px solid ${look.glassBorder}`,
                  color: look.ink,
                }}
              >
                {icon ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                  </svg>
                ) : shortcut.emoji ? (
                  <span className="text-[26px] leading-none">{shortcut.emoji}</span>
                ) : favicon ? (
                  /* A site's own icon says what it is faster than a label can. */
                  <img src={favicon} alt="" width={26} height={26} className="rounded-[6px]" loading="lazy" />
                ) : (
                  <span className="text-[22px] font-medium leading-none">
                    {shortcut.label.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Choosing a look. Fades away when you stop touching it. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center transition-opacity duration-700"
        style={{ opacity: chromeVisible ? 1 : 0 }}
      >
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-full p-1 backdrop-blur-xl"
          style={{ background: look.glass, border: `1px solid ${look.glassBorder}` }}
        >
          {LOOKS.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setIndex(i)}
              className="rounded-full px-4 py-[7px] text-[11px] font-medium tracking-[0.14em] uppercase transition-colors duration-300"
              style={{
                color: i === index ? look.ink : look.inkSoft,
                background: i === index ? look.glassBorder : "transparent",
              }}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
