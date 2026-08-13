// Owner-authenticated. Wires (or rewires) a site's Data Bridge: the URL on
// the TARGET site that Braino calls for site-specific grounding, plus a
// fresh HMAC secret the bridge uses to verify the call really came from
// this project. The secret is only ever returned once, here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const siteId = typeof body.site_id === "string" ? body.site_id.trim() : "";
    const bridgeUrl = typeof body.bridge_url === "string" ? body.bridge_url.trim() : "";
    const rotateSecret = body.rotate_secret !== false; // default true: always issue a fresh secret when (re)wiring

    if (!siteId) return json({ error: "site_id is required" }, 400);
    if (!bridgeUrl || !/^https:\/\//.test(bridgeUrl)) {
      return json({ error: "bridge_url is required and must be an https:// URL" }, 400);
    }

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Ownership check happens against the real row (service role bypasses RLS,
    // so this query explicitly re-checks owner_user_id itself).
    const { data: existing, error: findError } = await service
      .from("embedded_sites")
      .select("id, owner_user_id, bridge_secret")
      .eq("site_id", siteId)
      .maybeSingle();

    if (findError || !existing) return json({ error: "Unknown site" }, 404);
    if (existing.owner_user_id !== user.id) return json({ error: "Not your site" }, 403);

    const bridgeSecret = rotateSecret || !existing.bridge_secret ? randomSecret() : existing.bridge_secret;

    const { error: updateError } = await service
      .from("embedded_sites")
      .update({ bridge_url: bridgeUrl, bridge_secret: bridgeSecret })
      .eq("id", existing.id);

    if (updateError) return json({ error: updateError.message }, 500);

    return json({
      site_id: siteId,
      bridge_url: bridgeUrl,
      bridge_secret: bridgeSecret,
      note: "Put bridge_secret in the target site's own env as BRAINO_BRIDGE_SECRET. It is not shown again.",
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
