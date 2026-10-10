import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

/* Laya v4 learned from lines built by ~/.braino-laya/training/build_context.py.
   The app builds them live (laya-context.cjs). For the same moment they must
   be the same line, character for character, or v4 is reading text it never
   saw. This replays one conversation through both. */
const require = createRequire(import.meta.url);
const { createLayaContext } = require("../mac/braino-mac/laya-context.cjs");
const PY = join(homedir(), ".braino-laya", "training", "build_context.py");

const t0 = Date.parse("2026-09-29T10:44:00.000Z");
const EVENTS = [
  [0, "desktop.context.changed", { appName: "Google Chrome", windowTitle: "Feed | LinkedIn", browserUrl: "https://www.linkedin.com/feed/" }],
  [2000, "music.state", { playing: true, source: "spotify" }],
  [5000, "delegate.intent.start", { prompt: "Braino, what should I do to sell candles?", activeApp: "Google Chrome", activeTitle: "Feed | LinkedIn", activeUrl: "https://www.linkedin.com/feed/" }],
  [9000, "voice.out", { text: "What's your current approach, online, offline, or both?" }],
  [9500, "delegate.done", { hasPendingWorkflow: false }],
  [31000, "delegate.intent.start", { prompt: "both and like B2B and gifting shops and wedding planners", activeApp: "Google Chrome", activeTitle: "Feed | LinkedIn", activeUrl: "https://www.linkedin.com/feed/" }],
];

test("the app builds the same line Laya was trained on", { skip: !existsSync(PY) && "training kit not on this machine" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "laya-ctx-"));
  const log = EVENTS.map(([dt, ev, p]) => { const ts = new Date(t0 + dt).toISOString(); return `[${ts}] ${ev} ${JSON.stringify({ ts, event: ev, ...p })}`; }).join("\n") + "\n";
  writeFileSync(join(dir, "log"), log);
  writeFileSync(join(dir, "in.jsonl"), JSON.stringify({ text: "both and like B2B and gifting shops and wedding planners", kind: "chat" }) + "\n");
  execFileSync("python3", [PY, join(dir, "log"), join(dir, "in.jsonl"), join(dir, "out.jsonl")]);
  const trained = JSON.parse(readFileSync(join(dir, "out.jsonl"), "utf8").trim()).text;

  const ctx = createLayaContext();
  for (const [dt, ev, p] of EVENTS) ctx.observe(ev, p, t0 + dt);
  const live = ctx.text("both and like B2B and gifting shops and wedding planners", t0 + 31000);
  assert.equal(live, trained);
  assert.match(live, /Braino last said \(a question\), 22s ago/);
  assert.match(live, /Before that you said, 26s ago: "Braino, what should I do to sell candles\?"/);
});

test("the switch, the model and the port go together, and the line is logged for the next training", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // v7 (context, fine-tuned from v6) when it exists, else v4.
  assert.match(main, /LAYA_WITH_CONTEXT \? LAYA_CONTEXT_MODEL : "braino-kind"/);
  assert.match(main, /"braino-kind-v7", "model\.safetensors"\)\) \? "braino-kind-v7" : "braino-kind-v4"/);
  assert.match(main, /LAYA_WITH_CONTEXT \? 47832 : 47831/);
  assert.match(main, /try \{ layaContext\.observe\(event, payload \|\| \{\}\); \} catch \(_\) \{\}/);
  assert.match(main, /context: textForLog\(sorted\.context, 900\)/);
  const serve = readFileSync(new URL("../mac/braino-mac/laya-serve.py", import.meta.url), "utf8");
  assert.match(serve, /\[:900\]/);
});
