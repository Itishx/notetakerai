import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const teach = require("../mac/braino-mac/teach.cjs");

/* Teach Braino (2026-10-20): watched once, learned, run on request. */
const watched = [
  { t: "focus", app: "Google Chrome", url: "https://www.amazon.in/", title: "Amazon.in" },
  { t: "click", app: "Google Chrome", role: "AXTextField", label: "Search Amazon.in" },
  { t: "typed", app: "Google Chrome", field: "AXTextField:Search Amazon.in", text: "Atomic Habits" },
  { t: "click", app: "Google Chrome", role: "AXButton", label: "Go" },
  { t: "click", app: "Google Chrome", role: "AXButton", label: "Go" },
  { t: "click", app: "Braino", role: "AXGroup", label: "" },
  { t: "click", app: "Google Chrome", role: "AXButton", label: "Add to Cart" },
];

test("the timeline reads like what you did, without Braino's own windows or double clicks", () => {
  const lines = teach.compactTimeline(watched);
  assert.equal(lines[0], 'Opened https://www.amazon.in/ ("Amazon.in") in Google Chrome');
  assert.ok(lines.includes('Typed "Atomic Habits" into "Search Amazon.in" in Google Chrome'));
  assert.equal(lines.filter((l) => l.includes('"Go"')).length, 1);
  assert.ok(!lines.some((l) => / in Braino$/.test(l)));
});

test("the model's answer becomes a job with inputs and steps", () => {
  const job = teach.parseLearned('Here: {"name":"Buy a book on Amazon","say":"buy me a book on Amazon","goal":"Put a book in the Amazon cart","inputs":[{"name":"Book Title","example":"Atomic Habits","ask":"Which book?"}],"steps":["Open amazon.in","Search for {book_title}","Add to Cart"],"done_when":"cart shows it","stop_before":"Place order"}');
  assert.equal(job.name, "Buy a book on Amazon");
  assert.equal(job.inputs[0].name, "book_title");
  assert.equal(job.steps.length, 3);
  assert.equal(teach.parseLearned("no json here"), null);
});

test("only a request about a taught job brings its steps into the brain's context", () => {
  const job = teach.parseLearned('{"name":"Buy a book on Amazon","say":"buy me a book on Amazon","goal":"Put a book in the Amazon cart","inputs":[],"steps":["Open amazon.in"]}');
  assert.match(teach.taughtContextLines([job], "Braino, buy me Atomic Habits on Amazon"), /TAUGHT you these jobs[\s\S]*Buy a book on Amazon/);
  assert.equal(teach.taughtContextLines([job], "what's the weather tomorrow"), "");
});

test("sign-ins, phone numbers and emails never make it into a lesson", () => {
  const lines = teach.compactTimeline([
    { t: "typed", app: "Chrome", field: "AXTextField:Enter mobile number", text: "8879290298" },
    { t: "click", app: "Chrome", role: "AXButton", label: "" },
    { t: "typed", app: "Chrome", field: "AXTextField:Search", text: "call 8879290298 or a@b.com" },
  ]);
  assert.deepEqual(lines, ["Signed in (details not kept) in Chrome", 'Typed "call [number] or [email]" into "Search" in Chrome']);
  assert.match(teach.learnPrompt(["x"]), /ONE input that is a list/);
});
