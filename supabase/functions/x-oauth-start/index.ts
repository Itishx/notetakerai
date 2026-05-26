import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getXCallbackUrl, xFetch, parseFormEncodedResponse } from "../_shared/x-oauth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const callbackUrl = new URL(getXCallbackUrl());
    callbackUrl.searchParams.set("user_identifier", userIdentifier);

    const response = await xFetch({
      method: "POST",
      url: "https://api.x.com/oauth/request_token",
      oauthExtras: {
        oauth_callback: callbackUrl.toString(),
      },
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`X request token failed: ${raw}`);
    }

    const payload = parseFormEncodedResponse(raw);
    if (!payload.oauth_token || !payload.oauth_token_secret) {
      throw new Error("X did not return a request token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase service role configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("x_oauth_request_tokens")
      .insert({
        user_identifier: userIdentifier,
        oauth_token: payload.oauth_token,
        oauth_token_secret: payload.oauth_token_secret,
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        authUrl: `https://api.x.com/oauth/authorize?oauth_token=${encodeURIComponent(payload.oauth_token)}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("x-oauth-start error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
