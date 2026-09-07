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
import { logEngineRun } from "../../_shared/engine-log.ts";
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
  BRAINO_BRAIN,
  BRAINO_ASTRA_ALL_REASONING_EFFORT,
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
// When Astra drives everything there is nothing to escalate TO, so the whole
// rescue path stands down: no second model, no handoff, no gold. The loop is
// simply Astra's from turn one.
const ASTRA_DRIVES_ALL = BRAINO_BRAIN === "astra";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

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
      model: rescue || ASTRA_DRIVES_ALL ? HIL_RESCUE_MODEL : HIL_LOOP_MODEL,
      // Low when Astra is doing the whole run, medium when it was called in after
      // a wall. Most turns of an ordinary run are obvious and do not deserve the
      // expensive setting; the turn after a failure does.
      reasoning_effort: rescue
        ? BRAINO_RESCUE_REASONING_EFFORT
        : ASTRA_DRIVES_ALL
          ? BRAINO_ASTRA_ALL_REASONING_EFFORT
          : BRAINO_TEXT_REASONING_EFFORT,
      messages,
      // Astra bills reasoning as completion either way, so the roomier ceiling
      // applies whenever Astra is the one answering.
      max_completion_tokens: rescue || ASTRA_DRIVES_ALL ? BRAINO_RESCUE_MAX_TOKENS : 2400,
    }),
  });
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
    parts.push("First turn. No task list exists yet. Restate the goal, split it into its separate jobs, and choose the first action of job one. Look at the observation below before deciding anything: if what the command refers to is already open, continue from it rather than going to find it.");
    if (state?.screen) parts.push(`OBSERVATION, the live page right now:\n${String(state.screen).slice(0, 16000)}`);
    parts.push("Return the JSON for this turn now.");
    return parts.join("\n\n");
  }

  const jobs = state!.tasks
    .map((t, i) => `${i + 1}. [${t.status}] ${t.desc}`)
    .join("\n");
  parts.push(`RUN STATE\nJobs, strictly in order:\n${jobs}`);

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

  parts.push("Return the JSON for this turn now.");
  return parts.join("\n\n");
}

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
// The same ceiling for the mode where Astra drives everything. It sits above the
// client's own MAX_TURNS of 45 so an honest run never reaches it, and it is here
// for the dishonest one: this endpoint is public, and without a ceiling a single
// run id could be walked forever on a model that bills output at $50/M.
//
// Worth being straight about what this does and does not cover: it bounds one
// RUN. It does not bound someone who keeps inventing new run ids. That needs
// auth on the endpoint, which is a decision about the public lab, not something
// a constant can fix.
const ASTRA_RUN_CAP = 60;

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
  split: { restated_goal: string; tasks: string[] } | null;
  verdict: { ok: boolean; why: string | null } | null;
  decision:
    | { type: "step"; step: { intent: string; action: Record<string, unknown>; expects: string; reversible: boolean; assert?: Record<string, unknown> } }
    | { type: "ask"; question: string }
    | { type: "answer"; text: string }
    | { type: "task_done" | "all_done" | "blocked"; message: string };
};

