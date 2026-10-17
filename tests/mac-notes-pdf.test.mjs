import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* Notes as PDFs (2026-10-15): meetings and lectures saved to ~/Documents/Braino
   in the assignment write-up style, and read inside the app's Notes page. */
const require = createRequire(import.meta.url);
const np = require("../mac/braino-mac/notes-pdf.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const app = readFileSync(new URL("../mac/braino-mac/renderer/app.js", import.meta.url), "utf8");

test("markdown becomes headings, tables, lists and checkboxes", () => {
  const html = np.markdownToHtml("## 1. Why we met\n\n**Point.** More.\n\n| A | B |\n| --- | --- |\n| 1 | `x` |\n\n- one\n- two\n\n1. first\n\n- [ ] task");
  assert.match(html, /<h2>1\. Why we met<\/h2>/);
  assert.match(html, /<strong>Point\.<\/strong>/);
  assert.match(html, /<thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td><code>x<\/code><\/td><\/tr>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<ol><li>first<\/li><\/ol>/);
  assert.match(html, /class="task"/);
});

test("nothing from a transcript can inject markup", () => {
  assert.doesNotMatch(np.markdownToHtml("<script>alert(1)</script>"), /<script>/);
  assert.doesNotMatch(np.buildHtml({ title: "<b>x</b>", markdown: "", transcript: "<img src=x>" }), /<img|<b>x/);
});

test("file names start with the date and never carry slashes", () => {
  assert.equal(np.fileNameFor({ date: "2026-10-15T10:00:00", source: "Zoom", title: "Pricing / review", minutes: 32 }), "2026-10-15 · Zoom · Pricing review (32 min).pdf");
  assert.equal(np.fileNameFor({ date: "2026-10-15T10:00:00", title: "Cohorts" }), "2026-10-15 · Cohorts.pdf");
});

test("the title comes from the write-up's first heading", () => {
  assert.equal(np.titleFrom("# **Cohort analysis**\n\ntext", "x"), "Cohort analysis");
  assert.equal(np.titleFrom("no heading", "Lecture, 15 October"), "Lecture, 15 October");
});

test("each kind asks for the story order, answer first", () => {
  const meet = np.writeUpPrompt("meeting", { minutes: 30, transcript: "t" });
  assert.match(meet, /What we decided/); assert.match(meet, /Action items/); assert.match(meet, /If you are asked/);
  const lec = np.writeUpPrompt("lecture", { minutes: 50, transcript: "t" });
  assert.match(lec, /The big idea/); assert.match(lec, /Traps the professor flagged/); assert.match(lec, /Revision checklist/);
});

test("meetings and lectures save a PDF without waiting on it", () => {
  assert.match(main, /void saveNotesPdf\(\{ kind: state\.kind/);
  assert.match(main, /void saveNotesPdf\(\{ kind: "lecture"/);
});

test("the Notes page reads inside the app, not a second window", () => {
  assert.match(main, /plugins: true/);
  assert.match(app, /class="note-pdf"/);
  assert.doesNotMatch(app, /btn\("Open the library", "dashboardOpen"\)/);
});

test("Foundry and the unbuilt day pages are gone from the app", () => {
  assert.doesNotMatch(app, /foundry: \[\[/);
  assert.doesNotMatch(app, /\["habits", "focus", "routines"\]/);
});
