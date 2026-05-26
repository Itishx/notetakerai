import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getXOAuthClient,
  getXCallbackUrl,
  randomUrlSafe,
  pkceChallenge,
  X_SCOPES,
} from "../_shared/x-oauth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const userIdentifier: string | undefined = body?.userIdentifier;
    if (!userIdentifier) {
      return json({ error: "userIdentifier required" }, 400);
    }

    const { clientId } = getXOAuthClient();
    const redirectUri = getXCallbackUrl();

    const state = randomUrlSafe(24);
    const codeVerifier = randomUrlSafe(48);
    const codeChallenge = await pkceChallenge(codeVerifier);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // cleanup old states for this user
    await supabase.from("x_oauth_states").delete().eq("user_identifier", userIdentifier);

    const { error: insertError } = await supabase
      .from("x_oauth_states")
      .insert({ state, code_verifier: codeVerifier, user_identifier: userIdentifier });
    if (insertError) throw insertError;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: X_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    console.log("[x-oauth-start] generated auth url", { redirectUri });
    return json({ authUrl });
  } catch (e) {
    console.error("x-oauth-start error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
