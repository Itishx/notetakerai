/**
 * brainoWalkerSvg.ts — the EXACT walker mascot SVG from the browser extension
 * (extension/content.js: __SBWK_SHOE / __SBWK_BODY / __SBWK_REACT / __SBWK_MOONLEGS /
 * __SBWK_SVG). Self-contained gradients (sbwk-*), with the reaction / specs / fedora /
 * moonwalk-leg overlays. This is a hand-kept duplicate of the extension art — if the
 * extension walker art changes, mirror it here.
 *
 * viewBox="-8 -34 116 142", intrinsic 64×78. Element ids the animation drives:
 *   #__sbwk_root__, #__sbwk_ll__ / #__sbwk_rl__ (legs), #__sbwk_la__/#__sbwk_la_bg__ /
 *   #__sbwk_ra__/#__sbwk_ra_bg__ (arms), #__sbwk_eye_l__/r + #__sbwk_pupil_l__/r,
 *   #__sbwk_mouth__ (#__sbwk_smile__ + #__sbwk_talk__), #__sbwk_react__ (#__sbwk_rs__/rc/rt),
 *   #__sbwk_specs__, #__sbwk_fedora__, #__sbwk_moonlegs__ (#__sbwk_mw_r__/rh/l/lh).
 */

const SHOE = `<path d="M 45 74 L 42.5 87" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><path d="M 45 74 L 42.5 87" fill="none" stroke="url(#sbb-fill)" stroke-width="5.5" stroke-linecap="round"/><path d="M 47.5 89 C 47.5 87 44.5 86.4 42 87.4 C 36 89.2 29.6 90.6 25.2 94.2 C 22.2 96.7 21.8 99.4 25 100.8 C 27 101.6 31 101.6 35 101.6 L 45.6 101.6 C 47.1 101.6 47.8 100.6 47.5 99.1 Z" fill="white" stroke="rgba(176,86,78,.42)" stroke-width="0.9" stroke-linejoin="round"/><path d="M 23 98.6 Q 21.2 101.2 25.6 101.5 L 45.6 101.5 Q 47.8 101.3 47.4 98.9 Q 34.5 100.1 23 98.6 Z" fill="#F6E2DC" stroke="rgba(176,86,78,.42)" stroke-width="0.8" stroke-linejoin="round"/><g fill="none" stroke="#C9544A" stroke-width="0.85" stroke-linecap="round" opacity="0.7"><path d="M 29.5 90 Q 36 88.5 43 89.2"/><path d="M 32 92.7 Q 37.5 91.7 43 92.2" opacity="0.6"/></g><ellipse cx="30" cy="92.4" rx="3" ry="1.4" fill="#fff" opacity="0.6" transform="rotate(-12 30 92.4)"/>`;

const BODY = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 68 80.5 60 79.5 50 79 C 40 79.5 32 80.5 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";

const REACT = `<g id="__sbwk_react__" display="none">`
  + `<g id="__sbwk_rs__" display="none">`
    + `<circle cx="38" cy="47.4" r="7.8" fill="white"/><circle cx="62" cy="47.4" r="7.8" fill="white"/>`
    + `<circle cx="39" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="39.8" cy="45.4" r="0.9" fill="white"/>`
    + `<circle cx="61" cy="46.4" r="2.4" fill="#1B1713"/><circle cx="61.8" cy="45.4" r="0.9" fill="white"/>`
    + `<path d="M 32 41.5 Q 37 40 43 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`
    + `<path d="M 68 41.5 Q 63 40 57 41.8" fill="none" stroke="#8A2F28" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`
    + `<ellipse cx="50" cy="64" rx="3" ry="3.8" fill="#6E211A"/>`
    + `<path id="__sbwk_sweat__" d="M 79 39 C 82 43 82 46 79 47 C 76 46 76 43 79 39 Z" fill="#CFEFFF"/>`
  + `</g>`
  + `<g id="__sbwk_rc__" display="none">`
    + `<path d="M 32.5 49 Q 38 54.5 43.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 56.5 49 Q 62 54.5 67.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 42 59 Q 50 73.5 58 59 Q 50 62 42 59 Z" fill="#6E211A"/>`
    + `<path d="M 45.5 64.5 Q 50 70 54.5 64.5 Q 50 66.5 45.5 64.5 Z" fill="#E8786E"/>`
    + `<path d="M 43 60 Q 50 62.4 57 60" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`
    + `<g id="__sbwk_confetti__"><circle cx="12" cy="22" r="2.5" fill="#FFD700"/><circle cx="88" cy="20" r="2" fill="#FF69B4"/><circle cx="6" cy="44" r="2" fill="#7EC8E3"/><circle cx="94" cy="42" r="2.2" fill="#90EE90"/><circle cx="20" cy="10" r="1.8" fill="#FF8C42"/><circle cx="80" cy="10" r="1.8" fill="#E14A48"/></g>`
  + `</g>`
  + `<g id="__sbwk_rt__" display="none">`
    + `<path d="M 32.5 49 Q 38 54.5 43.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 56.5 49 Q 62 54.5 67.5 49" fill="none" stroke="#1B1713" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M 42 59 Q 50 73.5 58 59 Q 50 62 42 59 Z" fill="#6E211A"/>`
    + `<path d="M 45.5 64.5 Q 50 70 54.5 64.5 Q 50 66.5 45.5 64.5 Z" fill="#E8786E"/>`
    + `<path d="M 43 60 Q 50 62.4 57 60" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`
    + `<path id="__sbwk_tear_l__" d="M 30 50.5 C 33 54.5 33 57 30 58 C 27 57 27 54.5 30 50.5 Z" fill="#DFF4FF"/>`
    + `<path id="__sbwk_tear_r__" d="M 70 50.5 C 73 54.5 73 57 70 58 C 67 57 67 54.5 70 50.5 Z" fill="#DFF4FF"/>`
  + `</g>`
  + `</g>`;

