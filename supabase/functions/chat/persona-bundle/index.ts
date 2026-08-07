// persona-bundle — Braino's full soul, packaged for realtime voice clients.
// The Mac app's fast voice lane talks straight to the realtime API, which
// bypasses chat-about-notes and therefore the Emotional Engine and Memory
// Engine. This endpoint hands the client the same assembled persona core and
// per-user memory context so voice Braino IS Braino, not a thin agent prompt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildEmotionalCore, steeringLine } from "../../_shared/emotional-engine/engine.ts";
import { getClassManifest } from "../../_shared/emotional-engine/classes.ts";
import { serializeCues } from "../../_shared/emotional-engine/moments.ts";
import { resolvePersonalitySettings } from "../../_shared/emotional-engine/settings.ts";
import { buildLanguagePolicyBlock } from "../../_shared/emotional-engine/language.ts";
import type { Moment } from "../../_shared/emotional-engine/types.ts";

const ALL_MOMENTS: Moment[] = [
  "crisis", "grief", "heartbreak", "venting", "anxiety",
  "celebration", "conflict", "banter", "focused_task", "building",
];
import { loadUserKnowledge } from "../../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!authHeader.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
      return json({ error: "Not signed in." }, 401);
    }
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: "Not signed in." }, 401);

    const knowledge = await loadUserKnowledge(supabase, user.id, {
      includeMemoryNotes: true,
      includeXPersona: false,
      includeXContentSource: false,
    });

    // The language policy has to ride WITH the persona. Every other surface gets
    // it from buildBrainoSystemPrompt, which appends it right after the emotional
    // core, but voice clients bypass that builder entirely and only ever receive
    // this string. Without it Braino had no language rule at all on Mac voice: the
    // session bootstrap carried one, but the Mac rebuilds its instructions on every
    // turn and that per-response string replaces the session's, so the rule was
    // dropped on the first reply. He drifted into other languages unprompted and
    // captioned himself in them.
    const persona = [
      buildEmotionalCore({
        medium: "voice",
        settings: resolvePersonalitySettings(knowledge.personalitySettings || undefined),
      }),
      buildLanguagePolicyBlock("mirror_user", "voice"),
    ].join("\n\n");

    // Voice used to run neutral forever: this bundle is a session bootstrap
    // cached for ten minutes, so it never saw a message and never carried a
    // moment. It still does not need to. The Mac rebuilds its instruction
    // string on every single turn, so it only needs the RULES once: the cue
    // table to read the moment locally, and the steering sentence to say which
    // traits should lead. No per turn call, no latency, nothing to drift.
    const traits = getClassManifest().traits;
    const momentSteering: Record<string, string> = {};
    for (const moment of ALL_MOMENTS) {
      const line = steeringLine(moment, traits);
      if (line) momentSteering[moment] = line;
    }

    return json({
      persona,
      userContext: knowledge.combinedContext || "",
      displayName: knowledge.displayName || "",
      memoryEnabled: knowledge.memoryEnabled !== false,
      momentCues: serializeCues(),
      momentSteering,
    });
  } catch (error) {
    console.error("persona-bundle error:", error);
    return json({ error: error instanceof Error ? error.message : "persona bundle failed" }, 500);
  }
});
