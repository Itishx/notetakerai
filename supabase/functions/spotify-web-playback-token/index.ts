import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createSpotifyAdmin,
  getSpotifyConnection,
  getValidSpotifyAccessToken,
  json,
  requireAuthedSpotifyUser,
  requireSpotifyEnv,
} from "../_shared/spotify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const admin = createSpotifyAdmin(env);
    const connection = await getSpotifyConnection(admin, user.id);
    const accessToken = await getValidSpotifyAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "spotify-web-playback-token",
    });

    return json({
      accessToken,
      product: connection.product ?? null,
      displayName: connection.display_name ?? null,
    });
  } catch (error) {
    console.error("spotify-web-playback-token error:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
