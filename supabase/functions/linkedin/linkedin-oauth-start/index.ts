import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildAuthUrl, linkedinConfig } from "../../_shared/linkedin.ts";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);

    const { clientId, clientSecret } = linkedinConfig();
    if (!clientId || !clientSecret) {
      return json({
        error: "LinkedIn is not configured on the server yet. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.",
        needsConfig: true,
      }, 503);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Sign in required." }, 401);

    // State carries the user so the callback knows whose connection this is,
    // and is stored so a forged callback cannot bind an account to a stranger.
    const state = crypto.randomUUID();
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    await supabase.from("x_oauth_request_tokens").insert({
      token: state,
      token_secret: `linkedin:${user.id}`,
      user_identifier: user.id,
    });

    return json({ authUrl: buildAuthUrl(state) });
  } catch (e) {
    console.error("linkedin-oauth-start:", e);
    return json({ error: e instanceof Error ? e.message : "Failed to start LinkedIn OAuth." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
