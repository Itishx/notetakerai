// 2026-10-04: "can you see me?" takes one camera photo and answers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
const SEE_ME_RE = eval(main.match(/const SEE_ME_RE = (\/.*\/i);/)[1]);

test("asking to be seen goes to the camera; talk about the screen does not", () => {
  for (const t of ["can you see me", "Hey Braino, can you see me?", "how do I look", "what am I holding", "look at me"]) assert.ok(SEE_ME_RE.test(t), t);
  for (const t of ["I can see the screen", "show me the pointer", "what is on my screen", "look at this page"]) assert.ok(!SEE_ME_RE.test(t), t);
});

test("one photo, permission first, camera stopped after", () => {
  const fn = main.slice(main.indexOf("async function grabCameraFrame"), main.indexOf("async function lookAtUser"));
  assert.ok(fn.indexOf('askForMediaAccess("camera")') < fn.indexOf("getUserMedia"));
  assert.match(fn, /getTracks\(\)\.forEach\(function\(t\)\{t\.stop\(\)\}\)/);
  assert.match(main, /look_at_user: \(a\) => lookAtUser/);
  assert.match(main, /if \(SEE_ME_RE\.test\(String\(raw \|\| ""\)\)\) return lookAtUser/);
  assert.match(catalog, /name: "look_at_user"/);
});
