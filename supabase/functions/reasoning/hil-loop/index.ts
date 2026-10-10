// hil-loop — HIL Version 1: Braino's step-by-step thinking loop, standalone.
//
// One call per TURN, not per task: the browser holds the run's state (jobs, facts,
// steps taken, budget) and sends a fresh snapshot every call; this function renders
// it, thinks once, and returns exactly one decision. The canonical loop prompt
// (hil-loop-prompt.ts, the literal source of truth) goes first, then the Emotional
// Engine's personality block is appended live per request, exactly like hil-reason.
// The /human-intelligence page's Loop tab is the only consumer for now. Nothing real
// executes anywhere near this function: the caller runs steps against a pretend world.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HIL_LOOP_PROMPT, HIL_LOOP_VERSION } from "../../_shared/human-intelligence/hil-loop-prompt.ts";
import { HIL_USE_CASES } from "../../_shared/human-intelligence/use-cases.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { logEngineRun } from "../../_shared/engine-log.ts";
import { loadUserKnowledge } from "../../_shared/user-knowledge.ts";
import { recallLessons, recordLesson, scopeFromUrl } from "../../_shared/human-intelligence/lessons.ts";
import { recallHistory, recordRun } from "../../_shared/human-intelligence/history.ts";
import { renderSkills } from "../../_shared/human-intelligence/skills.ts";
import {
  recallProcedures,
  recordProcedure,
  recordProcedureMiss,
  routeFromSteps,
} from "../../_shared/human-intelligence/procedures.ts";
import {
  HIL_TOOL_CATALOG,
  HIL_CATALOG_VERSION,
  findTool,
  isIrreversible,
} from "../../_shared/human-intelligence/hil-tool-catalog.ts";
import { buildEmotionalCore } from "../../_shared/emotional-engine/engine.ts";
import { detectMoment, MOMENT_EMPHASIS, MOMENT_LABEL } from "../../_shared/emotional-engine/moments.ts";
import {
  BRAINO_TEXT_MODEL,
  BRAINO_TEXT_REASONING_EFFORT,
  BRAINO_RESCUE_MODEL,
  BRAINO_RESCUE_REASONING_EFFORT,
  BRAINO_RESCUE_MAX_TOKENS,
} from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// One model, chosen server-side. This endpoint is deliberately public (verify_jwt=false)
// so the lab works for anyone, which means the caller must NOT get to pick the model.
const HIL_LOOP_MODEL = BRAINO_TEXT_MODEL;
// The rescue model is likewise NOT caller-selectable. The client may ask to
// escalate, and the escalation is rationed here rather than there, because the
// client is a web page anyone can open and edit.
const HIL_RESCUE_MODEL = BRAINO_RESCUE_MODEL;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// Astra searches inside its own turn here, rather than us spending a turn asking
// for a search, a whole separate model answering it, and another turn reading
// the answer. Three model calls become one.
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

// The action vocabulary, matching the real extension's BG_DELEGATE_ACTIONS.
// The allowlist is the last word: an action not named here is rejected as an
// unreadable turn, no matter how correct it was. "look" was added to the prompt
// and to the world before it was added here, and the symptom was Braino
// appearing to fail at the new skill while actually performing it perfectly.
// Anything taught in hil-loop-prompt.ts must be listed here in the same change.
const ACTION_TYPES = new Set(["navigate", "read", "look", "click", "type", "pressKey", "scroll", "wait", "web_search", "selectOption", "downloadImage", "tool", "exec_js"]);

// ── Braino's own hands ───────────────────────────────────────────────────────
// The loop could drive a browser and nothing else, while everything Braino can
// actually DO on a Mac lived in a catalog only the regex cascade could reach.
// So the brain could not open Notes, play a song or send a message: not because
// it decided against it, but because those verbs did not exist in the vocabulary
// it was shown. It looked like a model failing at a task it was never offered.
//
// One "tool" action fixes that. The catalog is rendered into the prompt and the
// tool name is validated against it here, so a hallucinated tool is a rejected
// turn rather than a request the Mac has to defend itself from.
//
// Only sent when the caller says it HAS these hands. The extension runs in a
// browser and cannot fire spotify_play, so teaching it the tool would only
// invite a turn nothing can execute.
// ── Writing code instead of clicking ────────────────────────────────────────
// OpenAI's own guidance for Astra is code execution rather than one structured
// action at a time, and the difference is not stylistic. One action per turn
// means a ten step job costs ten model calls, and at five to ten seconds each
// that is a minute and a half of waiting to do something a script does in one.
//
// Braino already runs JavaScript inside the real tab, through the AppleScript
// door chrome-page.cjs uses to read the page. So this needs no new dependency
// and no second browser: the same channel, handed a script the model wrote
// rather than one we wrote for it.
function renderExecJs(): string {
  return [
    "=== ON A WEB PAGE, WRITE A SCRIPT. THIS IS THE DEFAULT. ===",
    'Run JavaScript in the page with {"type":"exec_js","code":"...","expects":"..."}. It runs in the real tab, signed in as them, and whatever it RETURNS comes back to you.',
    "",
    "A script takes a third of a second. A single click costs a whole turn, which is ten seconds of them waiting. So a script is not the clever option, it is the ordinary one: clicking is what you do when a script genuinely cannot.",
    "",
    "Do the WHOLE step in one script. Not 'find the button'. Find it, click it, and return what the page said afterwards. Not 'read one price'. Read all of them and return the comparison. If you find yourself about to click something and then look at what happened, that was one script.",
    "",
    "Worked examples of the difference:",
    "- Comparing products: one script that reads every result's title, price and rating and returns them as a list. Not one click per product.",
    "- Filling a form: one script that sets every field and reports which ones it could not find. Not one field per turn.",
    "- Finding and following a link: one script that locates it, returns its href and text, then navigate next turn.",
    "",
    "Rules:",
    "- Return the ANSWER, not a dump. You get back exactly what you return. An expression or an (function(){...})() both work.",
    "- There is room for a real result, around twelve thousand characters. If you go past it you are TOLD so, in the result, with the real length. That is not a failure and not a reason to run a smaller version of the same script: use what you got, or pick fewer fields next time.",
    "- Anything thrown comes back to you with its message, so you do not need your own try/catch.",
    "- You can read OTHER pages without leaving this one. __brainoPage(url) returns a parsed Document you can querySelector, __brainoGet(url) returns the raw HTML. Same tab, no navigation, up to 12 pages in one script.",
    "- This is the single biggest thing you can do for them. Ten product pages opened one at a time is ten turns, which is a hundred seconds of someone waiting. The same ten read with __brainoPage in one script is one turn. When you catch yourself about to open a link to check something, fetch it instead.",
    "- Relative links need to be absolute: new URL(href, location.href).href.",
    "- Actually NAVIGATING still ends the script, because the page is replaced. So navigate only when you need to BE somewhere, to click or to type. To read, fetch.",
    "- If a selector might miss, check and return that fact. Knowing the button was not there is worth a turn; a stack trace is not.",
    "- Reading is free. Anything that spends money, sends, posts or deletes is not: say so plainly and set reversible:false. A script that clicks Buy is still clicking Buy.",
  ].join("\n");
}

function renderToolCatalog(available?: string[]): string {
  /* Only what this machine can actually run.
   *
   * The catalog is what Braino can ever do; the caller says what it can do
   * today. Listing the difference is not harmless: being offered a tool that
   * does not exist costs a whole turn to find out, ten seconds of someone
   * waiting to learn a hand is missing.
   *
   * No list means an older caller that does not send one, and the whole catalog
   * is the right answer there: better to over-offer than to silently strip a
   * client of everything it had. */
  const have = Array.isArray(available) && available.length ? new Set(available) : null;
  const tools = have ? HIL_TOOL_CATALOG.filter((t) => have.has(t.name)) : HIL_TOOL_CATALOG;
  const lines = tools.map((t) => {
    const args = t.params.length ? `(${t.params.join(", ")})` : "()";
    const flag = t.irreversible ? "  [IRREVERSIBLE, must be reversible:false]" : "";
    return `- ${t.name}${args}: ${t.gloss}${flag}`;
  });
  return [
    "=== YOUR OWN HANDS ON THIS MAC ===",
    'Alongside the browser actions you have Braino\'s real abilities. Fire one with {"type":"tool","tool":"<name>","args":{...}}, as an ordinary step, one per turn, judged next turn like any other.',
    "Prefer a tool over doing the same thing by hand in a browser. Opening Notes and typing is worse than notes_create in every way: faster, and it cannot half-fail.",
    "You can also SEARCH THE WEB YOURSELF, in this turn, without asking for it. If you need a fact, just use it and answer: no action, no waiting, no separate step.",
    "So do not fire the web_search action for something you can look up yourself. That one hands the question to a different model and costs two extra turns, roughly forty seconds. Searching here costs you nothing but the search.",
    "",
    "This list is everything you can call DIRECTLY. It is short on purpose: it is what is wired on this machine today, not everything Braino will ever do.",
    "Anything not on it, you do in the browser, and that is not a lesser way of doing it. A Google Doc is docs.google.com plus a script. A spreadsheet, a calendar invite, a form, an order: all websites, and driving a website is the thing you are best at.",
    "So never say you cannot do something because there is no tool for it. Either there is a tool, or there is a site. Reach for the tool first because it is faster and cannot half-fail; reach for the browser the moment there is not one.",
    "Never invent a tool name. If you want one that is not here, that is your signal to open the site instead.",
    "",
    lines.join("\n"),
  ].join("\n");
}

