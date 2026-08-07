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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// One model, chosen server-side. This endpoint is deliberately public (verify_jwt=false)
// so the lab works for anyone, which means the caller must NOT get to pick the model.
const HIL_LOOP_MODEL = "gpt-5.4-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// The action vocabulary, matching the real extension's BG_DELEGATE_ACTIONS.
// The allowlist is the last word: an action not named here is rejected as an
// unreadable turn, no matter how correct it was. "look" was added to the prompt
// and to the world before it was added here, and the symptom was Braino
// appearing to fail at the new skill while actually performing it perfectly.
// Anything taught in hil-loop-prompt.ts must be listed here in the same change.
const ACTION_TYPES = new Set(["navigate", "read", "look", "click", "type", "pressKey", "scroll", "wait", "web_search"]);

// Reversibility is decided by WHAT is being clicked, and the element name lives on
// the client (it holds the live observation), so the final say is enforced there in
// isIrreversibleClick, mirroring bgCartSafetyBlock in the extension. Here we only
// keep the model honest about the obvious cases it can see in its own action.
const IRREVERSIBLE_HINT = /\b(send|place (your )?order|proceed to (buy|checkout)|pay now|buy now|checkout|publish|post|delete|remove|discard)\b/i;

const DECISION_TYPES = new Set(["step", "ask", "task_done", "all_done", "blocked"]);

async function callModel(apiKey: string, messages: unknown[]) {
  return await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // An explicit ceiling where there was none. A turn that weighs several
    // candidate songs runs longer than one that clicks a button, and a decision
    // cut off mid-JSON is indistinguishable from a broken one.
    body: JSON.stringify({ model: HIL_LOOP_MODEL, messages, max_completion_tokens: 1200 }),
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
    if (state?.screen) parts.push(`OBSERVATION, the live page right now:\n${String(state.screen).slice(0, 3000)}`);
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
  if (state!.screen) parts.push(`OBSERVATION, the live page right now:\n${String(state!.screen).slice(0, 3000)}`);
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

// ── Turn coercion ────────────────────────────────────────────────────────────
// Never hard-fail on shape: strip fences, find the object, coerce every field.
// meta.parse_ok tells the client whether this is the model's real turn or a
// fallback, so the client can retry once instead of ending a run on a hiccup.

type LoopTurn = {
  thinking: string;
  split: { restated_goal: string; tasks: string[] } | null;
  verdict: { ok: boolean; why: string | null } | null;
  decision:
    | { type: "step"; step: { intent: string; action: Record<string, unknown>; expects: string; reversible: boolean } }
    | { type: "ask"; question: string }
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
      },
    };
  } else if (type === "ask") {
    const q = typeof rawDecision.question === "string" ? rawDecision.question.trim() : "";
    decision = { type: "ask", question: q || "Something here only you can answer. What should I do?" };
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
    const { command, context, state, runId } = await req.json();
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

    const userMessage = renderState(commandText.slice(0, 2000), contextText.slice(0, 2000), loopState);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("API key not configured");

    const aiRes = await callModel(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ]);

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
        model: HIL_LOOP_MODEL,
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
      model: HIL_LOOP_MODEL,
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
        model: HIL_LOOP_MODEL,
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
