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
    const realtimeVoice = Deno.env.get("OPENAI_REALTIME_VOICE") || "marin";

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

    const sessionConfig = {
      type: "realtime",
      model: realtimeModel,
      audio: {
        output: {
          voice: realtimeVoice,
        },
      },
    };

    const form = new FormData();
    form.set("sdp", offerSdp);
    form.set("session", JSON.stringify(sessionConfig));

    const safetyIdentifier = await sha256(user.id);
    const openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "OpenAI-Safety-Identifier": safetyIdentifier,
      },
      body: form,
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
