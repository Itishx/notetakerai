import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseBrainoOsIntent } = require("../mac/braino-mac/braino-os-intent.cjs");

test("opens Braino OS when he is asked what he looks like", () => {
  for (const said of [
    "Braino, show me what Braino OS looks like",
    "show me braino os",
    "open braino OS",
    "what do you look like",
    "hey braino, let me see braino os",
  ]) {
    const intent = parseBrainoOsIntent(said);
    assert.equal(intent?.action, "open", said);
    assert.equal(intent?.system, null, said);
  }
});

test("opens straight into a named system", () => {
  assert.equal(parseBrainoOsIntent("show me your mind")?.system, "mind");
  assert.equal(parseBrainoOsIntent("Braino, show me what your mind looks like")?.system, "mind");
  assert.equal(parseBrainoOsIntent("let me see your heart")?.system, "heart");
  assert.equal(parseBrainoOsIntent("show me your ears")?.system, "ears");
  assert.equal(parseBrainoOsIntent("take me inside your memory")?.system, "memory");
});

/* A phrase that takes over the whole screen has to be certain. These are the
   sentences that contain the words and mean nothing of the sort. */
test("ordinary sentences never take the screen", () => {
  for (const said of [
    "put your heart into it",
    "learn it by heart",
    "my ears are ringing",
    "do you remember what I said",
    "keep that in mind",
    "show me the weather",
    "what does the deploy log look like",
  ]) {
    const intent = parseBrainoOsIntent(said);
    assert.notEqual(intent?.action, "open", said);
  }
});

test("closes only when Braino OS is named", () => {
  assert.equal(parseBrainoOsIntent("close braino os")?.action, "close");
  assert.equal(parseBrainoOsIntent("exit braino OS")?.action, "close");
  assert.equal(parseBrainoOsIntent("close this"), null);
});

/* Braino OS is not a browser pointed at the website.
 *
 * The first cut opened a BrowserWindow on the site route, which meant a web
 * page in a frame that needed the network to show you what he is made of. It
 * draws into the transparent full display overlay Braino already owns, so it is
 * the app itself, it works offline, and the voice pipeline already running in
 * that renderer is the one that talks over it. */
test("the surface is drawn in the app, not loaded from the web", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const block = main.slice(
    main.indexOf("function setBrainoOsSurface"),
    main.indexOf("function openDashboardWindow"),
  );
  // No second window, and nothing fetched.
  assert.doesNotMatch(block, /new BrowserWindow/);
  assert.doesNotMatch(block, /loadURL|https?:\/\//);
  // It drives the overlay that is already there.
  assert.match(block, /sendToRenderer\("braino-mac:braino-os"/);
  /* The overlay is deliberately unfocusable so it never steals the caret. A
     surface you click into and scroll has to take that back, and give it
     straight back afterwards. */
  assert.match(block, /dockWindow\.setFocusable\(next\)/);
  assert.match(block, /dockWindow\.setIgnoreMouseEvents\(!next/);
});

test("the drawn surface ships with the app", () => {
  const surface = readFileSync(new URL("../mac/braino-mac/renderer/braino-os.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../mac/braino-mac/renderer/index.html", import.meta.url), "utf8");
  // Loaded by the renderer that owns the notch, not by a page on the internet.
  assert.match(html, /braino-os\.js/);
  assert.match(html, /braino-os\.css/);
  // The four systems are the whole point of the picture.
  for (const system of ["THE MIND", "THE HEART", "THE EARS", "THE MEMORY"]) {
    assert.ok(surface.includes(system), system);
  }
  // It answers to the voice state rather than animating on its own.
  assert.match(surface, /setState\(state\)/);
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(renderer, /syncBrainoOsState\(status, text\)/);
});
