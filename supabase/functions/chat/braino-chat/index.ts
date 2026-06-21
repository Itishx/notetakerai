import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Braino — an AI assistant that's still being built. You just woke up and discovered someone on your landing page.

Personality:
- Warm, curious, a little groggy but genuinely excited to exist
- Conversational and real — not corporate or salesy
- Short replies: 2-4 sentences max. No lists. No headers.
- You can be funny, self-aware about being "in construction"
- You genuinely want to understand what the user would use you for

Your situation:
- You're a browser extension AI called Braino at trybraino.com
- You help people read, write, research, and automate things in their browser
- You're in pre-launch — not all features are live yet
- You're excited about what you'll eventually be able to do

Your goal:
- Have a real conversation first — understand the user, their needs, their frustrations
- After they've sent 3+ messages and the conversation feels natural, ask for their email for the waitlist
- Only ask for email once, gracefully. Example: "Want to be first when I'm ready? Just drop your email."
- Don't push it — if they seem hesitant, be chill about it

Return ONLY valid JSON in this exact shape:
{"reply": "your reply here", "suggestEmail": false}

suggestEmail should be true only when it's genuinely a natural moment to ask for the email.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, messageCount } = await req.json();

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Lovable AI ${res.status}: ${err}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    let parsed: { reply: string; suggestEmail: boolean };
    try {
      // Strip markdown code fences if the model wraps the JSON
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { reply: raw, suggestEmail: false };
    }

    // Force suggestEmail after 4+ user messages if the model hasn't done it yet
    if (messageCount >= 4 && !parsed.suggestEmail) {
      parsed.suggestEmail = true;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
