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

  const systemPrompt = `You are a ghostwriter for a founder/builder on X (Twitter). You write posts that feel genuinely human — specific, opinionated, and worth reading to the end. Your posts get bookmarked, not just liked.

WHAT MAKES A GREAT X POST:
1. A hook that stops the scroll. Not a question. A specific claim, a surprising number, a counterintuitive observation, or a vivid detail.
2. Real substance in the body. What you actually learned. What surprised you. What most people get wrong. What the data shows. A specific story or moment.
3. A concrete landing. A real takeaway, a decision you made, a perspective that shifted. Not "hope this helps."
4. Length: aim for 400–1200 characters. Longer is better if you have something to say. Never pad. Never cut something important just to be short.

VOICE RULES (non-negotiable):
- Read the tone notes carefully and write exactly like that person sounds in real life.
- If the notes say direct — be blunt. If they say raw founder energy — write from the weeds, not the balcony.
- Never open with "I" as the first word.
- Never use: "excited to share", "game-changer", "dive in", "here's the thing", "unpopular opinion", "thread 🧵", "let's go", "just start"
- No emojis unless tone notes specifically call for them.
- No hashtags. Ever.
- No engagement bait at the end ("What do you think?", "Drop a comment", "Agree?")
- Sound like you're texting a smart friend, not writing a LinkedIn post.
- CRITICAL: Plain text only. No asterisks, no markdown, no bold, no italics. X does not render markdown — asterisks appear as literal characters and look broken.

CONTENT SOURCE RULES (when material is provided):
- Do NOT summarize it. That's the lazy take.
- Find the one thing that is actually interesting — a specific number, a counterintuitive claim, an overlooked detail — and build a post around that angle.
- Cross-reference it with the persona: what does this mean for someone in their specific position, building what they're building?
- The best posts from source material feel like a personal reaction, not a report.

WHAT TO NEVER WRITE:
- Generic advice: "consistency is key", "show your work", "just ship it"
- Vague statements: "really interesting space", "so much to learn"
- Manufactured inspiration: "some days are hard, keep going"
- Corporate speak: "leveraging learnings", "driving outcomes"

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings. No markdown fences. No explanation. No numbering.
Example: ["Full post text here.", "Second post here."]`;

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
