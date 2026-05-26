import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parseFormEncodedResponse, xFetch } from "../_shared/x-oauth.ts";

function mask(value: string | null | undefined, visible = 6) {
  if (!value) return null;
  if (value.length <= visible) return value;
  return `${value.slice(0, visible)}…`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const denied = url.searchParams.get("denied");
    const requestToken = url.searchParams.get("oauth_token");
    const verifier = url.searchParams.get("oauth_verifier");
    console.log("[x-oauth-callback] begin", {
      denied: denied || null,
      oauthToken: mask(requestToken, 10),
      verifier: mask(verifier, 10),
    });

    if (denied) {
      return html(false, "X authorization was denied.");
    }

    if (!requestToken || !verifier) {
      return html(false, "Missing oauth token or verifier.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return html(false, "Server configuration error.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: pendingToken, error: pendingError } = await supabase
      .from("x_oauth_request_tokens")
      .select("oauth_token_secret,user_identifier")
      .eq("oauth_token", requestToken)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pendingToken?.oauth_token_secret || !pendingToken.user_identifier) {
      return html(false, "Could not find the pending X authorization request.");
    }

    const userIdentifier = pendingToken.user_identifier;
    console.log("[x-oauth-callback] pending token found", {
      userIdentifier: mask(userIdentifier, 8),
      oauthToken: mask(requestToken, 10),
    });

    const accessResponse = await xFetch({
      method: "POST",
      url: "https://api.x.com/oauth/access_token",
      token: requestToken,
      tokenSecret: pendingToken.oauth_token_secret,
      oauthExtras: {
        oauth_verifier: verifier,
      },
    });

    const raw = await accessResponse.text();
    console.log("[x-oauth-callback] access_token response", {
      status: accessResponse.status,
      ok: accessResponse.ok,
      raw: accessResponse.ok ? mask(raw, 24) : raw,
    });
    if (!accessResponse.ok) {
      throw new Error(`X access token exchange failed: ${raw}`);
    }

    const payload = parseFormEncodedResponse(raw);
    if (!payload.oauth_token || !payload.oauth_token_secret) {
      throw new Error("X did not return an access token.");
    }

    const { error: upsertError } = await supabase
      .from("x_connections")
      .upsert(
        {
          user_identifier: userIdentifier,
          x_user_id: payload.user_id || null,
          username: payload.screen_name || null,
          display_name: payload.screen_name || null,
          access_token: payload.oauth_token,
          access_token_secret: payload.oauth_token_secret,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" },
      );

    if (upsertError) throw upsertError;
    console.log("[x-oauth-callback] connection saved", {
      userIdentifier: mask(userIdentifier, 8),
      username: payload.screen_name || null,
      xUserId: mask(payload.user_id, 8),
    });

    await supabase
      .from("x_oauth_request_tokens")
      .delete()
      .eq("oauth_token", requestToken)
      .eq("user_identifier", userIdentifier);
    console.log("[x-oauth-callback] pending token cleared", {
      userIdentifier: mask(userIdentifier, 8),
      oauthToken: mask(requestToken, 10),
    });

    return html(true, `Connected to X${payload.screen_name ? ` as @${payload.screen_name}` : ""}.`);
  } catch (e) {
    console.error("x-oauth-callback error:", e);
    return html(false, e instanceof Error ? e.message : "Unknown error");
  }
});

function html(success: boolean, message: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>X Connection</title>
    <style>
      body { font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f0e8; color: #2c3e2d; }
      .card { text-align: center; padding: 40px; background: #ede8dd; border-radius: 12px; border: 1px solid #d4ccbc; max-width: 420px; }
      .icon { font-size: 48px; margin-bottom: 16px; }
      h1 { font-size: 20px; font-weight: 400; margin-bottom: 8px; }
      p { font-size: 14px; color: #6b7c6b; }
      .hint { margin-top: 16px; font-size: 12px; color: #8a9a8a; font-style: italic; }
      .button { display: inline-block; margin-top: 18px; padding: 10px 14px; border-radius: 999px; background: #2c3e2d; color: #f5f0e8; text-decoration: none; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">${success ? "✅" : "❌"}</div>
      <h1>${success ? "Connected!" : "Connection Failed"}</h1>
      <p>${message}</p>
      <p class="hint">${success ? "You can close this tab and return to Braino." : "Return to Braino and try again."}</p>
      <a href="#" class="button" onclick="window.close(); return false;">Close</a>
    </div>
    <script>
      if (${success ? "true" : "false"}) {
        window.close();
        setTimeout(() => window.close(), 500);
        setTimeout(() => window.close(), 1500);
      }
    </script>
  </body>
</html>`,
    {
      headers: { "Content-Type": "text/html" },
    },
  );
}
