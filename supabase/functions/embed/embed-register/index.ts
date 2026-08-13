// Owner-authenticated. Registers a new third-party site and hands back the
// site_id + a ready-to-paste <script> tag. This is the "one command" step:
// call it once, paste what it returns, done.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_SCRIPT_URL =
  Deno.env.get("BRAINO_EMBED_SCRIPT_URL") || "https://trybraino.com/embed/braino-embed.js";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth token" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const allowedOrigins = Array.isArray(body.allowed_origins)
      ? body.allowed_origins
          .filter((o: unknown) => typeof o === "string" && o.trim())
          .map((o: string) => o.trim().replace(/\/$/, ""))
      : [];

    if (!name) return json({ error: "name is required" }, 400);
    if (!allowedOrigins.length) {
      return json(
        { error: "allowed_origins must include at least one origin, e.g. https://example.com" },
        400,
      );
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: site, error } = await service
      .from("embedded_sites")
      .insert({ owner_user_id: user.id, name, allowed_origins: allowedOrigins })
      .select("id, site_id, name, allowed_origins, status, bridge_url, created_at")
      .single();

    if (error || !site) return json({ error: error?.message || "Failed to create site" }, 500);

    const snippet = `<script src="${EMBED_SCRIPT_URL}" data-braino-site="${site.site_id}" async></script>`;

    return json({ site, snippet });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
