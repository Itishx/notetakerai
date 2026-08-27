import { useEffect, useRef, useState } from "react";
// The Mac stylesheet as TEXT, not as a global import.
//
// It is written for a transparent click-through overlay window, so it contains
// `body { pointer-events: none }` and `html, body { overflow: hidden }`. Imported
// normally those apply to this whole site and the page becomes unclickable —
// which is exactly what happened. Injected into a shadow root instead, it styles
// the notch and reaches nothing else. The extension isolates the same CSS the
// same way, so this is the established route rather than a workaround.
import MAC_CSS from "../../mac/braino-mac/renderer/braino-mac.css?raw";
import "./notch-lab.css";

/* /notch-lab — the Mac notch, every state, in a browser.
 *
 * The markup is lifted verbatim from mac/braino-mac/renderer/index.html. When
 * that file changes, re-lift it; do not hand-edit this copy into a fork. */

const NOTCH_MARKUP = "\n        <div class=\"nf-sonar\"><i></i><i></i><i></i></div>\n        <div class=\"nf-pill\">\n          <svg class=\"nf-folds\" viewBox=\"0 0 200 74\" preserveAspectRatio=\"none\">\n            <path d=\"M 16 2 Q 23 20 16 37 Q 9 54 16 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 44 2 Q 37 20 44 37 Q 51 54 44 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 72 2 Q 79 20 72 37 Q 65 54 72 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 128 2 Q 121 20 128 37 Q 135 54 128 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 156 2 Q 163 20 156 37 Q 149 54 156 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 184 2 Q 177 20 184 37 Q 191 54 184 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 18.4 2 Q 25.4 20 18.4 37 Q 11.4 54 18.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 46.4 2 Q 39.4 20 46.4 37 Q 53.4 54 46.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 74.4 2 Q 81.4 20 74.4 37 Q 67.4 54 74.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 130.4 2 Q 123.4 20 130.4 37 Q 137.4 54 130.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 158.4 2 Q 165.4 20 158.4 37 Q 151.4 54 158.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 186.4 2 Q 179.4 20 186.4 37 Q 193.4 54 186.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n          </svg>\n          <div class=\"nf-iomi-identity\" aria-hidden=\"true\">\n            <span>F</span><span>O</span><span>U</span><span>N</span><span>D</span><span>R</span><span>Y</span>\n          </div>\n          <div class=\"nf-iomi-awake-eyes\" aria-hidden=\"true\"><i></i><i></i></div>\n          <div class=\"nf-iomi-expanded-card\" aria-hidden=\"true\">\n            <div class=\"nf-iomi-greeting\">\n              <strong><span class=\"nf-iomi-greet-lead\">Good</span><span class=\"nf-iomi-salutation\">evening,</span><span class=\"nf-iomi-first-name\">there.</span></strong>\n              <small>Everything is ready.</small>\n            </div>\n            <i class=\"nf-iomi-divider\"></i>\n            <div class=\"nf-iomi-wake-guide\">\n              <div class=\"nf-iomi-guide-eyes\"><i></i><i></i></div>\n              <small>Wake Braino</small>\n              <div><kbd>Control</kbd><kbd>Control</kbd></div>\n              <div><kbd>\u2318</kbd><kbd>\u2318</kbd><em>bring me out</em></div>\n            </div>\n          </div>\n          <div class=\"nf-band\">\n            <svg class=\"nf-mini\" viewBox=\"0 0 120 56\">\n              <g class=\"nf-ears\" opacity=\"0.32\"><ellipse cx=\"38\" cy=\"30\" rx=\"8\" ry=\"4.5\" fill=\"#E14A48\" /><ellipse cx=\"82\" cy=\"30\" rx=\"8\" ry=\"4.5\" fill=\"#E14A48\" /></g>\n              <g id=\"nf-eye-l\" class=\"nf-eye\">\n                <circle cx=\"49\" cy=\"22\" r=\"12\" fill=\"#fff\" />\n                <circle id=\"nf-pupil-l\" cx=\"49\" cy=\"22\" r=\"6.2\" fill=\"#1B1713\" />\n                <circle id=\"nf-glint-l\" cx=\"51.3\" cy=\"19.3\" r=\"2\" fill=\"#fff\" />\n              </g>\n              <g id=\"nf-eye-r\" class=\"nf-eye\">\n                <circle cx=\"71\" cy=\"22\" r=\"12\" fill=\"#fff\" />\n                <circle id=\"nf-pupil-r\" cx=\"71\" cy=\"22\" r=\"6.2\" fill=\"#1B1713\" />\n                <circle id=\"nf-glint-r\" cx=\"73.3\" cy=\"19.3\" r=\"2\" fill=\"#fff\" />\n              </g>\n              <path class=\"nf-lid\" d=\"M 36 22 Q 49 28 62 22\" fill=\"none\" stroke=\"#F4E4DC\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path class=\"nf-lid\" d=\"M 58 22 Q 71 28 84 22\" fill=\"none\" stroke=\"#F4E4DC\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path id=\"nf-mouth-idle\" d=\"M 52 41 Q 60 49 68 41\" fill=\"none\" stroke=\"#7E2A24\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path id=\"nf-mouth-listen\" d=\"M 55 43 Q 60 45 65 43\" fill=\"none\" stroke=\"#E8786E\" stroke-width=\"2.4\" stroke-linecap=\"round\" style=\"display:none\" />\n              <ellipse id=\"nf-mouth-talk\" cx=\"60\" cy=\"43\" rx=\"4.6\" ry=\"3.2\" fill=\"#E8786E\" style=\"display:none\" />\n            </svg>\n            <div class=\"nf-viz\"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>\n            <div class=\"nf-dancer\"></div>\n          </div>\n          <div class=\"nf-cap nf-cap-l\"></div>\n          <div class=\"nf-cap nf-cap-r\"></div>\n          <div class=\"nf-music-mini\" aria-hidden=\"true\">\n            <div class=\"nf-mm-art\"><svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n            <div class=\"nf-mm-eq\"><i></i><i></i><i></i><i></i><i></i></div>\n          </div>\n          <section class=\"nf-music-surface\" aria-label=\"Now playing\">\n            <div class=\"nf-ms-main\">\n              <div class=\"nf-ms-art\"><svg viewBox=\"0 0 24 24\" width=\"22\" height=\"22\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n              <div class=\"nf-ms-meta\">\n                <div class=\"nf-ms-track\">Nothing playing</div>\n                <div class=\"nf-ms-artist\"></div>\n              </div>\n              <div class=\"nf-ms-eq\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i></div>\n            </div>\n            <div class=\"nf-ms-progress\">\n              <span class=\"nf-ms-elapsed\">0:00</span>\n              <div class=\"nf-ms-bar\"><i></i></div>\n              <span class=\"nf-ms-remaining\">-0:00</span>\n            </div>\n            <div class=\"nf-ms-ctl\">\n              <button class=\"nf-ms-btn nf-ms-prev\" type=\"button\" title=\"Previous\"><svg viewBox=\"0 0 24 24\"><path d=\"M7 5v14h-1.8V5H7zm12 0v14L8.5 12 19 5z\" fill=\"currentColor\"/></svg></button>\n              <button class=\"nf-ms-btn nf-ms-play\" type=\"button\" title=\"Play / Pause\"><svg viewBox=\"0 0 24 24\"><path class=\"nf-ms-ic-play\" d=\"M8 5v14l11-7L8 5z\" fill=\"currentColor\"/><g class=\"nf-ms-ic-pause\"><rect x=\"7\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/><rect x=\"13.4\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/></g></svg></button>\n              <button class=\"nf-ms-btn nf-ms-next\" type=\"button\" title=\"Next\"><svg viewBox=\"0 0 24 24\"><path d=\"M17 5v14h1.8V5H17zM5 5v14l10.5-7L5 5z\" fill=\"currentColor\"/></svg></button>\n            </div>\n          </section>\n          <!-- The mode's own command list. Fourth member of the drop-down-from-the-\n               notch family (yap / meeting / answer), because a mode that refuses\n               everything except its own phrases has to be able to show you what\n               those phrases are. Braino never reads them aloud: a list is faster\n               to scan than to listen to, and the mic stays live the whole time so\n               you can just say one. -->\n          <section class=\"nf-cmds-surface\" aria-label=\"Voice mode commands\">\n            <header class=\"nf-cmds-head\">\n              <span class=\"nf-cmds-name\">Mode</span>\n              <b class=\"nf-cmds-count\"></b>\n            </header>\n            <div class=\"nf-cmds-list\" role=\"list\"></div>\n            <footer class=\"nf-cmds-foot\">Say one, or tap it</footer>\n          </section>\n          <section class=\"nf-yap-surface\" aria-live=\"polite\" aria-label=\"BrainoHERA live transcript\">\n            <header class=\"nf-yap-head\">\n              <span><i aria-hidden=\"true\"></i><span class=\"nf-brainohera-wordmark\">Braino<span class=\"nf-hera-shimmer\">HERA</span></span></span>\n              <b>Listening</b>\n            </header>\n            <div class=\"nf-yap-transcript\">\n              <p class=\"nf-yap-empty\">Start talking. I\u2019m writing it down.</p>\n            </div>\n          </section>\n          <!-- Meeting recorder. Same drop-down-from-the-notch family as the Yap and answer\n               surfaces, but translucent: this one sits over your work for the whole meeting,\n               so it reads as an overlay rather than a black card parked on your screen. -->\n          <section class=\"nf-meeting-surface\" aria-live=\"polite\" aria-label=\"Braino meeting recorder\">\n            <header class=\"nf-meeting-head\">\n              <span class=\"nf-meeting-rec\"><i aria-hidden=\"true\"></i><b class=\"nf-meeting-clock\">00:00</b></span>\n              <span class=\"nf-meeting-title\">Meeting</span>\n              <span class=\"nf-meeting-people\"></span>\n              <button class=\"nf-meeting-stealth is-on\" type=\"button\" aria-pressed=\"true\" title=\"Hidden from screen shares\">\n                <svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\" aria-hidden=\"true\">\n                  <path class=\"nf-eye-open\" d=\"M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z\" fill=\"currentColor\"/>\n                  <path class=\"nf-eye-slash\" d=\"M3.5 3.5l17 17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n                </svg>\n              </button>\n              <button class=\"nf-meeting-stop\" type=\"button\">Stop</button>\n            </header>\n            <div class=\"nf-meeting-live\">\n              <div class=\"nf-meeting-speaker\">\n                <span class=\"nf-meeting-dot\" aria-hidden=\"true\"></span>\n                <b class=\"nf-meeting-speaker-name\">Listening</b>\n                <span class=\"nf-meeting-wave\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i><i></i></span>\n              </div>\n              <div class=\"nf-meeting-lines\"></div>\n            </div>\n            <div class=\"nf-meeting-notes\" hidden>\n              <small>Notes</small>\n              <ul></ul>\n            </div>\n          </section>\n          <section class=\"nf-inline-caption\" aria-live=\"polite\" aria-label=\"Braino live voice caption\">\n            <header>\n              <small class=\"nf-inline-caption-label\">You said</small>\n              <span class=\"nf-inline-caption-state\">Listening</span>\n            </header>\n            <p class=\"nf-inline-caption-text\"></p>\n          </section>\n          <div id=\"nf-status\"></div>\n          <div id=\"nf-status-2\"></div>\n          <div class=\"nf-volume\" aria-hidden=\"true\">\n            <svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path d=\"M4 9v6h4l5 4V5L8 9H4z\" fill=\"currentColor\"/><path d=\"M16 8.5a5 5 0 0 1 0 7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>\n            <div class=\"nf-vol-bar\"><i></i></div>\n            <span class=\"nf-vol-num\"></span>\n          </div>\n          <div class=\"nf-drop-hint\">drop it, I&rsquo;ll hold it</div>\n          <div class=\"nf-tray\" aria-hidden=\"true\">\n            <div class=\"nf-tray-main\">\n              <div class=\"nf-np\">\n                <div class=\"nf-np-art\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n                <div class=\"nf-np-meta\">\n                  <div class=\"nf-np-track\">Nothing playing</div>\n                  <div class=\"nf-np-artist\"></div>\n                  <div class=\"nf-np-bar\"><i></i></div>\n                </div>\n                <div class=\"nf-np-ctl\">\n                  <button class=\"nf-ib nf-prev\" title=\"Previous\"><svg viewBox=\"0 0 24 24\"><path d=\"M7 5v14h-1.8V5H7zm12 0v14L8.5 12 19 5z\" fill=\"currentColor\"/></svg></button>\n                  <button class=\"nf-ib nf-play\" title=\"Play / Pause\"><svg viewBox=\"0 0 24 24\"><path class=\"nf-ic-play\" d=\"M8 5v14l11-7L8 5z\" fill=\"currentColor\"/><g class=\"nf-ic-pause\"><rect x=\"7\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/><rect x=\"13.4\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/></g></svg></button>\n                  <button class=\"nf-ib nf-next\" title=\"Next\"><svg viewBox=\"0 0 24 24\"><path d=\"M17 5v14h1.8V5H17zM5 5v14l10.5-7L5 5z\" fill=\"currentColor\"/></svg></button>\n                </div>\n              </div>\n              <div class=\"nf-side\">\n                <div class=\"nf-cal\">\n                  <div class=\"nf-cal-when\">today</div>\n                  <div class=\"nf-cal-title\">No events coming up</div>\n                  <button class=\"nf-join\" hidden>Join &amp; record</button>\n                </div>\n                <div class=\"nf-timerlist\" hidden></div>\n                <div class=\"nf-sys\">\n                  <span class=\"nf-batt\"></span>\n                  <span class=\"nf-bt\"></span>\n                </div>\n              </div>\n            </div>\n            <div class=\"nf-shelf\" hidden></div>\n          </div>\n          <div class=\"nf-privacy\"></div>\n          <div class=\"nf-think-dots\"><i></i><i></i><i></i></div>\n          <!-- The thinking chip: what he is doing, centred, with the way in\n               next to it. It used to be a caption pinned to the left edge of a\n               190px housing, which cut \"Reading the page and understanding what\n               matters\" down to the word \"READ\". -->\n          <button class=\"nf-think-chip\" type=\"button\" aria-expanded=\"false\" aria-label=\"Show what Braino is thinking\">\n            <span class=\"nf-think-chip-text\">Thinking</span>\n            <span class=\"nf-think-chip-arrow\" aria-hidden=\"true\"></span>\n          </button>\n          <section class=\"nf-thinking-canvas\" aria-live=\"polite\" aria-label=\"Braino task progress\">\n            <div class=\"nf-response-face\" aria-hidden=\"true\">\n              <svg viewBox=\"0 0 230 72\" preserveAspectRatio=\"none\">\n                <path class=\"nf-response-fold\" d=\"M115 0 Q111 14 115 27 Q119 40 115 56\" />\n                <path class=\"nf-response-fold\" d=\"M25 4 Q14 13 25 22 Q12 31 25 40 Q14 50 30 61\" />\n                <path class=\"nf-response-fold\" d=\"M61 1 Q49 11 60 20 Q47 30 61 39 Q49 49 65 63\" />\n                <path class=\"nf-response-fold\" d=\"M169 1 Q181 11 170 20 Q183 30 169 39 Q181 49 165 63\" />\n                <path class=\"nf-response-fold\" d=\"M205 4 Q216 13 205 22 Q218 31 205 40 Q216 50 200 61\" />\n                <path class=\"nf-response-lid\" d=\"M93 29 Q103 36 113 29\" />\n                <path class=\"nf-response-lid\" d=\"M117 29 Q127 36 137 29\" />\n                <path class=\"nf-response-smile\" d=\"M108 47 Q115 54 122 47\" />\n              </svg>\n            </div>\n            <div class=\"nf-thinking-head\">\n              <div class=\"nf-thinking-brand\"><i aria-hidden=\"true\"></i><span>Braino is thinking</span></div>\n              <span class=\"nf-thinking-state\">Thinking</span>\n            </div>\n            <div class=\"nf-thinking-lines\">\n              <p class=\"nf-flow-prompt\"><span>Reading the page and understanding what matters.</span></p>\n              <p class=\"nf-thinking-current\">Separating the useful signal from the repetition.</p>\n              <p class=\"nf-flow-response\"><span>Preparing the answer in your context.</span></p>\n              <!-- His earlier steps. renderThinkingCanvas has queried\n                   .nf-thinking-trail since it was written, but the element was\n                   never in this file, so the query returned null and every step\n                   he took was silently discarded. Inside .nf-thinking-lines on\n                   purpose: renderedThinkingHeight measures that container, so\n                   the sheet grows to fit the reasoning instead of clipping it. -->\n              <div class=\"nf-thinking-trail\" aria-label=\"Earlier steps\"></div>\n            </div>\n          </section>\n          <section class=\"nf-answer-surface\" aria-live=\"polite\" aria-label=\"Braino answer\">\n            <div class=\"nf-answer-short-row\">\n              <span><small>Braino</small><strong class=\"nf-answer-short-text\"></strong></span>\n              <button class=\"nf-answer-done\" type=\"button\">Done</button>\n            </div>\n            <header class=\"nf-answer-long-head\">\n              <span><i></i><i></i><b>Braino</b></span>\n              <button class=\"nf-answer-done\" type=\"button\">Done</button>\n            </header>\n            <article>\n              <small class=\"nf-answer-label\">Answer from this page</small>\n              <div class=\"nf-answer-body\"></div>\n            </article>\n          </section>\n        </div>\n        <!-- The keynote shimmer: a white-to-blue light that traces the island's\n             outline, verbatim from the trybraino.com reveal. Fired by JS via\n             the .nf-shining class, every ~90s while he's home and idle. -->\n        <svg class=\"nf-shine\" viewBox=\"0 0 190 55\" aria-hidden=\"true\">\n          <defs>\n            <linearGradient id=\"nf-shine-grad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n              <stop offset=\"0\" stop-color=\"#F4CF87\" />\n              <stop offset=\"0.42\" stop-color=\"#EC8078\" />\n              <stop offset=\"0.7\" stop-color=\"#DC77A8\" />\n              <stop offset=\"1\" stop-color=\"#779CFF\" />\n            </linearGradient>\n          </defs>\n          <path class=\"nf-shine-glow\" pathLength=\"100\" d=\"M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z\" stroke=\"url(#nf-shine-grad)\" fill=\"none\" />\n          <path class=\"nf-shine-core\" pathLength=\"100\" d=\"M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z\" stroke=\"url(#nf-shine-grad)\" fill=\"none\" />\n        </svg>\n";

