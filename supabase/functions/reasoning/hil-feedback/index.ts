// hil-feedback — captures a free-text note against one Lab run, so the HIL
// prompt can be fine-tuned by hand against a real log of what should have been
// different, instead of guessing at edge cases. Public insert only (mirrors
// waitlist-signup): the table has no RLS policies, so only this service-role
// write path can reach it — nobody, including anon callers, can read it back.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, context, momentId, reasoning, note } = await req.json();
    const noteText = typeof note === "string" ? note.trim() : "";
    const commandText = typeof command === "string" ? command.trim() : "";

    if (!commandText || !noteText) {
      return new Response(JSON.stringify({ error: "command and note are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from("hil_feedback").insert({
      command: commandText.slice(0, 2000),
      context: typeof context === "string" ? context.slice(0, 2000) : null,
      moment_id: typeof momentId === "string" ? momentId.slice(0, 60) : null,
      reasoning: reasoning ?? null,
      note: noteText.slice(0, 4000),
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hil-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