// Reversibility is decided by WHAT is being clicked, and the element name lives on
// the client (it holds the live observation), so the final say is enforced there in
// isIrreversibleClick, mirroring bgCartSafetyBlock in the extension. Here we only
// keep the model honest about the obvious cases it can see in its own action.
// This is a FLOOR, and on the extension it is the only one: the lab re-gates by
// element name client-side (isIrreversibleClick), the extension does not, so
// whatever passes here reaches a real click. Rule 7 draws the fine line (a send
// whose words the user dictated is finishing the job, not deciding for them) and it
// draws it in the prompt, where the command is actually readable. Down here the
// regex cannot tell those apart, so it keeps everything destructive and lets the
// model's own reversible flag be the thing rule 7 relaxes.
const IRREVERSIBLE_HINT = /\b(place (your )?order|proceed to (buy|checkout)|pay now|buy now|checkout|publish|post|delete|remove|discard)\b/i;

const DECISION_TYPES = new Set(["step", "ask", "answer", "task_done", "all_done", "blocked"]);

// The optional machine-checkable assertion a step may carry alongside its prose
// `expects`. Prose is for legibility; this is what a real runner can verify without
// a model call, and verified pass/fail is what drives the extension's stuck counter,
// escalation and recovery. Shapes mirror extension/lib/recovery.js verifyAssertion.
const ASSERT_KINDS = new Set(["element_exists", "element_gone", "url_contains", "value_equals", "text_present", "none"]);

// The KIND alone is not enough. The extension revalidates every assertion with
// bgValidateAssertion, which THROWS on a missing companion field and discards the
// turn, so a half-formed assert here would cost a whole step. Anything that would
// not survive that check is dropped and the step simply carries no assertion.
function isUsableAssert(a: unknown): boolean {
  if (!a || typeof a !== "object" || Array.isArray(a)) return false;
  const v = a as Record<string, unknown>;
  const kind = String(v.assert || "");
  if (!ASSERT_KINDS.has(kind)) return false;
  if (kind === "element_exists" || kind === "element_gone") return Boolean(v.match && typeof v.match === "object");
  if (kind === "url_contains" || kind === "text_present") return typeof v.value === "string" && Boolean(v.value.trim());
  if (kind === "value_equals") return Number.isInteger(v.index) && typeof v.value === "string";
  return true; // "none"
}

async function callModel(apiKey: string, messages: unknown[], rescue = false) {
  return await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // An explicit ceiling where there was none. A turn that weighs several
    // candidate songs runs longer than one that clicks a button, and a decision
    // cut off mid-JSON is indistinguishable from a broken one.
    // Raised with the observation cap and the answer channel: 1200 was set when the
    // screen was 3000 chars and no turn ever had to carry findings. An answer that
    // runs out of tokens mid-sentence is indistinguishable from a broken turn.
    // On a rescue every one of these three changes together, and they have to.
    // Astra has no "none" effort level and its reasoning is billed as completion,
    // so sending the standard loop's effort would be rejected outright and the
    // standard ceiling could be eaten by the thinking before any JSON is written.
    body: JSON.stringify({
      model: rescue ? HIL_RESCUE_MODEL : HIL_LOOP_MODEL,
      // Medium only on a rescue. He runs at his own effort the rest of the time,
      // and a rescue is the one turn that has earned the expensive setting: it
      // only happens after a wall.
      reasoning_effort: rescue ? BRAINO_RESCUE_REASONING_EFFORT : BRAINO_TEXT_REASONING_EFFORT,
      messages,
      // Astra bills reasoning as completion either way, so the roomier ceiling
      // applies whenever Astra is the one answering.
      max_completion_tokens: rescue ? BRAINO_RESCUE_MAX_TOKENS : 2400,
    }),
  });
}

/* The same turn, asked for through the Responses API so the model can search.
 *
 * A search used to cost three model calls: Astra spends a turn deciding to
 * search, web-research runs its own model to answer it, and Astra spends
 * another turn reading that answer. Nine to twenty three seconds in the middle,
 * two turns of about fifteen either side. The hosted tool folds all of it into
 * one turn, and the second model disappears entirely.
 *
 * No response_format. Structured output is not documented as working alongside
 * web search, and coerceTurn has always been tolerant by design: it strips
 * fences, finds the object, and tells the client to retry once when it cannot.
 * That tolerance is what makes this safe to try.
 */
/* Reusing the instructions (5 Oct). The ~10k-token start of every turn (the
   loop rules and the tool list) is identical, but only 2 of 286 turns were
   served from OpenAI's cache: without a cache name, requests rarely land where
   the cached copy is, and the default cache lasts minutes while Braino's
   commands are often further apart. A fixed name per model and a 24-hour
   cache make the repeat read cheap and quicker. If the API ever refuses these
   fields, the turn is sent again without them, so caching can never cost a
   turn. */
let cacheFieldsRefused = false;
async function callResponsesApi(
  apiKey: string, model: string, system: string, user: string,
  effort: string, maxTokens: number, json = true,
) {
  const body: Record<string, unknown> = {
    model,
    instructions: system,
    input: user,
    tools: [{ type: "web_search" }],
    reasoning: { effort },
    max_output_tokens: maxTokens,
    ...(cacheFieldsRefused ? {} : { prompt_cache_key: `braino-hil-loop-${model}`, prompt_cache_retention: "24h" }),
  };
  /* Asked for as JSON rather than merely instructed to be JSON.
   *
   * Measured over five identical turns, one in five came back unparseable, and
   * an unreadable turn is not a small tax: it ends as "I could not read my own
   * reasoning", the client burns a retry, and three seconds go with it. The
   * prompt has always asked for JSON and asking is not the same as constraining.
   *
   * Documented as maybe-unsupported alongside web search, which is exactly why
   * it is a flag: the caller drops it and retries once if the API says no,
   * rather than losing search or the turn. */
  if (json) body.text = { format: { type: "json_object" } };
  const send = () => fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let res = await send();
  if (res.status === 400 && !cacheFieldsRefused) {
    const why = await res.clone().text().catch(() => "");
    if (/prompt_cache/i.test(why)) {
      console.warn("hil-loop: cache fields refused, sending without them", why.slice(0, 200));
      cacheFieldsRefused = true;
      delete body.prompt_cache_key;
      delete body.prompt_cache_retention;
      res = await send();
    }
  }
  return res;
}

/* The final text, out of an output array that also carries reasoning items and
 * the search calls themselves. Walked backwards for the last assistant message:
 * a turn that searched twice has several items before the one that matters. */
function readResponsesText(data: any): { content: string; searches: number } {
  const output = Array.isArray(data?.output) ? data.output : [];
  const searches = output.filter((i: any) => i?.type === "web_search_call").length;
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return { content: data.output_text, searches };
  }
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i];
    if (item?.type !== "message") continue;
    const parts = Array.isArray(item?.content) ? item.content : [];
    const text = parts.map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("").trim();
    if (text) return { content: text, searches };
  }
  return { content: "", searches };
}

/* Responses counts tokens under different names. Mapped rather than left blank,
 * because engine_runs is where the cost of all this gets read, and a run that
 * reports no tokens looks free. */
function normaliseUsage(usage: any) {
  if (!usage) return usage;
  if (usage.prompt_tokens !== undefined) return usage;
  return {
    prompt_tokens: usage.input_tokens,
    completion_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    prompt_tokens_details: usage.input_tokens_details,
  };
}

// ── State rendering ──────────────────────────────────────────────────────────
// The client sends structured state; the server renders one plain snapshot for the
// model. Rendering lives here, next to the prompt that reads it, so the two can
// never drift apart across clients.

