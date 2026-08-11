// hil-router — the reflex tier. One utterance in, one tool name out.
//
// This is the same Human Intelligence Layer as hil-loop, running in its fast
// mode. hil-loop is the deliberating half: it looks at a screen, narrates its
// reasoning, and pays one to three seconds to take a single step. This half
// answers in one JSON object and does not look at anything. Both are HIL. The
// point of having two is that a brain which only deliberates cannot front every
// command, and a brain which only reacts cannot finish a long job.
//
// Deliberately ABSENT, each for a measured reason:
//   - no `thinking` field. hil-loop's is 40-60 output tokens, which is 400-1000ms
//     of pure narration on the interactive path. The Mac notch already gets its
//     line from the handler that fires.
//   - no emotional core. buildEmotionalCore is appended in hil-loop; it has no
//     effect on a tool name and it costs prefill. Braino's voice lives in what
//     the handlers say, not in how a tool is picked.
//   - no accessibility observation. That is a 120-element walk and 200-600ms. A
//     router that needs the screen is required to escalate instead.
//
// Public (verify_jwt=false) exactly like hil-loop, which is why the model is
// pinned here and the caller never gets to choose it.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HIL_TOOL_CATALOG, HIL_CATALOG_VERSION, isIrreversible } from "../../_shared/human-intelligence/hil-tool-catalog.ts";
import { buildRouterPrompt, buildRouterTurn, HIL_ROUTER_VERSION } from "../../_shared/human-intelligence/hil-router-prompt.ts";
import { logEngineRun } from "../../_shared/engine-log.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Small and fast on purpose. This is 112-way classification with slot filling,
// which is an easy task; the binding constraint is tokens per second, not
// intelligence. Reasoning is off because reasoning tokens here are invisible
// latency with no payoff.
const HIL_ROUTER_MODEL = BRAINO_TEXT_MODEL;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Built once per isolate, not per request. It is ~2,400 tokens of catalog and it
// never varies, so it is also the cache key the provider bills against.
const SYSTEM_PROMPT = buildRouterPrompt(HIL_TOOL_CATALOG);
const TOOL_NAMES = new Set(HIL_TOOL_CATALOG.map((t) => t.name));

const VERDICTS = new Set(["fire", "escalate", "ask", "say"]);

type Verdict =
  | { v: "fire"; t: string; a?: Record<string, unknown> }
  | { v: "escalate"; why?: string }
  | { v: "ask"; q: string }
  | { v: "say" };

/** The model's raw reply, made safe. A verdict that fails any of these is not a
 *  half-usable verdict, it is an escalate: the loop can always cope. */
