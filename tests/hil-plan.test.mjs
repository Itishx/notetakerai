import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The plan: he writes the map once and is shown it every turn.
 *
 * Long jobs were where he circled (64 of 376 Mac runs) and lost his thread,
 * because every turn worked the whole job out again from the screen. These pin
 * the three places that have to agree: the prompt asks for it, the server keeps
 * and renders it, and the Mac holds it between turns.
 */
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const prompt = read("supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
const server = read("supabase/functions/reasoning/hil-loop/index.ts");
const mac = read("mac/braino-mac/main.cjs");
const lab = read("src/lib/hilLoopEngine.ts");

test("turn one writes a plan, and it is a map rather than a script", () => {
  assert.match(prompt, /"plan": \["first move"/);
  assert.match(prompt, /The plan is a map, not a script: you still take one action a turn/);
  assert.match(prompt, /never element indices, because indices change/);
  assert.doesNotMatch(prompt, /Never plan a sequence\./);
});

test("a wrong plan is rewritten, not followed", () => {
  assert.match(prompt, /- replan: null, unless the screen proves the plan wrong/);
  assert.match(server, /const replan = cleanPlan\(parsed\.replan\)/);
});

test("the server shows the plan back on every later turn", () => {
  assert.match(server, /plan\?: string\[\];/);
  assert.match(server, /YOUR PLAN, written on turn one/);
});

test("both clients keep the plan between turns", () => {
  assert.match(mac, /state\.plan = turn\.split\.plan\.slice\(0, 10\)/);
  assert.match(mac, /state\.plan = turn\.replan\.slice\(0, 10\)/);
  assert.match(lab, /plan: this\.plan\.length \? this\.plan : undefined/);
});

test("the per-run prep cache is keyed on the caller, never the run id alone", () => {
  assert.match(server, /tokenFingerprint\(`\$\{req\.headers\.get\("Authorization"\)/);
  assert.match(server, /RUN_PREP_TTL_MS = 10 \* 60 \* 1000/);
  assert.match(server, /prepCached,/);
});

test("what is playing reaches the loop with its link", () => {
  /* "Send this song to Ilu": the Mac already reads the Spotify uri and the
     YouTube tab url. He used to be told only the name and went hunting. */
  assert.match(mac, /function spotifyShareLink\(uri\)/);
  assert.match(mac, /https:\/\/open\.spotify\.com\/\$\{match\[1\]\}\/\$\{match\[2\]\}/);
  assert.match(mac, /link: spotifyShareLink\(spotify\.uri\)/);
  assert.match(mac, /nowPlayingLine,\n\s+layaHintLine\(command\),\n\s+relationsLine\(\),\n\s+macOwnJobActive\(\) \? OWN_BROWSER_NOTE : "",\n\s+macRecentExchanges\(\)/);
});

test("a yes runs the approved step without asking the model again", () => {
  assert.match(mac, /gatedStep: stepObj,/);
  assert.match(mac, /macHilStepSignature\(resume\.gatedStep\) === approvedSig/);
  assert.match(mac, /hil\.loop\.replay_approved/);
});

test("what they say mid-run goes onto the plan", () => {
  assert.match(prompt, /replan also, on the turn after they tell you something while you work/);
  assert.match(mac, /They just told you, while you were working: \$\{line\}/);
});

test("he never asks consent himself, and done means seen", () => {
  assert.match(prompt, /NEVER ask permission yourself for a step that cannot be undone/);
  assert.match(prompt, /say what the screen SHOWED after the last action/);
});