type LoopTask = { desc: string; status: "pending" | "active" | "done" };
type LoopStepRecord = { intent: string; action: string; ok: boolean | null; why: string | null };
type LoopLastStep = { intent: string; action: unknown; expects: string; result: unknown };

type LoopState = {
  tasks: LoopTask[];
  facts: string[];
  asides: string[];
  steps: LoopStepRecord[];
  /* The moves he wrote down on turn one. Kept by the client, like tasks, and
     shown back every turn so step nine knows where it is on the map without
     having to work the whole job out again from the screen. */
  plan?: string[];
  /* Long-job memory (2026-10-01, sent only when the Mac's BRAINO_HIL_FAST
     switch is on). card: where the job is, kept by the client from the plan
     and the steps that worked. found: what earlier steps found, pinned so the
     reminders in facts can never push it out. batch: the client can run a
     short chain of steps without a turn in between. */
  card?: { goal?: string; done?: string[]; now?: string; left?: string[] };
  found?: string[];
  batch?: boolean;
  budgetLeft: number;
  screen?: string;
  userReply?: string;
  lastStep?: LoopLastStep;
};

function renderState(command: string, context: string, state: LoopState | null): string {
  const parts: string[] = [`Command: ${command}`];
  if (context) parts.push(`Context: ${context}`);

  const firstTurn = !state || !Array.isArray(state.tasks) || !state.tasks.length;

  if (firstTurn) {
    // The observation still goes in below. An earlier version returned early here,
    // so on turn one the model was asked to resolve "this email" while being shown
    // nothing at all, which made looking-before-asking impossible exactly when it
    // matters most. The screen is never withheld.
    parts.push("First turn. No task list exists yet. Restate the goal, split it into its separate jobs, write the plan (the moves you expect to make, in order), and choose the first action of job one. Look at the observation below before deciding anything: if what the command refers to is already open, continue from it rather than going to find it.");
    if (state?.screen) parts.push(`OBSERVATION, the live page right now:\n${String(state.screen).slice(0, 16000)}`);
    if (state?.batch) parts.push(CHAIN_RULE);
    parts.push("Return the JSON for this turn now.");
    return parts.join("\n\n");
  }

  const jobs = state!.tasks
    .map((t, i) => `${i + 1}. [${t.status}] ${t.desc}`)
    .join("\n");
  parts.push(`RUN STATE\nJobs, strictly in order:\n${jobs}`);
  if (Array.isArray(state!.plan) && state!.plan.length) {
    const moves = state!.plan.map((m, i) => `${i + 1}. ${m}`).join("\n");
    parts.push(`YOUR PLAN, written on turn one. Find where the actions below have got you to, and take the next move. Rewrite it with "replan" only if the screen shows it is wrong:\n${moves}`);
  }

  if (state!.card?.goal) {
    const c = state!.card;
    parts.push([
      "WHERE YOU ARE IN THIS JOB (kept for you; trust it over re-reading the screen):",
      `Goal: ${String(c.goal).slice(0, 400)}`,
      c.done?.length ? `Done: ${c.done.slice(-8).map((d) => String(d).slice(0, 120)).join(" → ")}` : "Done: nothing yet",
      c.now ? `Now: ${String(c.now).slice(0, 200)}` : "",
      c.left?.length ? `Left: ${c.left.slice(0, 8).map((d) => String(d).slice(0, 120)).join(" → ")}` : "",
    ].filter(Boolean).join("\n"));
  }
  if (state!.found?.length) parts.push("FOUND SO FAR (results of earlier steps; use these, do not fetch them again):\n" + state!.found.slice(-6).map((f) => `- ${String(f).slice(0, 2500)}`).join("\n"));
  if (state!.facts?.length) parts.push("Learned so far:\n" + state!.facts.map((f) => `- ${f}`).join("\n"));
  if (state!.asides?.length) parts.push("Set aside for later:\n" + state!.asides.map((a) => `- ${a}`).join("\n"));

  if (state!.steps?.length) {
    const lines = state!.steps.map((s) => {
      const status = s.ok === true ? "ok" : s.ok === false ? `FAILED: ${s.why || "no reason recorded"}` : "pending";
      return `- ${s.intent} [${s.action}] -> ${status}`;
    });
    parts.push("Actions taken so far:\n" + lines.join("\n"));
  } else {
    parts.push("Actions taken so far: none yet");
  }

  parts.push(`Budget left for the active job: ${Math.max(0, Number(state!.budgetLeft) || 0)} actions.`);
  // The live element map. Indices below are the ONLY ones that may be targeted.
  if (state!.screen) parts.push(`OBSERVATION, the live page right now:\n${String(state!.screen).slice(0, 16000)}`);
  if (state!.userReply) parts.push(`The user just replied: "${String(state!.userReply).slice(0, 1000)}"`);

  if (state!.lastStep) {
    parts.push([
      "ACTION THAT JUST RAN, judge it first:",
      `intent: ${state!.lastStep.intent}`,
      `action: ${JSON.stringify(state!.lastStep.action ?? {}).slice(0, 400)}`,
      `expected: ${state!.lastStep.expects}`,
      /* 1500 was sized for a click, whose result is the word "ok". A script's
         result IS the work: twenty listings read in one pass is legitimately
         twelve thousand characters, and cutting that here undid the whole point
         of letting it write a script. It was the tightest of the three places
         the same result got trimmed, so it decided what the model actually saw,
         and what it saw was one listing and a sentence that stopped mid-word. */
      `result: ${JSON.stringify(state!.lastStep.result ?? null).slice(0, 14000)}`,
    ].join("\n"));
  }

  if (state!.batch) parts.push(CHAIN_RULE);
  parts.push("Return the JSON for this turn now.");
  return parts.join("\n\n");
}

/* Chaining: the slow part of a long job is one ~5s turn per move. When the
   next moves do not depend on seeing the screen in between, they go in one
   turn and the Mac runs them back to back, stopping at the first failure. */
const CHAIN_RULE = `CHAINING IS ON FOR THIS RUN, and it overrides "one action a turn" and "never fire two things at once" for safe follow-ups only. Every turn costs the user about five seconds, so when the moves right after this step do not need you to see the screen in between, put them in the same turn as "then": [step, step] inside "decision", same shape as "step", at most 3. Examples that SHOULD be chained: navigate to a site, then wait 1-2s, then type into the search box by shortcut and press Enter; type text, then press Enter; a keyboard shortcut, then type. Each chained step must be reversible. Element indexes are allowed in a chain only to FILL A FORM on the page you can see right now: several "type" steps into different boxes by index (no submit), then at most one "click" by index as the very last step (the Search or Next button). Never use an index after a navigate, a click, Enter or a tool in the same chain, because the page has moved and the numbers are stale. Example for "flights from Pune to Hyderabad" on a form with [3] "Where from?", [5] "Where to?", [9] "Search": step type [3] "Pune", then type [5] "Hyderabad", then click [9]. Never chain past a step whose result you must read, and never chain a send, post, buy or delete. Example decision for "open youtube and search lofi": {"type":"step","step":{"intent":"Load YouTube.","action":{"type":"navigate","url":"https://www.youtube.com/results?search_query=lofi"},"expects":"YouTube results for lofi.","reversible":true},"then":[{"intent":"Let the results load.","action":{"type":"wait","ms":1500},"expects":"Results visible.","reversible":true}]}. When a site takes its query in the URL, put the query in the URL instead of typing it.`;

// ── Is this rescue earned? ───────────────────────────────────────────────────
// This endpoint is verify_jwt=false so the lab works for anyone, which means the
// rescue flag arrives from a caller that can send anything it likes. The client
// rations escalation honestly; a curl does not. Without a check here, the whole
// cost design is one line of JSON away from being bypassed by a stranger, and
// the model on the other side of that line bills output at $50/M.
//
// Two gates, in cost order.
//
// One, free: a rescue only makes sense partway through a run. A cold call with no
// jobs and no steps has nothing to be rescued from, and that is the shape of every
// trivial abuse of this flag.
const RESCUE_HARD_CAP = 12;

function rescueLooksReal(state: LoopState | null): boolean {
  if (!state) return false;
  const steps = Array.isArray(state.steps) ? state.steps.length : 0;
  const tasks = Array.isArray(state.tasks) ? state.tasks.length : 0;
  return steps > 0 || tasks > 0;
}

