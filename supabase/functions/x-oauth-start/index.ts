import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getXCallbackUrl, xFetch, parseFormEncodedResponse } from "../_shared/x-oauth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function mask(value: string | null | undefined, visible = 6) {
  if (!value) return null;
  if (value.length <= visible) return value;
  return `${value.slice(0, visible)}…`;
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

    const callbackUrl = getXCallbackUrl();
    console.log("[x-oauth-start] begin", {
      userIdentifier: mask(userIdentifier, 8),
      callbackUrl,
    });

    const response = await xFetch({
      method: "POST",
      url: "https://api.x.com/oauth/request_token",
      oauthExtras: {
        oauth_callback: callbackUrl,
      },
    });

    const raw = await response.text();
    console.log("[x-oauth-start] request_token response", {
      status: response.status,
      ok: response.ok,
      raw: response.ok ? mask(raw, 24) : raw,
    });
    if (!response.ok) {
      throw new Error(`X request token failed: ${raw}`);
    }

    const payload = parseFormEncodedResponse(raw);
    if (!payload.oauth_token || !payload.oauth_token_secret) {
      throw new Error("X did not return a request token");
    }
    if (payload.oauth_callback_confirmed !== "true") {
      throw new Error("X did not confirm the callback URL for this app");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase service role configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    await supabase
      .from("x_oauth_request_tokens")
      .delete()
      .eq("user_identifier", userIdentifier);
    console.log("[x-oauth-start] cleared pending tokens", {
      userIdentifier: mask(userIdentifier, 8),
    });

    const { error } = await supabase
      .from("x_oauth_request_tokens")
      .insert({
        user_identifier: userIdentifier,
        oauth_token: payload.oauth_token,
        oauth_token_secret: payload.oauth_token_secret,
      });

    if (error) throw error;
    console.log("[x-oauth-start] saved request token", {
      userIdentifier: mask(userIdentifier, 8),
      oauthToken: mask(payload.oauth_token, 10),
      callbackConfirmed: payload.oauth_callback_confirmed,
    });

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
