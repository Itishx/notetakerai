import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-10-11, the Iron Man run: he said a movie was playing when Netflix had
   not opened it, then answered "where can I watch it" with "I'll check". */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

test("a research step's answer is said, not the line written before it ran", () => {
  assert.match(main, /web_search\|deep_research\|web_research\|research\|count_items/);
});

test("what actually happened beats what the plan expected", () => {
  assert.match(main, /\(run\?\.lastOut\?\.partial \|\| run\?\.count === 1\)\) return found;/);
  assert.match(main, /return \{ ok: true, partial: true, say: `Netflix is open with \$\{title\}/);
});

test("'then do it' gets the answer and the next step offered", () => {
  assert.match(main, /I asked you to do something after this: end by offering to do it, in one short question\./);
});
