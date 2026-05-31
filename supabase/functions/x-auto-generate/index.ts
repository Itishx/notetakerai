import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadUserKnowledge } from "../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

// Posting windows in UTC hours — spread evenly if fewer slots needed
const POSTING_HOURS_UTC = [8, 12, 16, 20, 23];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

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
        content: text.slice(0, 2000),
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

  const systemPrompt = `You are a ghostwriter. You write posts that sound like a real person talking to a friend — not a brand, not a thought leader, not a newsletter. Study these examples. This is exactly the voice, structure, and length you are going for.

---
EXAMPLE 1 (The Story):
Three months ago I almost pulled the plug on everything.

We had 11 users. Six months of nights. My cofounder and I weren't really talking. I opened my laptop at 2am and just sat there — is this actually going anywhere?

Decided to send one more cold email. One.

Got a reply at 7am. That person is still a user today. Sometimes the whole thing hangs on one stupid decision you almost didn't make.

---
EXAMPLE 2 (The Update):
Just hit 200 notes synced in Braino.

Didn't expect to feel anything about a number. But one user texted me yesterday — she used it to prep for a pitch and got the funding.

That text is why I haven't slept right in four months.

---
EXAMPLE 3 (The Take):
Everyone's building an AI notes app. Nobody's asking why people stop using them after week two.

It's not the features. Your notes were already a mess before the AI got involved. All you did was make the mess faster.

The real problem is thinking, not storing. That's the only thing worth solving.

---

NOW WRITE IN THIS VOICE. Rules:

STRUCTURE — pick one per post:
- Story: drop into a moment, tell what happened, what shifted. No neat lesson at the end. Just where you landed.
- Update: real number, real moment, feels like a text to a friend who's been following along.
- Take: specific opinion, defended with something real. Not "AI is big." Something someone could disagree with.

VOICE:
- Short paragraphs. One or two sentences each. Like someone texting.
- Never start with "I" — start with what happened, what you noticed, what hit you.
- No hashtags. No emojis. No "what do you think?" No lesson at the end.
- Plain text only. No asterisks, no bold, no markdown. X doesn't render it.
- No: "excited to share", "game-changer", "let's dive in", "unpopular opinion", "here's the thing", "just start", "consistency is key", "some days are hard", "leveraging", "driving outcomes", "really interesting space"
- Nothing that sounds like it was written by a content marketing team.
- Nothing that could have been written by anyone — it must be specific to this person's story.

LENGTH: Minimum 5 sentences. Usually 6-10. 400–900 characters. Don't cut real content to be short. Don't pad to hit a number.

PLUGGING IN BRAINO:
- The product is called Braino. Spelled B-R-A-I-N-O. Not "Breno". Not any other spelling. Braino.
- Only mention it when it fits naturally in the story or take. Not every post. Never as an ad.
- When it fits: "this is exactly why I built Braino" / "been building Braino for X months" / "we just shipped [thing] in Braino"

CONTENT SOURCE (when provided):
- Pull out 5-10 specific facts, numbers, or moments from the material.
- Build each post around ONE of them — not a summary of all.
- Use the actual specifics. Vague is forgettable.
- Each post should feel like the writer's personal reaction to one thing in the material.
- Cover different parts across the posts.

OUTPUT: Return ONLY a valid JSON array of strings. No markdown fences. No explanation. Just the array.
["Post one here.", "Post two here."]`;

  const contentSection = opts.contentSource?.trim()
    ? `\n\nContent source material (mine this for tweet ideas and angles):\n---\n${opts.contentSource.trim()}\n---`
    : "";

  const userPrompt = `Persona:\n${personaContext}${opts.overallContext ? `\n\nAdditional user context:\n${opts.overallContext}` : ""}${contentSection}\n\nGenerate ${opts.count} original tweet${opts.count > 1 ? "s" : ""} for today. Return a JSON array of strings.`;

  const response = await fetch(LOVABLE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`AI generation failed: ${raw.slice(0, 200)}`);
  }

  const payload = await response.json();
  const rawContent = String(payload?.choices?.[0]?.message?.content || "").trim();

  // Strip markdown fences if present
  const fenced = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || rawContent;

  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t) => typeof t === "string" && t.trim().length > 0)
        .map(cleanPost);
    }
  } catch {
    if (candidate.length > 0) {
      return [cleanPost(candidate)];
    }
  }

  return [];
}

// Strip markdown formatting characters that render as literal symbols on X
function cleanPost(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")        // *italic* → italic
    .replace(/__(.+?)__/g, "$1")        // __bold__ → bold
    .replace(/_(.+?)_/g, "$1")          // _italic_ → italic
    .replace(/`(.+?)`/g, "$1")          // `code` → code
    .replace(/#{1,6}\s/g, "")           // ## headings → removed
    .trim();
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
