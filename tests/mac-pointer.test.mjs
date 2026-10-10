// "What is this?" with the mouse on it (2026-10-03).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
const lift = (start) => { const i = main.indexOf(start); assert.ok(i >= 0, start); return main.slice(i, main.indexOf("\n}\n", i) + 3); };

test("the pointer that counts is where it was when you started speaking", () => {
  const code = `const POINTER_TRAIL = []; let macSpeechStartedAt = 0; const screen = { getCursorScreenPoint: () => ({ x: -1, y: -1 }) };\n${lift("function notePointer(point)")}\n${lift("function pointerWhenAsked()")}\nreturn { notePointer, pointerWhenAsked, set: (t) => { macSpeechStartedAt = t; } };`;
  const realNow = Date.now;
  let now = 1_000_000; Date.now = () => now;
  try {
    const p = Function(code)();
    p.notePointer({ x: 100, y: 100 }); now += 500;
    p.set(now);                         // "what is this" starts here, pointer on the eye
    p.notePointer({ x: 300, y: 200 }); now += 1500;
    p.notePointer({ x: 900, y: 700 }); // drifted away while talking
    assert.deepEqual([p.pointerWhenAsked().x, p.pointerWhenAsked().y], [300, 200]);
  } finally { Date.now = realNow; }
});

test("highlight first, then text under the pointer, then a crop around it", () => {
  const fn = lift("async function lookAtPointer(question");
  const order = ['runAxHelper(["selected"])', "caretRangeFromPoint", '"-R"'].map((n) => fn.indexOf(n));
  assert.ok(order.every((x) => x > 0) && order[0] < order[1] && order[1] < order[2], "highlight, page text, crop, in that order");
  assert.match(fn, /Looking at: /);
  assert.match(main, /look_at_pointer: \(a\) => lookAtPointer\(/);
  assert.match(main, /ipcMain\.on\("braino-mac:speech-started"/);
});

test("HIL is told when to use it, and when not to", () => {
  const line = catalog.split("\n").find((l) => l.includes('name: "look_at_pointer"'));
  assert.ok(line);
  assert.match(line, /Not for a whole page or screen/);
  assert.match(line, /not when \\"this\\" means a link or file to send/);
});
