import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.css", import.meta.url), "utf8");

test("his menu has the three ways to hide him, and says how to get him back", () => {
  for (const m of ["hour", "hidden", "stealth"]) assert.match(html, new RegExp(`data-hide="${m}"`));
  assert.match(html, /Braino, come back/);
});

test("he comes back by voice, by Command+Shift+B, by a click on the notch, or after the hour", () => {
  const body = js.slice(js.indexOf("function parseMascotHidePhrase"), js.indexOf("async function handleMascotHidePhrase"));
  let hidden = true;
  const parse = new Function("STEALTH_LEAD", "mascotHidden", `${body}; return parseMascotHidePhrase;`)(/^(?:brain(?:o)?\b)?[\s,.!]*/i, () => hidden);
  assert.equal(parse("Braino, hide yourself"), "hidden");
  assert.equal(parse("hide for an hour"), "hour");
  assert.equal(parse("Braino, come back"), "show");
  hidden = false;
  assert.equal(parse("come back"), "", "come back only means this while he is hidden");
  assert.match(js, /setMascotHide\(mascotHidden\(\) \? null : "hidden", "hotkey"\)/);
  assert.match(js, /if \(mascotHidden\(\)\) setMascotHide\(null, "notch_click"\)/);
  assert.match(js, /mascotHide\?\.until && Date\.now\(\) >= mascotHide\.until\) setMascotHide\(null, "timer"\)/);
});

test("hidden he takes no clicks; stealth he is faint and shows on hover", () => {
  assert.match(css, /body\.mascot-hidden #walker[\s\S]{0,260}pointer-events: none/);
  assert.match(css, /body\.mascot-stealth\.mascot-peek #walker/);
  assert.match(js, /mascotHide\?\.mode !== "hidden" && rectContains\(walkerRect, x, y, 18\)/);
});
