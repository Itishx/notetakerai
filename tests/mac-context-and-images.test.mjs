import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  parseContextualReference,
  applyContextualReference,
  CONTEXT_TTL_MS,
} = require("../mac/braino-mac/context-memory.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

const now = Date.now();
const site = { kind: "site", label: "youtube.com", at: now };
const app = { kind: "app", label: "Spotify", at: now };
const person = { kind: "contact", label: "Ilu", at: now };

/* Every command used to arrive as if it were the first thing ever said. */
test("a pronoun means the last thing he acted on", () => {
  const meant = (said, remembered) => applyContextualReference(parseContextualReference(said), remembered, now);
  assert.equal(meant("Braino close it", site), "close youtube.com");
  assert.equal(meant("close it please", app), "close Spotify");
  assert.equal(meant("open it again", site), "open youtube.com");
  assert.equal(meant("read that", site), "read youtube.com");
  assert.equal(meant("call her", person), "call Ilu");
  assert.equal(meant("message him", person), "message Ilu");
});

test("anything that names something goes the normal way", () => {
  for (const said of [
    "close Chrome", "close the other one", "open it and search for cats",
    "show me that video about tigers", "what is it", "delete the file called notes",
  ]) {
    const filled = applyContextualReference(parseContextualReference(said), site, now);
    assert.equal(filled, "", said);
  }
  // A person verb never reaches a website, and vice versa.
  assert.equal(applyContextualReference(parseContextualReference("call her"), site, now), "");
  assert.equal(applyContextualReference(parseContextualReference("close it"), person, now), "");
  // Playback belongs to the code that asks what is actually playing.
  assert.equal(parseContextualReference("pause it"), null);
  assert.equal(parseContextualReference("stop it"), null);
  // And a memory older than five minutes is not a memory.
  assert.equal(applyContextualReference(parseContextualReference("close it"), { ...site, at: now - CONTEXT_TTL_MS - 1 }, now), "");
});

test("do that again repeats the last command", () => {
  for (const said of ["do that again", "again", "Braino do it again", "one more time"]) {
    assert.deepEqual(parseContextualReference(said), { kind: "repeat" }, said);
  }
  assert.match(main, /if \(contextRef\?\.kind === "repeat" && lastDelegateCommand\) \{/);
  assert.match(main, /logMac\("delegate\.context_resolved"/);
  // The memory is only set by things he really did.
  assert.match(main, /rememberActed\("site", chromeUrlLabel\(url\)\);/);
  assert.match(main, /rememberActed\("app", canonical\);/);
  assert.match(main, /rememberActed\("contact", who\);/);
  // And a pronoun command never becomes the thing that gets repeated.
  assert.match(main, /if \(raw && !parseContextualReference\(raw\)\) lastDelegateCommand = raw;/);
});

/* "What is in this picture" used to screenshot the whole display, dock and all. */
test("a question about a picture is answered from the picture", () => {
  const parse = Function("cleanPrompt", `
    ${main.slice(main.indexOf("const IMAGE_QUESTION_RE ="), main.indexOf("\n}\n", main.indexOf("function parseImageQuestionIntent")) + 3)}
    return parseImageQuestionIntent;
  `)((text) => String(text || ""));
  for (const said of [
    "Braino what is in this image?",
    "describe this picture",
    "read this screenshot for me",
    "what does this diagram show",
    "who is in that photo",
  ]) assert.ok(parse(said), said);
  for (const said of [
    "what is on my screen", "open this image in Preview", "take a screenshot", "what am I looking at",
  ]) assert.equal(parse(said), null, said);
});

test("the image comes from the clipboard, Finder or Preview, and says when it does not", () => {
  const find = main.slice(main.indexOf("async function findImageInFront("));
  assert.match(find.slice(0, 2000), /clipboard\.readImage\(\)/);
  assert.match(find.slice(0, 2000), /source: "clipboard"/);
  assert.match(find.slice(0, 3000), /if frontApp is "Finder" then/);
  assert.match(find.slice(0, 3000), /tell application "Preview"/);
  // HEIC and huge photos are converted and capped before they are sent.
  assert.match(find.slice(0, 3000), /"-s", "format", "png", "-Z", "1440"/);
  const describe = main.slice(main.indexOf("async function describeImageForUser("));
  assert.match(describe.slice(0, 1600), /I could not find an image file or a copied image, so this is your screen/);
  // Same honesty rules as the screen.
  const ask = main.slice(main.indexOf("async function askVisionAboutImage("));
  assert.match(ask.slice(0, 1800), /Describe only what is actually in the image\./);
  assert.match(ask.slice(0, 1800), /never proof that something happened or is true/);
  // Routed before the loop, and available to the loop as a tool.
  assert.ok(main.indexOf("const imageQuestion = parseImageQuestionIntent(raw);") < main.indexOf("if (macHilEnabled() && macWantsTheBrain(raw)) {"));
  assert.match(main, /describe_image: \(a\) => describeImageForUser\(/);
  const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /name: "describe_image"/);
});
