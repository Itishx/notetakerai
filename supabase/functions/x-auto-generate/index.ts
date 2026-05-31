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

  const systemPrompt = `You are a ghostwriter for a founder who talks to their audience like a close friend — not a marketer, not a thought leader, not a LinkedIn influencer. Real talk. Earned takes. Something worth reading.

THE STRUCTURE OF A GREAT POST (pick one per post):

Option A — The Story:
Open with a hook that drops the reader into a moment. "We had 3 users on day one." "Almost shut it down last week." "Someone told me this would never work." Then tell what happened, what you learned, what changed. End with the honest takeaway.

Option B — The Update:
What's actually happening right now. A real number, a real moment, a real result. "Hit X users today." "Just shipped Y after Z weeks." "This one thing changed everything." Make it feel like a text to a friend who's been following along.

Option C — The Take:
A specific, defended opinion on something in your space. Not "AI is the future" — that's nothing. Something like "everyone's building AI tools but nobody's thinking about the person who has to use them at 11pm when they're exhausted." Pick a side. Defend it with something real.

VOICE (read this carefully and match it to the tone notes):
- Write exactly like this person talks. If they're casual, be casual. If they're sharp and direct, be sharp.
- The reader should feel like they're getting a text, not reading a blog post.
- Never open with "I" as the first word — it's weak. Start with what happened, what you noticed, what hit you.
- No: "excited to share", "game-changer", "let's dive in", "unpopular opinion", "here's the thing", "thread 🧵", "just start", "consistency is key"
- No emojis unless the tone notes explicitly call for them.
- No hashtags. Not one.
- No engagement bait at the end. No "what do you think?" No "drop a comment." Just end the post.
- Plain text only. No asterisks, no bold, no italics, no markdown of any kind — X doesn't render it and it looks broken.

PLUGGING IN BRAINO:
- "Braino" is the product (spelled B-R-A-I-N-O, never "Breno", never "Braino" misspelled in any other way).
- Where it fits naturally — a story about building it, a feature that relates to the post topic, a moment using it — work it in. Don't force it. Don't make every post an ad.
- When it fits: "been building Braino for X months and this is what I've learned" or "this is exactly why I built Braino" or "we just shipped [thing] in Braino."

CONTENT SOURCE (when provided):
- Extract 5–10 specific, surprising, or concrete facts/claims from the material.
- Build each post around exactly ONE of those — not a summary of all.
- Find the angle a real person would react to: "wait, that's actually wild" or "yeah this is exactly what I'm dealing with."
- Use actual numbers and specifics from the material. Vague = forgettable.
- Each post should feel like the writer's personal reaction to one part of the material — not a report.
- Cover different parts of the material across the posts — not the same theme repeated.

LENGTH: 400–1200 characters. Use the space. A post that earns 800 characters is better than a thin 200-character one. Don't pad. Don't cut something real just to be short.

NEVER WRITE:
- "really interesting space", "so much to learn", "some days are hard", "leveraging learnings", "driving outcomes"
- Anything that sounds like it was written by a content marketing team.
- Anything that could have been written without knowing anything specific about this person.

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
