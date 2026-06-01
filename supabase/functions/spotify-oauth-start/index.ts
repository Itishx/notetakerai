import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createSpotifyAdmin, json, requireAuthedSpotifyUser, requireSpotifyEnv } from "../_shared/spotify.ts";

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-library-modify",
  "user-library-read",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const admin = createSpotifyAdmin(env);

    // Preserve the previous refresh token on reconnect if Spotify skips issuing a new one.
    const { data: existing } = await admin
      .from("spotify_connections")
      .select("id")
      .eq("user_identifier", user.id)
      .maybeSingle();

    const state = btoa(JSON.stringify({
      userIdentifier: user.id,
      hasExistingConnection: Boolean(existing?.id),
    }));

    const params = new URLSearchParams({
      client_id: env.clientId,
      response_type: "code",
      redirect_uri: env.redirectUri,
      scope: SPOTIFY_SCOPES.join(" "),
      state,
      show_dialog: existing?.id ? "true" : "false",
    });

    return json({
      authUrl: `https://accounts.spotify.com/authorize?${params.toString()}`,
    });
  } catch (error) {
    console.error("spotify-oauth-start error:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
