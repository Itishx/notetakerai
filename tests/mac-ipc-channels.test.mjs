import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The app would not boot at all.
 *
 * Electron refuses a second handler on one channel, and the tray's transport
 * buttons had been registered as braino-mac:media-control, which was already
 * taken by "pause whatever is playing". Two different features with two
 * different payload shapes, one name, and a crash before the first window.
 *
 * Nothing about that was visible in either diff on its own, which is exactly
 * what this file is for: a collision that only exists between two commits.
 */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");

test("no channel is registered twice", () => {
  const names = [...main.matchAll(/ipcMain\.handle\(\s*"([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  const dupes = names.filter((n) => (seen.has(n) ? true : (seen.add(n), false)));
  assert.deepEqual([...new Set(dupes)], [], "a second handler on one channel crashes the app on load");
  assert.ok(names.length > 50, `expected the real handler list, found ${names.length}`);
});

test("every channel the renderer calls has someone answering", () => {
  // The other half of the same failure: renaming a channel in main and
  // forgetting preload is silent, and a dead button is harder to notice than a
  // crash.
  const handled = new Set([...main.matchAll(/ipcMain\.handle\(\s*"([^"]+)"/g)].map((m) => m[1]));
  const invoked = [...preload.matchAll(/ipcRenderer\.invoke\("([^"]+)"/g)].map((m) => m[1]);
  const orphans = [...new Set(invoked)].filter((c) => !handled.has(c));
  assert.deepEqual(orphans, [], "preload invokes a channel nothing handles");
});

test("the tray and the general media control stay separate", () => {
  /* Renamed rather than merged. One handler branching on which field happens to
     be present is the same collision written down more politely, and the two
     contracts are genuinely different: {action, target} against {action, source}. */
  assert.match(main, /ipcMain\.handle\("braino-mac:tray-media"/);
  assert.match(main, /ipcMain\.handle\("braino-mac:media-control"/);
  assert.match(preload, /trayMediaControl: \(payload\) => ipcRenderer\.invoke\("braino-mac:tray-media"/);
});

test("one router decides, and both doors ask it", () => {
  /* Two routers with opposite defaults. The main process gives the brain
     anything that is not fast-lane or small talk; the renderer's voice fork
     gave chat everything unless one narrow check objected. So the same sentence
     went two ways depending on which door it came through, and "what class do I
     have next" reached the timetable once and was answered from thin air the
     next time: 662ms of thinking, which is not long enough to have asked
     anything.

     Duplicating the rules would have made a third thing to keep in step. */
  const renderer = readFileSync(
    new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(main, /ipcMain\.handle\("braino-mac:wants-brain"/);
  assert.match(preload, /wantsBrain: \(text\) => ipcRenderer\.invoke\("braino-mac:wants-brain"/);
  assert.match(renderer, /window\.brainoMac\.wantsBrain\?\.\(text\)/);

  /* It became async to ask, and !Promise is always false, so an un-awaited
     guard would silently stop guarding. Every call site must await. */
  assert.match(renderer, /async function shouldUseRealtimeDirectChat/);
  const calls = [...renderer.matchAll(/shouldUseRealtimeDirectChat\(/g)];
  assert.equal(calls.length, 3, "one definition and two call sites");
  for (const m of calls.slice(1)) {
    const before = renderer.slice(Math.max(0, m.index - 30), m.index);
    assert.match(before, /await /, `call site at ${m.index} is not awaited`);
  }

  // And it fails open: a broken routing lookup should cost a worse answer, not
  // every utterance.
  assert.match(renderer, /voice\.route\.lookup_failed/);
  assert.match(main, /return \{ brain: false, failed: true \};/);
});
