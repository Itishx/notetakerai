import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const pick = (name) => main.slice(main.indexOf(name), main.indexOf("\n", main.indexOf(name)));
// The two patterns, evaluated as written in main.cjs.
const ASK = eval(pick("const MAC_SHARE_ASK = ").replace(/^const MAC_SHARE_ASK = /, "").replace(/;$/, ""));
const NOT = eval(pick("const MAC_SHARE_NOT = ").replace(/^const MAC_SHARE_NOT = /, "").replace(/;$/, ""));
const sharing = (c) => ASK.test(c) && !NOT.test(c);

/* 2026-10-01: the Tanmay Bhat video went out as a claude.ai link. */
test("a job that shares a video or link is checked before it sends", () => {
  assert.ok(sharing("open youtube, search for the latest tanmay bhat video and send it to Shashank on whatsapp"));
  assert.ok(sharing("send this page to John"));
  assert.ok(sharing("share the first article with Shashank"));
  assert.ok(main.includes("const checked = macCheckSharedLink(String(a.message || \"\"));"));
  assert.ok(main.includes("That link is not the video."));
});

test("a message that only talks about a link is left alone", () => {
  assert.ok(!sharing("send John a message saying the article was great"));
  assert.ok(!sharing("tell John I'll be ten minutes late"));
});

test("WhatsApp gets a second try, and keep-going waits for no progress", () => {
  assert.ok(main.includes('logMac("whatsapp.send.open_retry"'));
  assert.ok(main.includes("if (settled?.ok !== false) stuckAt = Math.max(stuckAt, Date.now() + MAC_HIL_STUCK_MS);"));
});
