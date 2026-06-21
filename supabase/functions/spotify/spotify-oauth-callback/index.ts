import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSpotifyAdmin, requireSpotifyServerEnv } from "../../_shared/spotify.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHTML(false, `Spotify authorization denied: ${error}`), {
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

    const env = requireSpotifyServerEnv();
    const admin = createSpotifyAdmin(env);

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${env.clientId}:${env.clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: env.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Spotify token exchange failed:", errText);
      return new Response(renderHTML(false, "Failed to exchange authorization code"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in ?? 3600;
    const scope: string = tokenData.scope ?? "";
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("Spotify profile fetch failed:", errText);
      return new Response(renderHTML(false, "Connected to Spotify, but could not load your account profile"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const profile = await profileRes.json();

    let existingRefresh: string | null = null;
    if (!refreshToken) {
      const { data: existing } = await admin
        .from("spotify_connections")
        .select("refresh_token")
        .eq("user_identifier", userIdentifier)
        .maybeSingle();
      existingRefresh = existing?.refresh_token ?? null;
    }

    const { error: dbError } = await admin
      .from("spotify_connections")
      .upsert(
        {
          user_identifier: userIdentifier,
          spotify_user_id: profile.id ?? null,
          spotify_email: profile.email ?? null,
          display_name: profile.display_name ?? null,
          product: profile.product ?? null,
          country: profile.country ?? null,
          access_token: accessToken,
          refresh_token: refreshToken ?? existingRefresh,
          token_expires_at: tokenExpiresAt,
          scope,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_identifier" },
      );

    if (dbError) {
      console.error("Spotify DB error:", dbError);
      return new Response(renderHTML(false, "Failed to save Spotify connection"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const accountName = profile.display_name || profile.email || "your Spotify account";
    return new Response(renderHTML(true, `Connected to ${accountName}!`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("spotify-oauth-callback error:", error);
    return new Response(renderHTML(false, error instanceof Error ? error.message : "Unknown error"), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHTML(success: boolean, message: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spotify Connection</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f1512; color: #eff7f0; }
    .card { text-align: center; padding: 40px; background: #17211b; border-radius: 18px; border: 1px solid #213027; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
    .icon { font-size: 46px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    p { font-size: 14px; color: #b8c8bc; line-height: 1.5; }
    .hint { margin-top: 16px; font-size: 12px; color: #8ea48f; }
    .button { display: inline-block; margin-top: 18px; padding: 10px 14px; border-radius: 999px; background: #1ed760; color: #0b130d; text-decoration: none; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "🎵" : "❌"}</div>
    <h1>${success ? "Spotify Connected" : "Connection Failed"}</h1>
    <p>${message}</p>
    <p class="hint">${success ? "You can close this tab and head back to Braino." : "Return to Braino and try again."}</p>
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
