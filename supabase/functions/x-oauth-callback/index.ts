import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getEnvValue, getXCallbackUrl, getXOAuth2Credentials } from "../_shared/x-oauth.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (error) return html(false, `X authorization error: ${error}`);
    if (!code || !state) return html(false, "Missing code or state from X.");

    const { clientId, clientSecret } = getXOAuth2Credentials();
    const redirectUri = getXCallbackUrl();
    const supabaseUrl = getEnvValue("SUPABASE_URL");
    const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return html(false, "Server configuration error.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: pending, error: pendingError } = await supabase
      .from("x_oauth_states")
      .select("code_verifier,user_identifier")
      .eq("state", state)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending?.code_verifier || !pending.user_identifier) {
      return html(false, "Could not find the pending X authorization request.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: pending.code_verifier,
    });

    const basic = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: body.toString(),
    });

    const rawToken = await tokenResponse.text();
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${rawToken}`);
    }

    const token = JSON.parse(rawToken) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    let xUserId: string | null = null;
    let username: string | null = null;
    let displayName: string | null = null;
    try {
      const meResponse = await fetch("https://api.x.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (meResponse.ok) {
        const meJson = await meResponse.json();
        xUserId = meJson?.data?.id ?? null;
        username = meJson?.data?.username ?? null;
        displayName = meJson?.data?.name ?? null;
      }
    } catch (lookupError) {
      console.warn("users/me failed", lookupError);
    }

    const { data: existingConnection } = await supabase
      .from("x_connections")
      .select("refresh_token")
      .eq("user_identifier", pending.user_identifier)
      .maybeSingle();

    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase
      .from("x_connections")
      .upsert(
        {
          user_identifier: pending.user_identifier,
          x_user_id: xUserId,
          username,
          display_name: displayName,
          access_token: token.access_token,
          refresh_token: token.refresh_token ?? existingConnection?.refresh_token ?? null,
          token_expires_at: expiresAt,
          scope: token.scope ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" },
      );
    if (upsertError) throw upsertError;

    await supabase.from("x_oauth_states").delete().eq("state", state);

    return html(true, `Connected to X${username ? ` as @${username}` : ""}.`);
  } catch (error) {
    console.error("x-oauth-callback error:", error);
    return html(false, error instanceof Error ? error.message : "Unknown error");
  }
});

function html(success: boolean, message: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>X Connection</title>
<style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f0e8;color:#2c3e2d}
.card{text-align:center;padding:40px;background:#ede8dd;border-radius:12px;border:1px solid #d4ccbc;max-width:420px}
.icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;font-weight:400;margin-bottom:8px}
p{font-size:14px;color:#6b7c6b}.hint{margin-top:16px;font-size:12px;color:#8a9a8a;font-style:italic}
.button{display:inline-block;margin-top:18px;padding:10px 14px;border-radius:999px;background:#2c3e2d;color:#f5f0e8;text-decoration:none;font-size:13px}</style>
</head><body><div class="card"><div class="icon">${success ? "✅" : "❌"}</div>
<h1>${success ? "Connected!" : "Connection Failed"}</h1><p>${message}</p>
<p class="hint">${success ? "You can close this tab and return to Braino." : "Return to Braino and try again."}</p>
<a href="#" class="button" onclick="window.close();return false;">Close</a></div>
<script>if(${success ? "true" : "false"}){window.close();setTimeout(()=>window.close(),500);}</script>
</body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
