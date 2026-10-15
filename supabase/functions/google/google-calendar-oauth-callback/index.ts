import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createCalendarAdmin,
  ensureCalendarEventWatch,
  getCalendarOAuthEnv,
  verifyCalendarOAuthState,
} from "../../_shared/google-calendar.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return finish(false, `Google authorization denied: ${error}`);
    }
    if (!code || !state) {
      return finish(false, "Missing code or state parameter");
    }

    const env = getCalendarOAuthEnv();

    let userIdentifier = "";
    try {
      const parsed = await verifyCalendarOAuthState(state, env.serviceRoleKey);
      userIdentifier = parsed.userIdentifier;
    } catch {
      return finish(false, "Invalid state parameter");
    }
    if (!userIdentifier) {
      return finish(false, "Missing user identifier");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.clientId,
        client_secret: env.clientSecret,
        redirect_uri: env.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google Calendar token exchange failed:", errText);
      return finish(false, "Failed to exchange authorization code");
    }

    const tokenData = await tokenRes.json();
    const accessToken = String(tokenData.access_token || "");
    const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;
    const expiresIn = Number(tokenData.expires_in || 3600);
    const scope = String(tokenData.scope || "");
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    let googleEmail: string | null = null;
    let googleUserId: string | null = null;
    try {
      const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        googleEmail = u.email ?? null;
        googleUserId = u.sub ?? null;
      }
    } catch (e) {
      console.error("Failed to fetch Google userinfo:", e);
    }

    const supabase = createCalendarAdmin(env);
    const { data: existing } = await supabase
      .from("google_calendar_connections")
      .select("refresh_token, primary_calendar_id, watch_channel_id, watch_resource_id, watch_token, watch_expires_at")
      .eq("user_identifier", userIdentifier)
      .maybeSingle();
    const existingRefresh = existing?.refresh_token ?? null;
    const primaryCalendarId = existing?.primary_calendar_id ?? "primary";

    const { error: dbError } = await supabase
      .from("google_calendar_connections")
      .upsert(
        {
          user_identifier: userIdentifier,
          access_token: accessToken,
          refresh_token: refreshToken ?? existingRefresh,
          token_expires_at: tokenExpiresAt,
          scope,
          google_email: googleEmail,
          google_user_id: googleUserId,
          primary_calendar_id: primaryCalendarId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" },
      );

    if (dbError) {
      console.error("Google Calendar DB error:", dbError);
      return finish(false, "Failed to save connection");
    }

    try {
      await ensureCalendarEventWatch({
        admin: supabase,
        userId: userIdentifier,
        connection: {
          access_token: accessToken,
          refresh_token: refreshToken ?? existingRefresh,
          token_expires_at: tokenExpiresAt,
          scope,
          primary_calendar_id: primaryCalendarId,
          watch_channel_id: existing?.watch_channel_id ?? null,
          watch_resource_id: existing?.watch_resource_id ?? null,
          watch_token: existing?.watch_token ?? null,
          watch_expires_at: existing?.watch_expires_at ?? null,
        },
        accessToken,
        logPrefix: "google-calendar-oauth-callback",
      });
    } catch (watchError) {
      console.warn("google-calendar-oauth-callback watch setup skipped:", watchError);
    }

    return finish(true, `Connected to Google Calendar${googleEmail ? ` as ${googleEmail}` : ""}!`);
  } catch (e) {
    console.error("google-calendar-oauth-callback error:", e);
    return finish(false, e instanceof Error ? e.message : "Unknown error");
  }
});

/* Supabase functions cannot serve a web page: the HTML came back as code on
   screen (2026-10-15). The result goes to the site's /connected page instead. */
function finish(success: boolean, message: string): Response {
  const site = Deno.env.get("SITE_URL") || "https://trybraino.com";
  const detail = message.replace(/^Connected to Google Calendar(?: as )?/, "").replace(/!$/, "");
  const q = new URLSearchParams({ ok: success ? "1" : "0", service: "Google Calendar", msg: success ? (detail ? `Signed in as ${detail}` : "") : message });
  return Response.redirect(`${site.replace(/\/$/, "")}/connected?${q}`, 302);
}

function renderHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Calendar Connection</title>
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
    <p class="hint">${success ? "You can close this tab and return to Braino." : "Please return to Braino and try again."}</p>
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
</html>`;
}
