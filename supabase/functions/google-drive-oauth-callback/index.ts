import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHTML(false, `Google authorization denied: ${error}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(renderHTML(false, "Missing code or state parameter"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    let userIdentifier: string;
    try {
      const parsed = JSON.parse(atob(state));
      userIdentifier = parsed.userIdentifier;
    } catch {
      return new Response(renderHTML(false, "Invalid state parameter"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const redirectUri =
      Deno.env.get("GOOGLE_DRIVE_REDIRECT_URI") ||
      (supabaseUrl ? `${supabaseUrl}/functions/v1/google-drive-oauth-callback` : null);

    if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey || !redirectUri) {
      return new Response(renderHTML(false, "Server configuration error"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange failed:", errText);
      return new Response(renderHTML(false, "Failed to exchange authorization code"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const scope = tokenData.scope as string | undefined;
    const expiresIn = Number(tokenData.expires_in || 0);

    if (!accessToken) {
      return new Response(renderHTML(false, "Google did not return an access token"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
    const googleEmail = typeof userInfo?.email === "string" ? userInfo.email : null;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: existing } = await supabase
      .from("google_drive_connections")
      .select("refresh_token")
      .eq("user_identifier", userIdentifier)
      .maybeSingle();

    const expiresAt = expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error: dbError } = await supabase
      .from("google_drive_connections")
      .upsert(
        {
          user_identifier: userIdentifier,
          google_email: googleEmail,
          access_token: accessToken,
          refresh_token: refreshToken || existing?.refresh_token || null,
          scope: scope || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" },
      );

    if (dbError) {
      console.error("google drive db error:", dbError);
      return new Response(renderHTML(false, "Failed to save Google Drive connection"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(renderHTML(true, `Connected ${googleEmail || "your Google Drive"} successfully!`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    console.error("google-drive-oauth-callback error:", e);
    return new Response(renderHTML(false, e instanceof Error ? e.message : "Unknown error"), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHTML(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive Connection</title>
  <style>
    body { font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f0e8; color: #2c3e2d; }
    .card { text-align: center; padding: 40px; background: #ede8dd; border-radius: 12px; border: 1px solid #d4ccbc; max-width: 420px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 400; margin-bottom: 8px; }
    p { font-size: 14px; color: #6b7c6b; line-height: 1.5; }
    .hint { margin-top: 16px; font-size: 12px; color: #8a9a8a; font-style: italic; }
    .button { display: inline-block; margin-top: 18px; padding: 10px 14px; border-radius: 999px; background: #2c3e2d; color: #f5f0e8; text-decoration: none; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "❌"}</div>
    <h1>${success ? "Connected!" : "Connection Failed"}</h1>
    <p>${message}</p>
    <p class="hint">${success ? "You can return to Braino now. This tab will try to close automatically." : "Please return to Braino and try again."}</p>
    <a href="#" class="button" onclick="window.close(); return false;">Return to Braino</a>
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
