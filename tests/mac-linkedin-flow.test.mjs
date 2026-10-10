import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* 2026-09-29, a LinkedIn post: asked twice whether to open the composer ("That
   cannot be undone"), stalled on LinkedIn's Trusted Types, then "just write
   the goddam post" typed "the goddam post" into it. */
const require = createRequire(import.meta.url);
const typeSearch = require("../mac/braino-mac/type-search.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const lift = (start) => { const at = main.indexOf(start); assert.ok(at >= 0, start); return main.slice(at, main.indexOf("\n}\n", at) + 3); };
const consts = ["const MAC_FINAL_CONTROL", "const MAC_OPENER_CONTROL"].map((c) => { const at = main.indexOf(c); return main.slice(at, main.indexOf(";\n", at) + 2); }).join("\n");
const onlyOpens = new Function(`${consts}\n${lift("function macClickOnlyOpens(name) {")}; return macClickOnlyOpens;`)();

test("opening a composer is never a gate; the final button still is", () => {
  for (const name of ["Start a post", "Create a post", "Compose", "Reply", "Add a comment", "Write an article", "New message"]) assert.equal(onlyOpens(name), true, name);
  for (const name of ["Post", "Send", "Publish", "Delete", "Buy now", "Place order", "Pay", "Confirm", ""]) assert.equal(onlyOpens(name), false, name);
  assert.match(main, /const irreversible = \(stepObj\.reversible === false && macStepCanBeIrreversible\(stepObj\) && !onlyOpens\) \|\| unaskedSend;/);
});

test("a page that blocks innerHTML gets a way to write, not a wall", () => {
  assert.match(main, /function __brainoWrite\(t,s\)/);
  assert.match(main, /document\.execCommand\("insertText",false,s\)/);
  assert.match(main, /Trusted\(\?:HTML\|Script\|ScriptURL\)[\s\S]{0,500}call __brainoWrite/);
  // Nothing turns the page's protection off.
  assert.doesNotMatch(main, /trustedTypes\.createPolicy\(\s*["']default["']/);
});

test("a reference to the job is never typed as literal text", () => {
  for (const said of ["Braino just write the goddam post.", "Braino, just write the post I told you to.", "write that email", "write the LinkedIn post"]) {
    assert.equal(typeSearch.parseTypeSearch(said), null, said);
  }
  assert.equal(typeSearch.parseTypeSearch("write Hakuna Matata")?.text, "Hakuna Matata");
  assert.equal(typeSearch.parseTypeSearch('write "Hello, how are you?"')?.text, "Hello, how are you?");
});