function readVerdict(raw: string): { verdict: Verdict; rejected: string | null } {
  let parsed: Record<string, unknown>;
  try {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    parsed = JSON.parse(text);
  } catch {
    return { verdict: { v: "escalate", why: "unreadable verdict" }, rejected: "unparseable" };
  }

  const v = String(parsed.v || "");
  if (!VERDICTS.has(v)) {
    return { verdict: { v: "escalate", why: "unknown verdict" }, rejected: `bad verdict ${v}` };
  }

  if (v === "fire") {
    const t = String(parsed.t || "");
    // A name that is not in the catalog means the model invented a tool. The
    // allowlist is the last word here for the same reason it is in hil-loop:
    // teaching the prompt something the world does not have produces a Braino
    // that looks like it failed a skill it actually performed correctly.
    if (!TOOL_NAMES.has(t)) {
      return { verdict: { v: "escalate", why: "unknown tool" }, rejected: `unknown tool ${t}` };
    }
    // The floor. A prompt rule is a preference; this is a refusal, and no
    // rewording of the prompt can weaken it. The loop has the confirm gate.
    if (isIrreversible(t)) {
      return { verdict: { v: "escalate", why: "cannot be undone" }, rejected: `irreversible ${t}` };
    }
    const a = parsed.a && typeof parsed.a === "object" ? parsed.a as Record<string, unknown> : {};
    return { verdict: { v: "fire", t, a }, rejected: null };
  }

  if (v === "ask") {
    const q = String(parsed.q || "").trim();
    if (!q) return { verdict: { v: "escalate", why: "empty question" }, rejected: "ask with no question" };
    return { verdict: { v: "ask", q }, rejected: null };
  }

  if (v === "escalate") {
    return { verdict: { v: "escalate", why: String(parsed.why || "").slice(0, 80) }, rejected: null };
  }

  return { verdict: { v: "say" }, rejected: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, surface, runId, shadow, cascade } = await req.json();
    const commandText = typeof command === "string" ? command.trim() : "";
    const surfaceObj = surface && typeof surface === "object" ? surface as Record<string, unknown> : {};
    const logRunId = typeof runId === "string" && /^[0-9a-f-]{36}$/i.test(runId) ? runId : null;
    // Shadow callers run the cascade first and tell us what it chose, so one row
    // carries both answers and the agreement view is a query, not a join. Live
    // callers have no cascade answer yet and leave this out.
    const cascadeChoice = cascade && typeof cascade === "object" ? cascade as Record<string, unknown> : null;

    if (!commandText) {
      return new Response(JSON.stringify({ error: "No command provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const started = Date.now();
    const aiRes = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: HIL_ROUTER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildRouterTurn(commandText, surfaceObj) },
        ],
        // Reasoning tokens are drawn from THIS budget, not a separate one, so a
        // tight ceiling here does not cap latency, it truncates the answer. Set to
        // 120 first and the reply came back cut off mid-JSON, which readVerdict
        // reports as "unreadable verdict" — indistinguishable from a broken model.
        // The verdict itself is ~20 tokens; the headroom is for the thinking.
        max_completion_tokens: 900,
        // The single most important line in this file. Measured on the deployed
        // function: default reasoning ran 3 to 16 seconds, "none" runs 0.6 to 1.2.
        // Same verdicts. Picking one name out of 108 is a shallow classification
        // and there is nothing to reason about, so every reasoning token is dead
        // time a person is sitting through waiting for a song to start.
        // "none" and not "minimal": minimal is rejected outright by this model,
        // and the rejection is a 400 that reads exactly like any other AI failure,
        // so it costs a deploy to notice.
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      logEngineRun({
        engine: "hil-router",
        run_id: logRunId,
        command: commandText,
        context: JSON.stringify(surfaceObj).slice(0, 2000),
        model: HIL_ROUTER_MODEL,
        elapsed_ms: Date.now() - started,
        ok: false,
        error: `AI ${aiRes.status}`,
        prompt_version: `${HIL_ROUTER_VERSION}/${HIL_CATALOG_VERSION}`,
      });
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await aiRes.json();
    const rawText = payload?.choices?.[0]?.message?.content ?? "";
    const { verdict, rejected } = readVerdict(String(rawText));

    const logId = logEngineRun({
      engine: "hil-router",
      run_id: logRunId,
      command: commandText,
      context: JSON.stringify({ surface: surfaceObj, cascade: cascadeChoice }).slice(0, 4000),
      // Both answers in one object so the agreement view can compare them without
      // reconstructing anything: agreed is verdict.t === cascade.tool.
      response: { verdict, cascade: cascadeChoice, agreed: cascadeChoice ? verdict.v === "fire" && verdict.t === cascadeChoice.tool : null },
      // The verdict column is what the agreement view groups by, so it carries
      // the tool name when there is one: "fire:spotify_play" reads better than
      // "fire" when you are scanning a week of rows for where HIL disagreed.
      verdict: verdict.v === "fire" ? `fire:${verdict.t}` : verdict.v,
      model: HIL_ROUTER_MODEL,
      usage: payload?.usage ?? null,
      elapsed_ms: Date.now() - started,
      ok: true,
      // A rejected verdict is not an error: it is the safety net doing its job,
      // and it is the single most useful thing to be able to count later.
      error: rejected,
      prompt_version: `${HIL_ROUTER_VERSION}/${HIL_CATALOG_VERSION}`,
    });

    return new Response(
      JSON.stringify({
        verdict,
        logId,
        rejected,
        shadow: shadow === true,
        elapsedMs: Date.now() - started,
        promptVersion: `${HIL_ROUTER_VERSION}/${HIL_CATALOG_VERSION}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error)?.message || "hil-router failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
