// vision-point — slim, fast "where is X on this screenshot" locator.
// No chat context, no knowledge loading, minimal reasoning: latency is the feature.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

async function requireAuthedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authHeader || !supabaseUrl || !anonKey) throw new Error("Not signed in.");
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user?.id) throw new Error("Not signed in.");
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAuthedUser(req);
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    const payload = await req.json().catch(() => ({}));
    const target = String(payload?.target || "").trim().slice(0, 200);
    const said = String(payload?.said || "").trim().slice(0, 300);
    const context = String(payload?.context || "").trim().slice(0, 200);
    const imageBase64 = String(payload?.imageBase64 || "").trim();
    if (!target || !imageBase64) return json({ error: "target and imageBase64 required." }, 400);

    const startedAt = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        reasoning_effort: "low",
        max_completion_tokens: 500,
        messages: [
          {
            role: "system",
            content: [
              "You locate UI elements in a screenshot of a Mac screen.",
              'Reply with ONLY compact JSON, no prose: {"found":true,"x":0.42,"y":0.18,"label":"short name","spoken":"one short spoken sentence"}.',
              "x and y are the CENTER of the target normalized to the image: x 0=left 1=right, y 0=top 1=bottom.",
              'If the target is not visible: {"found":false,"spoken":"brief sentence saying you cannot see it on this screen"}.',
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  `Target: "${target}".`,
                  said ? `The user said: "${said}".` : "",
                  context ? `Context: ${context}.` : "",
                ].filter(Boolean).join("\n"),
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${imageBase64}`, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("vision-point openai error:", JSON.stringify(data)?.slice(0, 400));
      return json({ error: data?.error?.message || `OpenAI failed (${response.status}).` }, 502);
    }
    const reply = String(data?.choices?.[0]?.message?.content || "").trim();
    console.log("vision-point done", { ms: Date.now() - startedAt, chars: reply.length });
    return json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Not signed in." ? 401 : 500;
    return json({ error: message }, status);
  }
});
