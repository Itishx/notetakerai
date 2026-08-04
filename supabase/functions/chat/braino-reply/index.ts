// braino-reply — Braino actually talks back, with the full reasoning for HOW he talked.
//
// Every other reply endpoint either needs a login or returns a bare string, so there was
// no way to watch the Emotional Engine work: you got the answer with none of the routing
// that produced it. This one returns both, in one call, for the /emotional-intelligence
// Reply tab. Same public pattern as hil-reason and hil-loop: verify_jwt=false so the lab
// works for anyone, and the model is pinned SERVER-SIDE so an unauthenticated body can
// never point our key at an expensive tier.
//
// What comes back alongside the reply:
//   - which moment was read, and HOW it was read (which exact words tripped it, or that
//     the words found nothing and a second cheap read decided it)
//   - which traits led, in the real engine's order, and the exact steering sentence sent
//   - where the charm dial sat for this moment
//   - a tell scan of his own reply against his own banned-phrase lists (tells.ts), so
//     "he never says What's on your mind?" is checked, not hoped for
//   - the engine's own measurements (trait count, size of the personality block)
//
// The charmOff switch exists so the lab can run the same message with the charm trait
// removed and show, side by side, exactly what that trait buys.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildEmotionalCore, leadIdsForMoment, orderTraitsForMoment, steeringLine } from "../../_shared/emotional-engine/engine.ts";
import { detectMomentDetailed, looksEmotionallyLoaded, MOMENT_LABEL } from "../../_shared/emotional-engine/moments.ts";
import { getClassManifest } from "../../_shared/emotional-engine/classes.ts";
import { resolvePersonalitySettings } from "../../_shared/emotional-engine/settings.ts";
import { scanForTells } from "../../_shared/emotional-engine/tells.ts";
import { logEngineRun } from "../../_shared/engine-log.ts";
import type { Moment } from "../../_shared/emotional-engine/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPLY_MODEL = "gpt-5.4-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const VALID_MOMENTS = new Set<Moment>([
  "neutral", "crisis", "grief", "heartbreak", "venting", "anxiety",
  "celebration", "conflict", "banter", "focused_task", "building",
]);

// Where the charm trait sits for each moment, for the breakdown display. This mirrors
// the dial inside traits/charm.ts; it is labelling only, the trait itself is the truth.
function charmLevel(moment: Moment): { level: "full" | "economy" | "warm" | "plain" | "off"; note: string } {
  if (moment === "grief" || moment === "crisis") {
    return { level: "off", note: "Charm removes itself entirely. Wit here would be an insult." };
  }
  if (moment === "heartbreak") return { level: "plain", note: "Plain and warm. No wit at all." };
  if (moment === "venting" || moment === "anxiety") {
    return { level: "warm", note: "Warmth up, teasing off. Still short and specific." };
  }
  if (moment === "focused_task" || moment === "conflict") {
    return { level: "economy", note: "Charm shows up as speed and precision, not jokes." };
  }
  return { level: "full", note: "Full charm. Teasing is on, and it points up." };
}

async function callModel(apiKey: string, messages: unknown[], maxTokens = 600) {
  return await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: REPLY_MODEL, messages, max_completion_tokens: maxTokens }),
  });
}

function textOf(aiData: unknown): string {
  const d = aiData as { choices?: Array<{ message?: { content?: string } }> };
  return String(d?.choices?.[0]?.message?.content || "").trim();
}

