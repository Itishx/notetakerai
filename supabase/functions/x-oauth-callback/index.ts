import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function renderHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>X Connection</title>
<style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f0e8;color:#2c3e2d}
.card{text-align:center;padding:40px;background:#ede8dd;border-radius:12px;border:1px solid #d4ccbc;max-width:400px}
.icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;font-weight:400;margin-bottom:8px}
p{font-size:14px;color:#6b7c6b}.hint{margin-top:16px;font-size:12px;color:#8a9a8a;font-style:italic}</style></head>
<body><div class="card"><div class="icon">${success ? "✅" : "❌"}</div>
<h1>${success ? "Connected!" : "Connection Failed"}</h1><p>${message}</p>
<p class="hint">${success ? "You can close this tab." : "Please try again."}</p></div>
<script>if(${success}){window.close();setTimeout(()=>window.close(),500);setTimeout(()=>window.close(),1500);}</script>
</body></html>`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) return new Response(renderHTML(false, `X authorization denied: ${error}`), { headers: { "Content-Type": "text/html" } });
    if (!code || !state) return new Response(renderHTML(false, "Missing code or state"), { headers: { "Content-Type": "text/html" } });

    const clientId = Deno.env.get("X_CLIENT_ID");
    const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    const redirectUri = Deno.env.get("X_REDIRECT_URI");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret || !redirectUri || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(renderHTML(false, "Server configuration error"), { headers: { "Content-Type": "text/html" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: stateRow, error: stateErr } = await supabase
      .from("x_oauth_states").select("user_identifier, code_verifier").eq("state", state).maybeSingle();
    if (stateErr || !stateRow) return new Response(renderHTML(false, "Invalid or expired state"), { headers: { "Content-Type": "text/html" } });

    const { user_identifier: userIdentifier, code_verifier: codeVerifier } = stateRow;

    // Exchange code (X requires Basic auth for confidential clients)
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("X token exchange failed:", errText);
      return new Response(renderHTML(false, "Failed to exchange code"), { headers: { "Content-Type": "text/html" } });
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in ?? 7200;
    const scope: string = tokenData.scope ?? "";
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Fetch X user info
    let xUserId: string | null = null;
    let xUsername: string | null = null;
    try {
      const uRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (uRes.ok) {
        const u = await uRes.json();
        xUserId = u?.data?.id ?? null;
        xUsername = u?.data?.username ?? null;
      }
    } catch (e) {
      console.error("Failed to fetch X userinfo:", e);
    }

    const { error: dbError } = await supabase.from("x_connections").upsert({
      user_identifier: userIdentifier,
      access_token: accessToken,
      refresh_token: refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
      scope,
      x_user_id: xUserId,
      x_username: xUsername,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_identifier" });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(renderHTML(false, "Failed to save connection"), { headers: { "Content-Type": "text/html" } });
    }

    await supabase.from("x_oauth_states").delete().eq("state", state);

    return new Response(renderHTML(true, `Connected to X${xUsername ? ` as @${xUsername}` : ""}!`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    console.error("x-oauth-callback error:", e);
    return new Response(renderHTML(false, e instanceof Error ? e.message : "Unknown error"), { headers: { "Content-Type": "text/html" } });
  }
});
