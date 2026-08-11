// hil-reason — Braino's Human Intelligence Layer, standalone.
//
// One call, one brain: the canonical HIL prompt (hil-system-prompt.ts, the literal
// source of truth) goes first, then the Emotional Engine's personality block is
// appended live per request (detectMoment is regex-only, zero cost). The model runs
// the whole thing in a single pass and returns the reasoning trace as strict JSON.
// No classifier pre-pass, no second call, no routing into the extension or Mac app.
// The /human-intelligence page is the only consumer for now.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HIL_SYSTEM_PROMPT, HIL_VERSION } from "../../_shared/human-intelligence/hil-system-prompt.ts";
import { buildEmotionalCore, orderTraitsForMoment, steeringLine } from "../../_shared/emotional-engine/engine.ts";
import { detectMoment, MOMENT_EMPHASIS, MOMENT_LABEL } from "../../_shared/emotional-engine/moments.ts";
import { getClassManifest } from "../../_shared/emotional-engine/classes.ts";
import { logEngineRun } from "../../_shared/engine-log.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// One model, chosen server-side. This endpoint is deliberately public (verify_jwt=false)
// so the lab works for anyone, which means the caller must NOT get to pick the model:
// an unauthenticated request body could otherwise point our key at a 10x tier.
const HIL_MODEL = BRAINO_TEXT_MODEL;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

async function callModel(apiKey: string, messages: unknown[]) {
  return await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HIL_MODEL,
      reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
      messages,
    }),
  });
}

// ── The screen-identity referent: hardcoded, not left to the model ──────────
// "Who is this?", "What is that?", "Who's on my screen?" only ever mean one
// thing: look at the screen first. This is exactly as certain as moment
// detection, so it gets the same treatment — a zero-cost regex, checked in
// code, that FORCES the first step rather than hoping the model remembers.
const SCREEN_REFERENT_RE =
  /\b(who|what)('s|s|\s+is|\s+are)?\s+(is\s+|are\s+)?(this|that|these|those)\b|\b(who|what)('s|s|\s+is)?\s+(is\s+)?on\s+(my|the)\s+(screen|camera)\b/i;

const LOOK_AT_SCREEN_STEP = "Look at the screen to see who or what this refers to.";

// ── Reasoning-shape coercion ─────────────────────────────────────────────────
// The harness must never hard-fail on a shape mismatch: strip fences, find the
// JSON object, and coerce every field to the contract. If parsing fails entirely,
// fall back to a proceed verdict carrying the raw text as the single step.

type HilChecks = { vague_referent: boolean; unresolved_person: boolean; delivery_fork: boolean };

type HilReasoning = {
  restated_goal: string;
  steps: string[];
  checks: HilChecks;
  ambiguous: boolean;
  clarifying_question: string | null;
  verdict: "proceed" | "ask";
  action: string;
  screen_referent: boolean;
};

