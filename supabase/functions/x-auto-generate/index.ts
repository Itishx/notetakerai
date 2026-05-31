import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

  // Load all users with auto posting enabled who have a linked X account
  const { data: personas, error: personaError } = await supabase
    .from("x_auto_persona")
    .select("user_id, display_name, bio, what_building, tone_notes, content_source, posts_per_day")
    .eq("auto_posting_enabled", true);

  if (personaError) {
    console.error("Failed to load personas:", personaError);
    return json({ error: personaError.message }, 500);
  }

  if (!personas?.length) {
    return json({ message: "No users with auto posting enabled.", generated: 0 });
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

      // Generate tweets via AI
      const tweets = await generateTweets({
        apiKey: apiKey ?? null,
        displayName: persona.display_name,
        bio: persona.bio,
        whatBuilding: persona.what_building,
        toneNotes: persona.tone_notes,
        contentSource: persona.content_source ?? null,
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
        content: text.slice(0, 280),
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

  const systemPrompt = `You are a social media ghostwriter. Generate original, authentic X (Twitter) posts for a person based on their persona and content source.

Rules:
- Each post MUST be under 280 characters.
- Write in first person, in the person's authentic voice.
- Vary the style: mix insights, observations, questions to followers, and personal thoughts.
- No hashtags unless they are genuinely useful.
- No emojis unless the tone calls for it.
- No promotional language or obvious marketing.
- If content source material is provided, mine it for ideas and angles — don't just summarize it, find the interesting takes.
- Return ONLY a valid JSON array of strings. No markdown fences. No extra text.
- Example output: ["Post one here.", "Post two here."]`;

  const contentSection = opts.contentSource?.trim()
    ? `\n\nContent source material (mine this for tweet ideas and angles):\n---\n${opts.contentSource.trim()}\n---`
    : "";

  const userPrompt = `Persona:\n${personaContext}${contentSection}\n\nGenerate ${opts.count} original tweet${opts.count > 1 ? "s" : ""} for today. Return a JSON array of strings.`;

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
      return parsed.filter((t) => typeof t === "string" && t.trim().length > 0);
    }
  } catch {
    // If not an array, try to return it as a single tweet
    if (candidate.length > 0 && candidate.length <= 280) {
      return [candidate];
    }
  }

  return [];
}

function buildScheduleTimes(now: Date, count: number): string[] {
  const nowHour = now.getUTCHours();
  // Pick future slots from POSTING_HOURS_UTC that haven't passed today
  const futureSlots = POSTING_HOURS_UTC.filter((h) => h > nowHour + 1);

  const times: string[] = [];

  for (let i = 0; i < count; i++) {
    const slotHour = futureSlots[i % futureSlots.length] ?? POSTING_HOURS_UTC[i % POSTING_HOURS_UTC.length];
    const t = new Date(now);
    // If we're cycling into tomorrow's slots, advance the date
    const dayOffset = futureSlots.length > 0 && i < futureSlots.length ? 0 : Math.floor(i / (futureSlots.length || 1));
    t.setUTCDate(t.getUTCDate() + dayOffset);
    t.setUTCHours(slotHour, 0, 0, 0);
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
