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

const NOTCH_MARKUP = "\n        <div class=\"nf-sonar\"><i></i><i></i><i></i></div>\n        <div class=\"nf-pill\">\n          <svg class=\"nf-folds\" viewBox=\"0 0 200 74\" preserveAspectRatio=\"none\">\n            <path d=\"M 16 2 Q 23 20 16 37 Q 9 54 16 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 44 2 Q 37 20 44 37 Q 51 54 44 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 72 2 Q 79 20 72 37 Q 65 54 72 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 128 2 Q 121 20 128 37 Q 135 54 128 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 156 2 Q 163 20 156 37 Q 149 54 156 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 184 2 Q 177 20 184 37 Q 191 54 184 72\" fill=\"none\" stroke=\"#B34A41\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.55\" />\n            <path d=\"M 18.4 2 Q 25.4 20 18.4 37 Q 11.4 54 18.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 46.4 2 Q 39.4 20 46.4 37 Q 53.4 54 46.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 74.4 2 Q 81.4 20 74.4 37 Q 67.4 54 74.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 130.4 2 Q 123.4 20 130.4 37 Q 137.4 54 130.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 158.4 2 Q 165.4 20 158.4 37 Q 151.4 54 158.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n            <path d=\"M 186.4 2 Q 179.4 20 186.4 37 Q 193.4 54 186.4 72\" fill=\"none\" stroke=\"#FBD9D2\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\"0.5\" />\n          </svg>\n          <div class=\"nf-iomi-identity\" aria-hidden=\"true\">\n            <span>F</span><span>O</span><span>U</span><span>N</span><span>D</span><span>R</span><span>Y</span>\n          </div>\n          <div class=\"nf-iomi-awake-eyes\" aria-hidden=\"true\"><i></i><i></i></div>\n          <div class=\"nf-iomi-expanded-card\" aria-hidden=\"true\">\n            <div class=\"nf-iomi-greeting\">\n              <strong><span class=\"nf-iomi-greet-lead\">Good</span><span class=\"nf-iomi-salutation\">evening,</span><span class=\"nf-iomi-first-name\">there.</span></strong>\n              <small>Everything is ready.</small>\n            </div>\n            <i class=\"nf-iomi-divider\"></i>\n            <div class=\"nf-iomi-wake-guide\">\n              <div class=\"nf-iomi-guide-eyes\"><i></i><i></i></div>\n              <small>Wake Braino</small>\n              <div><kbd>Control</kbd><kbd>Control</kbd></div>\n              <div><kbd>\u2318</kbd><kbd>\u2318</kbd><em>bring me out</em></div>\n            </div>\n          </div>\n          <div class=\"nf-band\">\n            <svg class=\"nf-mini\" viewBox=\"0 0 120 56\">\n              <g class=\"nf-ears\" opacity=\"0.32\"><ellipse cx=\"38\" cy=\"30\" rx=\"8\" ry=\"4.5\" fill=\"#E14A48\" /><ellipse cx=\"82\" cy=\"30\" rx=\"8\" ry=\"4.5\" fill=\"#E14A48\" /></g>\n              <g id=\"nf-eye-l\" class=\"nf-eye\">\n                <circle cx=\"49\" cy=\"22\" r=\"12\" fill=\"#fff\" />\n                <circle id=\"nf-pupil-l\" cx=\"49\" cy=\"22\" r=\"6.2\" fill=\"#1B1713\" />\n                <circle id=\"nf-glint-l\" cx=\"51.3\" cy=\"19.3\" r=\"2\" fill=\"#fff\" />\n              </g>\n              <g id=\"nf-eye-r\" class=\"nf-eye\">\n                <circle cx=\"71\" cy=\"22\" r=\"12\" fill=\"#fff\" />\n                <circle id=\"nf-pupil-r\" cx=\"71\" cy=\"22\" r=\"6.2\" fill=\"#1B1713\" />\n                <circle id=\"nf-glint-r\" cx=\"73.3\" cy=\"19.3\" r=\"2\" fill=\"#fff\" />\n              </g>\n              <path class=\"nf-lid\" d=\"M 36 22 Q 49 28 62 22\" fill=\"none\" stroke=\"#F4E4DC\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path class=\"nf-lid\" d=\"M 58 22 Q 71 28 84 22\" fill=\"none\" stroke=\"#F4E4DC\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path id=\"nf-mouth-idle\" d=\"M 52 41 Q 60 49 68 41\" fill=\"none\" stroke=\"#7E2A24\" stroke-width=\"2.6\" stroke-linecap=\"round\" />\n              <path id=\"nf-mouth-listen\" d=\"M 55 43 Q 60 45 65 43\" fill=\"none\" stroke=\"#E8786E\" stroke-width=\"2.4\" stroke-linecap=\"round\" style=\"display:none\" />\n              <ellipse id=\"nf-mouth-talk\" cx=\"60\" cy=\"43\" rx=\"4.6\" ry=\"3.2\" fill=\"#E8786E\" style=\"display:none\" />\n            </svg>\n            <div class=\"nf-viz\"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>\n            <div class=\"nf-dancer\"></div>\n          </div>\n          <div class=\"nf-cap nf-cap-l\"></div>\n          <div class=\"nf-cap nf-cap-r\"></div>\n          <div class=\"nf-music-mini\" aria-hidden=\"true\">\n            <div class=\"nf-mm-art\"><svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n            <div class=\"nf-mm-eq\"><i></i><i></i><i></i><i></i><i></i></div>\n          </div>\n          <section class=\"nf-music-surface\" aria-label=\"Now playing\">\n            <div class=\"nf-ms-main\">\n              <div class=\"nf-ms-art\"><svg viewBox=\"0 0 24 24\" width=\"22\" height=\"22\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n              <div class=\"nf-ms-meta\">\n                <div class=\"nf-ms-track\">Nothing playing</div>\n                <div class=\"nf-ms-artist\"></div>\n              </div>\n              <div class=\"nf-ms-eq\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i></div>\n            </div>\n            <div class=\"nf-ms-progress\">\n              <span class=\"nf-ms-elapsed\">0:00</span>\n              <div class=\"nf-ms-bar\"><i></i></div>\n              <span class=\"nf-ms-remaining\">-0:00</span>\n            </div>\n            <div class=\"nf-ms-ctl\">\n              <button class=\"nf-ms-btn nf-ms-prev\" type=\"button\" title=\"Previous\"><svg viewBox=\"0 0 24 24\"><path d=\"M7 5v14h-1.8V5H7zm12 0v14L8.5 12 19 5z\" fill=\"currentColor\"/></svg></button>\n              <button class=\"nf-ms-btn nf-ms-play\" type=\"button\" title=\"Play / Pause\"><svg viewBox=\"0 0 24 24\"><path class=\"nf-ms-ic-play\" d=\"M8 5v14l11-7L8 5z\" fill=\"currentColor\"/><g class=\"nf-ms-ic-pause\"><rect x=\"7\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/><rect x=\"13.4\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/></g></svg></button>\n              <button class=\"nf-ms-btn nf-ms-next\" type=\"button\" title=\"Next\"><svg viewBox=\"0 0 24 24\"><path d=\"M17 5v14h1.8V5H17zM5 5v14l10.5-7L5 5z\" fill=\"currentColor\"/></svg></button>\n            </div>\n          </section>\n          <!-- The mode's own command list. Fourth member of the drop-down-from-the-\n               notch family (yap / meeting / answer), because a mode that refuses\n               everything except its own phrases has to be able to show you what\n               those phrases are. Braino never reads them aloud: a list is faster\n               to scan than to listen to, and the mic stays live the whole time so\n               you can just say one. -->\n          <section class=\"nf-cmds-surface\" aria-label=\"Voice mode commands\">\n            <header class=\"nf-cmds-head\">\n              <span class=\"nf-cmds-name\">Mode</span>\n              <b class=\"nf-cmds-count\"></b>\n            </header>\n            <div class=\"nf-cmds-list\" role=\"list\"></div>\n            <footer class=\"nf-cmds-foot\">Say one, or tap it</footer>\n          </section>\n          <section class=\"nf-yap-surface\" aria-live=\"polite\" aria-label=\"BrainoHERA live transcript\">\n            <header class=\"nf-yap-head\">\n              <span><i aria-hidden=\"true\"></i><span class=\"nf-brainohera-wordmark\">Braino<span class=\"nf-hera-shimmer\">HERA</span></span></span>\n              <b>Listening</b>\n            </header>\n            <div class=\"nf-yap-transcript\">\n              <p class=\"nf-yap-empty\">Start talking. I\u2019m writing it down.</p>\n            </div>\n          </section>\n          <!-- Meeting recorder. Same drop-down-from-the-notch family as the Yap and answer\n               surfaces, but translucent: this one sits over your work for the whole meeting,\n               so it reads as an overlay rather than a black card parked on your screen. -->\n          <section class=\"nf-meeting-surface\" aria-live=\"polite\" aria-label=\"Braino meeting recorder\">\n            <header class=\"nf-meeting-head\">\n              <span class=\"nf-meeting-rec\"><i aria-hidden=\"true\"></i><b class=\"nf-meeting-clock\">00:00</b></span>\n              <span class=\"nf-meeting-title\">Meeting</span>\n              <span class=\"nf-meeting-people\"></span>\n              <button class=\"nf-meeting-stealth is-on\" type=\"button\" aria-pressed=\"true\" title=\"Hidden from screen shares\">\n                <svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\" aria-hidden=\"true\">\n                  <path class=\"nf-eye-open\" d=\"M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z\" fill=\"currentColor\"/>\n                  <path class=\"nf-eye-slash\" d=\"M3.5 3.5l17 17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n                </svg>\n              </button>\n              <button class=\"nf-meeting-stop\" type=\"button\">Stop</button>\n            </header>\n            <div class=\"nf-meeting-live\">\n              <div class=\"nf-meeting-speaker\">\n                <span class=\"nf-meeting-dot\" aria-hidden=\"true\"></span>\n                <b class=\"nf-meeting-speaker-name\">Listening</b>\n                <span class=\"nf-meeting-wave\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i><i></i></span>\n              </div>\n              <div class=\"nf-meeting-lines\"></div>\n            </div>\n            <div class=\"nf-meeting-notes\" hidden>\n              <small>Notes</small>\n              <ul></ul>\n            </div>\n          </section>\n          <!-- The panel. Double-click Braino (he jumps up into the notch) or\n               double-click the notch, and the island drops open into his\n               settings: the first piece of the app moving out of the dashboard\n               window and into the notch. -->\n          <section class=\"nf-panel-surface\" aria-label=\"Braino settings\">\n            <div class=\"nf-panel-inner\">\n              <header class=\"nf-panel-head\">\n                <span class=\"nf-panel-brand\"><i aria-hidden=\"true\"></i><i aria-hidden=\"true\"></i><b>Braino</b></span>\n                <button type=\"button\" class=\"nf-panel-done\">Done</button>\n              </header>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Size</span>\n                <div class=\"nf-panel-control\">\n                  <input class=\"nf-panel-size\" type=\"range\" min=\"1\" max=\"5\" step=\"0.05\" value=\"1\" aria-label=\"Braino size\" />\n                  <output class=\"nf-panel-size-value\">100%</output>\n                </div>\n              </div>\n              <div class=\"nf-panel-row nf-panel-row-chars\">\n                <span class=\"nf-panel-label\">Character</span>\n                <div class=\"nf-panel-chars\" role=\"group\" aria-label=\"Character\">\n                  <button type=\"button\" data-mascot=\"braino\">Braino</button>\n                  <button type=\"button\" data-mascot=\"brainelle\">Brainelle</button>\n                  <button type=\"button\" data-mascot=\"webb\">Webb</button>\n                  <button type=\"button\" data-mascot=\"ferro\">Ferro</button>\n                </div>\n              </div>\n              <i class=\"nf-panel-rule\" aria-hidden=\"true\"></i>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Listen for my name<small class=\"nf-panel-name-hint\">Say \u201cHey Braino\u201d and I wake up</small></span>\n                <button type=\"button\" class=\"nf-switch\" data-setting=\"named\" role=\"switch\" aria-checked=\"false\" aria-label=\"Listen for my name\"><i></i></button>\n              </div>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Talk out loud<small>Off and I answer in the notch only</small></span>\n                <button type=\"button\" class=\"nf-switch\" data-setting=\"voice\" role=\"switch\" aria-checked=\"true\" aria-label=\"Talk out loud\"><i></i></button>\n              </div>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Stealth<small>The notch fades to almost nothing. Hover it to look</small></span>\n                <button type=\"button\" class=\"nf-switch\" data-setting=\"stealth\" role=\"switch\" aria-checked=\"false\" aria-label=\"Stealth\"><i></i></button>\n              </div>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Stay where you drop me<small>Off and I walk around</small></span>\n                <div class=\"nf-panel-control\">\n                  <button type=\"button\" class=\"nf-panel-link\" data-action=\"patch\">Pick a patch</button>\n                  <button type=\"button\" class=\"nf-switch\" data-setting=\"stay\" role=\"switch\" aria-checked=\"true\" aria-label=\"Stay where you drop me\"><i></i></button>\n                </div>\n              </div>\n              <div class=\"nf-panel-row\">\n                <span class=\"nf-panel-label\">Wallpaper</span>\n                <div class=\"nf-panel-control\">\n                  <button type=\"button\" class=\"nf-panel-button\" data-action=\"wallpaper-restore\">Put back</button>\n                  <button type=\"button\" class=\"nf-panel-button nf-panel-button-primary\" data-action=\"wallpaper-next\">Change</button>\n                </div>\n              </div>\n            </div>\n          </section>\n          <section class=\"nf-inline-caption\" aria-live=\"polite\" aria-label=\"Braino live voice caption\">\n            <header>\n              <small class=\"nf-inline-caption-label\">You said</small>\n              <span class=\"nf-inline-caption-state\">Listening</span>\n            </header>\n            <p class=\"nf-inline-caption-text\"></p>\n            <!-- Typing lands in the same box speech does, so everything past\n                 this point (understanding, routing, the thinking panel, the\n                 reply) is identical and there is no second surface to keep. -->\n            <input class=\"nf-type-field\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"\n                   placeholder=\"Type what you need\" aria-label=\"Type to Braino\">\n          </section>\n          <div id=\"nf-status\"></div>\n          <div id=\"nf-status-2\"></div>\n          <div class=\"nf-volume\" aria-hidden=\"true\">\n            <svg viewBox=\"0 0 24 24\" width=\"11\" height=\"11\"><path d=\"M4 9v6h4l5 4V5L8 9H4z\" fill=\"currentColor\"/><path d=\"M16 8.5a5 5 0 0 1 0 7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/></svg>\n            <div class=\"nf-vol-bar\"><i></i></div>\n            <span class=\"nf-vol-num\"></span>\n          </div>\n          <div class=\"nf-drop-hint\">drop it, I&rsquo;ll hold it</div>\n          <!-- The strip.\n\n               Not a wider notch. The whole menu bar, edge to edge, and the\n               thing it mostly is is a command line: you go up to the top of\n               the screen and type at the machine. The status the system\n               already keeps up there sits at the right end where it always\n               was, so nothing is taken away to make room for him.\n\n               Inert until something sets .nf-hud-on. Nothing in this renderer\n               does; /notch-lab does, because the design is being settled in a\n               browser before a single system read is wired up. -->\n          <div class=\"nf-hud\" aria-hidden=\"true\">\n            <div class=\"nf-hud-bar\">\n              <span class=\"nf-hud-mark\" aria-hidden=\"true\"><i></i><i></i></span>\n\n              <label class=\"nf-hud-cmd\">\n                <svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"6.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\"/><path d=\"M15.6 15.6 20 20\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/></svg>\n                <input class=\"nf-hud-input\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"\n                       placeholder=\"Ask Braino, or type a command\" aria-label=\"Ask Braino\">\n                <kbd class=\"nf-hud-key\">&#8984;K</kbd>\n              </label>\n\n              <div class=\"nf-hud-status\">\n                <button class=\"nf-hud-item nf-hud-np\" type=\"button\" title=\"Now playing\">\n                  <svg viewBox=\"0 0 24 24\" width=\"13\" height=\"13\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg>\n                </button>\n                <button class=\"nf-hud-item nf-hud-weather\" type=\"button\" title=\"Weather\">\n                  <b class=\"nf-hud-temp\">--&deg;</b>\n                </button>\n                <button class=\"nf-hud-item nf-hud-wifi\" type=\"button\" title=\"Network\">\n                  <svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" aria-hidden=\"true\">\n                    <path d=\"M12 18.2a1.6 1.6 0 1 0 0 .01z\" fill=\"currentColor\"/>\n                    <path class=\"nf-hud-arc nf-hud-arc-1\" d=\"M8.6 14.2a5 5 0 0 1 6.8 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/>\n                    <path class=\"nf-hud-arc nf-hud-arc-2\" d=\"M5.6 11.1a9.4 9.4 0 0 1 12.8 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/>\n                    <path class=\"nf-hud-arc nf-hud-arc-3\" d=\"M2.8 8.2a13.6 13.6 0 0 1 18.4 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"/>\n                  </svg>\n                </button>\n                <span class=\"nf-hud-item nf-hud-batt\" title=\"Battery\">\n                  <svg viewBox=\"0 0 30 14\" width=\"22\" height=\"11\" aria-hidden=\"true\">\n                    <rect x=\"1\" y=\"1.6\" width=\"24\" height=\"10.8\" rx=\"3.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" opacity=\".6\"/>\n                    <rect class=\"nf-hud-batt-fill\" x=\"2.8\" y=\"3.4\" width=\"14\" height=\"7.2\" rx=\"2\" fill=\"currentColor\"/>\n                    <path d=\"M26.8 5.4v3.2a2.2 2.2 0 0 0 0-3.2z\" fill=\"currentColor\" opacity=\".6\"/>\n                  </svg>\n                </span>\n                <button class=\"nf-hud-item nf-hud-toggles\" type=\"button\" title=\"Controls\">\n                  <svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" aria-hidden=\"true\">\n                    <rect x=\"3\" y=\"4.6\" width=\"18\" height=\"6\" rx=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>\n                    <circle cx=\"8\" cy=\"7.6\" r=\"1.7\" fill=\"currentColor\"/>\n                    <rect x=\"3\" y=\"13.4\" width=\"18\" height=\"6\" rx=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/>\n                    <circle cx=\"16\" cy=\"16.4\" r=\"1.7\" fill=\"currentColor\"/>\n                  </svg>\n                </button>\n                <span class=\"nf-hud-dot\" aria-hidden=\"true\"></span>\n              </div>\n            </div>\n            <!-- One line under the strip: what the icons would say if you asked\n                 them. A reading, not a document. -->\n            <div class=\"nf-hud-sheet\">\n              <span class=\"nf-hud-read\"></span>\n            </div>\n          </div>\n\n          <div class=\"nf-tray\" aria-hidden=\"true\">\n            <div class=\"nf-tray-main\">\n              <div class=\"nf-np\">\n                <div class=\"nf-np-art\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\"><path d=\"M9 18.5a2.5 2.5 0 1 1-1.5-2.29V6.8l9-2.2v9.6a2.5 2.5 0 1 1-1.5-2.29V8.1l-6 1.47v8.93z\" fill=\"currentColor\"/></svg></div>\n                <div class=\"nf-np-meta\">\n                  <div class=\"nf-np-track\">Nothing playing</div>\n                  <div class=\"nf-np-artist\"></div>\n                  <div class=\"nf-np-bar\"><i></i></div>\n                </div>\n                <div class=\"nf-np-ctl\">\n                  <button class=\"nf-ib nf-prev\" title=\"Previous\"><svg viewBox=\"0 0 24 24\"><path d=\"M7 5v14h-1.8V5H7zm12 0v14L8.5 12 19 5z\" fill=\"currentColor\"/></svg></button>\n                  <button class=\"nf-ib nf-play\" title=\"Play / Pause\"><svg viewBox=\"0 0 24 24\"><path class=\"nf-ic-play\" d=\"M8 5v14l11-7L8 5z\" fill=\"currentColor\"/><g class=\"nf-ic-pause\"><rect x=\"7\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/><rect x=\"13.4\" y=\"5\" width=\"3.6\" height=\"14\" rx=\"1\" fill=\"currentColor\"/></g></svg></button>\n                  <button class=\"nf-ib nf-next\" title=\"Next\"><svg viewBox=\"0 0 24 24\"><path d=\"M17 5v14h1.8V5H17zM5 5v14l10.5-7L5 5z\" fill=\"currentColor\"/></svg></button>\n                </div>\n              </div>\n              <div class=\"nf-side\">\n                <div class=\"nf-cal\">\n                  <div class=\"nf-cal-when\">today</div>\n                  <div class=\"nf-cal-title\">No events coming up</div>\n                  <button class=\"nf-join\" hidden>Join &amp; record</button>\n                </div>\n                <div class=\"nf-timerlist\" hidden></div>\n                <div class=\"nf-sys\">\n                  <span class=\"nf-batt\"></span>\n                  <span class=\"nf-bt\"></span>\n                </div>\n              </div>\n            </div>\n            <div class=\"nf-shelf\" hidden></div>\n          </div>\n          <div class=\"nf-privacy\"></div>\n          <div class=\"nf-think-dots\"><i></i><i></i><i></i></div>\n          <!-- The thinking chip: what he is doing, centred, with the way in\n               next to it. It used to be a caption pinned to the left edge of a\n               190px housing, which cut \"Reading the page and understanding what\n               matters\" down to the word \"READ\". -->\n          <button class=\"nf-think-chip\" type=\"button\" aria-expanded=\"false\" aria-label=\"Show what Braino is thinking\">\n            <span class=\"nf-think-chip-text\">Thinking</span>\n            <span class=\"nf-think-chip-arrow\" aria-hidden=\"true\"></span>\n          </button>\n          <section class=\"nf-thinking-canvas\" aria-live=\"polite\" aria-label=\"Braino task progress\">\n            <div class=\"nf-response-face\" aria-hidden=\"true\">\n              <svg viewBox=\"0 0 230 72\" preserveAspectRatio=\"none\">\n                <path class=\"nf-response-fold\" d=\"M115 0 Q111 14 115 27 Q119 40 115 56\" />\n                <path class=\"nf-response-fold\" d=\"M25 4 Q14 13 25 22 Q12 31 25 40 Q14 50 30 61\" />\n                <path class=\"nf-response-fold\" d=\"M61 1 Q49 11 60 20 Q47 30 61 39 Q49 49 65 63\" />\n                <path class=\"nf-response-fold\" d=\"M169 1 Q181 11 170 20 Q183 30 169 39 Q181 49 165 63\" />\n                <path class=\"nf-response-fold\" d=\"M205 4 Q216 13 205 22 Q218 31 205 40 Q216 50 200 61\" />\n                <path class=\"nf-response-lid\" d=\"M93 29 Q103 36 113 29\" />\n                <path class=\"nf-response-lid\" d=\"M117 29 Q127 36 137 29\" />\n                <path class=\"nf-response-smile\" d=\"M108 47 Q115 54 122 47\" />\n              </svg>\n            </div>\n            <div class=\"nf-thinking-head\">\n              <div class=\"nf-thinking-brand\"><i aria-hidden=\"true\"></i><span>Braino is thinking</span></div>\n              <span class=\"nf-thinking-state\">Thinking</span>\n              <button class=\"nf-thinking-stop\" type=\"button\" aria-label=\"Stop the task\">Stop</button>\n            </div>\n            <div class=\"nf-thinking-lines\">\n              <p class=\"nf-flow-prompt\"><span>Reading the page and understanding what matters.</span></p>\n              <p class=\"nf-thinking-current\">Separating the useful signal from the repetition.</p>\n              <p class=\"nf-flow-response\"><span>Preparing the answer in your context.</span></p>\n              <!-- His earlier steps. renderThinkingCanvas has queried\n                   .nf-thinking-trail since it was written, but the element was\n                   never in this file, so the query returned null and every step\n                   he took was silently discarded. Inside .nf-thinking-lines on\n                   purpose: renderedThinkingHeight measures that container, so\n                   the sheet grows to fit the reasoning instead of clipping it. -->\n              <div class=\"nf-thinking-trail\" aria-label=\"Earlier steps\"></div>\n            </div>\n          </section>\n          <section class=\"nf-answer-surface\" aria-live=\"polite\" aria-label=\"Braino answer\">\n            <div class=\"nf-answer-short-row\">\n              <span><small>Braino</small><strong class=\"nf-answer-short-text\"></strong></span>\n              <button class=\"nf-answer-done\" type=\"button\">Done</button>\n            </div>\n            <header class=\"nf-answer-long-head\">\n              <span><i></i><i></i><b>Braino</b></span>\n              <button class=\"nf-answer-done\" type=\"button\">Done</button>\n            </header>\n            <article>\n              <small class=\"nf-answer-label\">Answer from this page</small>\n              <div class=\"nf-answer-body\"></div>\n            </article>\n          </section>\n        </div>\n        <!-- The quiet notch: his status in the menu bar band, and one line\n             under it for your sentence or his answer. See renderQuietNotch. -->\n        <div class=\"nf-q\" aria-live=\"polite\">\n          <div class=\"nf-q-band\">\n            <span class=\"nf-q-left\"></span>\n            <span class=\"nf-q-right\"></span>\n          </div>\n          <div class=\"nf-q-line\">\n            <span class=\"nf-q-text\"></span>\n            <button class=\"nf-q-more\" type=\"button\">More</button>\n            <button class=\"nf-q-x\" type=\"button\" aria-label=\"Dismiss\">\u2715</button>\n          </div>\n        </div>\n        <!-- The keynote shimmer: a white-to-blue light that traces the island's\n             outline, verbatim from the trybraino.com reveal. Fired by JS via\n             the .nf-shining class, every ~90s while he's home and idle. -->\n        <svg class=\"nf-shine\" viewBox=\"0 0 190 55\" preserveAspectRatio=\"none\" aria-hidden=\"true\">\n          <defs>\n            <linearGradient id=\"nf-shine-grad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n              <stop offset=\"0\" stop-color=\"#F4CF87\" />\n              <stop offset=\"0.42\" stop-color=\"#EC8078\" />\n              <stop offset=\"0.7\" stop-color=\"#DC77A8\" />\n              <stop offset=\"1\" stop-color=\"#779CFF\" />\n            </linearGradient>\n          </defs>\n          <path class=\"nf-shine-glow\" pathLength=\"100\" d=\"M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z\" stroke=\"url(#nf-shine-grad)\" fill=\"none\" />\n          <path class=\"nf-shine-core\" pathLength=\"100\" d=\"M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z\" stroke=\"url(#nf-shine-grad)\" fill=\"none\" />\n        </svg>\n";