function coerceReasoning(rawContent: string, screenReferent: boolean): HilReasoning {
  const fallback: HilReasoning = {
    restated_goal: rawContent.trim().slice(0, 300) || "Could not read the reasoning.",
    steps: screenReferent ? [LOOK_AT_SCREEN_STEP] : [rawContent.trim().slice(0, 300) || "No steps returned."],
    checks: { vague_referent: false, unresolved_person: false, delivery_fork: false },
    ambiguous: false,
    clarifying_question: null,
    verdict: "proceed",
    action: "Act on the command as stated.",
    screen_referent: screenReferent,
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
      } catch { /* fall through to fallback */ }
    }
  }
  if (!parsed || typeof parsed !== "object") return fallback;

  const checks: HilChecks = {
    vague_referent: parsed.checks?.vague_referent === true,
    unresolved_person: parsed.checks?.unresolved_person === true,
    delivery_fork: parsed.checks?.delivery_fork === true,
  };
  const ambiguous = checks.vague_referent || checks.unresolved_person || checks.delivery_fork;
  // Capped at 5 to match the prompt's own "2 to 5 steps" rule, so the trace graph's
  // plan column can never disagree with the step list the page renders.
  let steps = Array.isArray(parsed.steps)
    ? parsed.steps.filter((s: unknown) => typeof s === "string" && s.trim()).slice(0, 5)
    : [];

  // Hardcoded, not trusted from the model: "who/what is this" only ever means
  // look at the screen first. If the model's own first step doesn't already say
  // so, force it in, exactly like ambiguous/verdict below are derived, not asked.
  if (screenReferent && !/\b(look|check|glance)\b.*\b(screen|camera)\b/i.test(steps[0] || "")) {
    steps = [LOOK_AT_SCREEN_STEP, ...steps].slice(0, 5);
  }

  return {
    restated_goal: typeof parsed.restated_goal === "string" && parsed.restated_goal.trim()
      ? parsed.restated_goal.trim()
      : fallback.restated_goal,
    steps: steps.length ? steps : fallback.steps,
    checks,
    // ambiguous/verdict are DERIVED from the checks, not trusted from the model,
    // so the contract's "true iff at least one check fired" always holds.
    ambiguous,
    clarifying_question: ambiguous && typeof parsed.clarifying_question === "string" && parsed.clarifying_question.trim()
      ? parsed.clarifying_question.trim()
      : ambiguous
      ? "Something here could go two ways. Which did you mean?"
      : null,
    verdict: ambiguous ? "ask" : "proceed",
    action: typeof parsed.action === "string" && parsed.action.trim()
      ? parsed.action.trim()
      : ambiguous
      ? "Ask the question above, then carry on once it is answered."
      : fallback.action,
    // Hardcoded from the regex match above, never from the model: this is a
    // fact about the command, not something the model gets to decide happened.
    screen_referent: screenReferent,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, context } = await req.json();
    const commandText = typeof command === "string" ? command.trim() : "";
    const contextText = typeof context === "string" ? context.trim() : "";

    if (!commandText) {
      return new Response(JSON.stringify({ error: "No command provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The brain, assembled: HIL first, then who Braino is, per this exact moment.
    // Every step below the model call is deterministic and free, so the trace can
    // report exactly what happened rather than re-deriving it on the client.
    const started = Date.now();
    const reading = detectMoment(commandText);
    const momentId = reading.moment;
    const leadIds = MOMENT_EMPHASIS[momentId] || [];
    const manifestTraits = getClassManifest().traits;
    const orderedTraits = orderTraitsForMoment(momentId, manifestTraits);
    const steer = steeringLine(momentId, manifestTraits);
    const emotionalCore = buildEmotionalCore({ medium: "text", moment: momentId, intensity: reading.intensity });
    const systemPrompt = [
      HIL_SYSTEM_PROMPT,
      "=== WHO YOU ARE (the Emotional Engine, appended live for this request) ===",
      emotionalCore,
    ].join("\n\n");

    const screenReferent = SCREEN_REFERENT_RE.test(commandText);
    const userMessage = [
      `Command: ${commandText.slice(0, 2000)}`,
      contextText ? `Context: ${contextText.slice(0, 2000)}` : "",
      // Told once, plainly, in addition to being enforced in code below (coerceReasoning
      // forces this step regardless of what the model outputs) — belt and suspenders.
      screenReferent
        ? "Note: this command asks about identity using this/that/on my screen. Looking at the screen is your hardcoded first step, always, with zero exceptions. Never ask permission for it."
        : "",
    ].filter(Boolean).join("\n");

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
      console.error("hil-reason AI error:", aiRes.status, errText);
      logEngineRun({
        engine: "hil-reason",
        command: commandText,
        context: contextText,
        moment_id: momentId,
        model: HIL_MODEL,
        elapsed_ms: Date.now() - started,
        ok: false,
        error: `AI ${aiRes.status}: ${errText}`,
        prompt_version: HIL_VERSION,
      });
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const reasoning = coerceReasoning(aiData?.choices?.[0]?.message?.content || "", screenReferent);

    logEngineRun({
      engine: "hil-reason",
      command: commandText,
      context: contextText,
      response: reasoning,
      moment_id: momentId,
      verdict: reasoning.verdict,
      model: HIL_MODEL,
      usage: aiData?.usage,
      elapsed_ms: Date.now() - started,
      prompt_version: HIL_VERSION,
    });

    return new Response(JSON.stringify({
      reasoning,
      moment: {
        id: momentId,
        label: MOMENT_LABEL[momentId],
        leads: leadIds,
        intensity: reading.intensity,
      },
      // Stages 1-5 of the ten: what the machine did for free, before the call.
      pipeline: {
        command_chars: commandText.length,
        context_chars: contextText.length,
        traits: orderedTraits.map((t) => ({
          id: t.id,
          name: t.name,
          leading: leadIds.includes(t.id),
        })),
        default_order: manifestTraits.map((t) => t.id),
        steering_line: steer,
        emotional_core_chars: emotionalCore.length,
        hil_prompt_chars: HIL_SYSTEM_PROMPT.length,
        system_prompt_chars: systemPrompt.length,
      },
      meta: {
        model: HIL_MODEL,
        elapsed_ms: Date.now() - started,
        hil_version: HIL_VERSION,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hil-reason error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
