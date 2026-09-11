/* /onb — the Mac app's first boot, running in a browser.
 *
 * This is a PREVIEW, not a second implementation. It imports the Mac renderer's
 * own boot-intro.css, onboarding.css, boot-intro.js and onboarding.js straight
 * out of mac/braino-mac/renderer, so what you judge here is literally the code
 * that ships. The version of this page before it was a separate React flow that
 * merely looked similar, and it drifted the same day: reviewing a copy tells you
 * nothing about the thing you are actually shipping.
 *
 * The only things written here are the markup (mirrored from the Mac's
 * index.html) and a stub of window.brainoMac, because the real one is an
 * Electron preload bridge and none of it exists in a browser. Every stub does
 * the least convincing honest thing rather than faking a result, and the ones
 * standing in for a native prompt say so on screen when they fire.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import "../../mac/braino-mac/renderer/boot-intro.css";
import "../../mac/braino-mac/renderer/onboarding.css";
import "./onb.css";

declare global {
  interface Window {
    brainoMac?: Record<string, unknown>;
    __brainoBootIntro?: {
      show: (o: { firstRun: boolean }) => boolean;
      progress: (p: number) => void;
      handoff: () => Promise<void>;
      finish: (o: { firstRun: boolean }) => Promise<void>;
      flyHome: () => Promise<void>;
      hideNow: () => void;
      abort: () => void;
    };
    __brainoOnboarding?: {
      run: (o: { name: string }) => Promise<{ answers?: Record<string, string>; aborted?: boolean }>;
      goHome: () => Promise<void>;
      abort: () => void;
    };
    __brainoUniqueGradients?: (svg: string, tag: string) => string;
  }
}

const HELLO_D =
  "M 62 220 C 64 176, 74 108, 90 62 C 98 38, 74 30, 70 58 C 66 88, 78 168, 82 220 " +
  "C 84 176, 98 148, 120 150 C 142 152, 146 190, 140 220 C 138 231, 150 234, 160 226 " +
  "C 172 218, 186 190, 196 168 C 206 150, 184 146, 174 164 C 164 182, 174 220, 196 223 " +
  "C 210 226, 222 218, 230 208 C 246 180, 258 112, 270 64 C 278 40, 254 32, 250 60 " +
  "C 246 90, 258 168, 262 220 C 264 232, 278 235, 288 226 C 304 180, 316 112, 328 64 " +
  "C 336 40, 312 32, 308 60 C 304 90, 316 168, 320 220 C 322 232, 336 235, 346 225 " +
  "C 356 214, 366 196, 378 186 C 394 172, 416 180, 420 200 C 424 220, 408 234, 390 230 " +
  "C 372 226, 366 206, 374 192 C 384 176, 408 174, 418 188 C 426 199, 428 214, 422 224";

export default function Onb() {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const mod = await import("@/components/brainoWalkerSvg");
      const svg = (mod as { BRAINO_WALKER_SVG?: string }).BRAINO_WALKER_SVG || null;

      window.brainoMac = {
        getWalkerSvg: () => svg,
        setMousePassthrough: () => {},
        /* On the Mac this is what makes the buttons clickable at all — raise the
           window, make it focusable, focus it. There is no Electron window here,
           so it is a no-op and the browser was never going to catch that bug. */
        onbInteractive: async () => ({ ok: true }),
        introGuard: () => {},
        onIntroKill: () => () => {},
        onAuthRequired: () => () => {},
        authStatus: async () => ({ displayName: "Itish Pande" }),
        permissionAsk: async (what: string) => {
          setAsked((a) => [...a, `macOS would ask for ${what} here`]);
          return { ok: true };
        },
        namedMode: async (p: { enabled: boolean }) => {
          setAsked((a) => [...a, `always-on set to ${p.enabled ? "on" : "off"}`]);
          return p;
        },
        introDone: async () => ({ ok: true }),
        log: () => {},
      };

      /* Side-effect imports. These files are plain IIFEs that hang
         __brainoBootIntro and __brainoOnboarding off window, exactly as the
         script tags in the Mac's index.html do. */
      await import("../../mac/braino-mac/renderer/boot-intro.js");
      await import("../../mac/braino-mac/renderer/onboarding.js");
      if (!cancelled) setReady(true);
    }

    void boot();
    return () => { cancelled = true; };
  }, []);

  const play = useCallback(async () => {
    if (!ready || busy.current) return;
    busy.current = true;
    setRunning(true);
    setAnswers(null);
    setAsked([]);

    const intro = window.__brainoBootIntro;
    const onb = window.__brainoOnboarding;
    if (!intro || !onb) { busy.current = false; setRunning(false); return; }

    try {
      intro.show({ firstRun: true });
      intro.progress(0.18);
      // Stands in for the app coming up; on the Mac this tracks real startup.
      await new Promise((r) => setTimeout(r, 420));
      intro.progress(0.9);
      await intro.handoff();

      const out = await onb.run({ name: "Itish" });
      setAnswers(out?.answers || {});
      intro.hideNow();
      await onb.goHome();
    } finally {
      setRunning(false);
      busy.current = false;
    }
  }, [ready]);

  return (
    <div className="onbp">
      {/* Mirrored from mac/braino-mac/renderer/index.html. The stylesheets and
          the behaviour are the Mac's own files; this markup is the one part
          repeated, so it is the one part that can drift. */}
      <div id="notch-face" className="onbp-notch" aria-hidden="true" />

      <div id="boot-intro" hidden aria-hidden="true">
        <div className="bi-stack">
          <div className="bi-mascot" />
          <div className="bi-bar"><div className="bi-fill" /></div>
        </div>
        <p className="bi-line">Hey. I'm Braino. I run your day so it runs itself.</p>
      </div>

      <div id="onb-mac" hidden aria-hidden="true">
        <div className="onbm-stage" />
        <div className="onbm-dots" />
        <div className="onbm-mascot" aria-hidden="true" />
        <div id="onb-hello">
          <svg className="onbm-hello-svg" viewBox="40 20 410 240" fill="none" aria-label="hello">
            <path d={HELLO_D} />
          </svg>
        </div>
      </div>

      {!running && (
        <div className="onbp-shell">
          <p className="onbp-kicker">Braino for Mac</p>
          <h1 className="onbp-h1">First boot.</h1>
          <p className="onbp-sub">
            The Mac app's own screens, running here. Same stylesheets, same code —
            this page imports them out of <code>mac/braino-mac/renderer</code>, so
            what you approve is what ships.
          </p>
          <button className="onbp-btn" onClick={play} disabled={!ready}>
            {ready ? "Play first boot" : "Loading…"}
          </button>

          {answers && (
            <div className="onbp-out">
              <h2>What it captured</h2>
              <dl>
                {Object.entries(answers).map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              {asked.length > 0 && (
                <>
                  <h2>Native steps, stubbed</h2>
                  <ul>{asked.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </>
              )}
            </div>
          )}

          <p className="onbp-fine">
            Native only on the Mac: the permission prompts, the window focus that
            makes the buttons clickable, and the wake word. Those are stubbed here
            and say so above when they fire.
          </p>
        </div>
      )}
    </div>
  );
}