type State = {
  id: string; label: string; hint: string; classes: string;
  said?: string; phase?: string; answer?: string; steps?: string[];
};

const PHASES = ["Thinking", "Hatching", "Deciding", "Calibrating"];

const STATES: State[] = [
  { id: "heard", label: "1 \u00b7 He hears you",
    hint: "Your words land immediately, under You said.",
    classes: "on nf-inline-open busy",
    said: "organize my desktop really quick", phase: "Live" },
  { id: "working", label: "2 \u00b7 Thinking",
    hint: "The phase belongs in the middle, with the arrow that opens his working.",
    classes: "on nf-thinking nf-think-hint busy",
    said: "organize my desktop really quick", phase: "Calibrating" },
  { id: "expanded", label: "3 \u00b7 Extended thinking",
    hint: "The arrow opens every step he took, your sentence first.",
    classes: "on nf-thinking nf-think-open busy",
    said: "organize my desktop really quick", phase: "Deciding",
    steps: [
      "Reading the current context and understanding what matters.",
      "Counting what is on the Desktop and how stale each file is.",
      "Screenshots and recordings are the biggest group, 24 items.",
      "Moving them to Redundant Files so nothing is deleted.",
    ] },
  { id: "reply", label: "4 \u00b7 His reply",
    hint: "Same box. It must not change shape while it types.",
    classes: "on nf-answer-open nf-answer-short busy",
    answer: "Moved 24 screenshots into Redundant Files. Desktop is clear." },
];

