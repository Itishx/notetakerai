import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifySignedOAuthState } from "../../_shared/google-calendar.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHTML(false, `Notion authorization denied: ${error}`), {
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
      const parsed = await verifySignedOAuthState(state, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
      userIdentifier = parsed.userIdentifier;
    } catch {
      return new Response(renderHTML(false, "Invalid state parameter"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("NOTION_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("NOTION_OAUTH_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(renderHTML(false, "Server configuration error"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/notion-oauth-callback`;

    // Exchange code for access token
    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Notion token exchange failed:", errText);
      return new Response(renderHTML(false, "Failed to exchange authorization code"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const workspaceName = tokenData.workspace_name || "";
    const workspaceId = tokenData.workspace_id || "";
    const botId = tokenData.bot_id || "";

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase
      .from("notion_connections")
      .upsert(
        {
          user_identifier: userIdentifier,
          access_token: accessToken,
          workspace_name: workspaceName,
          workspace_id: workspaceId,
          bot_id: botId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" }
      );

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(renderHTML(false, "Failed to save connection"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(renderHTML(true, `Connected to "${workspaceName || "Notion"}" successfully!`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    console.error("notion-oauth-callback error:", e);
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
  <title>Notion Connection</title>
  <style>
    body { font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f0e8; color: #2c3e2d; }
    .card { text-align: center; padding: 40px; background: #ede8dd; border-radius: 12px; border: 1px solid #d4ccbc; max-width: 400px; }
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
    <p class="hint">${success ? "You can return to LectureSnap now. This tab will try to close automatically." : "Please return to LectureSnap and try again."}</p>
    <a href="#" class="button" onclick="window.close(); return false;">Return to LectureSnap</a>
  </div>
  <script>
    // Try to close immediately, then retry aggressively
    if (${success ? "true" : "false"}) {
      window.close();
      setTimeout(() => window.close(), 500);
      setTimeout(() => window.close(), 1500);
      setTimeout(() => { document.body.innerHTML = '<div style="text-align:center;padding:60px;font-family:Georgia,serif;color:#2c3e2d"><h2>✅ Connected!</h2><p>You can close this tab and return to LectureSnap.</p></div>'; }, 2000);
    }
  </script>
</body>
</html>`;
}
