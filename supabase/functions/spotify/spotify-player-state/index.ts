import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  compactText,
  corsHeaders,
  createSpotifyError,
  createSpotifyAdmin,
  getSpotifyConnection,
  getValidSpotifyAccessToken,
  json,
  normalizeSpotifyDevice,
  normalizeSpotifyTrack,
  requireAuthedSpotifyUser,
  requireSpotifyEnv,
  serializeSpotifyError,
} from "../../_shared/spotify.ts";

async function fetchSpotifyOptionalJson(url: string, accessToken: string, logPrefix: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`${logPrefix} spotify api error:`, errorText);
    throw createSpotifyError(compactText(errorText) || "Spotify request failed.", {
      spotifyStatus: res.status,
      reconnectRequired: res.status === 401,
    });
  }

  return await res.json();
}

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
      logPrefix: "spotify-player-state",
    });

    const [playback, devicesPayload] = await Promise.all([
      fetchSpotifyOptionalJson("https://api.spotify.com/v1/me/player", accessToken, "spotify-player-state"),
      fetchSpotifyOptionalJson("https://api.spotify.com/v1/me/player/devices", accessToken, "spotify-player-state"),
    ]);

    const devices = Array.isArray(devicesPayload?.devices)
      ? devicesPayload.devices.map(normalizeSpotifyDevice).filter(Boolean)
      : [];
    const activeDevice = normalizeSpotifyDevice(playback?.device) || devices.find((device: any) => device?.isActive) || null;

    return json({
      account: {
        displayName: connection.display_name ?? null,
        spotifyEmail: connection.spotify_email ?? null,
        product: connection.product ?? null,
        country: connection.country ?? null,
      },
      activeDevice,
      devices,
      isPlaying: Boolean(playback?.is_playing),
      progressMs: typeof playback?.progress_ms === "number" ? playback.progress_ms : 0,
      repeatState: playback?.repeat_state ?? "off",
      shuffleState: Boolean(playback?.shuffle_state),
      track: normalizeSpotifyTrack(playback?.item),
    });
  } catch (error) {
    console.error("spotify-player-state error:", error);
    const { payload, status } = serializeSpotifyError(error);
    return json(payload, status);
  }
});
