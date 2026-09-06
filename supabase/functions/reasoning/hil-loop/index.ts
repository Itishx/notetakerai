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

// The action vocabulary, matching the real extension's BG_DELEGATE_ACTIONS.
// The allowlist is the last word: an action not named here is rejected as an
// unreadable turn, no matter how correct it was. "look" was added to the prompt
// and to the world before it was added here, and the symptom was Braino
// appearing to fail at the new skill while actually performing it perfectly.
// Anything taught in hil-loop-prompt.ts must be listed here in the same change.
const ACTION_TYPES = new Set(["navigate", "read", "look", "click", "type", "pressKey", "scroll", "wait", "web_search", "selectOption", "downloadImage"]);

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
      reasoning_effort: rescue ? BRAINO_RESCUE_REASONING_EFFORT : BRAINO_TEXT_REASONING_EFFORT,
      messages,
      max_completion_tokens: rescue ? BRAINO_RESCUE_MAX_TOKENS : 2400,
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
      `result: ${JSON.stringify(state!.lastStep.result ?? null).slice(0, 1500)}`,
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
    // A click on a send/buy/publish/destroy control is gated even if the model said
    // otherwise. The element NAME is the real test and lives on the client, which
    // has the last word (isIrreversibleClick); this is the server-side floor.
    const looksIrreversible = IRREVERSIBLE_HINT.test(JSON.stringify(action)) || IRREVERSIBLE_HINT.test(String(s.intent || ""));
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
    const { command, context, state, runId, rescue, rescueReason } = await req.json();
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
    const systemPrompt = [
      HIL_LOOP_PROMPT,
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

    const aiRes = await callModel(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], isRescue);

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
        elapsed_ms: Date.now() - started,
        hil_loop_version: HIL_LOOP_VERSION,
        parse_ok: parseOk,
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
