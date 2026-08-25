import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const { parseWallpaperIntent } = require("../mac/braino-mac/wallpaper-intent.cjs");
const file = JSON.parse(read("../shared/wallpaperLooks.json"));
const looks = file.looks;
const main = read("../mac/braino-mac/main.cjs");

test("the set is whole", () => {
  assert.ok(looks.length >= 10, "a set of looks, not a couple");
  assert.equal(new Set(looks.map((look) => look.id)).size, looks.length, "ids are unique");
  for (const look of looks) {
    for (const key of ["id", "name", "family", "timeOfDay", "background", "ink", "inkSoft", "glass", "glassBorder", "vignette", "clockFont"]) {
      assert.ok(look[key], `${look.id} is missing ${key}`);
    }
    assert.ok(typeof look.grain === "number" && look.grain > 0, `${look.id} has grain`);
    assert.ok(["Light", "Dark", "Colour", "Editorial"].includes(look.family), `${look.id} family`);
    assert.ok(["dawn", "day", "dusk", "night"].includes(look.timeOfDay), `${look.id} time of day`);
    /* Painted, never photographed: nothing here may point at a file. */
    assert.doesNotMatch(look.background, /url\(/i, `${look.id} is drawn, not fetched`);
  }
  /* One of them is the wordmark rather than wearing it. */
  assert.equal(looks.filter((look) => look.signature).length, 1);
  /* Every hour of the day has something to show. */
  for (const when of ["dawn", "day", "dusk", "night"]) {
    assert.ok(looks.some((look) => look.timeOfDay === when), `nothing for ${when}`);
  }
});

/* Braino never writes a dash of any kind, and these are lines in his voice. */
test("the lines under the clock sound like him", () => {
  for (const look of looks) {
    if (!look.quote) continue;
    assert.doesNotMatch(look.quote, /[—–-]/, `${look.id}: ${look.quote}`);
    assert.ok(look.quote.length <= 52, `${look.id} quote is short enough to read at a glance`);
  }
});

/* One file underneath both surfaces, or a look means two different things on
   two screens. */
test("the website and the Mac read the same file", () => {
  assert.match(read("../src/lib/wallpaperLooks.ts"), /shared\/wallpaperLooks\.json/);
  assert.match(main, /WALLPAPER_LOOKS_PATH = path\.join\(ROOT_DIR, "shared", "wallpaperLooks\.json"\)/);
  /* The Mac renderer keeps no set of its own: it is handed one on open. */
  const surface = read("../mac/braino-mac/renderer/wallpaper.js");
  assert.match(surface, /payload\.looks/);
  assert.equal((surface.match(/^\s{4}id: "/gm) || []).length, 1, "only the bare fallback is written in the renderer");
});

test("asking to change the wallpaper gets one of his", () => {
  for (const said of [
    "Braino, could you please change the wallpaper?",
    "change my wallpaper",
    "give me a new wallpaper",
    "switch my desktop background",
  ]) {
    assert.equal(parseWallpaperIntent(said, looks)?.mode, "braino", said);
  }
  /* Naming one of his beats searching the web for a picture of the word. */
  assert.deepEqual(parseWallpaperIntent("set my wallpaper to obsidian", looks), { mode: "braino", look: "obsidian" });
  assert.deepEqual(parseWallpaperIntent("make signature my wallpaper", looks), { mode: "braino", look: "signature" });
  /* Anything else is still a picture of a thing. */
  assert.deepEqual(parseWallpaperIntent("set my wallpaper to spider man", looks), { mode: "web", subject: "spider man" });
  /* The Mac's own pictures are still there for the asking. */
  assert.equal(parseWallpaperIntent("give me a random mac wallpaper", looks)?.mode, "random");
  assert.equal(parseWallpaperIntent("put my old wallpaper back", looks)?.mode, "restore");
  /* A question is not a command. */
  assert.equal(parseWallpaperIntent("what is my wallpaper", looks), null);
  assert.equal(parseWallpaperIntent("open my notes", looks), null);
});

test("a wallpaper is drawn, not downloaded", () => {
  const block = main.slice(main.indexOf("function wallpaperHtml"), main.indexOf("async function applyBrainoWallpaper"));
  assert.match(block, /offscreen: true/);
  assert.match(block, /capturePage/);
  /* Drawn once per look per display and kept, or every ask costs a second. */
  assert.match(block, /if \(drawn > source\) return file/);
  /* Points, not pixels: the window inherits the display's scale. */
  const apply = main.slice(main.indexOf("async function applyBrainoWallpaper"), main.indexOf("async function nextBrainoWallpaper"));
  assert.match(apply, /Math\.round\(display\.size\.width\)/);
});

/* Three states and no more: filling, emptying, or it wants you. */
test("the battery says one of three things", () => {
  assert.match(main, /needsAttention = Boolean\(/);
  assert.match(main, /system_profiler.*SPPowerDataType/s);
  assert.match(main, /Condition:/);
  const surface = read("../mac/braino-mac/renderer/wallpaper.js");
  assert.match(surface, /function paintBattery/);
  assert.match(surface, /battery\.needsAttention/);
  /* Pushed in whenever the machine changes its mind about it. */
  assert.match(read("../mac/braino-mac/renderer/braino-mac.js"), /__brainoWallpaper\?\.setBattery/);
});

test("the two jobs are settable, and separately", () => {
  const store = main.slice(main.indexOf("function readIdleScreenSettings"), main.indexOf("let idleScreenOpen"));
  for (const key of ["mode", "cycleSeconds", "quotes", "wallpaperMode", "wallpaperLook"]) {
    assert.match(store, new RegExp(`${key}`), `settings carry ${key}`);
  }
  /* Files written before there were modes still mean what they said. */
  assert.match(store, /raw\?\.cycle === false \? "one"/);

  const settings = read("../src/lib/wallpaperSettings.ts");
  assert.match(settings, /export function rotationFor/);
  assert.match(settings, /looksForTimeOfDay/);

  /* Both dashboards, as asked. */
  assert.match(read("../mac/braino-mac/renderer/dashboard.html"), /id="wp-swatches"/);
  assert.match(read("../mac/braino-mac/renderer/dashboard.html"), /id="idle-swatches"/);
  assert.match(read("../src/components/WallpaperSettingsCards.tsx"), /Your <em[^>]*>wallpaper\./);
  assert.match(read("../src/components/WallpaperSettingsCards.tsx"), /Your <em[^>]*>screensaver\./);
});

test("the set has a page of its own", () => {
  const page = read("../src/pages/Wallpapers.tsx");
  assert.match(page, /Make your Mac come to life/);
  assert.match(page, /screensaver/);
  assert.match(page, /wallpaper/);
  assert.match(page, /IntersectionObserver/);
  assert.match(page, /--p/, "parallax is one number per section");
  assert.match(page, /to="\/os"/, "and a way into Braino OS");
  assert.match(read("../src/App.tsx"), /path="\/wallpapers"/);
  assert.match(read("../src/components/SiteFooter.tsx"), /to="\/wallpapers"/);
  assert.match(read("../src/pages/BrainoOS.tsx"), /href="\/wallpapers"/);
});
