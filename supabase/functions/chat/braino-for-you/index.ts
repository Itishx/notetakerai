// braino-for-you — the landing page's "tell him what you do" answer.
//
// The section makes one argument: the same four features are a different product
// depending on whose week you are having. Six preset columns can only ever make
// that argument six times, and the seventh visitor types "paediatric nurse" and
// gets told nothing matched, which proves the opposite of the point.
//
// So this writes the seventh column live. Public on purpose: it sits on a
// landing page and nobody signs in to read a landing page. That shapes
// everything below.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/* An open endpoint that spends money per call needs a ceiling that is not the
   OpenAI bill. Short input, short output, and a per-IP window. */
const MAX_INPUT = 120;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // The map only ever holds one window's worth of callers per instance.
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Not configured." }, 500);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return json({ error: "One moment. Try again in a few seconds." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const who = String(body?.who ?? "").trim().slice(0, MAX_INPUT);
    if (who.length < 2) return json({ error: "Tell him what you do first." }, 400);

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        max_completion_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `They said they are: ${who}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);

    const payload = await res.json();
    const parsed = safeJson(String(payload?.choices?.[0]?.message?.content ?? "{}"));
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    if (rows.length !== 4) throw new Error("Malformed answer.");

    return json({
      label: String(parsed.label ?? who).slice(0, 40),
      line: String(parsed.line ?? "").slice(0, 160),
      // Feature names are fixed on our side. The model only ever writes the
      // right-hand column, so it cannot quietly rename or invent a feature.
      rows: [
        ["Chat with the page", String(rows[0] ?? "")],
        ["Notes from audio", String(rows[1] ?? "")],
        ["Meetings", String(rows[2] ?? "")],
        ["Delegate", String(rows[3] ?? "")],
      ],
    });
  } catch (e) {
    console.error("braino-for-you:", e);
    return json({ error: "Could not work that one out. Try saying it differently." }, 500);
  }
});

const SYSTEM = [
  "Someone typed what they do for a living on a landing page. Write how Braino fits into THEIR week.",
  "",
  "BRAINO HAS EXACTLY FOUR FEATURES. You are describing these four and nothing else. Inventing a fifth is the one unforgivable error here, because a landing page promise becomes a refund request.",
  "1. Chat with the page: he is already on whatever is on screen. Any web page, PDF, doc or video. Nothing to paste, nothing to upload.",
  "2. Notes from audio: he listens to a recording, a lecture, a podcast or a long video and writes usable notes.",
  "3. Meetings: he sits in the call, invisible to the participant list and to screen share, and writes notes and commitments afterwards.",
  "4. Delegate: he does browser tasks you say out loud. Booking, buying, searching, filling forms, renaming, chasing.",
  "",
  "RULES",
  "- Each answer names something SPECIFIC to their job. A nurse gets shift handovers and drug formularies, not 'documents'. A lawyer gets the discovery bundle, not 'files'.",
  "- 12 to 26 words each. One concrete example beats three abstract ones.",
  "- Never promise something outside the four. No coding for them, no designing, no sending email on its own, no medical or legal judgement.",
  "- If their job genuinely never touches one of the four, say the smallest honest thing rather than inventing a use.",
  "- Never use em dashes or en dashes. No exclamation marks. No 'streamline', 'leverage', 'supercharge', 'effortlessly', 'game changer'.",
  "- Write to them as 'you'. Plain words, the way a person would say it.",
  "- If what they typed is nonsense, abusive, or clearly not a job, still answer for a general everyday person and keep the label neutral.",
  "",
  "OUTPUT",
  'One JSON object: {"label":"a two to four word name for them, title case","line":"one short sentence about what their week is actually like, under 90 characters","rows":["chat with page answer","notes from audio answer","meetings answer","delegate answer"]}',
  "rows must have exactly four strings, in that order.",
].join("\n");

function safeJson(raw: string) { try { return JSON.parse(raw); } catch { return null; } }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
