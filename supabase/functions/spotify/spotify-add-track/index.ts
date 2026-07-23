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
  spotifyRequestJson,
  spotifyRequestRaw,
} from "../../_shared/spotify.ts";

type SpotifyAddTrackAction =
  | { action: "like"; trackId: string }
  | { action: "addToPlaylist"; trackId: string; playlistName: string }
  | { action: "createPlaylist"; name: string; description?: string };

function normalizeName(value: string) {
  return String(value || "").trim().toLowerCase();
}

function toTrackUri(trackId: string) {
  const value = String(trackId || "").trim();
  if (!value) return "";
  if (value.startsWith("spotify:track:")) return value;

  const urlMatch = value.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) {
    return `spotify:track:${urlMatch[1]}`;
  }

  return `spotify:track:${value}`;
}

async function findPlaylistByName(accessToken: string, playlistName: string, ownerId: string | null) {
  const desiredName = normalizeName(playlistName);
  let url: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";
  let fallback: { id: string; name: string } | null = null;

  for (let page = 0; url && page < 10; page += 1) {
    const payload = await spotifyRequestJson<any>(
      url,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      "spotify-add-track",
    );

    const items = Array.isArray(payload?.items) ? payload.items : [];
    for (const item of items) {
      if (!item?.id || normalizeName(item?.name || "") !== desiredName) continue;

      const match = {
        id: String(item.id),
        name: String(item.name || playlistName).trim(),
      };

      if (ownerId && item?.owner?.id === ownerId) {
        return match;
      }

      if (!fallback) {
        fallback = match;
      }
    }

    url = typeof payload?.next === "string" && payload.next ? payload.next : null;
  }

  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let grantedScope = "";
  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const payload = await req.json() as Partial<SpotifyAddTrackAction>;
    const trackId = String((payload as { trackId?: string })?.trackId || "").trim();

    if (payload?.action !== "like" && payload?.action !== "addToPlaylist" && payload?.action !== "createPlaylist") {
      return json({ error: "Valid add-track action required." }, 400);
    }

    if (payload.action !== "createPlaylist" && !trackId) {
      return json({ error: "trackId required." }, 400);
    }

    const admin = createSpotifyAdmin(env);
    const connection = await getSpotifyConnection(admin, user.id);
    grantedScope = String(connection.scope || "");
    const accessToken = await getValidSpotifyAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "spotify-add-track",
    });

    if (payload.action === "createPlaylist") {
      const name = String(payload?.name || "").trim().slice(0, 100);
      if (!name) {
        return json({ error: "name required for createPlaylist." }, 400);
      }
      const ownerId = String(connection.spotify_user_id || "").trim();
      const created = await spotifyRequestJson<any>(
        ownerId
          ? `https://api.spotify.com/v1/users/${encodeURIComponent(ownerId)}/playlists`
          : "https://api.spotify.com/v1/me/playlists",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            public: false,
            description: String(payload?.description || "Made by Braino").slice(0, 300),
          }),
        },
        "spotify-add-track",
      );
      return json({
        ok: true,
        destination: "createdPlaylist",
        playlistId: created?.id ?? null,
        playlistName: created?.name ?? name,
      });
    }

    if (payload.action === "like") {
      await spotifyRequestRaw(
        `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(trackId)}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        "spotify-add-track",
      );

      return json({ ok: true, destination: "liked" });
    }

    const playlistName = String(payload?.playlistName || "").trim();
    if (!playlistName) {
      return json({ error: "playlistName required for addToPlaylist." }, 400);
    }

    const playlist = await findPlaylistByName(accessToken, playlistName, connection.spotify_user_id);
    if (!playlist?.id) {
      return json({
        error: `Could not find a Spotify playlist named "${playlistName}".`,
      }, 404);
    }

    await spotifyRequestRaw(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlist.id)}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [toTrackUri(trackId)],
        }),
      },
      "spotify-add-track",
    );

    return json({
      ok: true,
      destination: "playlist",
      playlistId: playlist.id,
      playlistName: playlist.name,
    });
  } catch (error) {
    console.error("spotify-add-track error:", error);
    const { payload, status } = serializeSpotifyError(error);
    // A 403 with valid auth almost always means the stored token predates the
    // current scope list. Surface the granted scopes so the client can tell.
    if ((error as { spotifyStatus?: number })?.spotifyStatus === 403) {
      (payload as Record<string, unknown>).grantedScope = grantedScope;
      (payload as Record<string, unknown>).scopeHint =
        "Spotify returned 403 Forbidden. Granted scopes on the stored token are listed in grantedScope. Writes need user-library-modify and playlist-modify-private.";
    }
    return json(payload, status);
  }
});
