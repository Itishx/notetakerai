import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const realtimeModel = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-realtime-2";

    if (!anonKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }
    if (!openAiApiKey) {
      return json({ error: "Missing OpenAI configuration." }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const offerSdp = (await req.text()).trim();
    if (!offerSdp) {
      return json({ error: "Missing SDP offer." }, 400);
    }

    const openAiResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(realtimeModel)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/sdp",
      },
      body: offerSdp,
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error("openai-realtime-call upstream error:", openAiResponse.status, errorText);
      return json(
        {
          error: "OpenAI Realtime session failed.",
          details: errorText,
        },
        openAiResponse.status,
      );
    }

    const answerSdp = await openAiResponse.text();
    return new Response(answerSdp, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    console.error("openai-realtime-call error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
