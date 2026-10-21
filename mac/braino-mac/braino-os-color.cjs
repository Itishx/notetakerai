"use strict";

/* "Braino, turn yourself orange."
 *
 * Braino OS is blue because that is what he looks like, not because anything
 * depends on it. Being able to say what colour you want him to be, and have him
 * become it, is the difference between a rendering and a thing that is his.
 *
 * Resolution goes as wide as is reasonable: every CSS colour name, any hex, any
 * literal rgb triple, and the ordinary modifiers people actually say out loud
 * such as "dark red", "light green", "neon pink".
 */

// The CSS named colours. This is the practical answer to "any colour that
// exists": it is the vocabulary people already have words for.
const NAMED = {
  aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "00ffff", aquamarine: "7fffd4",
  azure: "f0ffff", beige: "f5f5dc", bisque: "ffe4c4", black: "000000",
  blanchedalmond: "ffebcd", blue: "0000ff", blueviolet: "8a2be2", brown: "a52a2a",
  burlywood: "deb887", cadetblue: "5f9ea0", chartreuse: "7fff00", chocolate: "d2691e",
  coral: "ff7f50", cornflowerblue: "6495ed", cornsilk: "fff8dc", crimson: "dc143c",
  cyan: "00ffff", darkblue: "00008b", darkcyan: "008b8b", darkgoldenrod: "b8860b",
  darkgray: "a9a9a9", darkgreen: "006400", darkgrey: "a9a9a9", darkkhaki: "bdb76b",
  darkmagenta: "8b008b", darkolivegreen: "556b2f", darkorange: "ff8c00", darkorchid: "9932cc",
  darkred: "8b0000", darksalmon: "e9967a", darkseagreen: "8fbc8f", darkslateblue: "483d8b",
  darkslategray: "2f4f4f", darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493",
  deepskyblue: "00bfff", dimgray: "696969", dodgerblue: "1e90ff", firebrick: "b22222",
  floralwhite: "fffaf0", forestgreen: "228b22", fuchsia: "ff00ff", gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520", gray: "808080",
  green: "008000", greenyellow: "adff2f", grey: "808080", honeydew: "f0fff0",
  hotpink: "ff69b4", indianred: "cd5c5c", indigo: "4b0082", ivory: "fffff0",
  khaki: "f0e68c", lavender: "e6e6fa", lawngreen: "7cfc00", lemonchiffon: "fffacd",
  lightblue: "add8e6", lightcoral: "f08080", lightcyan: "e0ffff", lightgreen: "90ee90",
  lightgray: "d3d3d3", lightgrey: "d3d3d3", lightpink: "ffb6c1", lightsalmon: "ffa07a",
  lightseagreen: "20b2aa", lightskyblue: "87cefa", lightyellow: "ffffe0", lime: "00ff00",
  limegreen: "32cd32", linen: "faf0e6", magenta: "ff00ff", maroon: "800000",
  mediumaquamarine: "66cdaa", mediumblue: "0000cd", mediumorchid: "ba55d3", mediumpurple: "9370db",
  mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970",
  mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5", navajowhite: "ffdead",
  navy: "000080", oldlace: "fdf5e6", olive: "808000", olivedrab: "6b8e23",
  orange: "ffa500", orangered: "ff4500", orchid: "da70d6", palegoldenrod: "eee8aa",
  palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "db7093", papayawhip: "ffefd5",
  peachpuff: "ffdab9", peru: "cd853f", pink: "ffc0cb", plum: "dda0dd",
  powderblue: "b0e0e6", purple: "800080", rebeccapurple: "663399", red: "ff0000",
  rosybrown: "bc8f8f", royalblue: "4169e1", saddlebrown: "8b4513", salmon: "fa8072",
  sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee", sienna: "a0522d",
  silver: "c0c0c0", skyblue: "87ceeb", slateblue: "6a5acd", slategray: "708090",
  snow: "fffafa", springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c",
  teal: "008080", thistle: "d8bfd8", tomato: "ff6347", turquoise: "40e0d0",
  violet: "ee82ee", wheat: "f5deb3", white: "ffffff", whitesmoke: "f5f5f5",
  yellow: "ffff00", yellowgreen: "9acd32",
};

/* Words people put in front of a colour. They are not colours themselves, so
   they are lifted off, the colour underneath is resolved, and then the word is
   applied as what it actually means. */
