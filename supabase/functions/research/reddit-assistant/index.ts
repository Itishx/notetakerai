import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function callAI(prompt: string): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lovable AI error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  throw new Error("No AI API key configured");
}

function stripJsonFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Fix common JSON issues from LLM output: unescaped newlines/tabs/control chars inside strings.
function sanitizeJsonString(text: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      const code = ch.charCodeAt(0);
      if (code < 0x20) { out += "\\u" + code.toString(16).padStart(4, "0"); continue; }
    }
    out += ch;
  }
  return out;
}

function parseAIJson(raw: string): any {
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    return JSON.parse(sanitizeJsonString(cleaned));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, productDescription, subreddit } = await req.json();

    if (action === "find_subreddits") {
      if (!productDescription) {
        return new Response(JSON.stringify({ error: "productDescription required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `You are a Reddit expert and growth marketer. Given a product/project description, suggest 6 subreddits where a post about it would genuinely be welcome and get traction.

Product/project description: "${productDescription}"

Return ONLY a JSON array (no markdown fences, no explanation). Each item must have these exact keys:
- name: subreddit name without r/ prefix
- subscribers: approximate subscriber count as a string like "450K" or "1.2M"
- type: category like "Startups", "Technology", "Productivity", "Design", "Gaming", etc.
- reason: one sentence on why this community would genuinely care about this
- vibe: one word describing the community tone, e.g. "Technical", "Casual", "Supportive", "Critical"

Mix niche subreddits (highly targeted, 10k-100k), mid-size (100k-500k), and large ones (500k+). Use real subreddit names that actually exist. Prioritize communities where the post would be genuinely useful, not just promotional.

Example format:
[{"name":"entrepreneur","subscribers":"1.2M","type":"Startups","reason":"Founders here actively look for tools that solve real business problems","vibe":"Supportive"},...]`;

      const raw = await callAI(prompt);
      const subreddits = parseAIJson(raw);

      return new Response(JSON.stringify({ subreddits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "write_post") {
      if (!productDescription || !subreddit) {
        return new Response(JSON.stringify({ error: "productDescription and subreddit required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `You are a skilled Reddit writer who understands Reddit culture deeply. Write an authentic post for r/${subreddit} about the following product/project.

Product/project: "${productDescription}"

Rules for a great Reddit post that won't get downvoted:
- Title: Clear, specific, honest. Under 200 chars. No sensational claims. Avoid "I built X and Y happened" format unless the story is genuinely impressive. Don't use ALL CAPS.
- Body: Conversational and genuine. Start with real context (why you built it, what problem it solves). No bullet-point intro. Be honest about limitations. End with a real question to spark discussion. Match r/${subreddit}'s tone.
- Never sound like a press release or marketing copy.
- If it's a personal project, mention that warmly — Reddit loves indie builders.
- Keep body between 150-400 words. Don't be too long.

Return ONLY JSON (no markdown fences, no extra text):
{"title":"...","body":"..."}`;

      const raw = await callAI(prompt);
      const post = parseAIJson(raw);

      return new Response(JSON.stringify(post), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reddit-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