export default function NotchLab() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<ShadowRoot | null>(null);
  const [active, setActive] = useState(0);
  const [cycling, setCycling] = useState(true);
  const [tick, setTick] = useState(0);
  const state = STATES[active];

  useEffect(() => { document.title = "Mac notch \u00b7 every state"; }, []);

  // Build the shadow root once: the Mac's CSS and the Mac's markup, together
  // and sealed off from the page.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || rootRef.current) return;
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MAC_CSS;
    /* #notch-face is `position: fixed` because on the Mac it lives in a
       full-screen overlay window. Shadow DOM does not create a containing block
       for fixed, so it would anchor to this page's viewport and sit behind the
       header. Pin it to the stage instead — the only Mac rule this lab
       overrides, and it changes placement, never the design. */
    const place = document.createElement("style");
    place.textContent = `
      #notch-face { position: absolute !important; top: 0; left: 50%; transform: translateX(-50%); }
    `;
    const face = document.createElement("div");
    face.id = "notch-face";
    face.innerHTML = NOTCH_MARKUP;
    root.append(style, place, face);
    rootRef.current = root;
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!cycling || state.id !== "working") return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1600);
    return () => window.clearInterval(t);
  }, [cycling, state.id]);

  const phase = state.id === "working" && cycling ? PHASES[tick % PHASES.length] : state.phase;

  // Everything the renderer would write into the DOM, written here.
  useEffect(() => {
    const root = rootRef.current;
    const nf = root?.getElementById("notch-face") as HTMLElement | null;
    if (!nf) return;
    nf.setAttribute("class", state.classes);
    const set = (sel: string, value: string) => {
      const el = nf.querySelector(sel);
      if (el) el.textContent = value;
    };
    set(".nf-inline-caption-label", state.said ? "You said" : "Braino");
    set(".nf-inline-caption-text", state.said || "");
    set(".nf-inline-caption-state", phase || "");
    set(".nf-think-chip-text", phase || "");
    set(".nf-thinking-current", (state.steps && state.steps[state.steps.length - 1]) || phase || "");
    set(".nf-flow-prompt", state.said ? "You said: " + state.said : "");
    set(".nf-answer-short-text", state.answer || "");

    const trail = nf.querySelector(".nf-thinking-trail");
    if (trail) {
      trail.replaceChildren(...(state.steps || []).slice(0, -1).map((step) => {
        const row = document.createElement("div");
        row.className = "nf-thinking-step";
        const span = document.createElement("span");
        span.textContent = step;
        row.appendChild(span);
        return row;
      }));
    }
    // The renderer measures and sets these; without them the pill cannot grow.
    nf.style.setProperty("--nf-inline-height", "168px");
    nf.style.setProperty("--nf-compact-surface-w", "480px");
    nf.style.setProperty("--nf-screen-h", "900px");
    // syncOpenThinkingZone measures the real content and sets this; a fixed
    // 300px let the step trail spill out below the sheet.
    const canvas = nf.querySelector(".nf-thinking-canvas") as HTMLElement | null;
    const lines = nf.querySelector(".nf-thinking-lines") as HTMLElement | null;
    const head = nf.querySelector(".nf-thinking-head") as HTMLElement | null;
    if (canvas && lines && head) {
      const cs = getComputedStyle(canvas);
      const measured = (parseFloat(cs.paddingTop) || 0) + head.getBoundingClientRect().height
        + lines.scrollHeight + (parseFloat(cs.paddingBottom) || 0) + 14;
      nf.style.setProperty("--nf-thinking-height", `${Math.round(Math.max(280, measured))}px`);
    }
  }, [state, phase, tick]);

  return (
    <div className="nl">
      <header className="nl-head">
        <div>
          <h1>The Mac notch</h1>
          <p>Every state, driven by the same class names the renderer sets.</p>
        </div>
        <label className="nl-toggle">
          <input type="checkbox" checked={cycling} onChange={(e) => setCycling(e.target.checked)} />
          <span>cycle the phase word</span>
        </label>
      </header>

      <nav className="nl-states">
        {STATES.map((s, i) => (
          <button key={s.id} type="button" className={i === active ? "is-on" : ""}
            onClick={() => setActive(i)}>{s.label}</button>
        ))}
      </nav>

      <p className="nl-hint">{state.hint}</p>

      <div className="nl-stage">
        <div className="nl-menubar"><span>Finder</span><span>File</span><span>Edit</span><span>View</span></div>
        <div className="nl-host" ref={hostRef} />
      </div>

      <footer className="nl-foot"><code>{state.classes}</code></footer>
    </div>
  );
}
