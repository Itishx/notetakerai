// watch-play — "Braino, play Shawshank Redemption on Netflix".
//
// Returns the URL that opens the player, plus one line for Braino to say. The
// client opens the tab; this function never touches a streaming service beyond
// the two metadata APIs that exist to be called. See _shared/watch-resolve.ts
// for why this is Watchmode alone: TMDB is not free commercially, and it was
// not load-bearing once Watchmode's own fuzzy search proved good enough.
//
// Latency is the feature here, same as vision-point: the parse is a regex, not
// a model call, because "play X on Netflix" is a shape, not a comprehension
// problem. Callers that already know the title (HIL, the delegate) skip it by
// sending structured fields.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parseSpoken, resolveWatch, spokenLine, type Parsed } from "../../_shared/watch-resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAuthedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authHeader || !supabaseUrl || !anonKey) throw new Error("Not signed in.");
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user?.id) throw new Error("Not signed in.");
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAuthedUser(req);

    const watchmodeKey = Deno.env.get("WATCHMODE_API_KEY");
    if (!watchmodeKey) {
      return json({ error: "WATCHMODE_API_KEY is not configured.", setup: true }, 500);
    }

    const body = await req.json().catch(() => ({}));
    /* Structured wins over text: if HIL already worked out the title, do not
       re-derive it from a sentence and risk disagreeing with itself. */
    const parsed = body?.text ? parseSpoken(String(body.text)) : ({ query: "" } as Parsed);
    const query = String(body?.query || parsed.query || "").trim();
    if (!query) return json({ error: "Nothing to look up." }, 400);

    const result = await resolveWatch({
      query,
      platform: body?.platform || parsed.platform,
      kind: body?.kind || parsed.kind,
      season: body?.season ?? parsed.season,
      episode: body?.episode ?? parsed.episode,
      region: body?.region || "IN",
      watchmodeKey,
    });

    return json({ ...result, speak: spokenLine(result) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /signed in/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
