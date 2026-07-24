// persona-bundle — Braino's full soul, packaged for realtime voice clients.
// The Mac app's fast voice lane talks straight to the realtime API, which
// bypasses chat-about-notes and therefore the Emotional Engine and Memory
// Engine. This endpoint hands the client the same assembled persona core and
// per-user memory context so voice Braino IS Braino, not a thin agent prompt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildEmotionalCore } from "../../_shared/emotional-engine/engine.ts";
import { resolvePersonalitySettings } from "../../_shared/emotional-engine/settings.ts";
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

    const persona = buildEmotionalCore({
      medium: "voice",
      settings: resolvePersonalitySettings(knowledge.personalitySettings || undefined),
    });

    return json({
      persona,
      userContext: knowledge.combinedContext || "",
      displayName: knowledge.displayName || "",
      memoryEnabled: knowledge.memoryEnabled !== false,
    });
  } catch (error) {
    console.error("persona-bundle error:", error);
    return json({ error: error instanceof Error ? error.message : "persona bundle failed" }, 500);
  }
});
