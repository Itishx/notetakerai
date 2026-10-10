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

    /* view "taste": what they actually listen to (5 Oct). Top tracks this
       month, recently played and recently liked. Top and recent need the
       user-top-read and user-read-recently-played scopes; a connection made
       before they were added gets needsReconnect instead of an error. */
    const body = req.method === "POST" ? await req.clone().json().catch(() => ({})) : {};
    if (body?.view === "taste") {
      const soft = async (url: string) => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 403 || res.status === 401) return { denied: true };
        if (!res.ok) return { failed: res.status };
        return await res.json();
      };
      const [top, topLong, recent, liked] = await Promise.all([
        soft("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10"),
        soft("https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=5"),
        soft("https://api.spotify.com/v1/me/player/recently-played?limit=30"),
        soft("https://api.spotify.com/v1/me/tracks?limit=10"),
      ]);
      const name = (t: any) => t ? { title: t.name, artist: (t.artists || []).map((a: any) => a.name).join(", "), uri: t.uri } : null;
      return json({
        topThisMonth: Array.isArray(top?.items) ? top.items.map(name) : null,
        topLately: Array.isArray(topLong?.items) ? topLong.items.map(name) : null,
        recentlyPlayed: Array.isArray(recent?.items) ? recent.items.map((i: any) => ({ ...name(i.track), playedAt: i.played_at })) : null,
        recentlyLiked: Array.isArray(liked?.items) ? liked.items.map((i: any) => ({ ...name(i.track), likedAt: i.added_at })) : null,
        needsReconnect: Boolean(top?.denied || recent?.denied),
      });
    }

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
