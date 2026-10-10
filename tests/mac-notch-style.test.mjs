import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-09-28: two notches, chosen in Settings. "braino" is the notch as it
   always was and stays the default; "affective" is the AffectiveOS notch. */
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs");
const preload = read("preload.cjs");
const css = read("renderer/braino-mac.css");
const js = read("renderer/braino-mac.js");
const html = read("renderer/index.html");
const dash = read("renderer/dashboard.html");
const dashJs = read("renderer/dashboard.js");

test("Braino stays the default, and only two styles exist", () => {
  assert.match(main, /const NOTCH_STYLES = new Set\(\["braino", "affective"\]\);/);
  assert.match(main, /return NOTCH_STYLES\.has\(style\) \? style : "braino";\s*\} catch \(_\) \{ return "braino"; \}/);
  assert.match(main, /const next = NOTCH_STYLES\.has\(style\) \? style : "braino";/);
});

test("a change is saved and reaches the notch live", () => {
  assert.match(main, /sendToRenderer\("braino-mac:notch-style", \{ style: next \}\);/);
  assert.match(preload, /notchStyle: \(style\) => ipcRenderer\.invoke\("braino-mac:notch-style"/);
  assert.match(preload, /onNotchStyle:/);
  assert.match(js, /notchFace\?\.classList\.toggle\("nf-aos", on\);/);
  assert.match(js, /window\.brainoMac\.onNotchStyle\?\.\(\(payload\) => applyNotchStyle\(payload\?\.style\)\);/);
});

test("every AffectiveOS rule is scoped, so the Braino notch is untouched", () => {
  const block = css.slice(css.indexOf("/* ── AffectiveOS notch style"));
  assert.ok(block.length > 200);
  const selectors = block.replace(/\/\*[\s\S]*?\*\//g, "").match(/^[^{}@\n][^{}]*\{/gm) || [];
  for (const sel of selectors) {
    if (/^\s*(to|from)\s*\{/.test(sel)) continue;
    // Base (hidden) rules for the new elements are fine; anything that styles
    // existing notch parts must require .nf-aos.
    if (/\.nf-aos-(logo|band)\s*\{/.test(sel) && !/nf-aos\./.test(sel)) continue;
    assert.match(sel, /#notch-face\.nf-aos|body\.aos-notch/, sel.trim());
  }
  assert.match(block, /#notch-face \.nf-aos-logo \{ display: none; \}/);
  assert.match(block, /#notch-face \.nf-aos-band \{[\s\S]*opacity: 0;/);
});

test("his lines carry the Affective logo in that style, and thinking lights the island", () => {
  assert.equal((html.match(/class="nf-aos-logo" src="assets\/affective-logo-white\.png"/g) || []).length, 2);
  assert.match(html, /<i class="nf-aos-band" aria-hidden="true"><\/i>/);
  assert.match(css, /#notch-face\.nf-aos \.nf-answer-short-row small,[\s\S]*\{ display: none; \}/);
  assert.match(css, /#notch-face\.nf-aos\.nf-inline-working \.nf-pill,\s*#notch-face\.nf-aos\.nf-thinking \.nf-pill \{[\s\S]*animation: nfAosSpin/);
});

test("the colour moves through the spectrum, ten seconds a colour", () => {
  assert.match(js, /const NF_AOS_SPECTRUM = \[/);
  assert.match(js, /Math\.floor\(t \/ 10\) % n/);
});

test("Settings offers both, Braino first", () => {
  const seg = dash.slice(dash.indexOf('id="notch-style"'), dash.indexOf("</div>", dash.indexOf('id="notch-style"')));
  assert.ok(seg.indexOf('data-style="braino"') < seg.indexOf('data-style="affective"'));
  assert.match(dashJs, /api\.notchStyle\?\.\(button\.dataset\.style\)/);
});

test("the Braino app's Appearance page has the switch too (⌘⇧D opens this one)", () => {
  const app = read("renderer/app.js");
  assert.match(app, /seg\(\[\["braino", "Braino"\], \["affective", "AffectiveOS"\]\], S\.notchStyle \|\| "braino", "notch", "Notch style"\)/);
  assert.match(app, /if \(key === "notch"\) \{ S\.notchStyle = v; await call\("notchStyle", v\);/);
});

test("the AffectiveOS notch has no Braino in it, and he comes back on switching", () => {
  assert.match(js, /document\.body\.classList\.toggle\("aos-notch", on\);/);
  assert.match(css, /body\.aos-notch #walker,\s*body\.aos-notch #speech-bubble,\s*body\.aos-notch #status-pill \{ opacity: 0 !important;/);
  // His own hide setting is a different class, so switching back restores it as it was.
  assert.doesNotMatch(js.slice(js.indexOf("function applyNotchStyle"), js.indexOf("function applyNotchStyle") + 700), /setMascotHide/);
});

test("no thinking steps drop below the AffectiveOS notch", () => {
  assert.match(css, /#notch-face\.nf-aos \.nf-thinking-canvas,\s*#notch-face\.nf-aos \.nf-think-chip,\s*#notch-face\.nf-aos \.nf-think-arrow \{ display: none !important; \}/);
  assert.match(js, /if \(open && notchFace\.classList\.contains\("nf-aos"\)\) open = false;/);
});
