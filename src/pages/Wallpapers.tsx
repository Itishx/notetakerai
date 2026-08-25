import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LOOKS, type Look } from "@/lib/wallpaperLooks";
import "./wallpapers.css";

/* The Braino OS set, scrolled through.
 *
 * Two things live here because Apple keeps them together and they are right to:
 * the screensaver and the wallpaper are the same picture, one of them moving
 * and one of them still, so logging in feels like the screen settling rather
 * than switching. The tab at the top says which one you are looking at.
 */

const serif = { fontFamily: "'Instrument Serif', Georgia, serif" } as const;
const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

type Surface = "screensaver" | "wallpaper";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/* What a look actually looks like on a Mac, at a quarter of the size. */
function Screen({ look, surface, now }: { look: Look; surface: Surface; now: Date }) {
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M$/i, "");
  const date = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="wps-glass" style={{ background: look.background }}>
      <div className="wps-glass-grain" style={{ opacity: look.grain }} />
      <div className="absolute inset-0" style={{ background: look.vignette }} />

      {surface === "screensaver" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {look.signature ? (
            <p
              style={{ ...serif, color: look.ink, fontStyle: "italic", fontSize: "clamp(28px, 6.4vw, 62px)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
            >
              Braino OS
            </p>
          ) : null}
          <p className="text-[10px] font-medium tracking-[0.02em] md:text-[12px]" style={{ color: look.inkSoft, marginTop: look.signature ? 12 : 0 }}>
            {date}
          </p>
          <div className="relative" style={{ color: look.ink }}>
            <span
              className="block"
              style={{
                fontFamily: look.clockFont,
                fontStyle: look.clockItalic ? "italic" : "normal",
                fontWeight: look.clockWeight,
                fontSize: look.signature ? "clamp(20px, 3.4vw, 34px)" : "clamp(44px, 9vw, 96px)",
                lineHeight: 0.9,
                letterSpacing: look.clockTracking,
              }}
            >
              {time}
            </span>
          </div>
          {look.quote ? (
            <p className="mt-3 max-w-[26ch] px-6 text-center text-[11px] italic md:text-[13px]" style={{ ...serif, color: look.inkSoft }}>
              {look.quote}
            </p>
          ) : null}
          <div className="wps-dots mt-5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="wps-dot" style={{ background: look.glass, border: `1px solid ${look.glassBorder}` }} />
            ))}
          </div>
          {/* Battery, the way the real one wears it. */}
          <div className="absolute right-4 top-3 flex items-center gap-1.5 text-[9px] font-medium" style={{ color: look.inkSoft }}>
            <span>84%</span>
            <span className="relative block h-[9px] w-[18px] rounded-[3px] border" style={{ borderColor: look.inkSoft }}>
              <span className="absolute left-[1px] top-[1px] block h-[5px] w-[13px] rounded-[1.5px]" style={{ background: look.inkSoft }} />
            </span>
          </div>
        </div>
      ) : (
        <>
          {look.signature ? (
            <div className="absolute inset-0 grid place-items-center">
              <p style={{ ...serif, color: look.ink, fontStyle: "italic", fontSize: "clamp(30px, 7vw, 72px)", letterSpacing: "-0.03em" }}>
                Braino OS
              </p>
            </div>
          ) : (
            <p
              className="absolute inset-x-0 bottom-3 text-center text-[7px] uppercase tracking-[0.42em] md:text-[8px]"
              style={{ color: look.inkSoft, opacity: 0.55 }}
            >
              Braino OS
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function Wallpapers() {
  const [active, setActive] = useState(0);
  const [surface, setSurface] = useState<Surface>("screensaver");
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const now = useClock();

  /* Which look owns the screen right now. The gradient behind everything
     cross-fades to it, so scrolling reads as one surface changing rather than
     eleven pictures going past. */
  useEffect(() => {
    const nodes = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (Number.isFinite(index)) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  /* Parallax: one number per section, written as a CSS variable and spent in
     the stylesheet. Read on a frame, never on the event. */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const height = window.innerHeight;
      for (const node of sectionRefs.current) {
        if (!node) continue;
        const box = node.getBoundingClientRect();
        if (box.bottom < -200 || box.top > height + 200) continue;
        const middle = box.top + box.height / 2;
        node.style.setProperty("--p", String(((middle - height / 2) / height) * -2));
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const current = LOOKS[active] || LOOKS[0];
  const families = useMemo(() => {
    const seen = new Map<string, number>();
    LOOKS.forEach((look) => seen.set(look.family, (seen.get(look.family) || 0) + 1));
    return Array.from(seen.entries());
  }, []);

  return (
    <main className="wps-root">
      {/* One sky behind everything. */}
      <div className="wps-sky" aria-hidden="true">
        {LOOKS.map((look, i) => (
          <div key={look.id} className={`wps-layer${i === active ? " is-on" : ""}`} style={{ background: look.background }} />
        ))}
        <div className="wps-grain" />
        <div className="wps-scrim" />
      </div>

      <div className="wps-content">
        <header className="flex items-center justify-between px-6 py-6 md:px-12">
          <Link to="/" className="flex items-center gap-2 text-[13px] tracking-[0.02em] opacity-90">
            <img src="/favicon.svg" alt="" width="26" height="26" />
            <span style={serif} className="text-[19px]">Braino</span>
          </Link>
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur-xl">
            {(["screensaver", "wallpaper"] as Surface[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSurface(tab)}
                style={mono}
                className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  surface === tab ? "bg-white/90 text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <section className="flex min-h-[86vh] flex-col justify-center px-6 pb-24 md:px-12">
          <p style={mono} className="text-[11px] uppercase tracking-[0.32em] text-white/55">
            Braino OS · {LOOKS.length} looks
          </p>
          <h1 style={serif} className="mt-5 max-w-[16ch] text-[52px] leading-[0.94] tracking-[-0.03em] md:text-[104px]">
            Make your Mac come to life <em className="opacity-90">with Braino OS.</em>
          </h1>
          <p className="mt-7 max-w-[58ch] text-[16px] leading-relaxed text-white/70 md:text-[18px]">
            A set drawn rather than photographed, so every one of them redraws at your display&apos;s
            exact size and none of them weigh anything. The same picture does both jobs: still behind
            your work, and moving when you walk away. Ask for one out loud and he puts it up.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3" style={mono}>
            {families.map(([family, count]) => (
              <span key={family} className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                {family} · {String(count).padStart(2, "0")}
              </span>
            ))}
          </div>
          <p className="mt-14 text-[11px] uppercase tracking-[0.3em] text-white/35" style={mono}>
            Scroll
          </p>
        </section>

        {LOOKS.map((look, i) => (
          <section
            key={look.id}
            ref={(node) => { sectionRefs.current[i] = node; }}
            data-index={i}
            className="wps-section grid min-h-screen items-center gap-10 px-6 py-24 md:grid-cols-2 md:gap-16 md:px-12"
          >
            <div className="wps-copy">
              <p style={mono} className="text-[11px] uppercase tracking-[0.3em] text-white/45">
                {String(i + 1).padStart(2, "0")} · {look.family} · {look.timeOfDay}
              </p>
              <h2 style={serif} className="mt-4 text-[54px] leading-[0.95] tracking-[-0.03em] md:text-[86px]">
                {look.name}
              </h2>
              {look.quote ? (
                <p style={serif} className="mt-5 max-w-[30ch] text-[22px] italic leading-snug text-white/75 md:text-[26px]">
                  “{look.quote}”
                </p>
              ) : (
                <p style={serif} className="mt-5 max-w-[30ch] text-[22px] italic leading-snug text-white/75 md:text-[26px]">
                  The name, set in the face he is written in, and nothing else.
                </p>
              )}
              <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-white/60">
                {surface === "screensaver"
                  ? "As a screensaver: the date, the time in its own face, your battery in the corner, and the row of things you keep under the clock."
                  : "As a wallpaper: the picture on its own, signed as small as a signature on a print."}
              </p>
              <p style={mono} className="mt-7 text-[11px] uppercase tracking-[0.2em] text-white/40">
                Say: Braino, set my wallpaper to {look.name}
              </p>
            </div>

            <div className="wps-screen">
              <Screen look={look} surface={surface} now={now} />
            </div>
          </section>
        ))}

        <section className="flex min-h-[80vh] flex-col justify-center px-6 py-24 md:px-12">
          <h2 style={serif} className="max-w-[18ch] text-[46px] leading-[0.96] tracking-[-0.03em] md:text-[82px]">
            The screensaver settles <em className="opacity-90">into the wallpaper.</em>
          </h2>
          <p className="mt-7 max-w-[56ch] text-[16px] leading-relaxed text-white/70">
            Walk away and the Mac puts one up on its own. Come back and it is gone before your hand
            is off the trackpad. Ask him to change it and the same picture stops moving and stays
            behind your work. On the Mac it is Shift twice, or five quiet minutes.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4" style={mono}>
            <Link
              to="/os"
              className="rounded-full bg-white px-6 py-3 text-[12px] uppercase tracking-[0.18em] text-black transition-transform hover:scale-[1.02]"
            >
              Enter Braino OS
            </Link>
            <Link
              to="/wallpaper"
              className="rounded-full border border-white/25 px-6 py-3 text-[12px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white/60 hover:text-white"
            >
              Open the live one
            </Link>
            <Link
              to="/knowledge/mac-idle-screen"
              className="text-[12px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white"
            >
              How it works
            </Link>
          </div>
          <p className="mt-16 text-[11px] uppercase tracking-[0.32em] text-white/30" style={mono}>
            {current.name} · Braino OS
          </p>
        </section>
      </div>
    </main>
  );
}
