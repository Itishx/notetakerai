import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOOKS, lookIndexById, type Look } from "@/lib/wallpaperLooks";
import { loadSettings, rotationFor, SETTINGS_EVENT, type WallpaperSettings } from "@/lib/wallpaperSettings";
import {
  ACTION_ICONS,
  faviconFor,
  loadShortcuts,
  normalizeUrl,
  type Shortcut,
} from "@/lib/wallpaperShortcuts";

/* The idle screen, on the web.
 *
 * This page is the bench: the Mac draws exactly this, from exactly the same
 * look file, so a change here is a change there. Almost nothing on it, and
 * everything you need. The reference is the iPhone lock screen, which is the
 * best version of this anyone has made.
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

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

type Battery = { percent: number; charging: boolean } | null;

/* The browser's battery, where the browser still has one. On the Mac this comes
   from the machine itself, so the page is only ever the rehearsal. */
function useBattery(): Battery {
  const [battery, setBattery] = useState<Battery>(null);
  useEffect(() => {
    const api = (navigator as unknown as { getBattery?: () => Promise<never> }).getBattery;
    if (typeof api !== "function") return;
    let source: { level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void } | null = null;
    const read = () => {
      if (!source) return;
      setBattery({ percent: Math.round(source.level * 100), charging: source.charging });
    };
    let cancelled = false;
    api.call(navigator).then((result: never) => {
      if (cancelled) return;
      source = result as never;
      read();
      source?.addEventListener("levelchange", read);
      source?.addEventListener("chargingchange", read);
    }).catch(() => {});
    return () => {
      cancelled = true;
      source?.removeEventListener("levelchange", read);
      source?.removeEventListener("chargingchange", read);
    };
  }, []);
  return battery;
}

/* Small, quiet, and only ever three things: it is filling, it is emptying, or
   it wants you. Anything more belongs in the menu bar. */
function BatteryPill({ battery, look }: { battery: Battery; look: Look }) {
  if (!battery) return null;
  const low = !battery.charging && battery.percent <= 20;
  const tint = battery.charging ? "#5ad07f" : low ? "#f0a03c" : look.inkSoft;
  return (
    <div
      className="absolute right-9 top-8 flex items-center gap-2 text-[13px] font-medium tabular-nums transition-colors duration-700"
      style={{ color: low || battery.charging ? tint : look.inkSoft }}
    >
      <span>{battery.percent}%</span>
      <span className="relative inline-flex items-center">
        <span
          className="relative block h-[13px] w-[26px] rounded-[4px] border"
          style={{ borderColor: look.inkSoft }}
        >
          <span
            className="absolute left-[1.5px] top-[1.5px] block rounded-[2px] transition-[width] duration-700"
            style={{ width: `${Math.max(4, (battery.percent / 100) * 21)}px`, height: "8px", background: tint }}
          />
        </span>
        <span
          className="ml-[2px] block h-[5px] w-[2px] rounded-[1px]"
          style={{ background: look.inkSoft }}
        />
        {battery.charging ? (
          <svg className="absolute left-[7px] top-[-1px]" width="12" height="15" viewBox="0 0 24 24" fill={tint} aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        ) : null}
      </span>
    </div>
  );
}

export default function Wallpaper() {
  const [settings, setSettings] = useState<WallpaperSettings>(() => loadSettings());
  useEffect(() => {
    const refresh = () => setSettings(loadSettings());
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const rotation = useMemo(() => rotationFor(settings), [settings]);
  const [index, setIndex] = useState(() => lookIndexById(settings.look));
  useEffect(() => {
    /* A look that just left the rotation cannot stay on screen. */
    if (!rotation.some((entry) => entry.id === LOOKS[index]?.id)) {
      setIndex(lookIndexById(rotation[0].id));
    }
  }, [rotation, index]);

  /* They take turns. Keyed on the index rather than mounted once, so choosing
     one by hand restarts the clock instead of being overwritten by a turn that
     was already halfway through. */
  useEffect(() => {
    if (rotation.length < 2) return;
    const timer = window.setTimeout(() => {
      const at = rotation.findIndex((entry) => entry.id === LOOKS[index]?.id);
      const next = rotation[(Math.max(0, at) + 1) % rotation.length];
      setIndex(lookIndexById(next.id));
    }, settings.cycleSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [index, rotation, settings.cycleSeconds]);

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

  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);
  const now = useClock();
  const battery = useBattery();
  const look = LOOKS[index] || LOOKS[0];

  const time = useMemo(
    () => now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M$/i, ""),
    [now],
  );
  const meridiem = useMemo(() => (now.getHours() >= 12 ? "PM" : "AM"), [now]);
  const date = useMemo(
    () => now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }),
    [now],
  );

  /* The switcher is for choosing a look, not for looking at. It fades out while
     you sit still, the way the real thing has nothing on it at all. */
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
        style={{ opacity: look.grain, backgroundImage: GRAIN }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: look.vignette }} />

      <BatteryPill battery={battery} look={look} />

      {/* The face of it. */}
      {/* Centred, because a Mac is not a phone.
          The phone puts the clock in the upper third and the actions at the
          bottom edge, which works on something tall and held in one hand. On a
          wide display that leaves the clock stranded high and a dead half-screen
          under it. Here the whole thing sits in the middle of the glass. */}
      <div className="relative flex h-full w-full flex-col items-center justify-center px-8">
        {look.signature ? (
          /* One look does not wear the wordmark. It is the wordmark. */
          <p
            className="transition-colors duration-700"
            style={{
              color: look.ink,
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: "clamp(64px, 13vw, 190px)",
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
            }}
          >
            Braino OS
          </p>
        ) : null}

        <p
          className="text-[15px] font-medium tracking-[0.02em] transition-colors duration-700"
          style={{ color: look.inkSoft, marginTop: look.signature ? 26 : 0 }}
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
              fontFamily: look.clockFont,
              fontStyle: look.clockItalic ? "italic" : "normal",
              fontWeight: look.clockWeight,
              fontSize: look.signature ? "clamp(48px, 7vw, 104px)" : "clamp(96px, 20vw, 288px)",
              lineHeight: 0.86,
              letterSpacing: look.clockTracking,
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

        {settings.quotes && look.quote ? (
          <p
            className="mt-7 max-w-[34ch] text-center text-[17px] italic transition-colors duration-700"
            style={{ color: look.inkSoft, fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            {look.quote}
          </p>
        ) : null}

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

      {/* Signed, quietly. Apple never puts a word on a wallpaper, and they are
          right, so this is as small as a signature on a print. */}
      {look.signature ? null : (
        <p
          className="pointer-events-none absolute inset-x-0 bottom-[26px] text-center text-[10px] uppercase tracking-[0.42em] transition-colors duration-700"
          style={{ color: look.inkSoft, opacity: 0.5 }}
        >
          Braino OS
        </p>
      )}

      {/* Choosing a look. Fades away when you stop touching it. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-6 transition-opacity duration-700"
        style={{ opacity: chromeVisible ? 1 : 0 }}
      >
        <div
          className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 backdrop-blur-xl"
          style={{ background: look.glass, border: `1px solid ${look.glassBorder}` }}
        >
          {LOOKS.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setIndex(i)}
              className="flex-shrink-0 rounded-full px-3.5 py-[7px] text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300"
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
