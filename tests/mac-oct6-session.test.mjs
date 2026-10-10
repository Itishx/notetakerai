// From Itish's 6 Oct test session: the Cursor attach run, "open Pinterest", and learning.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const loop = read("../supabase/functions/reasoning/hil-loop/index.ts");
const catalog = read("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts");

test("page clicks never go to Chrome while another app is in front", () => {
  assert.match(main, /if \(!isChromeApp\(data\?\.app\)\) macLastReadWasPage = null;/);
});

test("a file can be attached to any chat box by pasting it", () => {
  assert.match(main, /attach_file: \(a\) => attachFileToFrontChat\(/);
  assert.match(main, /set the clipboard to \(POSIX file \$\{JSON\.stringify\(file\)\}\)/);
  assert.match(catalog, /name: "attach_file"/);
});

test("open X opens a file only when the file's name is X", () => {
  const src = main.slice(main.indexOf("function fileNameIsTarget"), main.indexOf("\nfunction commonWebTargetFor"));
  const f = Function("path", `${src}; return fileNameIsTarget;`)(path);
  assert.equal(f("/d/Is Pinterest just woke Twitter.jpeg", "Pinterest"), false);
  assert.equal(f("/d/Resume 2026.pdf", "resume"), true);
  assert.match(main, /\.filter\(\(f\) => askedForFile \|\| fileNameIsTarget\(f, target\)\)/);
});

test("HIL learns routes in desktop apps and from single finished jobs", () => {
  assert.match(loop, /`app:\$\{appName\}`/);
  assert.match(loop, /turn\?\.decision\?\.type === "task_done" && singleJob/);
});