// Two, one indexed read: the client's 10-action ceiling is enforced in a file
// anyone can edit, so the real ceiling lives here. Counting rows already written
// for this run makes the cap survive a client that simply refuses to stop.
//
// Fails CLOSED. If the count cannot be read, the turn runs on the standard model
// rather than the expensive one: a rescue that quietly degrades to him is a worse
// answer, and an unbounded bill is a worse problem.
async function rescueTurnsUsed(runId: string | null): Promise<number> {
  if (!runId) return RESCUE_HARD_CAP;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return RESCUE_HARD_CAP;
  try {
    const res = await fetch(
      `${url}/rest/v1/engine_runs?select=id&run_id=eq.${encodeURIComponent(runId)}&model=eq.${encodeURIComponent(HIL_RESCUE_MODEL)}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          // head+exact gets the count from the Content-Range header without
          // shipping the rows, so this stays one cheap indexed read.
          Prefer: "count=exact",
          Range: "0-0",
        },
        method: "HEAD",
      },
    );
    const range = res.headers.get("content-range") || "";
    const total = Number(range.split("/")[1]);
    return Number.isFinite(total) ? total : RESCUE_HARD_CAP;
  } catch {
    return RESCUE_HARD_CAP;
  }
}

/* What Braino already knows about the person, handed to the brain doing the work.
 *
 * The memory engine has been filling braino_memories for months, and the loop
 * has never seen a line of it. So "send it to Ilu" costs a whole turn working
 * out who Ilu is, at ten seconds a turn, to look up something already stored.
 * Braino's own contacts, the user's name, what they are building: all of it sat
 * one table away from the brain that needed it.
 *
 * Read as the USER, not with a service key. The caller passes its own token,
 * RLS decides what comes back, and a caller with no token gets nothing. That is
 * what makes it safe to do this in a function that is deliberately public: the
 * lab still works, and it simply has no memories to draw on.
 */
type KnownContext = { block: string; userId: string | null; supabase: any | null };

async function loadWhatBrainoKnows(req: Request, command: string): Promise<KnownContext> {
  const auth = req.headers.get("Authorization") || "";
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const none: KnownContext = { block: "", userId: null, supabase: null };
  if (!auth.startsWith("Bearer ") || !url || !anon) return none;
  try {
    const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    // The anon key is a perfectly valid Bearer token and resolves to no user,
    // which is exactly the right answer: the public lab gets no memories.
    if (!userId) return none;
    const knowledge = await loadUserKnowledge(supabase, userId, {
      currentMessage: command,
      includeMemoryNotes: false,   // note summaries are for chat; a task needs facts and people
      includeXPersona: false,
      includeContacts: true,
      includeMemories: true,
    });
    const block = String(knowledge.combinedContext || "").trim();
    /* The user and their client are handed back even when there is nothing to
       say about them. Resolving who this is costs one round trip and history
       needs the same answer; doing it twice would be paying twice for a fact we
       already had. */
    if (!block) return { block: "", userId, supabase };
    const rendered = [
      "=== WHAT YOU ALREADY KNOW ABOUT THEM ===",
      "Braino remembers this from earlier. Use it instead of asking, and instead of spending a step finding out something you were already told.",
      "",
      block,
    ].join("\n");
    return { block: rendered, userId, supabase };
  } catch (_) {
    // Never fail a turn over this. A run without memories is worse, not broken.
    return none;
  }
}

// ── The rescue brief ─────────────────────────────────────────────────────────
// Appended to the ordinary state render when the loop escalates. It is deliberately
// short: Astra already receives the whole run above it, and repeating that in prose
// would cost input tokens to say what the state block just said.
//
// The one thing it MUST carry is the difference between an action that is known to
// have worked and an action whose outcome was never confirmed. A step sitting at
// ok:null was executed and never judged, which is the exact shape of "the message
// may or may not have sent". Told nothing, the sensible move looks like doing it
// again, and doing it again is how a rescue turns one unsent message into two sent
// ones. So the unverified steps are named, and looking is made the required first
// move rather than a suggestion.
function renderRescueBrief(state: LoopState | null, reason: string): string {
  const parts: string[] = [];
  parts.push([
    "=== YOU ARE BEING HANDED A RUN THAT IS STUCK ===",
    `Braino's own loop could not get through this and handed it to you. Why: ${reason}`,
    "Everything above is real. Those jobs were really attempted, on a real screen, by him.",
  ].join("\n"));

  const steps = Array.isArray(state?.steps) ? state!.steps : [];
  const unverified = steps.filter((s) => s && s.ok === null);
  if (unverified.length) {
    parts.push([
      "NOT CONFIRMED, and this is the dangerous part:",
      ...unverified.map((s) => `- ${s.intent} [${s.action}] ran, and nothing ever confirmed whether it worked.`),
      "Any of these may have SUCCEEDED. Doing one again could send a second message, place a second order, or post twice.",
      "Before you repeat anything on that list, look at the screen and find out. If you cannot tell, ask. Never assume it failed just because nobody wrote down that it worked.",
    ].join("\n"));
  }

  parts.push([
    "How to take over:",
    "1. Read the failures above and work out what he misread, not just what he clicked.",
    "2. Your first action should usually be to look, because his picture of the screen is the thing that failed.",
    "3. Same rules as him. Same actions, same one-decision-per-turn, same JSON. You are not exempt from the confirmation gate: anything that spends money, sends, posts or deletes is still reversible:false and still waits for the human.",
    "4. Finish the job. Do not hand it back half done.",
  ].join("\n"));

  return parts.join("\n\n");
}

// ── Turn coercion ────────────────────────────────────────────────────────────
// Never hard-fail on shape: strip fences, find the object, coerce every field.
// meta.parse_ok tells the client whether this is the model's real turn or a
// fallback, so the client can retry once instead of ending a run on a hiccup.

type LoopTurn = {
  thinking: string;
  split: { restated_goal: string; tasks: string[]; plan?: string[] } | null;
  /* The rest of the map, rewritten. Only when the screen proved the old one
     wrong; null on every ordinary turn. */
  replan?: string[] | null;
  verdict: { ok: boolean; why: string | null } | null;
  decision:
    | { type: "step"; step: { intent: string; action: Record<string, unknown>; expects: string; reversible: boolean; assert?: Record<string, unknown> } }
    | { type: "ask"; question: string }
    | { type: "answer"; text: string }
    | { type: "task_done" | "all_done" | "blocked"; message: string; lesson?: string };
};

// ── Per-run prep cache ───────────────────────────────────────────────────────
// See the handler. Bounded and short lived on purpose: this is a saving on the
// turns of one job, not a store, and a warm instance should never grow into one.
type RunPrep = {
  at: number;
  known: KnownContext;
  lessonBlock: string;
  procedureBlock: string;
  historyBlock: string;
};
const RUN_PREP_TTL_MS = 10 * 60 * 1000;
const RUN_PREP_MAX = 200;
const runPrepCache = new Map<string, RunPrep>();

function rememberRunPrep(key: string, prep: RunPrep) {
  runPrepCache.set(key, prep);
  if (runPrepCache.size <= RUN_PREP_MAX) return;
  const now = Date.now();
  for (const [k, v] of runPrepCache) {
    if (now - v.at > RUN_PREP_TTL_MS || runPrepCache.size > RUN_PREP_MAX) runPrepCache.delete(k);
    if (runPrepCache.size <= RUN_PREP_MAX / 2) break;
  }
}

/** A short hash of the caller's token and the command, so the key never holds
 *  the token itself and an answered question (which rewrites the command) reads
 *  fresh memories for what the job now is. */
async function tokenFingerprint(auth: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(auth));
  return Array.from(new Uint8Array(digest).slice(0, 12)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* A plan is a handful of short moves. Anything that is not a string is dropped
   rather than failing the turn: the plan is a map, and a turn with a bad map is
   still a turn with a good action in it. */
function cleanPlan(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: unknown) => typeof m === "string" && (m as string).trim())
    .map((m: string) => m.trim().slice(0, 160))
    .slice(0, 10);
}

const HIL_TOOL_NAMES_SORTED = HIL_TOOL_CATALOG.map((t) => t.name).sort((x, y) => y.length - x.length);

/* Names the model uses for actions the runner has under another name. */
const ACTION_ALIASES: Record<string, string> = {
  click_element: "click", click_at: "click", tap: "click", press_button: "click", hover: "look",
  press: "pressKey", press_key: "pressKey", presskey: "pressKey", key: "pressKey", keypress: "pressKey", hotkey: "pressKey", shortcut: "pressKey", keyboard: "pressKey",
  input: "type", type_text: "type", fill: "type", enter_text: "type", write: "type",
  open: "navigate", open_url: "navigate", goto: "navigate", go_to: "navigate", visit: "navigate",
  screenshot: "look", inspect: "look", vision: "look", look_at_screen: "look", see: "look", observe: "look", screen_vision: "look",
  scroll_down: "scroll", scroll_up: "scroll", swipe: "scroll",
  read_page: "read", extract: "read", get_text: "read",
  search: "web_search", websearch: "web_search", google: "web_search",
  script: "exec_js", run_js: "exec_js", javascript: "exec_js", js: "exec_js", execute_js: "exec_js",
  sleep: "wait", pause: "wait", delay: "wait",
  select: "selectOption", choose: "selectOption",
};