const MODIFIERS = {
  dark: { light: 0.62 }, deep: { light: 0.6 }, darker: { light: 0.55 },
  light: { light: 1.28, sat: 0.85 }, pale: { light: 1.3, sat: 0.55 },
  bright: { light: 1.12, sat: 1.25 }, vivid: { sat: 1.35 },
  neon: { light: 1.15, sat: 1.6 }, electric: { light: 1.12, sat: 1.5 },
  hot: { sat: 1.4 }, soft: { sat: 0.7, light: 1.12 }, dull: { sat: 0.55 },
};

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function hexToRgb(hex) {
  let clean = String(hex || "").replace(/^#/, "").trim();
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHsl(rgb) {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(hsl) {
  const h = ((hsl[0] % 1) + 1) % 1;
  const s = clamp(hsl[1], 0, 1);
  const l = clamp(hsl[2], 0, 1);
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

/* Turns whatever was said into a colour, or into nothing. */
function resolveColor(raw) {
  const said = String(raw || "").toLowerCase().trim().replace(/[.!?]+$/, "");
  if (!said) return null;

  const hex = said.match(/#?\b([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hex && (said.includes("#") || /\bhex\b/.test(said))) {
    const rgb = hexToRgb(hex[1]);
    if (rgb) return { rgb, name: "#" + hex[1].toLowerCase() };
  }

  const triple = said.match(/rgb\s*\(?\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (triple) {
    const rgb = [Number(triple[1]), Number(triple[2]), Number(triple[3])].map((v) => clamp(v, 0, 255));
    return { rgb, name: "rgb(" + rgb.join(", ") + ")" };
  }

  // Longest name first, so "dark sea green" beats "green".
  const collapsed = said.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const words = collapsed.split(" ");
  for (let start = 0; start < words.length; start += 1) {
    for (let end = words.length; end > start; end -= 1) {
      const phrase = words.slice(start, end).join("");
      if (NAMED[phrase]) {
        return { rgb: hexToRgb(NAMED[phrase]), name: words.slice(start, end).join(" ") };
      }
    }
  }

  // Nothing matched whole, so try lifting a modifier off the front of a colour.
  for (let i = 0; i < words.length - 1; i += 1) {
    const mod = MODIFIERS[words[i]];
    if (!mod) continue;
    for (let end = words.length; end > i + 1; end -= 1) {
      const phrase = words.slice(i + 1, end).join("");
      if (!NAMED[phrase]) continue;
      const hsl = rgbToHsl(hexToRgb(NAMED[phrase]));
      const shifted = [
        hsl[0],
        clamp(hsl[1] * (mod.sat || 1), 0, 1),
        clamp(hsl[2] * (mod.light || 1), 0.05, 0.95),
      ];
      return { rgb: hslToRgb(shifted), name: words.slice(i, end).join(" ") };
    }
  }

  return null;
}

const ASK = /\b(?:turn|change|make|paint|colou?r|go|become|switch)\b/;
const SELF = /\b(?:yourself|your ?self|you|your colou?r|braino|the colou?r|it)\b/;
const NOT_COLOUR = /\b(?:profiles?|tabs?|chrome|browser|accounts?|windows?|apps?|settings|mode|playlist|songs?|channel|meeting|calendar|whatsapp|spotify|youtube)\b/;
const RESET = /\b(?:be yourself|back to (?:normal|blue|yourself)|reset|default|normal again|original)\b/;

/* Only ever a deliberate instruction. "I like red" does not repaint him. */
function parseBrainoOsColorIntent(raw) {
  const text = String(raw || "")
    .toLowerCase()
    .replace(/^\s*(?:hey\s+)?(?:braino|breno|braido|brainer)[\s,]+/, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  /* "Switch to my default, my main profile" reset his colour and opened Braino
     OS (2026-10-18): "switch" + "default" was enough. A sentence about a
     profile, tab, app or account is never about his colour. */
  if (NOT_COLOUR.test(text)) return null;

  // Reset needs the colour itself, or "be yourself": "default" alone is not his colour.
  if (RESET.test(text) && (/\bcolou?r\b/.test(text) || /\b(?:be yourself|back to (?:blue|yourself))\b/.test(text))) {
    return { action: "reset", say: "Back to blue." };
  }

  if (!ASK.test(text)) return null;

  const found = resolveColor(text);
  if (!found) return null;

  /* Something has to point the instruction at him rather than at the world.
     Usually that is the word "yourself". When it is not, the only thing that
     counts is a sentence that is nothing but the instruction: "go crimson" is
     him, "make me a green tea" is not. */
  if (!SELF.test(text)) {
    const bare = text
      .replace(/^(?:go|become|turn|switch|change|make|paint)\s+/, "")
      .replace(/^(?:to|into)\s+/, "")
      .trim();
    if (bare !== found.name) return null;
  }
  return {
    action: "color",
    color: found.rgb,
    name: found.name,
    say: found.name.charAt(0).toUpperCase() + found.name.slice(1) + " it is.",
  };
}

module.exports = { parseBrainoOsColorIntent, resolveColor, rgbToHsl, hslToRgb, NAMED };