type State = {
  id: string; label: string; hint: string; classes: string;
  said?: string; phase?: string; answer?: string; steps?: string[];
  /* The caption's own label, chip and line when they are not "You said". */
  caption?: { label: string; state: string; text?: string; countdown?: boolean; height?: number };
  /* The pill's one-line ticker (#nf-status). */
  status?: string;
  /* Replays the perimeter trace, the way a heard name does. */
  wake?: boolean;
  /* The settings panel: measured and switched like the renderer does. */
  panel?: boolean;
  /* The quiet notch: its two ears and its one line (renderQuietNotch). */
  quiet?: { left: string; right: string; text?: string };
  /* The glance bar. Sample values only: nothing reads the machine yet, and the
     point of showing it here is to settle the design before anything does. */
  hud?: { temp: string; wifi: "0" | "1" | "2" | "3"; busy?: boolean; read: string };
  /* Shows him parked at all four edges at once. */
  perch?: boolean;
};

const PERCH_MARKUP = "      <div class=\"bm-perch\" data-at=\"notch\" aria-hidden=\"true\">\n        <!-- Filled with the real mascot, the same window.brainoMac.getWalkerSvg()\n             the walker uses. Nothing is drawn here by hand: whatever character\n             is chosen, and whatever his artwork becomes, this is him. -->\n        <div class=\"bm-perch-art\"></div>\n      </div>\n";