/* JSON as models write it when it is almost right: raw line breaks and tabs
   inside strings, trailing commas. Walks the text once, tracking strings. */
function repairJson(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

/* Brackets as models write them when they are almost right (2026-10-03): one
   closer too many in the middle, so the object ends early and the rest reads
   as junk, or the last one or two left off. Both were behind "I lost my train
   of thought": 7 of 32 turns in one scoring run, every one a bracket. Walks
   once, tracking strings: a closer that does not match what is open is
   dropped, a closer that would end the outermost object while more fields
   follow is dropped, and whatever is still open at the end is closed. */
/* The last balanced {...} after a "decision" key, string-aware, parsed on its own. */
function salvageDecision(text: string): Record<string, unknown> | null {
  let at = text.lastIndexOf("\"decision\"");
  while (at >= 0) {
    const open = text.indexOf("{", at);
    if (open < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = open; i < text.length; i++) {
      const c = text[i];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) {
        const chunk = text.slice(open, i + 1);
        try { const d = JSON.parse(repairJson(chunk)); if (d && typeof d === "object" && typeof d.type === "string") return { thinking: "", decision: d }; } catch { /* keep looking */ }
        break;
      } }
    }
    at = text.lastIndexOf("\"decision\"", at - 1);
  }
  return null;
}

function balanceJson(text: string): string {
  let out = "";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === "{" || ch === "[") { stack.push(ch); out += ch; continue; }
    if (ch === "}" || ch === "]") {
      const want = ch === "}" ? "{" : "[";
      if (stack[stack.length - 1] !== want) continue;
      if (stack.length === 1 && /^\s*,/.test(text.slice(i + 1))) continue;
      stack.pop();
      out += ch;
      continue;
    }
    out += ch;
  }
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

/* Looking is never something you cannot take back (2026-10-03).
   "Open the Publish Content documentation. That cannot be undone. Want me to
   go ahead?" was asked four times about a docs link, and typing a draft into
   Cursor was gated the same way. The model marks these reversible false; the
   gate exists for buying, posting, sending and deleting, so a step that only
   opens, reads, scrolls, waits, follows a link or tab, or types without
   sending is set back to reversible here, on both surfaces at once. A click on
   anything named like a buy, post, send or delete control is left alone. */
const DESTRUCTIVE_NAME = /\b(?:buy|order|checkout|check out|pay|purchase|place order|publish|post|share|send|submit|delete|remove|trash|discard|unsubscribe|cancel subscription|confirm|transfer|book now|reserve)\b/i;
function markHarmlessStepsUndoable(turn: LoopTurn, screen: string) {
  const step = (turn?.decision as { step?: { reversible?: boolean; action?: Record<string, unknown> } } | undefined)?.step;
  if (!step || step.reversible !== false) return;
  const a = step.action || {};
  const type = String(a.type || "");
  let harmless = ["navigate", "read", "look", "scroll", "wait"].includes(type);
  if (type === "type" && a.submit !== true) harmless = true;
  if (type === "click" && typeof a.index === "number") {
    const line = String(screen || "").split("\n").find((l) => l.startsWith(`[${a.index}] `)) || "";
    const role = (line.match(/^\[\d+\]\s+(\S+)/) || [])[1] || "";
    const name = (line.match(/"([^"]*)"/) || [])[1] || "";
    if (/^(?:link|tab|menuitem|treeitem|heading|image|article|row|cell)$/i.test(role) && !DESTRUCTIVE_NAME.test(name)) harmless = true;
  }
  /* Prompting another AI reaches nobody: on an AI chat site, typing with
     Enter, pressing Enter, or clicking its Send is finishing the job. */
  const AI_CHAT = /https?:\/\/(?:[\w-]+\.)*(?:chatgpt\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com|perplexity\.ai|copilot\.microsoft\.com|grok\.com|chat\.deepseek\.com|meta\.ai)\b/i;
  if (!harmless && AI_CHAT.test(String(screen || ""))) {
    const line = typeof a.index === "number" ? (String(screen || "").split("\n").find((l) => l.startsWith(`[${a.index}] `)) || "") : "";
    const name = (line.match(/"([^"]*)"/) || [])[1] || "";
    if (type === "type" || (type === "pressKey" && /enter|return/i.test(String(a.key || ""))) || (type === "click" && /\b(?:send|submit)\b/i.test(name))) harmless = true;
  }
  if (harmless) {
    step.reversible = true;
    console.warn("hil-loop: harmless step marked undoable", { type });
  }
}

/* Why the last turn was rejected, so "came back unreadable" stops being a
   mystery: 8 of 19 recent give-ups were this, with normal-length replies. */
let lastParseFailure = "";
let lastParseRaw = "";

