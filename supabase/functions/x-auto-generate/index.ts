import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadUserKnowledge } from "../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-5-mini";
const X_POST_MAX_CHARS = 280;
const X_POST_MIN_CHARS = 170;
const X_POST_IDEAL_MIN_CHARS = 210;
const MIN_POST_LINES = 3;
const MIN_POST_SENTENCES = 3;
const CANDIDATE_MULTIPLIER = 4;
const MAX_GENERATION_PASSES = 2;

// Posting windows in UTC hours — spread evenly if fewer slots needed
const POSTING_HOURS_UTC = [8, 12, 16, 20, 23];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Detect manual user-triggered call via JWT
  let targetUserId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) targetUserId = user.id;
    }
  }

  // Cron mode: all enabled users. Manual mode: only the calling user (bypass toggle gate)
  let personaQuery = supabase
    .from("x_auto_persona")
    .select("user_id, display_name, bio, what_building, tone_notes, content_source, posts_per_day");
  personaQuery = targetUserId
    ? personaQuery.eq("user_id", targetUserId)
    : personaQuery.eq("auto_posting_enabled", true);

  const { data: personas, error: personaError } = await personaQuery;

  if (personaError) {
    console.error("Failed to load personas:", personaError);
    return json({ error: personaError.message }, 500);
  }

  if (!personas?.length) {
    return json({ message: targetUserId ? "No persona configured yet." : "No users with auto posting enabled.", generated: 0 });
  }

  const results: Array<{ user_id: string; inserted: number; skipped?: boolean; error?: string }> = [];

  for (const persona of personas) {
    try {
      // Verify user has a linked X account
      const { data: connection } = await supabase
        .from("x_connections")
        .select("id")
        .eq("user_identifier", persona.user_id)
        .maybeSingle();

      if (!connection) {
        results.push({ user_id: persona.user_id, inserted: 0, skipped: true });
        continue;
      }

      // Count posts already scheduled for today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);

      const { count: todayCount } = await supabase
        .from("scheduled_x_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", persona.user_id)
        .in("status", ["pending", "posted"])
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString());

      const quota = persona.posts_per_day ?? 4;
      const remaining = quota - (todayCount ?? 0);

      if (remaining <= 0) {
        results.push({ user_id: persona.user_id, inserted: 0, skipped: true });
        continue;
      }

      const userKnowledge = await loadUserKnowledge(supabase, persona.user_id, {
        includeMemoryNotes: true,
        includeXPersona: false,
        includeXContentSource: false,
      });

      // Generate tweets via AI
      const tweets = await generateTweets({
        apiKey: apiKey ?? null,
        displayName: persona.display_name,
        bio: persona.bio,
        whatBuilding: persona.what_building,
        toneNotes: persona.tone_notes,
        contentSource: persona.content_source ?? null,
        overallContext: userKnowledge.combinedContext,
        count: remaining,
      });

      if (!tweets.length) {
        results.push({ user_id: persona.user_id, inserted: 0, error: "AI returned no tweets" });
        continue;
      }

      // Build scheduled times spread across the remaining POSTING_HOURS_UTC slots for today
      const now = new Date();
      const scheduledTimes = buildScheduleTimes(now, remaining);

      const inserts = tweets.slice(0, scheduledTimes.length).map((text, i) => ({
        user_id: persona.user_id,
        content: text.slice(0, X_POST_MAX_CHARS),
        scheduled_at: scheduledTimes[i],
        status: "pending",
      }));

      const { error: insertError } = await supabase.from("scheduled_x_posts").insert(inserts);
      if (insertError) throw insertError;

      results.push({ user_id: persona.user_id, inserted: inserts.length });
    } catch (err) {
      console.error(`Error processing user ${persona.user_id}:`, err);
      results.push({
        user_id: persona.user_id,
        inserted: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  return json({ message: "Generation complete.", generated: totalInserted, users: results });
});

async function generateTweets(opts: {
  apiKey: string | null;
  displayName: string;
  bio: string;
  whatBuilding: string;
  toneNotes: string;
  contentSource: string | null;
  overallContext: string;
  count: number;
}): Promise<string[]> {
  if (!opts.apiKey) {
    return [];
  }

  const personaContext = [
    opts.displayName ? `Name: ${opts.displayName}` : null,
    opts.bio ? `Bio: ${opts.bio}` : null,
    opts.whatBuilding ? `Building: ${opts.whatBuilding}` : null,
    opts.toneNotes ? `Voice & tone: ${opts.toneNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Scrub old product names from source before sending to AI so they never appear in output
  const cleanedSource = (opts.contentSource || "")
    .replace(/\bBenu\b/g, "Braino")
    .replace(/\bSidebrain\b/gi, "Braino")
    .replace(/\bBreno\b/g, "Braino")
    .replace(/\bBrenu\b/g, "Braino")
    .trim();

  const contentSection = cleanedSource
    ? `\n\nContent source material (mine this for tweet ideas and angles):\n---\n${cleanedSource}\n---`
    : "";

  const candidateTarget = Math.max(opts.count * CANDIDATE_MULTIPLIER, opts.count + 4);
  const userPrompt = `Persona:\n${personaContext}${opts.overallContext ? `\n\nAdditional user context:\n${opts.overallContext}` : ""}${contentSection}

Generate ${candidateTarget} distinct X post candidates for today. I will keep only the strongest ${opts.count}.

Important:
- These are for X, so every post must stay at or under ${X_POST_MAX_CHARS} characters total.
- Multi-line only. No one-line posts.
- Each post must feel specific, lived-in, and stoppable in the feed.
- Cover different angles. Do not repeat the same insight in different words.

Return a JSON array of strings.`;

  const acceptedPosts: Array<{ post: string; score: number }> = [];
  const fallbackPosts: Array<{ post: string; score: number }> = [];
  const seen = new Set<string>();
  let rejectionSummary = "";

  for (let pass = 1; pass <= MAX_GENERATION_PASSES; pass++) {
    const rawCandidates = await requestPostBatch({
      apiKey: opts.apiKey,
      systemPrompt: buildGenerationSystemPrompt(pass),
      userPrompt: rejectionSummary ? `${userPrompt}\n\nPrevious batch failed for these reasons:\n${rejectionSummary}` : userPrompt,
    });

    console.log(`[x-auto-generate] pass ${pass} returned ${rawCandidates.length} raw candidates`);

    const inspections = rawCandidates.map(inspectPostQuality);
    rejectionSummary = summarizeWeakPosts(inspections);

    for (const inspection of inspections) {
      if (seen.has(inspection.normalized)) continue;

      if (inspection.ok) {
        seen.add(inspection.normalized);
        acceptedPosts.push({
          post: inspection.normalized,
          score: inspection.score,
        });
        continue;
      }

      if (isUsableFallback(inspection)) {
        seen.add(inspection.normalized);
        fallbackPosts.push({
          post: inspection.normalized,
          score: inspection.score,
        });
      }
    }

    if (acceptedPosts.length >= opts.count) {
      break;
    }
  }

  const finalPosts = acceptedPosts
    .sort((left, right) => right.score - left.score)
    .concat(fallbackPosts.sort((left, right) => right.score - left.score))
    .slice(0, opts.count)
    .map((item) => item.post);

  console.log(
    `[x-auto-generate] accepted ${finalPosts.length} strong posts${rejectionSummary ? ` | last rejection summary: ${rejectionSummary}` : ""}`,
  );

  return finalPosts;
}

// Strip markdown formatting characters that render as literal symbols on X
// Also replace old product names with the current name: Braino
function cleanPost(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")        // *italic* → italic
    .replace(/__(.+?)__/g, "$1")        // __bold__ → bold
    .replace(/_(.+?)_/g, "$1")          // _italic_ → italic
    .replace(/`(.+?)`/g, "$1")          // `code` → code
    .replace(/#{1,6}\s/g, "")           // ## headings → removed
    .replace(/^["“”']+|["“”']+$/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\bBenu\b/g, "Braino")     // old product name → Braino
    .replace(/\bSidebrain\b/gi, "Braino") // old product name → Braino
    .replace(/\bBreno\b/g, "Braino")    // common misspelling → Braino
    .replace(/\bBrenu\b/g, "Braino")    // common misspelling → Braino
    .trim();
}

async function requestPostBatch(opts: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string[]> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`AI generation failed: ${raw.slice(0, 200)}`);
  }

  const payload = await response.json();
  const rawContent = String(payload?.choices?.[0]?.message?.content || "").trim();
  console.log("[x-auto-generate] raw AI response:", rawContent.slice(0, 500));

  const fenced = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || rawContent;

  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
  } catch (error) {
    console.warn("[x-auto-generate] could not parse candidate array:", error);
  }

  return candidate ? [candidate] : [];
}

function buildGenerationSystemPrompt(pass: number) {
  const retryTightening = pass > 1
    ? `
RETRY MODE:
- The last batch was too short, too generic, or collapsed into single-paragraph filler.
- Push harder toward specificity, tension, and line breaks.
- If a post reads like advice anyone could have tweeted, rewrite it until it sounds owned.`
    : "";

  return `You are ghostwriting X posts for a founder.

Goal:
- Write posts that feel like they came from a real person living through the work.
- These should stop the scroll because they sound specific, not polished.

Format:
- X hard limit: ${X_POST_MAX_CHARS} characters total. Never exceed it.
- Multi-line only.
- Minimum ${MIN_POST_LINES} non-empty lines.
- Minimum ${MIN_POST_SENTENCES} sentences.
- Prefer 4-7 short lines, with natural rhythm and line breaks.
- One idea per post.

Allowed structures:
- Story: a moment, tension, shift, where it landed.
- Update: a concrete number or user moment that actually means something.
- Take: a strong opinion anchored in something real, not content-farm fluff.

Voice:
- Sounds like a founder texting a sharp friend.
- Specific, lived-in, unsanitized.
- Not motivational sludge.
- Not a brand account.
- Not a newsletter intro.
- No hashtags. No emojis. No "what do you think?" No CTA. No listicles.
- Do not start with "I". Start with the moment, tension, number, observation, or surprise.

Bad phrases to never use:
- excited to share
- game-changer
- let's dive in
- unpopular opinion
- here's the thing
- consistency is key
- some days are hard
- leveraging
- driving outcomes
- really interesting space

Specificity rules:
- Use at least one concrete detail per post: a number, time marker, user message, shipped thing, mistake, tension, contrast, or decision.
- If the source is bullets or one-liners, unwrap ONE of them into an actual scene or grounded take.
- Do not summarize the source. Make it sound lived.

Product naming:
- The product is called Braino.
- Never output Benu, Sidebrain, Breno, or Brenu. Always use Braino when the product is mentioned.
- Mention Braino only when it fits naturally. Never force the product name into every post.${retryTightening}

Return ONLY a valid JSON array of strings. No markdown fences. No explanations.`;
}

function inspectPostQuality(text: string) {
  const normalized = cleanPost(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const charCount = normalized.length;
  const punctuatedSentenceCount = normalized
    .split(/[.!?](?:\s|$)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean).length;
  const sentenceCount = Math.max(punctuatedSentenceCount, lines.length);
  const issues: string[] = [];
  const lowered = normalized.toLowerCase();

  if (!normalized) issues.push("empty");
  if (charCount < X_POST_MIN_CHARS) issues.push("too_short");
  if (charCount > X_POST_MAX_CHARS) issues.push("too_long");
  if (lines.length < MIN_POST_LINES) issues.push("not_multiline_enough");
  if (sentenceCount < MIN_POST_SENTENCES) issues.push("too_few_sentences");
  if (/^i\b/i.test(normalized)) issues.push("starts_with_i");
  if (/#/.test(normalized)) issues.push("has_hashtag");
  if (/[\u{1F300}-\u{1FAFF}]/u.test(normalized)) issues.push("has_emoji");
  if (
    /(excited to share|game-?changer|let'?s dive in|unpopular opinion|here'?s the thing|consistency is key|some days are hard|leveraging|driving outcomes|really interesting space)/i.test(
      normalized,
    )
  ) {
    issues.push("generic_phrase");
  }
  if (!/\d|\b(today|yesterday|tonight|week|month|year|user|users|customer|customers|shipped|shipping|built|building|bug|reply|replies|launch|launched|note|notes|braino)\b/i.test(lowered)) {
    issues.push("not_specific_enough");
  }

  let score = 0;
  if (issues.length === 0) score += 10;
  if (charCount >= X_POST_IDEAL_MIN_CHARS && charCount <= X_POST_MAX_CHARS) score += 4;
  if (lines.length >= 4) score += 3;
  if (/\d/.test(normalized)) score += 2;
  if (/\b(but|instead|then|still|because)\b/i.test(normalized)) score += 2;
  if (/braino/i.test(normalized)) score += 1;
  score -= issues.length * 2;

  return {
    ok: issues.length === 0,
    normalized,
    issues,
    score,
    charCount,
    lineCount: lines.length,
    sentenceCount,
  };
}

function summarizeWeakPosts(
  inspections: Array<{ ok: boolean; issues: string[] }>,
) {
  const rejected = inspections.filter((item) => !item.ok);
  if (rejected.length === 0) return "";

  const counts = new Map<string, number>();
  for (const item of rejected) {
    for (const issue of item.issues) {
      counts.set(issue, (counts.get(issue) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([issue, count]) => `${issue}: ${count}`)
    .join(", ");
}

function isUsableFallback(inspection: {
  normalized: string;
  issues: string[];
  charCount: number;
  lineCount: number;
}) {
  if (!inspection.normalized) return false;
  if (inspection.charCount > X_POST_MAX_CHARS) return false;
  if (inspection.lineCount < 2) return false;

  const disqualifyingIssues = new Set([
    "has_hashtag",
    "has_emoji",
    "generic_phrase",
    "starts_with_i",
    "not_specific_enough",
  ]);

  return inspection.issues.every((issue) => !disqualifyingIssues.has(issue));
}

function buildScheduleTimes(now: Date, count: number): string[] {
  const times: string[] = [];
  // Spread posts evenly across a 16-hour window (6am–10pm UTC) with minimum 20-min gaps
  const windowStartUTC = 6;
  const windowEndUTC = 22;
  const windowMinutes = (windowEndUTC - windowStartUTC) * 60;
  const gapMinutes = count > 1 ? Math.max(20, Math.floor(windowMinutes / count)) : windowMinutes;

  const base = new Date(now);
  base.setUTCHours(windowStartUTC, 0, 0, 0);
  // If we're past the window start, begin from now + 5 min
  if (now.getTime() > base.getTime()) {
    base.setTime(now.getTime() + 5 * 60 * 1000);
  }

  for (let i = 0; i < count; i++) {
    const t = new Date(base.getTime() + i * gapMinutes * 60 * 1000);
    times.push(t.toISOString());
  }

  return times;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