const MOONLEGS = `<g id="__sbwk_moonlegs__" display="none"><g transform="translate(100,0) scale(-1,1)">`
  + `<g id="__sbwk_mw_r__" transform="translate(12 0)"><g id="__sbwk_mw_rh__" transform="rotate(0 24 101)">${SHOE}</g></g>`
  + `<g id="__sbwk_mw_l__" transform="translate(0 0)"><g id="__sbwk_mw_lh__" transform="rotate(0 24 101)">${SHOE}</g></g>`
  + `</g></g>`;

export const BRAINO_WALKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -34 116 142" width="64" height="78" overflow="visible" style="display:block"><defs><linearGradient id="sbwk-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient><linearGradient id="sbwk-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9645A"/><stop offset="1" stop-color="#9C3E36"/></linearGradient><radialGradient id="sbwk-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs><g id="__sbwk_root__">${MOONLEGS}<g id="__sbwk_ll__">${SHOE}</g><g id="__sbwk_rl__"><g transform="translate(100,0) scale(-1,1)">${SHOE}</g></g><g id="__sbwk_la_bg__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><g id="__sbwk_ra_bg__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g><path d="${BODY}" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/><g id="__sbwk_la__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><g transform="translate(7 64)" stroke="rgba(176,86,78,.42)" stroke-width="0.7"><circle cx="5" cy="-1.4" r="3" fill="white"/><circle cx="0" cy="0.6" r="7" fill="white"/><g fill="none" stroke="#C9544A" stroke-width="0.8" stroke-linecap="round" opacity="0.55"><path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8"/><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2"/><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8"/></g><path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" stroke-width="1.1" stroke-linecap="round"/></g></g><g id="__sbwk_ra__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="url(#sbb-fill)" stroke-width="6" stroke-linecap="round"/><g transform="translate(93 64)" stroke="rgba(176,86,78,.42)" stroke-width="0.7"><circle cx="-5" cy="-1.4" r="3" fill="white"/><circle cx="0" cy="0.6" r="7" fill="white"/><g fill="none" stroke="#C9544A" stroke-width="0.8" stroke-linecap="round" opacity="0.55"><path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8"/><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2"/><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8"/></g><path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" stroke-width="1.1" stroke-linecap="round"/></g></g><path d="${BODY}" fill="url(#sbb-fill)"/><path d="${BODY}" fill="url(#sbb-glow)"/><path d="M 50 8 Q 49 30 50 50 Q 50.5 60 50 65" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/><path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/><path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/><path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/><g id="__sbwk_eye_l__"><circle cx="38" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_l__"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g></g><g id="__sbwk_eye_r__"><circle cx="62" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_r__"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g></g><ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><g id="__sbwk_mouth__"><path id="__sbwk_smile__" d="M 43.5 60 Q 50 67.5 56.5 60" fill="none" stroke="#1B1713" stroke-width="1.9" stroke-linecap="round"/><g id="__sbwk_talk__" style="display:none"><ellipse id="__sbwk_te__" cx="50" cy="61.8" rx="3.5" ry="1.4" fill="#8A2F28"/><ellipse id="__sbwk_ti__" cx="50" cy="62.5" rx="2.2" ry="0.7" fill="#E8776E"/></g></g></g></svg>`
  .replaceAll("url(#sbb-fill)", "url(#sbwk-fill)")
  .replaceAll("url(#sbb-glow)", "url(#sbwk-glow)")
  .replaceAll("url(#sbb-dark)", "url(#sbwk-dark)")
  .replace("</g></g></g></svg>", "</g></g>" + REACT + "</g></svg>")
  .replace("</g></svg>",
    '<g id="__sbwk_specs__" display="none">' +
    '<circle cx="38" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>' +
    '<circle cx="62" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>' +
    '<path d="M 47.2 48 L 52.8 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '<path d="M 28.8 46 Q 24 45 21 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '<path d="M 71.2 46 Q 76 45 79 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>' +
    '</g></g></svg>')
  .replace("</g></svg>",
    '<g id="__sbwk_fedora__" display="none" transform="rotate(-12 50 2)">' +
    '<path d="M 31 4 C 31 -17 39 -24 50 -24 C 61 -24 69 -17 69 4 Z" fill="#14110f" stroke="#000" stroke-width="0.6"/>' +
    '<path d="M 44 -22 Q 50 -18 56 -22" fill="none" stroke="#2c2723" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M 31 3 Q 50 9 69 3 L 69 -2 Q 50 4 31 -2 Z" fill="#000"/>' +
    '<ellipse cx="50" cy="4" rx="45" ry="8.5" fill="#14110f" stroke="#000" stroke-width="0.6"/>' +
    '<ellipse cx="50" cy="3" rx="32" ry="5" fill="#000" opacity="0.6"/>' +
    '<path d="M 37 -20 Q 35 -8 38 2" fill="none" stroke="#3a332e" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>' +
    '<path d="M 12 5 Q 50 12 88 5" fill="none" stroke="#3a332e" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>' +
    '</g></g></svg>');