function coerceTurn(rawContent: string, hadLastStep: boolean, allowChain = false): { turn: LoopTurn; parseOk: boolean } {
  const fallback: LoopTurn = {
    thinking: "I could not read my own reasoning for this turn.",
    split: null,
    verdict: hadLastStep ? { ok: false, why: "The reasoning for this turn did not come back readable." } : null,
    decision: { type: "blocked", message: "My reasoning for this turn came back unreadable, so I stopped rather than guess at my own next move." },
  };

  const withoutFence = String(rawContent || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: any = null;
  try {
    parsed = JSON.parse(withoutFence);
  } catch {
    const jsonMatch = withoutFence.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        /* 4 of 42 turns on 2026-09-25 were "not json" at normal lengths: the
           usual cause is a script or a quote with a raw line break inside a
           string, or a trailing comma. Repaired rather than thrown away. */
        try { parsed = JSON.parse(repairJson(jsonMatch[0])); } catch { /* fall through */ }
      }
    }
    // Brackets last, on the whole reply: an early closer leaves the greedy
    // match above holding only half the object.
    if (!parsed) {
      try { parsed = JSON.parse(balanceJson(repairJson(withoutFence.slice(withoutFence.indexOf("{"))))); } catch { /* fall through */ }
      if (parsed) console.warn("hil-loop: brackets repaired");
    }
    /* The decision alone, when the thinking broke the reply. Every unreadable
       turn in two weeks started '{"thinking":' and then broke inside it (stray
       quotes, or 11,000 characters of it), killing the run with "I lost my
       train of thought" (5 Oct). The decision is all the run needs. */
    if (!parsed) {
      const salvaged = salvageDecision(withoutFence);
      if (salvaged) { parsed = salvaged; console.warn("hil-loop: decision salvaged from a broken reply"); }
    }
  }
  if (!parsed || typeof parsed !== "object") {
    lastParseFailure = `not json (${withoutFence.length} chars, starts "${withoutFence.slice(0, 12).replace(/[^\x20-\x7e]/g, "?")}")`;
    lastParseRaw = withoutFence.slice(0, 600);
    return { turn: fallback, parseOk: false };
  }

  const rawDecision = parsed.decision && typeof parsed.decision === "object" ? parsed.decision : {};
  const type = DECISION_TYPES.has(rawDecision.type) ? rawDecision.type : null;
  if (!type) { lastParseFailure = "bad decision type"; lastParseRaw = withoutFence.slice(0, 600); return { turn: fallback, parseOk: false }; }

  let decision: LoopTurn["decision"];
  if (type === "step") {
    const s = rawDecision.step && typeof rawDecision.step === "object" ? rawDecision.step : {};
    const action = s.action && typeof s.action === "object" && !Array.isArray(s.action) ? s.action : null;
    let actionType = action && typeof action.type === "string" ? action.type.trim() : "";
    /* 5 of 42 turns were "bad action type": a sensible action under a name the
       runner does not use. Mapped to the real one; a catalog tool written as
       the type becomes that tool; anything else goes to the Mac as a step it
       will refuse in words, which the next turn can recover from. Throwing the
       turn away only ever produced a retry and then "lost my train of thought". */
    if (action && !ACTION_TYPES.has(actionType)) {
      const alias = ACTION_ALIASES[actionType.toLowerCase().replace(/[\s-]+/g, "_")];
      if (alias) {
        actionType = alias;
      } else if (findTool(actionType)) {
        (action as Record<string, unknown>).tool = actionType;
        actionType = "tool";
      }
      if (actionType !== String(action.type)) console.warn("hil-loop: action type repaired", { from: action.type, to: actionType });
      else lastParseFailure = `unknown action "${String(actionType).slice(0, 40)}" passed through`;
    }
    if (!action || !actionType) { lastParseFailure = "step with no action"; lastParseRaw = withoutFence.slice(0, 600); return { turn: fallback, parseOk: false }; }
    // A tool call is only a step if the tool is real. Rejecting the whole turn
    // rather than dropping the action is deliberate: a half-understood turn that
    // silently becomes a no-op is the hardest kind of bug to see from outside.
    if (actionType === "tool") {
      /* The name, wherever the model put it. It writes "name" or "tool_name"
         as often as "tool", and the whole turn used to be thrown away for it:
         8 of 19 recent give-ups, each after two retries, 55 to 83 seconds of
         nothing for "change to Monday mode". */
      const a = action as Record<string, unknown>;
      const toolName = String(a.tool || a.name || a.tool_name || a.toolName || "").trim();
      a.tool = toolName;
      if (!a.args && a.arguments && typeof a.arguments === "object") a.args = a.arguments;
      /* A name that is not in the catalog is still a real turn: it goes to the
         Mac, which answers "there is no such tool, do it another way", and the
         next turn recovers. Rejecting it only ever produced the same turn again. */
      /* A near miss is the real tool: "monday_mode" is monday_mode_toggle. */
      if (toolName && !findTool(toolName)) {
        const near = HIL_TOOL_NAMES_SORTED.find((n) => n.startsWith(`${toolName}_`) || n.startsWith(toolName) || toolName.startsWith(n));
        if (near) { a.tool = near; console.warn("hil-loop: tool name repaired", { from: toolName, to: near }); }
      }
      if (!findTool(String(a.tool))) {
        console.warn("hil-loop: tool not in catalog, passing through", { tool: toolName });
        if (!toolName) { lastParseFailure = "tool with no name"; lastParseRaw = withoutFence.slice(-600); return { turn: fallback, parseOk: false }; }
      }
    }
    // A script with no code is not a step, it is a turn that would run nothing
    // and be judged as if it had. The cap is a sanity bound, not a security
    // one: what makes this safe is the gate below and the fact that a person is
    // watching, not the length.
    if (actionType === "exec_js") {
      const code = String((action as Record<string, unknown>).code || "");
      if (!code.trim() || code.length > 8000) { lastParseFailure = "bad script"; lastParseRaw = withoutFence.slice(0, 600); return { turn: fallback, parseOk: false }; }
    }
    // A click on a send/buy/publish/destroy control is gated even if the model said
    // otherwise. The element NAME is the real test and lives on the client, which
    // has the last word (isIrreversibleClick); this is the server-side floor.
    // The catalog already knows which tools cannot be taken back, and it knows it
    // better than a regex over the intent ever will. Its verdict is not advice:
    // a tool marked irreversible is forced to reversible:false whatever the model
    // claimed, so the confirmation gate fires on a delete even when the model
    // was sure it was harmless.
    const toolIrreversible = actionType === "tool"
      && isIrreversible(String((action as Record<string, unknown>).tool || ""));
    const looksIrreversible = toolIrreversible
      || IRREVERSIBLE_HINT.test(JSON.stringify(action))
      || IRREVERSIBLE_HINT.test(String(s.intent || ""));
    decision = {
      type: "step",
      step: {
        intent: typeof s.intent === "string" && s.intent.trim() ? s.intent.trim() : `Run ${actionType}.`,
        action: { ...action, type: actionType },
        expects: typeof s.expects === "string" && s.expects.trim() ? s.expects.trim() : "The action completes without an error.",
        reversible: looksIrreversible ? false : s.reversible !== false,
        // Optional machine-checkable assertion. Kept only when it is one of the
        // known shapes; a malformed one is dropped, never a reason to fail the turn.
        ...(isUsableAssert(s.assert) ? { assert: s.assert as Record<string, unknown> } : {}),
      },
    };
  } else if (type === "ask") {
    const q = typeof rawDecision.question === "string" ? rawDecision.question.trim() : "";
    decision = { type: "ask", question: q || "Something here only you can answer. What should I do?" };
  } else if (type === "answer") {
    // The reporting channel. Informational work ends by HANDING OVER what was
    // found, and before this existed the only way out was a terminal message,
    // which taught the model to keep browsing to "prove" a task that was already
    // answerable. Accept text or message so a near-miss still lands.
    const t = typeof rawDecision.text === "string" && rawDecision.text.trim()
      ? rawDecision.text.trim()
      : typeof rawDecision.message === "string" ? rawDecision.message.trim() : "";
    decision = { type: "answer", text: t || "I found what was asked for, but my answer text came back empty." };
  } else {
    const m = typeof rawDecision.message === "string" ? rawDecision.message.trim() : "";
    /* The one line that would have saved this run, offered when he gives up.
     *
     * Written by the model rather than derived from the error, because the error
     * says what happened and a lesson has to say what to do instead. "Docs
     * rejected the insertion" is a symptom; "Docs draws on a canvas, use
     * google_doc_create" is the thing worth keeping. Optional: a block without
     * one is still a valid block. */
    const lesson = type === "blocked" && typeof rawDecision.lesson === "string"
      ? rawDecision.lesson.trim().slice(0, 600)
      : "";
    decision = {
      type,
      message: m || (type === "all_done" ? "Everything asked for is finished." : type === "task_done" ? "That job is finished." : "I stopped, and I am not sure of the reason my own turn gave."),
      ...(lesson ? { lesson } : {}),
    };
  }

  /* Chained steps, each coerced exactly like a single one. Kept only while
     every one is valid and reversible; the chain stops at the first that is
     not, so a bad tail never costs the good head. */
  if (allowChain && decision.type === "step" && Array.isArray(rawDecision.then) && rawDecision.then.length) {
    const keepFailure = lastParseFailure;
    const keepRaw = lastParseRaw;
    const then: Array<Record<string, unknown>> = [];
    for (const raw of rawDecision.then.slice(0, 3)) {
      const one = coerceTurn(JSON.stringify({ thinking: "", decision: { type: "step", step: raw } }), false);
      const st = one.parseOk && one.turn.decision.type === "step" ? one.turn.decision.step : null;
      if (!st || st.reversible === false) break;
      then.push(st as unknown as Record<string, unknown>);
    }
    lastParseFailure = keepFailure;
    lastParseRaw = keepRaw;
    if (then.length) (decision as { then?: Array<Record<string, unknown>> }).then = then;
  }

  const rawSplit = parsed.split && typeof parsed.split === "object" ? parsed.split : null;
  const split = rawSplit && Array.isArray(rawSplit.tasks) && rawSplit.tasks.length
    ? {
        restated_goal: typeof rawSplit.restated_goal === "string" && rawSplit.restated_goal.trim()
          ? rawSplit.restated_goal.trim()
          : "",
        tasks: rawSplit.tasks.filter((t: unknown) => typeof t === "string" && (t as string).trim()).slice(0, 5),
        plan: cleanPlan(rawSplit.plan),
      }
    : null;
  const replan = cleanPlan(parsed.replan);

  const rawVerdict = parsed.verdict && typeof parsed.verdict === "object" ? parsed.verdict : null;
  const verdict = hadLastStep
    ? {
        ok: rawVerdict ? rawVerdict.ok === true : false,
        why: rawVerdict && typeof rawVerdict.why === "string" && rawVerdict.why.trim() ? rawVerdict.why.trim() : null,
      }
    : null;

  return {
    turn: {
      thinking: typeof parsed.thinking === "string" && parsed.thinking.trim()
        ? parsed.thinking.trim()
        : "Thinking through the next move.",
      split,
      ...(replan.length ? { replan } : {}),
      verdict,
      decision,
    },
    parseOk: true,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, context, state, runId, rescue, rescueReason, hands, tools } = await req.json();
    // Which hands the caller actually has. "mac" gets the tool catalog; anything
    // else gets the browser vocabulary alone. Opt-in rather than opt-out on
    // purpose: a caller that forgets to say loses abilities, which is visible,
    // instead of being taught tools it cannot run, which is not.
    const hasMacHands = hands === "mac";
    // Which of the catalog's tools this caller can really run. See renderToolCatalog.
    const macTools = Array.isArray(tools)
      ? (tools as unknown[]).filter((t): t is string => typeof t === "string")
      : undefined;
    // Escalation is a claim by the client, so it is treated as one. The flag only
    // ever swaps the model and appends the brief; it can never widen what an action
    // is allowed to do, because the allowlist and the gate below do not read it.
    const rescueAsked = rescue === true;
    const rescueWhy = typeof rescueReason === "string" && rescueReason.trim()
      ? rescueReason.trim().slice(0, 400)
      : "his loop stopped making progress";
    const commandText = typeof command === "string" ? command.trim() : "";
    const contextText = typeof context === "string" ? context.trim() : "";
    const loopState: LoopState | null = state && typeof state === "object" ? state as LoopState : null;
    // The client owns the run id so all turns of one run stitch together in the
    // log. A missing or malformed one is not worth failing a turn over.
    const logRunId = typeof runId === "string" && /^[0-9a-f-]{36}$/i.test(runId) ? runId : null;
    const logTurn = (loopState?.steps?.length ?? 0) + 1;

    if (!commandText) {
      return new Response(JSON.stringify({ error: "No command provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Both gates are evaluated before a single expensive token is spent, and a
    // refused escalation is not an error: the turn simply runs on the standard
    // model, which is what would have happened anyway a moment earlier.
    // Escalation has to be earned. The flag is a claim by a client that can be
    // edited, so it is checked against the run's own state and against how many
    // expensive turns this run has already had.
    const isRescue = rescueAsked
      && rescueLooksReal(loopState)
      && (await rescueTurnsUsed(logRunId)) < RESCUE_HARD_CAP;
    if (rescueAsked && !isRescue) console.warn("hil-loop: rescue refused", { runId: logRunId });


    const started = Date.now();
    const reading = detectMoment(commandText);
    const momentId = reading.moment;
    // intensity was computed here, returned to the client, and then dropped on the
    // floor — so buildEmotionalCore always assembled at its default of 2 and a
    // panic-level command produced a byte-identical personality to a mild one.
    const emotionalCore = buildEmotionalCore({ medium: "text", moment: momentId, intensity: reading.intensity });
    /* Fetched in parallel with nothing else, but before the prompt is built, and
       only on the first turn's worth of cost: it is one indexed read and it
       replaces turns, which are ten seconds each. */
    /* Once per run, not once per turn.
     *
     * Who they are, what he remembers, their history and the lessons for this
     * site were fetched again on every turn: an auth round trip, then the memory
     * reads, then three more, all before the model saw a token. None of it
     * changes between turn two and turn nine of the same job, so a ten step job
     * paid for it ten times. It is kept here, in this instance, for the run.
     *
     * Keyed on the run AND the caller's own token, so a run id alone can never
     * hand one person's memories to another, and on the site, because lessons
     * and routes are about where he is and he moves. A cold instance or a
     * refreshed token is simply a miss: the turn pays what it always paid. */
    const screenText = String(loopState?.screen || "");
    const urlMatch = screenText.match(/https?:\/\/[^\s"']+/);
    /* A desktop app is a place too (6 Oct). Only websites had a scope, so
       nothing he worked out in Cursor, WhatsApp or Finder was ever kept. The
       app's name stands in for the site: "app:cursor". */
    const appMatch = screenText.match(/^APP:\s*([^|\n]+)/m);
    const appName = appMatch ? appMatch[1].trim().toLowerCase().replace(/[^a-z0-9 .-]/g, "").slice(0, 40) : "";
    const hostScope = urlMatch ? scopeFromUrl(urlMatch[0]) : appName && !/^(?:braino|electron)/.test(appName) && !/browser/.test(appName) ? `app:${appName}` : "";
    const lessonScopes = [hostScope, ...(macTools || []).slice(0, 4).map((t) => `tool:${t}`)];
    const cacheKey = logRunId
      ? `${logRunId}|${await tokenFingerprint(`${req.headers.get("Authorization") || ""}|${commandText}`)}|${hostScope}`
      : "";
    const cached = cacheKey ? runPrepCache.get(cacheKey) : undefined;
    let prep: RunPrep;
    if (cached && Date.now() - cached.at < RUN_PREP_TTL_MS) {
      prep = cached;
    } else {
      const known = await loadWhatBrainoKnows(req, commandText);
      /* The walls and the doors, fetched together.
       *
       * Two reads rather than one because they answer different questions: a
       * lesson is keyed on where you are, a route is keyed on where you are AND
       * what you are trying to do. They are awaited in parallel, so the pair costs
       * what the single read cost before. */
      /* History and routes shape how a job starts; by step two the plan exists
         and they only cost time (0.5 to 1.6s a step on 2026-09-25, because the
         run cache rarely hits across edge instances). Lessons stay: they are
         about the site in front of him, which can change mid-job. */
      const laterStep = Array.isArray(loopState?.steps) && loopState!.steps.length > 0;
      const [lessonBlock, procedureBlock, historyBlock] = await Promise.all([
        recallLessons(lessonScopes),
        laterStep ? Promise.resolve("") : recallProcedures(lessonScopes, commandText),
        /* Their own past runs, read as them. No token means no user means no
           history, which is exactly right for the public lab. */
        !laterStep && known.supabase ? recallHistory(known.supabase, commandText, hostScope) : Promise.resolve(""),
      ]);
      prep = { at: Date.now(), known, lessonBlock, procedureBlock, historyBlock };
      if (cacheKey) rememberRunPrep(cacheKey, prep);
    }
    const { known, lessonBlock, procedureBlock, historyBlock } = prep;
    const knownBlock = known.block;
    const prepMs = Date.now() - started;
    const prepCached = prep === cached;

    /* Pure and local: ten descriptions matched against the command, no network
       and no model call, so it cannot slow a turn down or fail one. */
    const skillBlock = renderSkills(commandText);

    const systemPrompt = [
      HIL_LOOP_PROMPT,
      // Learned use cases: fixed text, so it stays in the cached prefix.
      HIL_USE_CASES,
      // Before the personality, because it is capability rather than character,
      // and after the loop rules, because how to take a turn has to be settled
      // before what can be done in one.
      ...(hasMacHands ? [renderExecJs(), renderToolCatalog(macTools)] : []),
      /* The written contract for this kind of work, when there is one.
       *
       * Above everything learned, because it is the only block here that was
       * decided on purpose: a route is what happened to work and a lesson is
       * what happened to fail, while this is somebody having thought about how
       * the thing ought to behave. It is also usually absent, which is the
       * point: most commands are not one of the ten written-down skills and
       * should cost exactly what they cost before. */
      ...(skillBlock ? [skillBlock] : []),
      // After the rules and the abilities, before the personality: it is context
      // about the person, and it should not be able to displace how a turn works.
      ...(knownBlock ? [knownBlock] : []),
      // Beside what he knows about them, because their history with him is a
      // fact about them and not about the world. Before the lessons and the
      // routes for the same reason those sit before the state: who this is
      // settles before what is true of this site.
      ...(historyBlock ? [historyBlock] : []),
      // After what he knows about the person, because a lesson is about the
      // world rather than about them, and both sit under the rules.
      ...(lessonBlock ? [lessonBlock] : []),
      // And the routes last of the three, closest to the state: a lesson is a
      // standing fact about a place, a route is about the job in front of him
      // right now, and the nearer something is to the state the more it reads as
      // being about this turn rather than about the world in general.
      ...(procedureBlock ? [procedureBlock] : []),
      "=== WHO YOU ARE (the Emotional Engine, appended live for this request) ===",
      emotionalCore,
    ].join("\n\n");

    const baseMessage = renderState(commandText.slice(0, 2000), contextText.slice(0, 2000), loopState);
    // The brief goes AFTER the state, not before it: the last thing in the prompt is
    // the thing most likely to be obeyed, and what matters most here is the warning
    // about repeating an action nobody confirmed.
    const userMessage = isRescue
      ? `${baseMessage}\n\n${renderRescueBrief(loopState, rescueWhy)}`
      : baseMessage;
    // Recorded rather than recomputed, so the row in engine_runs says which brain
    // actually answered this turn. That column is the whole cost report.
    const turnModel = isRescue ? HIL_RESCUE_MODEL : HIL_LOOP_MODEL;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("API key not configured");

    /* Astra goes through Responses so it can search mid-turn; everything else
     * keeps the chat endpoint it has always used.
     *
     * Falling back rather than failing is the whole safety of this change. A new
     * endpoint can be wrong in ways a test does not find, and the old path is
     * known to work, so a bad Responses call costs one extra call and not the
     * run. It is logged, because a fallback that fires every time is a bug
     * wearing a safety net. */
    /* Everyone gets the Responses endpoint, not just Astra.
     *
     * Searching inside the turn is not an Astra feature, it is an endpoint
     * feature, and the whole reason a lookup cost three model calls was that we
     * were on the wrong endpoint. Luna searching for itself is the same saving
     * at a fiftieth of the price. */
    const bigBrain = isRescue;
    const effort = isRescue ? BRAINO_RESCUE_REASONING_EFFORT : BRAINO_TEXT_REASONING_EFFORT;
    const ceiling = bigBrain ? BRAINO_RESCUE_MAX_TOKENS : 2400;
    let aiRes = await callResponsesApi(apiKey, turnModel, systemPrompt, userMessage, effort, ceiling);
    let viaResponses = true;
    /* Rejected for asking for JSON, not for anything else: drop that one field
       and keep the endpoint. Falling all the way back to chat here would trade a
       formatting nicety for the search that made this endpoint worth using. */
    if (!aiRes.ok) {
      const first = await aiRes.clone().text().catch(() => "");
      if (/text|format|json/i.test(first)) {
        console.warn("hil-loop: responses rejected json_object, retrying without", first.slice(0, 200));
        aiRes = await callResponsesApi(apiKey, turnModel, systemPrompt, userMessage, effort, ceiling, false);
      }
    }
    if (!aiRes.ok) {
      const why = await aiRes.text();
      console.warn("hil-loop: responses failed, falling back to chat", aiRes.status, why.slice(0, 300));
      viaResponses = false;
      aiRes = await callModel(apiKey, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ], bigBrain);
    }

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("hil-loop AI error:", aiRes.status, errText);
      logEngineRun({
        engine: "hil-loop",
        run_id: logRunId,
        turn: logTurn,
        command: commandText,
        context: contextText,
        moment_id: momentId,
        model: turnModel,
        elapsed_ms: Date.now() - started,
        ok: false,
        error: `AI ${aiRes.status}`,
        prompt_version: HIL_LOOP_VERSION,
      });
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const read = viaResponses
      ? readResponsesText(aiData)
      : { content: aiData?.choices?.[0]?.message?.content || "", searches: 0 };
    if (read.searches) console.log("hil-loop: searched mid-turn", { searches: read.searches, runId: logRunId });
    lastParseFailure = "";
    lastParseRaw = "";
    const { turn, parseOk } = coerceTurn(read.content, Boolean(loopState?.lastStep), loopState?.batch === true);
    if (!parseOk) console.warn("hil-loop: turn rejected", { why: lastParseFailure, raw: lastParseRaw });
    markHarmlessStepsUndoable(turn, screenText);

    /* Written when he gives up, not when he succeeds.
     *
     * A run that worked teaches nothing anyone needs; a wall teaches everyone
     * who comes after. Fire and forget, and scoped to the host, so the next
     * person on this site is handed what this run paid two minutes to find out.
     * It goes in as proposed and only reaches other people on its second
     * independent hit: one run is an anecdote. */
    const blockedLesson = turn?.decision?.type === "blocked" ? (turn.decision as { lesson?: string }).lesson : "";
    if (blockedLesson && hostScope) {
      recordLesson({
        scope: hostScope,
        trigger: String((turn.decision as { message?: string }).message || commandText),
        lesson: blockedLesson,
        runId: logRunId,
      });
      console.log("hil-loop: lesson recorded", { scope: hostScope, runId: logRunId });
    }

    /* And written when he finishes, which is the half that was missing.
     *
     * The route is derived from the run's own step record rather than asked for,
     * so it costs no output tokens, cannot be hallucinated, and says what he
     * actually did instead of what he would later claim he did. The state
     * carrying it is the same snapshot the client sends every turn, so nothing
     * new has to be plumbed through to get it.
     *
     * all_done and not task_done: one job out of three finishing is not evidence
     * the approach worked, and the steps recorded at that point belong to all
     * three jobs mixed together. */
    /* A single job that finished counts too (6 Oct): most runs are one job and
       end task_done, so almost nothing was ever recorded. More than one job
       still waits for all_done, so routes from different jobs never mix. */
    const singleJob = (loopState?.tasks || []).length <= 1;
    if (hostScope && (turn?.decision?.type === "all_done" || (turn?.decision?.type === "task_done" && singleJob))) {
      const route = routeFromSteps(loopState?.steps || []);
      recordProcedure({
        scope: hostScope,
        goal: commandText,
        route,
        steps: (loopState?.steps || []).filter((s) => s?.ok !== false).length,
        runId: logRunId,
      });
      console.log("hil-loop: route recorded", { scope: hostScope, runId: logRunId });
    }

    /* And the run itself, kept as a thing that happened to this person.
     *
     * Whole runs only, never a step: forty rows of bookkeeping per run would
     * bury the four that are actually a memory. Both endings are worth keeping —
     * "you could not do it last time" is as useful to them as "you did", and
     * more useful than being asked to explain it again. */
    const ending = turn?.decision?.type;
    if ((ending === "all_done" || ending === "blocked") && known.userId) {
      recordRun({
        userId: known.userId,
        command: commandText,
        scope: hostScope,
        verdict: ending,
        message: String((turn.decision as { message?: string }).message || ""),
        surface: hasMacHands ? "mac" : "web",
        elapsedMs: Date.now() - started,
      });
    }

    /* A route was handed over and the run gave up on that scope anyway.
     *
     * Counted, never acted on immediately: one bad run on a good route is a site
     * having a bad afternoon. Only a row that has been wrong at least as often
     * as it has been right stops being handed to anyone, and it can earn its way
     * back. Charged only when a route was actually injected, so a run that never
     * saw one cannot retire it. */
    if (turn?.decision?.type === "blocked" && procedureBlock) {
      recordProcedureMiss(lessonScopes, commandText);
    }

    const logId = logEngineRun({
      engine: "hil-loop",
      run_id: logRunId,
      turn: logTurn,
      command: commandText,
      context: contextText,
      response: turn,
      moment_id: momentId,
      // The decision type is what a Loop turn is judged on: did he step, ask,
      // finish, or give up. Stored flat so a session can be scanned without
      // opening every row.
      verdict: turn?.decision?.type ?? null,
      model: turnModel,
      usage: normaliseUsage(aiData?.usage),
      elapsed_ms: Date.now() - started,
      ok: parseOk,
      error: parseOk ? null : `decision JSON came back unreadable (${lastParseFailure || "unknown"})`,
      prompt_version: HIL_LOOP_VERSION,
    });

    return new Response(JSON.stringify({
      turn,
      /* Why a turn came back unreadable, sent to the caller as well as the
         log, so "I lost my train of thought" can be traced from the Mac. */
      parse: parseOk ? null : { failure: lastParseFailure || "unknown", raw: lastParseRaw.slice(0, 600), via: viaResponses ? "responses" : "chat" },
      moment: {
        id: momentId,
        label: MOMENT_LABEL[momentId],
        leads: MOMENT_EMPHASIS[momentId] || [],
        intensity: reading.intensity,
      },
      meta: {
        model: turnModel,
        rescue: isRescue,
        // So the Mac can say "searched" in the terminal, and so a fallback that
        // fires constantly is visible rather than merely survivable.
        searched: read.searches || 0,
        via: viaResponses ? "responses" : "chat",
        // Where the turn went before the model saw a token, and whether the
        // run cache saved it. Turn one pays; the rest should read near zero.
        prepMs,
        prepCached,
        modelMs: Date.now() - started - prepMs,
        // How much of this turn's input came from the cache: the cost check.
        inputTokens: Number(aiData?.usage?.input_tokens ?? aiData?.usage?.prompt_tokens) || 0,
        cachedTokens: Number(aiData?.usage?.input_tokens_details?.cached_tokens ?? aiData?.usage?.prompt_tokens_details?.cached_tokens) || 0,
        // Which brain answered THIS turn. The client reads it to decide whether
        // escalation is even a thing here: when Astra is already driving there is
        // nothing better to hand over to, and offering a handoff would be a lie.
        // A rescue IS Astra answering, so it must read as Astra. Without the
        // isRescue half, the one moment the expensive brain is actually driving
        // is the one moment the notch says it is not, and the gold badge would
        // never appear on the Mac at all now that rescues are how Astra is
        // reached.
        brain: isRescue ? "astra" : "hil",
        elapsed_ms: Date.now() - started,
        hil_loop_version: HIL_LOOP_VERSION,
        parse_ok: parseOk,
        // Why, when it was not: the rejection reason and the start of the reply.
        ...(parseOk ? {} : { parse_error: lastParseFailure, parse_raw: lastParseRaw.slice(0, 400) }),
        // So the Mac can tell whether the brain it just spoke to actually knew
        // about its hands, rather than inferring it from a turn that happened
        // not to use one.
        tools: hasMacHands ? HIL_CATALOG_VERSION : null,
        // So it is visible whether the brain had anything to go on, rather than
        // being inferred from whether it happened to need it.
        knows: knownBlock ? knownBlock.length : 0,
        log_id: logId,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hil-loop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
