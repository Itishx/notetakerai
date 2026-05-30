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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text ?? "";

    let parsed: { reply: string; suggestEmail: boolean };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, suggestEmail: false };
    }

    // Force suggestEmail after 4+ user messages if Claude hasn't done it yet
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