// Layer two of moment detection: the word cues found nothing, but the message looks
// like it carries feeling. One small call decides the real moment before the personality
// is assembled. Ordinary quick asks never reach this, so they cost nothing extra.
async function readMomentWithModel(apiKey: string, message: string): Promise<{ moment: Moment; ok: boolean }> {
  try {
    const res = await callModel(apiKey, [
      {
        role: "system",
        content:
          "You label the emotional situation behind a message. Reply with ONE word from this list and nothing else: " +
          "neutral, grief, heartbreak, venting, anxiety, celebration, conflict, banter, focused_task, building. " +
          "Pick neutral only when the message genuinely carries no feeling. Do not explain.",
      },
      { role: "user", content: message.slice(0, 1000) },
    ], 8);
    if (!res.ok) return { moment: "neutral", ok: false };
    const word = textOf(await res.json()).toLowerCase().replace(/[^a-z_]/g, "");
    if (VALID_MOMENTS.has(word as Moment) && word !== "crisis") return { moment: word as Moment, ok: true };
    return { moment: "neutral", ok: false };
  } catch {
    return { moment: "neutral", ok: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
    const charmOff = body?.charmOff === true;
    const settings = resolvePersonalitySettings(body?.settings);

    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("API key not configured");

    const started = Date.now();

    // ── Layer 1: the word cues. Instant, free, and crisis is decided here and ONLY
    // here, so a life-or-death moment never depends on a model being reachable.
    const cueRead = detectMomentDetailed(message);
    let moment: Moment = cueRead.moment;
    let intensity = cueRead.intensity;
    let how: "cues" | "model" | "none" = cueRead.hits.length ? "cues" : "none";

    // ── Layer 2: the cues found nothing, but this reads as loaded. Spend one small call.
    if (cueRead.moment === "neutral" && looksEmotionallyLoaded(message)) {
      const deep = await readMomentWithModel(apiKey, message);
      if (deep.ok && deep.moment !== "neutral") {
        moment = deep.moment;
        intensity = 2;
        how = "model";
      }
    }

    // ── Assemble the personality for THIS moment.
    const allTraits = getClassManifest(body?.classId).traits;
    // charmOff drops the charm trait only, so the lab can A/B exactly what it buys.
    const traits = charmOff ? allTraits.filter((t) => t.id !== "charm") : allTraits;
    const ordered = orderTraitsForMoment(moment, traits);
    const leads = leadIdsForMoment(moment, traits);
    const steer = steeringLine(moment, traits);
    // traits is passed explicitly so charmOff genuinely removes the trait from the
    // prompt. Without it buildEmotionalCore would rebuild the full list internally
    // and the A/B comparison would be a lie.
    const personality = buildEmotionalCore({ medium: "text", moment, settings, classId: body?.classId, traits });

    const messages = [
      { role: "system", content: personality },
      ...history
        .filter((h: unknown) => h && typeof (h as { content?: unknown }).content === "string")
        .map((h: { role?: string; content: string }) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: String(h.content).slice(0, 2000),
        })),
      { role: "user", content: message.slice(0, 4000) },
    ];

    const aiRes = await callModel(apiKey, messages);
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
      console.error("braino-reply AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const reply = textOf(aiData);
    // The check that makes the ban real: his own reply, against his own ban lists.
    const tells = scanForTells(reply);
    const dial = charmLevel(moment);

    logEngineRun({
      engine: "braino-reply",
      command: message,
      response: { reply, tells, how, intensity, leads, charm: dial, charm_off: charmOff },
      moment_id: moment,
      // A reply that tripped his own ban list is the row worth finding later,
      // so the count is flat rather than buried in the JSON.
      verdict: tells.length ? `tells:${tells.length}` : "clean",
      model: REPLY_MODEL,
      usage: aiData?.usage,
      elapsed_ms: Date.now() - started,
    });

    return new Response(JSON.stringify({
      reply,
      moment: {
        id: moment,
        label: MOMENT_LABEL[moment],
        intensity,
        how,                    // "cues" | "model" | "none"
        cueHits: cueRead.hits,  // the exact words that tripped it
        cueSaid: cueRead.moment, // what layer 1 thought, for comparing against layer 2
      },
      personality: {
        leads,
        traits: ordered.map((t) => ({ id: t.id, name: t.name, summary: t.summary, leading: leads.includes(t.id) })),
        steering_line: steer,
        charm: { ...dial, present: !charmOff && ordered.some((t) => t.id === "charm") },
        settings,
        core_chars: personality.length,
        trait_count: ordered.length,
      },
      tells,
      meta: {
        model: REPLY_MODEL,
        elapsed_ms: Date.now() - started,
        charm_off: charmOff,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("braino-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
