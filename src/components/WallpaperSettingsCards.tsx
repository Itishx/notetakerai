import { useEffect, useState } from "react";
import { LOOKS } from "@/lib/wallpaperLooks";
import {
  CYCLE_CHOICES,
  loadSettings,
  saveSettings,
  type LookMode,
  type WallpaperSettings,
} from "@/lib/wallpaperSettings";
import WallpaperShortcutsCard from "@/components/WallpaperShortcutsCard";

/* Wallpaper and Screensaver.
 *
 * Two jobs, kept apart because they are genuinely different: the wallpaper sits
 * behind your work all day, the screensaver is what the Mac shows when you are
 * not there. They draw from the same set of looks, which is the whole trick.
 * Apple does it this way for a reason: the screensaver settles into the
 * wallpaper rather than being a separate world.
 */

const serifStyle = { fontFamily: "'Instrument Serif', Georgia, serif" } as const;
const monoStyle = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const MODES: { id: LookMode; label: string; hint: string }[] = [
  { id: "shuffle", label: "Shuffle all", hint: "Every look, in turn." },
  { id: "one", label: "Just one", hint: "The one you picked, held." },
  { id: "dynamic", label: "Follow the hour", hint: "Whichever suits the time of day." },
];

/* A swatch is the picture itself at a tenth of the size. The name under it is
   there to be said out loud later: "Braino, set my wallpaper to Obsidian". */
function Swatches({ selected, onPick }: { selected: string; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-2.5">
      {LOOKS.map((look) => (
        <button
          key={look.id}
          type="button"
          onClick={() => onPick(look.id)}
          className="text-left"
          aria-pressed={look.id === selected}
        >
          <span
            className={`relative block aspect-[16/10] w-full overflow-hidden rounded-[10px] border transition-transform duration-300 hover:-translate-y-[2px] ${
              look.id === selected
                ? "border-transparent outline outline-2 outline-offset-2 outline-[var(--sb-accent-deep)]"
                : "border-[var(--sb-line-2)]"
            }`}
            style={{ background: look.background }}
          >
            <span
              className="absolute inset-x-0 bottom-1.5 text-center text-[6px] uppercase tracking-[0.36em]"
              style={{ color: look.inkSoft, opacity: 0.55 }}
            >
              Braino OS
            </span>
          </span>
          <span className="mt-1.5 block text-[12px] text-[var(--sb-ink-2)]">
            {look.name} <span className="text-[11px] text-[var(--sb-ink-3)]">{look.family}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
      {children}
    </div>
  );
}

export default function WallpaperSettingsCards() {
  const [settings, setSettings] = useState<WallpaperSettings>(() => loadSettings());
  useEffect(() => { saveSettings(settings); }, [settings]);

  const patch = (next: Partial<WallpaperSettings>) => setSettings((current) => ({ ...current, ...next }));

  return (
    <>
      <Card>
        <h3 style={serifStyle} className="mb-1 text-[24px] leading-none tracking-[-0.02em]">
          Your <em className="text-[var(--sb-accent-deep)]">wallpaper.</em>
        </h3>
        <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
          The desktop behind your work. These are drawn by Braino OS rather than photographed, so
          they redraw at your display&apos;s exact size and never look soft. On the Mac, say{" "}
          <span style={monoStyle} className="text-[var(--sb-ink)]">Braino, change my wallpaper</span>{" "}
          and he uses one of these. Name one and he uses that one.
        </p>
        <Swatches selected={settings.wallpaperLook} onPick={(id) => patch({ wallpaperLook: id })} />
        <label className="mt-4 flex items-center gap-2 text-[12.5px] text-[var(--sb-ink-2)]">
          <input
            type="checkbox"
            checked={settings.wallpaperMode === "dynamic"}
            onChange={(event) => patch({ wallpaperMode: event.target.checked ? "dynamic" : "one" })}
          />
          Follow the hour, the way Apple&apos;s dynamic ones do
        </label>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 style={serifStyle} className="mb-1 text-[24px] leading-none tracking-[-0.02em]">
              Your <em className="text-[var(--sb-accent-deep)]">screensaver.</em>
            </h3>
            <p className="max-w-[62ch] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
              The same looks, moving: the date, the time, your battery, and the row you keep below.
              On the Mac it comes up on <span style={monoStyle}>Shift twice</span>, or on its own
              once the machine has been quiet.
            </p>
          </div>
          <a
            href="/wallpaper"
            style={monoStyle}
            className="flex-shrink-0 rounded-full border border-[var(--sb-line-2)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]"
          >
            Preview
          </a>
        </div>

        <div className="mt-5 inline-flex gap-0.5 rounded-full border border-[var(--sb-line)] p-[3px]">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              title={mode.hint}
              onClick={() => patch({ mode: mode.id })}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                settings.mode === mode.id
                  ? "bg-[var(--sb-panel)] text-[var(--sb-ink)]"
                  : "text-[var(--sb-ink-3)] hover:text-[var(--sb-ink-2)]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Picking one look only means anything when you are showing one look. */}
        {settings.mode === "one" ? (
          <div className="mt-4">
            <Swatches selected={settings.look} onPick={(id) => patch({ look: id })} />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-[var(--sb-ink-2)]">
          <label className="flex items-center gap-2">
            Change every
            <select
              value={settings.cycleSeconds}
              onChange={(event) => patch({ cycleSeconds: Number(event.target.value) })}
              className="rounded-[8px] border border-[var(--sb-line)] bg-[var(--sb-bg-2)] px-2 py-1 text-[12.5px] text-[var(--sb-ink)]"
            >
              {CYCLE_CHOICES.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.quotes}
              onChange={(event) => patch({ quotes: event.target.checked })}
            />
            Show a line under the clock
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.idleEnabled}
              onChange={(event) => patch({ idleEnabled: event.target.checked })}
            />
            Come up on its own after
            <input
              type="number"
              min={1}
              max={120}
              value={settings.idleMinutes}
              onChange={(event) => patch({ idleMinutes: Number(event.target.value) })}
              className="w-[54px] rounded-[8px] border border-[var(--sb-line)] bg-[var(--sb-bg-2)] px-2 py-1 text-[12.5px] text-[var(--sb-ink)]"
            />
            minutes
          </label>
        </div>
      </Card>

      <WallpaperShortcutsCard />
    </>
  );
}