function coerceTurn(rawContent: string, hadLastStep: boolean): { turn: LoopTurn; parseOk: boolean } {
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
      } catch { /* fall through */ }
    }
  }
  if (!parsed || typeof parsed !== "object") return { turn: fallback, parseOk: false };

  const rawDecision = parsed.decision && typeof parsed.decision === "object" ? parsed.decision : {};
  const type = DECISION_TYPES.has(rawDecision.type) ? rawDecision.type : null;
  if (!type) return { turn: fallback, parseOk: false };

  let decision: LoopTurn["decision"];
  if (type === "step") {
    const s = rawDecision.step && typeof rawDecision.step === "object" ? rawDecision.step : {};
    const action = s.action && typeof s.action === "object" && !Array.isArray(s.action) ? s.action : null;
    const actionType = action && typeof action.type === "string" ? action.type.trim() : "";
    if (!action || !ACTION_TYPES.has(actionType)) return { turn: fallback, parseOk: false };
    // A tool call is only a step if the tool is real. Rejecting the whole turn
    // rather than dropping the action is deliberate: a half-understood turn that
    // silently becomes a no-op is the hardest kind of bug to see from outside.
    if (actionType === "tool") {
      const toolName = String((action as Record<string, unknown>).tool || "");
      if (!findTool(toolName)) return { turn: fallback, parseOk: false };
    }
    // A script with no code is not a step, it is a turn that would run nothing
    // and be judged as if it had. The cap is a sanity bound, not a security
    // one: what makes this safe is the gate below and the fact that a person is
    // watching, not the length.
    if (actionType === "exec_js") {
      const code = String((action as Record<string, unknown>).code || "");
      if (!code.trim() || code.length > 8000) return { turn: fallback, parseOk: false };
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
    decision = {
      type,
      message: m || (type === "all_done" ? "Everything asked for is finished." : type === "task_done" ? "That job is finished." : "I stopped, and I am not sure of the reason my own turn gave."),
    };
  }

  const rawSplit = parsed.split && typeof parsed.split === "object" ? parsed.split : null;
  const split = rawSplit && Array.isArray(rawSplit.tasks) && rawSplit.tasks.length
    ? {
        restated_goal: typeof rawSplit.restated_goal === "string" && rawSplit.restated_goal.trim()
          ? rawSplit.restated_goal.trim()
          : "",
        tasks: rawSplit.tasks.filter((t: unknown) => typeof t === "string" && (t as string).trim()).slice(0, 5),
      }
    : null;

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
    // Astra is either already driving, in which case there is nothing to escalate
    // to and the flag is ignored outright, or it is being called in and has to
    // earn it. The two modes never both apply.
    const isRescue = !ASTRA_DRIVES_ALL
      && rescueAsked
      && rescueLooksReal(loopState)
      && (await rescueTurnsUsed(logRunId)) < RESCUE_HARD_CAP;
    if (rescueAsked && !isRescue && !ASTRA_DRIVES_ALL) console.warn("hil-loop: rescue refused", { runId: logRunId });

    // In astra mode the ceiling applies to the run itself, since every turn of it
    // is expensive. Over the cap the turn falls back to the standard model rather
    // than failing, so a run that somehow gets there degrades instead of dying.
    const overAstraCap = ASTRA_DRIVES_ALL && (await rescueTurnsUsed(logRunId)) >= ASTRA_RUN_CAP;
    if (overAstraCap) console.warn("hil-loop: astra run cap hit", { runId: logRunId });
    const astraDriving = ASTRA_DRIVES_ALL && !overAstraCap;

    const started = Date.now();
    const reading = detectMoment(commandText);
    const momentId = reading.moment;
    // intensity was computed here, returned to the client, and then dropped on the
    // floor — so buildEmotionalCore always assembled at its default of 2 and a
    // panic-level command produced a byte-identical personality to a mild one.
    const emotionalCore = buildEmotionalCore({ medium: "text", moment: momentId, intensity: reading.intensity });
    const systemPrompt = [
      HIL_LOOP_PROMPT,
      // Before the personality, because it is capability rather than character,
      // and after the loop rules, because how to take a turn has to be settled
      // before what can be done in one.
      ...(hasMacHands ? [renderExecJs(), renderToolCatalog(macTools)] : []),
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
    const turnModel = isRescue || astraDriving ? HIL_RESCUE_MODEL : HIL_LOOP_MODEL;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("API key not configured");

    const aiRes = await callModel(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], isRescue || astraDriving);

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
    const { turn, parseOk } = coerceTurn(
      aiData?.choices?.[0]?.message?.content || "",
      Boolean(loopState?.lastStep),
    );

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
      usage: aiData?.usage,
      elapsed_ms: Date.now() - started,
      ok: parseOk,
      error: parseOk ? null : "decision JSON came back unreadable",
      prompt_version: HIL_LOOP_VERSION,
    });

    return new Response(JSON.stringify({
      turn,
      moment: {
        id: momentId,
        label: MOMENT_LABEL[momentId],
        leads: MOMENT_EMPHASIS[momentId] || [],
        intensity: reading.intensity,
      },
      meta: {
        model: turnModel,
        rescue: isRescue,
        // Which brain answered THIS turn. The client reads it to decide whether
        // escalation is even a thing here: when Astra is already driving there is
        // nothing better to hand over to, and offering a handoff would be a lie.
        brain: astraDriving ? "astra" : "hil",
        elapsed_ms: Date.now() - started,
        hil_loop_version: HIL_LOOP_VERSION,
        parse_ok: parseOk,
        // So the Mac can tell whether the brain it just spoke to actually knew
        // about its hands, rather than inferring it from a turn that happened
        // not to use one.
        tools: hasMacHands ? HIL_CATALOG_VERSION : null,
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
