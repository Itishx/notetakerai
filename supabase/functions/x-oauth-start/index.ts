import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return base64UrlEncode(bytes).slice(0, length);
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdentifier } = await req.json();
    if (!userIdentifier) {
      return new Response(JSON.stringify({ error: "userIdentifier required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("X_CLIENT_ID");
    const redirectUri =
      Deno.env.get("X_REDIRECT_URI") ||
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/x-oauth-callback`;
    if (!clientId) throw new Error("X_CLIENT_ID not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase service role configuration");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const state = randomString(32);
    const codeVerifier = randomString(64);
    const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

    // Clear any prior pending states for this user
    await supabase.from("x_oauth_states").delete().eq("user_identifier", userIdentifier);

    const { error } = await supabase.from("x_oauth_states").insert({
      user_identifier: userIdentifier,
      state,
      code_verifier: codeVerifier,
    });
    if (error) throw error;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("x-oauth-start error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
