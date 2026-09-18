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
