import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createSpotifyAdmin,
  getSpotifyConnection,
  getValidSpotifyAccessToken,
  json,
  normalizeSpotifyTrack,
  requireAuthedSpotifyUser,
  requireSpotifyEnv,
  spotifyRequestJson,
} from "../_shared/spotify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const { query, limit } = await req.json();
    const trimmedQuery = String(query || "").trim();

    if (!trimmedQuery) {
      return json({ error: "Search query required." }, 400);
    }

    const safeLimit = Math.max(1, Math.min(12, Number(limit) || 6));
    const admin = createSpotifyAdmin(env);
    const connection = await getSpotifyConnection(admin, user.id);
    const accessToken = await getValidSpotifyAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "spotify-search",
    });

    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", trimmedQuery);
    searchUrl.searchParams.set("type", "track");
    searchUrl.searchParams.set("limit", String(safeLimit));

    const payload = await spotifyRequestJson<any>(
      searchUrl.toString(),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      "spotify-search",
    );

    const tracks = Array.isArray(payload?.tracks?.items)
      ? payload.tracks.items.map(normalizeSpotifyTrack).filter(Boolean)
      : [];

    return json({ tracks });
  } catch (error) {
    console.error("spotify-search error:", error);
    return json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
