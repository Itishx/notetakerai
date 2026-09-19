import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The reflex tier, which nothing was guarding.
 *
 * hil-router fronts every single command a person speaks. It is the fastest
 * path in Braino and the only one with no screen, no narration and no second
 * opinion, which makes it the one place where a mistake is both instant and
 * invisible. It had thirteen tests' worth of siblings and none of its own.
 *
 * The rule it exists to enforce is the same one the cart incident bought:
 * a refusal has to be CODE. A prompt rule is a preference, and a preference is
 * one clever rephrasing away from being ignored. Rule 4 of the router prompt
 * says never fire anything marked [CANNOT UNDO]; readVerdict says it again in
 * a way no wording can talk it out of. Both halves are pinned here, because the
 * prompt without the code is a hope, and the code without the prompt is a model
 * being surprised by its own refusals.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const router = read("../supabase/functions/reasoning/hil-router/index.ts");
const routerPrompt = read("../supabase/functions/_shared/human-intelligence/hil-router-prompt.ts");
const catalog = read("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts");

test("nothing irreversible can be fired from the reflex tier, whatever the prompt says", () => {
  /* The floor. Not "the model is told not to": the verdict is rewritten to an
     escalate before it can leave this function, so the only path to an action
     that cannot be undone runs through hil-loop, which has the confirm gate. */
  assert.match(router, /if \(isIrreversible\(t\)\) \{/);
  assert.match(router, /return \{ verdict: \{ v: "escalate", why: "cannot be undone" \}/);

  /* And the prompt agrees, so a refusal is never a surprise to the model. */
  assert.match(routerPrompt, /4\. NEVER FIRE ANYTHING MARKED \[CANNOT UNDO\]/);
  assert.match(routerPrompt, /the verdict is escalate/);

  /* The mark itself has to reach the prompt, or rule 4 names a label the model
     never sees and the whole chain is decoration. */
  assert.match(routerPrompt, /tool\.irreversible \? " \[CANNOT UNDO\]" : ""/);
});

test("a tool the catalog does not declare is not a tool", () => {
  /* The allowlist is the last word here for the same reason it is in hil-loop:
     an invented name is a request the Mac then has to defend itself from, and
     it reads to a user exactly like a skill he failed. */
  assert.match(router, /const TOOL_NAMES = new Set\(HIL_TOOL_CATALOG\.map\(\(t\) => t\.name\)\)/);
  assert.match(router, /if \(!TOOL_NAMES\.has\(t\)\) \{/);
  assert.match(router, /why: "unknown tool"/);
});

test("a verdict that cannot be read is an escalate, never a half-usable guess", () => {
  /* Three ways the reply can be unusable, and all three land in the same place.
     The loop can always cope; a router that improvises cannot. */
  assert.match(router, /why: "unreadable verdict"/);
  assert.match(router, /why: "unknown verdict"/);
  assert.match(router, /why: "empty question"/, "an ask with no question is not an ask");
});

test("the model is chosen here, because the endpoint is public", () => {
  /* verify_jwt=false, so the caller is anyone with curl. A caller that picks the
     model picks the bill. */
  assert.match(router, /const HIL_ROUTER_MODEL = BRAINO_TEXT_MODEL;/);
  assert.doesNotMatch(router, /model: (?:body|payload|req)\./, "the caller must never name the model");
  assert.match(router, /reasoning_effort: BRAINO_TEXT_REASONING_EFFORT/);
});

test("the cacheable half goes first and the surface goes last", () => {
  /* ~2,400 tokens of catalog rides on every command anyone ever speaks. It is
     byte-identical every call, so it is billed as a cached prefix, and only if
     nothing dynamic is interleaved ahead of it. Built once per isolate. */
  assert.match(router, /const SYSTEM_PROMPT = buildRouterPrompt\(HIL_TOOL_CATALOG\);/);
  const messages = router.slice(router.indexOf("messages: ["), router.indexOf("max_completion_tokens"));
  assert.ok(
    messages.indexOf("SYSTEM_PROMPT") < messages.indexOf("buildRouterTurn"),
    "the static catalog must precede the per-turn surface",
  );
});

test("the safety net firing is counted, not swallowed", () => {
  /* A rejected verdict is not an error and must not be logged as one, or the
     single most useful number in the table (how often the floor caught
     something) reads as an outage. */
  assert.match(router, /error: rejected/);
  assert.match(router, /ok: true/);
});

test("every tool that cannot be undone still says so", () => {
  /* Sampled across the three kinds of harm the flag covers: a message that has
     already gone, a file that is no longer there, and text overwritten in place
     with no undo. Losing the flag on any of these silently removes the gate. */
  for (const name of ["whatsapp_send", "rewrite_selection", "alarm_cancel"]) {
    const line = catalog.split("\n").find((l) => l.includes(`name: "${name}"`));
    assert.ok(line, `${name} left the catalog`);
    assert.ok(line.includes("irreversible: true"), `${name} must stay irreversible`);
  }
});
