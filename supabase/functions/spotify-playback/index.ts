import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createSpotifyAdmin,
  getSpotifyConnection,
  getValidSpotifyAccessToken,
  json,
  requireAuthedSpotifyUser,
  requireSpotifyEnv,
  serializeSpotifyError,
  spotifyRequestRaw,
} from "../_shared/spotify.ts";

type SpotifyPlaybackAction =
  | { action: "transfer"; deviceId: string; play?: boolean }
  | { action: "play"; deviceId?: string | null; uris?: string[]; contextUri?: string | null; offsetUri?: string | null; positionMs?: number | null }
  | { action: "pause" | "next" | "previous"; deviceId?: string | null };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const payload = await req.json() as SpotifyPlaybackAction;
    const admin = createSpotifyAdmin(env);
    const connection = await getSpotifyConnection(admin, user.id);
    const accessToken = await getValidSpotifyAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "spotify-playback",
    });

    if (!payload?.action) {
      return json({ error: "Playback action required." }, 400);
    }

    if (payload.action === "transfer") {
      if (!payload.deviceId) {
        return json({ error: "deviceId required for transfer." }, 400);
      }

      await spotifyRequestRaw(
        "https://api.spotify.com/v1/me/player",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [payload.deviceId],
            play: Boolean(payload.play),
          }),
        },
        "spotify-playback",
      );

      return json({ ok: true });
    }

    const deviceParam = payload.deviceId ? `?device_id=${encodeURIComponent(payload.deviceId)}` : "";

    if (payload.action === "play") {
      const body: Record<string, unknown> = {};
      if (Array.isArray(payload.uris) && payload.uris.length > 0) {
        body.uris = payload.uris;
      }
      if (payload.contextUri) {
        body.context_uri = payload.contextUri;
      }
      if (payload.offsetUri) {
        body.offset = { uri: payload.offsetUri };
      }
      if (typeof payload.positionMs === "number" && Number.isFinite(payload.positionMs)) {
        body.position_ms = payload.positionMs;
      }

      await spotifyRequestRaw(
        `https://api.spotify.com/v1/me/player/play${deviceParam}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        },
        "spotify-playback",
      );

      return json({ ok: true });
    }

    const endpoint =
      payload.action === "pause"
        ? `https://api.spotify.com/v1/me/player/pause${deviceParam}`
        : payload.action === "next"
          ? `https://api.spotify.com/v1/me/player/next${deviceParam}`
          : `https://api.spotify.com/v1/me/player/previous${deviceParam}`;

    await spotifyRequestRaw(
      endpoint,
      {
        method: payload.action === "pause" ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      "spotify-playback",
    );

    return json({ ok: true });
  } catch (error) {
    console.error("spotify-playback error:", error);
    const { payload, status } = serializeSpotifyError(error);
    return json(payload, status);
  }
});