const Q_DOT = '<i class="nf-q-dot"></i>';

// One word now. The renderer stopped cycling Hatching / Deciding / Calibrating.
const PHASES = ["Thinking"];
const COUNTDOWN = ["Live in 4", "Live in 3", "Live in 2", "Live in 1"];

const STATES: State[] = [
  { id: "waking", label: "1 \u00b7 Voice waking up",
    hint: "Control twice (blue trace) or \u201cHey Braino\u201d (gold). HERA is already listening, so you can talk now: what you say goes through the moment the session is up. No countdown.",
    classes: "on awake nf-inline-open nf-inline-working nf-voice-starting nf-shining nf-shine-slow nf-waking-voice",
    caption: { label: "Voice", state: "Connecting", text: "Go ahead, I\u2019m listening" } },
  { id: "ready", label: "2 \u00b7 You can speak now",
    hint: "The session is live. Holds long enough to read, then the listening pill takes over, or your words do.",
    classes: "on awake mic-live nf-inline-open nf-voice-ready",
    caption: { label: "Voice", state: "Live", text: "You can speak now" } },
  { id: "saying", label: "3 \u00b7 You're saying",
    hint: "HERA, on this Mac, shows your words while you are still saying them. The mint chip is HERA's colour everywhere in the notch.",
    classes: "on awake mic-live nf-inline-open nf-inline-hera",
    caption: { label: "You're saying", state: "HERA", text: "book me a table for two at" } },
  { id: "long", label: "3b \u00b7 A long sentence",
    hint: "Past 110 characters the sheet widens, the lines get air, and the oldest line fades out at the top instead of cramming.",
    classes: "on awake mic-live nf-inline-open nf-inline-hera nf-inline-long nf-inline-trimmed",
    caption: { label: "You're saying", state: "HERA", height: 214,
      text: "the one near the office, not the one we went to last time, and if they have nothing at eight then try the Italian place on the corner, and send the confirmation to my email so I can forward it to Kalika" } },
  { id: "heard", label: "3c \u00b7 You said",
    hint: "Your words land immediately, under You said.",
    classes: "on awake nf-inline-open busy",
    said: "organize my desktop really quick", phase: "Live" },
  { id: "working", label: "4 \u00b7 Thinking",
    hint: "Your sentence stays while he works. The phase is the chip in the corner, shimmering, and it is one word.",
    classes: "on awake nf-inline-open nf-inline-working nf-thinking busy",
    said: "organize my desktop really quick", phase: "Thinking" },
  { id: "expanded", label: "5 \u00b7 Extended thinking",
    hint: "The arrow opens every step he took, your sentence first.",
    classes: "on nf-thinking nf-think-open busy",
    said: "post about what I shipped this week", phase: "Deciding",
    steps: [
      "Reading what you shipped: the notch rebuild and two fixes.",
      "LinkedIn first. Your posts there get the most replies.",
      "Leading with the bug you fixed, not the feature.",
      "Drafting it now. Nothing goes out until you approve.",
    ] },
  { id: "reply", label: "6 \u00b7 His reply",
    hint: "Same box. It must not change shape while it types.",
    classes: "on nf-answer-open nf-answer-short busy",
    answer: "Moved 24 screenshots into Redundant Files. Desktop is clear." },
  { id: "panel", label: "9 \u00b7 The panel",
    hint: "Double-click Braino: he jumps into the notch and it drops open into his settings. Click outside, Escape or Done to close; he jumps back out.",
    classes: "on awake nf-panel-open", panel: true },
  { id: "asleep", label: "7 \u00b7 Asleep, listening for his name",
    hint: "Named mode between turns, or the on-device wake word with no session. Not the listening look: no coral, no pulse.",
    classes: "on awake wake-armed nf-name-asleep",
    status: "Say \u201cHey Braino\u201d to wake me" },
  { id: "wake", label: "8 \u00b7 His name, heard",
    hint: "The boot's perimeter trace, once, around the listening pill. Then five seconds to talk.",
    classes: "on awake mic-live listen nf-shining nf-name-wake",
    wake: true },
  { id: "q-listen", label: "10 \u00b7 Quiet: listening",
    hint: "The quiet notch. Status in the menu bar band only, nothing below it. Coral dot: the next thing you say is his. Grey: say his name first.",
    classes: "on awake mic-live nf-quiet-on nfq-listen",
    quiet: { left: "Listening", right: Q_DOT } },
  { id: "q-work", label: "11 \u00b7 Quiet: working",
    hint: "Amber shimmer and the step he is on. Click the band for every step and the Stop button.",
    classes: "on awake nf-thinking nf-quiet-on nfq-work",
    quiet: { left: '<i class="nf-q-think"></i>', right: '<span class="nf-q-step">Step 3</span>' } },
  { id: "q-heard", label: "12 \u00b7 Quiet: you said",
    hint: "One line for two seconds, then the band goes back to listening or working. Clicks pass through the line.",
    classes: "on awake mic-live nf-inline-open nf-quiet-on nfq-heard nfq-line",
    quiet: { left: "You said", right: Q_DOT, text: "Braino, open YouTube" } },
  { id: "q-answer", label: "13 \u00b7 Quiet: answer",
    hint: "His answer as one line, the words he has said so far. More opens the whole answer; the cross dismisses it. Nothing else takes a click.",
    classes: "on awake nf-answer-open nf-quiet-on nfq-answer nfq-line nfq-long",
    quiet: { left: '<i class="nf-q-speak"></i>', right: "Braino", text: "extensions page shows none of the two active" } },
  { id: "q-stealth", label: "14 \u00b7 Stealth",
    hint: "Everything he draws in the notch at 1%. Hover the notch and it comes back. Say \u201cBraino, go stealth\u201d or use the switch in the panel.",
    classes: "on awake mic-live nf-quiet-on nfq-listen nf-stealth",
    quiet: { left: "Listening", right: Q_DOT } },,
  /* The status layer. Not a Braino state at all: this is the machine's own
     readout living in his housing, which is the first piece of him that is
     useful without being spoken to. */
  { id: "hud", label: "15 \u00b7 The strip",
    hint: "Go up to the top of the screen. At rest there is nothing there; the whole menu bar drops as one strip, and the strip is mostly a command line. Sample values.",
    classes: "on awake nf-hud-on",
    hud: { temp: "78\u00b0", wifi: "3", read: "78\u00b0 Cloudy in Bengaluru \u00b7 Home wifi \u00b7 Battery 58%" } },
  { id: "hud-read", label: "15b \u00b7 The strip, held open",
    hint: "The same strip held open, for looking at the design without hovering. The end light is amber while he is busy.",
    classes: "on awake nf-hud-on nf-hud-read",
    hud: { temp: "78\u00b0", wifi: "2", busy: true, read: "78\u00b0 Cloudy \u00b7 Home \u00b7 Braino is working" } },
  /* Perched: the third thing he can be doing, beside walking the screen and
     staying where he was dropped. All four anchors at once, because the only
     question here is whether the turn reads right at each edge. */
  { id: "perch", label: "16 \u00b7 Perched, all four edges",
    hint: "Half of him against an edge, out of the way, still himself when you call him. He is turned so his own down points into the screen, which is why his eyes are looking at you from every side.",
    classes: "on awake", perch: true }
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
      /* The strip is the whole menu bar. On the Mac that is 100vw; here the
         stage is the screen, so it spans the stage instead. */
      #notch-face.nf-hud-on { width: 100%; --nf-strip-w: 100%; }
      /* The perches are position: fixed on the Mac because the overlay window
         is the screen. Here the stage is the screen. */
      .nl-perches { position: absolute; inset: 0; pointer-events: none; }
      .nl-perches .bm-perch { position: absolute; }
    `;
    const face = document.createElement("div");
    face.id = "notch-face";
    face.innerHTML = NOTCH_MARKUP;
    /* One of him per edge, so the four orientations can be judged against each
       other in a single look rather than by clicking between them. They are
       fixed to the screen on the Mac; here the stage is the screen, so the
       lab pins them to it. */
    const perches = document.createElement("div");
    perches.className = "nl-perches";
    perches.innerHTML = ["notch", "bottom", "left", "right"]
      .map((at) => PERCH_MARKUP.replace('data-at="notch"', `data-at="${at}"`))
      .join("");
    /* On the Mac these are filled with window.brainoMac.getWalkerSvg(). That
       is this same file, so the lab fetches it rather than keeping a second
       copy of the mascot that could drift from his real one. */
    fetch("/braino-standing.svg")
      .then((r) => (r.ok ? r.text() : ""))
      .then((svg) => {
        if (!svg) return;
        perches.querySelectorAll(".bm-perch-art").forEach((slot) => {
          slot.innerHTML = svg;
        });
      })
      .catch(() => {});
    root.append(style, place, face, perches);
    rootRef.current = root;
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const ticks = state.caption?.countdown ? 1000 : state.wake ? 2600 : 0;
    if (!cycling || !ticks) return;
    const t = window.setInterval(() => setTick((n) => n + 1), ticks);
    return () => window.clearInterval(t);
  }, [cycling, state]);

  const phase = state.phase;

  // Everything the renderer would write into the DOM, written here.
  useEffect(() => {
    const root = rootRef.current;
    const nf = root?.getElementById("notch-face") as HTMLElement | null;
    if (!nf) return;
    const set = (sel: string, value: string) => {
      const el = nf.querySelector(sel);
      if (el) el.textContent = value;
    };
    // A heard name replays the trace: take the class off, reflow, put it back.
    if (state.wake) {
      nf.setAttribute("class", state.classes.replace("nf-shining", ""));
      void nf.offsetWidth;
    }
    nf.setAttribute("class", state.classes);
    const cap = state.caption;
    const countdownText = cap?.countdown ? COUNTDOWN[tick % COUNTDOWN.length] : "";
    root?.querySelectorAll(".bm-perch").forEach((el) => el.classList.toggle("is-on", Boolean(state.perch)));
    const hud = nf.querySelector(".nf-hud");
    if (hud) {
      hud.setAttribute("data-wifi", state.hud?.wifi ?? "3");
      hud.classList.toggle("is-busy", Boolean(state.hud?.busy));
    }
    set(".nf-hud-temp", state.hud?.temp ?? "--\u00b0");
    set(".nf-hud-read", state.hud?.read ?? "");
    set(".nf-inline-caption-label", cap ? cap.label : (state.said ? "You said" : "Braino"));
    set(".nf-inline-caption-text", cap ? (cap.text || countdownText) : (state.said || ""));
    set(".nf-inline-caption-state", cap ? cap.state : (phase || ""));
    const status = nf.querySelector("#nf-status");
    if (status) {
      status.innerHTML = state.status ? `<span class="nf-status-inner">${state.status}</span>` : "";
      status.classList.toggle("show", Boolean(state.status));
    }
    set(".nf-think-chip-text", phase || "");
    set(".nf-thinking-current", (state.steps && state.steps[state.steps.length - 1]) || phase || "");
    set(".nf-flow-prompt", state.said ? "You said: " + state.said : "");
    set(".nf-answer-short-text", state.answer || "");
    const q = state.quiet;
    const qLeft = nf.querySelector(".nf-q-left");
    const qRight = nf.querySelector(".nf-q-right");
    if (qLeft) qLeft.innerHTML = q?.left || "";
    if (qRight) qRight.innerHTML = q?.right || "";
    set(".nf-q-text", q?.text || "");
    nf.querySelector(".nf-q-text")?.classList.toggle("trimmed", state.classes.includes("nfq-long"));
    // renderQuietNotch sets this: the housing plus an 80pt ear each side, or the line.
    nf.style.setProperty("--nf-q-w", state.classes.includes("nfq-line") ? "420px" : "350px");

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
    if (state.panel) {
      const panel = nf.querySelector(".nf-panel-surface") as HTMLElement | null;
      const inner = nf.querySelector(".nf-panel-inner") as HTMLElement | null;
      nf.querySelector('.nf-panel-chars button[data-mascot="braino"]')?.classList.add("active");
      nf.querySelector('.nf-switch[data-setting="named"]')?.setAttribute("aria-checked", "true");
      if (panel && inner) {
        const cs = getComputedStyle(panel);
        const h = (parseFloat(cs.paddingTop) || 0) + inner.scrollHeight + (parseFloat(cs.paddingBottom) || 0);
        nf.style.setProperty("--nf-panel-height", `${Math.round(Math.max(220, h))}px`);
      }
      (nf.querySelector(".nf-panel-size") as HTMLElement | null)?.style.setProperty("--nf-size-fill", "0%");
    }
    // The renderer measures and sets these; without them the pill cannot grow.
    nf.style.setProperty("--nf-inline-height", cap?.height ? `${cap.height}px` : (cap ? "140px" : "168px"));
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
          <span>play the motion</span>
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
