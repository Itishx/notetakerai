/**
 * webbWalkerSvg.ts — Webb's desktop-walker sprite. A hand-kept duplicate of
 * brainoWalkerSvg.ts's structure (same viewBox, same intrinsic size, same
 * element ids) so the existing walker animation driver (braino-mac.js /
 * BrainoWalker.tsx — walk cycle, drag physics, blink, talk mouth) animates
 * Webb with zero changes to that driver's math. Only the artwork differs,
 * and it's the ACTUAL design: mask, torso, arm curves, and the signature
 * teardrop-lens eyes are taken directly from the Claude Design source
 * (mascot-webb.jsx) / WebbChar.tsx, not reinvented.
 *
 * Solid fills, not gradients: this renders inside Electron via
 * `walkerFlip.innerHTML = <svg>...`, and url(#gradientId) fills silently
 * failed to resolve there even though the identical markup rendered fine in
 * a plain Chromium/Playwright check — solid colors sidestep whatever's
 * different about that context rather than chasing it further.
 *
 * Braino's walker has arm-rotation and eye-blink pivots hardcoded to HIS
 * shoulder/eye coordinates (22/78,53 and 38/62,48). Webb's shoulders (35/65,46)
 * and eye centers (37/63,26) sit elsewhere, so the __sbwk_la__/__sbwk_ra__ and
 * __sbwk_eye_l__/__sbwk_eye_r__ groups below carry data-pivot-x/data-pivot-y —
 * braino-mac.js's pivotOf() reads these instead of assuming Braino's numbers.
 * Legs have no such override mechanism (their pivot is baked into every
 * rotate() call as a literal), so they reuse Braino's exact leg geometry,
 * recolored, rather than a shape that would rotate from the wrong point.
 *
 * Not ported (Webb doesn't have these yet): reactions, specs/fedora
 * accessories, moonwalk legs, pupil eye-tracking (his eyes are a single
 * static teardrop shape, not a sclera+pupil pair — the driver's pupil-gaze
 * code targets #__sbwk_pupil_l__/__sbwk_pupil_r__, which simply don't exist
 * here, and every read of them is optional-chained, so this is inert, not
 * broken). The walker driver treats all of these as optional (`q(...)?.`).
 */

const WEBB_AMBER = "#E8873F";
const WEBB_DARK = "#1C1815";

const WEBB_SHOE = `<path d="M 45 74 L 42.5 89" fill="none" stroke="${WEBB_AMBER}" stroke-width="6.5" stroke-linecap="round"/><path d="M 47.5 91 C 47.5 89 44.5 88.4 42 89.4 C 36 91.2 29.6 92.6 25.2 96.2 C 22.2 98.7 21.8 101.4 25 102.8 C 27 103.6 31 103.6 35 103.6 L 45.6 103.6 C 47.1 103.6 47.8 102.6 47.5 101.1 Z" fill="${WEBB_DARK}" stroke="#000" stroke-width="0.9" stroke-linejoin="round"/><ellipse cx="30" cy="94.4" rx="3" ry="1.4" fill="#3a332e" opacity="0.5" transform="rotate(-12 30 94.4)"/>`;

const WEBB_TORSO = `<path d="M 34 44 Q 30 58 36 70 Q 50 78 64 70 Q 70 58 66 44 Q 58 34 50 34 Q 42 34 34 44 Z" fill="${WEBB_AMBER}" stroke="#8A2A22" stroke-width="0.9" stroke-linejoin="round"/><g fill="none" stroke="#141110" stroke-width="0.7" opacity="0.6"><path d="M 40 40 L 60 66"/><path d="M 60 40 L 40 66"/><path d="M 50 34 L 50 72"/></g>`;

const WEBB_MASK = `<path d="M 32 32 Q 28 12 50 9 Q 72 12 68 32 Q 66 42 50 44 Q 34 42 32 32 Z" fill="${WEBB_DARK}"/><g fill="none" stroke="#3a332e" stroke-width="0.6" opacity="0.6"><path d="M 40 14 L 46 34"/><path d="M 50 11 L 50 40"/><path d="M 60 14 L 54 34"/></g>`;

export const WEBB_WALKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -34 116 142" width="64" height="78" overflow="visible" style="display:block"><g id="__sbwk_root__"><g id="__sbwk_ll__">${WEBB_SHOE}</g><g id="__sbwk_rl__"><g transform="translate(100,0) scale(-1,1)">${WEBB_SHOE}</g></g><g id="__sbwk_la_bg__"><path d="M 35 46 Q 22 50 16 62" fill="none" stroke="white" stroke-width="9.5" stroke-linecap="round"/></g><g id="__sbwk_ra_bg__"><path d="M 65 46 Q 78 50 84 62" fill="none" stroke="white" stroke-width="9.5" stroke-linecap="round"/></g>${WEBB_TORSO}<g id="__sbwk_la__" data-pivot-x="35" data-pivot-y="46"><path d="M 35 46 Q 22 50 16 62" fill="none" stroke="${WEBB_AMBER}" stroke-width="7.5" stroke-linecap="round"/><circle cx="14" cy="64" r="4.6" fill="${WEBB_DARK}"/></g><g id="__sbwk_ra__" data-pivot-x="65" data-pivot-y="46"><path d="M 65 46 Q 78 50 84 62" fill="none" stroke="${WEBB_AMBER}" stroke-width="7.5" stroke-linecap="round"/><circle cx="86" cy="64" r="4.6" fill="${WEBB_DARK}"/></g>${WEBB_MASK}<g id="__sbwk_eye_l__" data-pivot-x="37" data-pivot-y="26"><path d="M 28 28 Q 37 18 47 26 Q 37 34 28 28 Z" fill="#F3C05C"/></g><g id="__sbwk_eye_r__" data-pivot-x="63" data-pivot-y="26"><path d="M 72 28 Q 63 18 53 26 Q 63 34 72 28 Z" fill="#F3C05C"/></g><g id="__sbwk_mouth__"><path id="__sbwk_smile__" d="M 44 37 Q 50 38 56 37" fill="none" stroke="#3a332e" stroke-width="1.2" stroke-linecap="round"/><g id="__sbwk_talk__" style="display:none"><ellipse id="__sbwk_te__" cx="50" cy="37" rx="3.5" ry="1.4" fill="#3a332e"/><ellipse id="__sbwk_ti__" cx="50" cy="37.7" rx="2.2" ry="0.7" fill="#5c5048"/></g></g></g></svg>`;
