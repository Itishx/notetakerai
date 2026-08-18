// x-voice-learn — Braino reads the user's own X history and works out how they
// write, instead of asking them to describe a voice nobody can describe.
//
// Two pages of 100 posts (X caps a single request at 100), each carrying its
// real engagement, then one analysis pass. The output is deliberately a
// human-readable object rather than a prompt blob: the user has to be able to
// read it back on /x/setup and say "no, that's wrong" (BrainoX.md section 7).
//
// Cost note (Distra.md section 7.1): X now bills per read at $0.005. 200 posts
// is a one dollar, one time charge, and this function is the only place that
// spends it, so the number stays easy to reason about.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getAuthorizedXContext } from "../../_shared/x-auto-sessions.ts";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const X_API_BASE = "https://api.x.com/2";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Two pages of 100. X's cap per request is 100, which is exactly why the
// original single-call version only ever saw half the picture.
const PAGES = 2;
const PER_PAGE = 100;

type Sample = {
  x_post_id: string;
  text: string;
  posted_at: string | null;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  impressions: number | null;
  engagement_score: number;
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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!anonKey) return json({ error: "Missing Supabase anon key." }, 500);
    if (!openaiKey) return json({ error: "Missing OpenAI key." }, 500);

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let ctx;
    try {
      ctx = await getAuthorizedXContext(supabase, user.id);
    } catch {
      return json({ error: "Connect your X account first.", connected: false }, 400);
    }

    // ── Read the history, two pages deep ────────────────────────────────
    const samples: Sample[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < PAGES; page++) {
      const url = new URL(`${X_API_BASE}/users/${ctx.xUserId}/tweets`);
      url.searchParams.set("max_results", String(PER_PAGE));
      url.searchParams.set("exclude", "retweets,replies");
      url.searchParams.set("tweet.fields", "public_metrics,created_at");
      if (cursor) url.searchParams.set("pagination_token", cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
      });
      const raw = await res.text();
      if (!res.ok) {
        // A first page failure is fatal. A second page failure is not: 100
        // posts still teaches plenty, and a new account may simply not have
        // 200 posts to give.
        if (page === 0) {
          return json({ error: `X refused the read (${res.status}). ${raw.slice(0, 200)}` }, 502);
        }
        break;
      }

      const payload = safeJson(raw);
      const list = Array.isArray(payload?.data) ? payload.data : [];
      for (const t of list) {
        const m = t?.public_metrics ?? {};
        const likes = num(m.like_count);
        const replies = num(m.reply_count);
        const reposts = num(m.retweet_count);
        const quotes = num(m.quote_count);
        const impressions = typeof m.impression_count === "number" ? m.impression_count : null;
        const raw_engagement = likes + replies * 2 + reposts * 3 + quotes * 3;
        samples.push({
          x_post_id: String(t.id),
          text: String(t.text ?? ""),
          posted_at: t.created_at ?? null,
          likes, replies, reposts, quotes, impressions,
          // Rate beats raw count: a post that got 5 likes from 50 people who
          // saw it beats one that got 8 from 4,000.
          engagement_score: impressions && impressions > 0
            ? (raw_engagement / impressions) * 1000
            : raw_engagement,
        });
      }

      cursor = payload?.meta?.next_token ?? null;
      if (!cursor) break;
    }

    if (!samples.length) {
      return json({ error: "No posts found on that account yet. Post a few times, then run this again." }, 400);
    }

    // ── Store them, so the user can star the ones that are most them ────
    await supabase.from("x_voice_samples").upsert(
      samples.map((s) => ({ ...s, user_id: user.id })),
      { onConflict: "user_id,x_post_id" },
    );

    // ── Learn ───────────────────────────────────────────────────────────
    const ranked = [...samples].sort((a, b) => b.engagement_score - a.engagement_score);
    const top = ranked.slice(0, 15);
    const bottom = ranked.slice(-10);

    const hourBuckets = new Map<number, { n: number; total: number }>();
    for (const s of samples) {
      if (!s.posted_at) continue;
      const h = new Date(s.posted_at).getUTCHours();
      const b = hourBuckets.get(h) ?? { n: 0, total: 0 };
      b.n += 1; b.total += s.engagement_score;
      hourBuckets.set(h, b);
    }
    const bestHours = [...hourBuckets.entries()]
      .filter(([, b]) => b.n >= 3)
      .map(([hour, b]) => ({ hour_utc: hour, posts: b.n, avg_engagement: round(b.total / b.n) }))
      .sort((a, b) => b.avg_engagement - a.avg_engagement)
      .slice(0, 4);

    // Structure is measured, not inferred. An LLM asked "how long are their
    // posts" will produce an adjective; this produces a number the prompt can
    // enforce against.
    const lengths = samples.map((s) => s.text.trim().length);
    const structure = {
      median_length: median(lengths),
      p25_length: percentile(lengths, 0.25),
      p75_length: percentile(lengths, 0.75),
      shortest: Math.min(...lengths),
      longest: Math.max(...lengths),
      share_under_80_chars: share(lengths, (n) => n < 80),
      share_over_200_chars: share(lengths, (n) => n > 200),
      share_multiline: share(samples.map((s) => s.text), (t) => String(t).includes("\n")),
      avg_words: Math.round(
        samples.reduce((a, s) => a + s.text.trim().split(/\s+/).filter(Boolean).length, 0) / samples.length,
      ),
      share_with_question: share(samples.map((s) => s.text), (t) => String(t).includes("?")),
      share_with_number: share(samples.map((s) => s.text), (t) => /\d/.test(String(t))),
      share_with_link: share(samples.map((s) => s.text), (t) => /https?:\/\//.test(String(t))),
      share_with_hashtag: share(samples.map((s) => s.text), (t) => String(t).includes("#")),
    };

    // Does the length they actually write match a policy we can enforce?
    const suggestedLengthMode =
      structure.median_length >= 180 ? "substantial"
      : structure.median_length >= 110 ? "balanced"
      : "punchy";

    const analysis = await analyseVoice(openaiKey, {
      handle: ctx.username,
      total: samples.length,
      top, bottom, bestHours, structure,
    });

    const learned = {
      ...analysis,
      posts_read: samples.length,
      best_hours_utc: bestHours,
      structure,
      suggested_length_mode: suggestedLengthMode,
      median_length: structure.median_length,
      learned_at: new Date().toISOString(),
    };

    await supabase.from("x_settings").upsert({
      user_id: user.id,
      voice_learned: learned,
      voice_learned_at: new Date().toISOString(),
      voice_posts_read: samples.length,
    }, { onConflict: "user_id" });

    await supabase.from("x_action_log").insert({
      user_id: user.id,
      agent: "x-voice-learn",
      action: "learned_voice",
      target: ctx.username,
      reason: `Read ${samples.length} posts and rebuilt the voice profile.`,
      meta: { posts_read: samples.length, est_cost_usd: round(samples.length * 0.005) },
      result: "success",
    });

    return json({
      ok: true,
      posts_read: samples.length,
      est_cost_usd: round(samples.length * 0.005),
      learned,
      top_posts: top.slice(0, 5).map((t) => ({ id: t.x_post_id, text: t.text, score: round(t.engagement_score) })),
    });
  } catch (e) {
    console.error("x-voice-learn error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function analyseVoice(apiKey: string, input: {
  handle: string | null;
  total: number;
  top: Sample[];
  bottom: Sample[];
  bestHours: { hour_utc: number; posts: number; avg_engagement: number }[];
  structure: Record<string, number>;
}) {
  const fmt = (list: Sample[]) =>
    list.map((s, i) => `${i + 1}. [${s.likes}L ${s.replies}R ${s.reposts}RT] ${s.text.replace(/\n/g, " / ")}`).join("\n");

  const system = [
    "You are building a writing profile detailed enough that another writer could produce a post this person would accept without editing.",
    "",
    "RULES FOR YOUR OUTPUT:",
    "- You are NOT judging the writing and NOT advising how to improve it. Describe what is actually there.",
    "- Be concrete to the point of being mechanical. 'Conversational' is worthless. 'Opens with the blunt claim, no setup line, then a blank line, then the consequence' is usable.",
    "- Quote real fragments as evidence in every field where evidence exists.",
    "- Where the evidence is thin, write \"not enough evidence\" in that field. Never invent a pattern to fill a slot.",
    "- Never use em dashes or en dashes anywhere in your output.",
    "- Structural measurements are supplied to you and are already correct. Interpret them, do not restate or contradict them.",
    "",
    "Answer with a single JSON object and nothing else, matching this shape exactly:",
    JSON.stringify({
      summary: "One paragraph, second person, that the author reads back and recognises themselves in. Concrete, not flattering.",
      how_they_think: "The shape of their reasoning. Do they argue from experience, from first principles, from a number, from a contrast? Do they state the conclusion first or build to it?",
      sentence_style: "Length, rhythm, whether full sentences or deliberate fragments, and how those alternate.",
      paragraph_style: "How they use line breaks. Single block, two beat setup and payoff, or a list. Quote a structure.",
      opener_style: "How posts begin. Quote three real openings.",
      closer_style: "How posts end. Statement, question, callback, or nothing.",
      humor: { present: "yes | no | occasionally", kind: "dry, self deprecating, absurd, deadpan, none", frequency: "roughly what share of posts", example: "a real quoted line, or empty" },
      register: "How formal. Do they swear, use slang, contractions, first person plural?",
      formatting: { hashtags: "", emoji: "", line_breaks: "", capitalisation: "", punctuation: "", links: "" },
      signature_phrases: ["actual recurring words or phrases lifted from the posts"],
      never_does: ["things conspicuously absent, stated as rules a writer could follow"],
      topics: [{ name: "", share: "roughly what fraction of posts", angle: "what they typically say about it" }],
      formats_they_use: [{ format: "teach | opinion | build-log | story | contrarian | proof | question", share: "", note: "" }],
      what_works: [{ pattern: "", evidence: "" }],
      what_flops: [{ pattern: "", evidence: "" }],
      length_read: "What their post length says about them, interpreting the supplied measurements. Say plainly whether they are a short-post writer or not.",
      writing_rules: ["Five to eight imperative rules another writer could follow to sound like this person. Each one specific enough to be checkable."],
      confidence: "high | medium | low, and why in one clause",
    }),
  ].join("\n");

  const userMsg = [
    `Account: @${input.handle ?? "unknown"}. ${input.total} posts read.`,
    "",
    "THEIR BEST PERFORMING POSTS (engagement adjusted for reach):",
    fmt(input.top),
    "",
    "THEIR WEAKEST POSTS:",
    fmt(input.bottom),
    "",
    input.bestHours.length
      ? `Posting hours with the strongest average engagement (UTC): ${input.bestHours.map((h) => `${h.hour_utc}:00 (${h.posts} posts)`).join(", ")}`
      : "Not enough posts per hour to read a timing pattern yet.",
    "",
    "MEASURED STRUCTURE (already computed, treat as fact):",
    JSON.stringify(input.structure, null, 2),
  ].join("\n");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: BRAINO_TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Voice analysis failed: ${detail.slice(0, 200)}`);
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content ?? "{}";
  return safeJson(content) ?? {};
}

function safeJson(raw: string) {
  try { return JSON.parse(raw); } catch { return null; }
}
function num(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}
function percentile(list: number[], p: number) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
function share<T>(list: T[], test: (v: T) => boolean) {
  if (!list.length) return 0;
  return Math.round((list.filter(test).length / list.length) * 100);
}
function median(list: number[]) {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
