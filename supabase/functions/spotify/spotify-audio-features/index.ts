import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  compactText,
  corsHeaders,
  createSpotifyAdmin,
  createSpotifyError,
  getSpotifyConnection,
  getValidSpotifyAccessToken,
  json,
  requireAuthedSpotifyUser,
  requireSpotifyEnv,
  serializeSpotifyError,
} from "../../_shared/spotify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const { trackId } = await req.json();
    const id = String(trackId || "").trim();
    if (!id) return json({ error: "trackId required." }, 400);

    const admin = createSpotifyAdmin(env);
    const connection = await getSpotifyConnection(admin, user.id);
    const accessToken = await getValidSpotifyAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "spotify-audio-features",
    });

    const res = await fetch(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw createSpotifyError(compactText(errorText) || "Spotify request failed.", {
        spotifyStatus: res.status,
        reconnectRequired: res.status === 401,
      });
    }
    const data = await res.json();

    return json({
      tempo: typeof data?.tempo === "number" ? data.tempo : null,
      energy: typeof data?.energy === "number" ? data.energy : null,
      valence: typeof data?.valence === "number" ? data.valence : null,
      danceability: typeof data?.danceability === "number" ? data.danceability : null,
      timeSignature: typeof data?.time_signature === "number" ? data.time_signature : null,
    });
  } catch (error) {
    console.error("spotify-audio-features error:", error);
    const { payload, status } = serializeSpotifyError(error);
    return json(payload, status);
  }
});
