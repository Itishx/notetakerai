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
  serializeSpotifyError,
  spotifyRequestJson,
} from "../../_shared/spotify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const env = requireSpotifyEnv(req);
    const user = await requireAuthedSpotifyUser(env);
    const { query, limit, types } = await req.json();
    const trimmedQuery = String(query || "").trim();

    if (!trimmedQuery) {
      return json({ error: "Search query required." }, 400);
    }

    const allowedTypes = ["track", "playlist", "album", "artist"];
    const requestedTypes = Array.isArray(types)
      ? types.map((t: unknown) => String(t || "").trim().toLowerCase()).filter((t: string) => allowedTypes.includes(t))
      : [];
    const searchTypes = requestedTypes.length ? requestedTypes : ["track"];

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
    searchUrl.searchParams.set("type", searchTypes.join(","));
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

    const normalizeName = (value: string) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

    const playlists: Array<{ id: string; uri: string; name: string; owner: string | null; ownedByUser: boolean }> = [];
    if (searchTypes.includes("playlist")) {
      // The user's own playlists rarely rank in global search, so scan the
      // library first and put name matches ahead of the public results.
      const desired = normalizeName(trimmedQuery);
      let url: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";
      for (let page = 0; url && page < 4; page += 1) {
        const mine = await spotifyRequestJson<any>(
          url,
          { headers: { Authorization: `Bearer ${accessToken}` } },
          "spotify-search",
        );
        const items = Array.isArray(mine?.items) ? mine.items : [];
        for (const item of items) {
          if (!item?.id) continue;
          const name = normalizeName(item?.name || "");
          if (name !== desired && !name.includes(desired)) continue;
          playlists.push({
            id: String(item.id),
            uri: String(item.uri || `spotify:playlist:${item.id}`),
            name: String(item.name || trimmedQuery).trim(),
            owner: item?.owner?.display_name ?? item?.owner?.id ?? null,
            ownedByUser: Boolean(connection.spotify_user_id && item?.owner?.id === connection.spotify_user_id),
          });
        }
        url = typeof mine?.next === "string" && mine.next ? mine.next : null;
      }
      playlists.sort((a, b) => Number(b.ownedByUser) - Number(a.ownedByUser)
        || Number(normalizeName(b.name) === desired) - Number(normalizeName(a.name) === desired));
      const searchItems = Array.isArray(payload?.playlists?.items) ? payload.playlists.items : [];
      for (const item of searchItems) {
        if (!item?.id || playlists.some((p) => p.id === String(item.id))) continue;
        playlists.push({
          id: String(item.id),
          uri: String(item.uri || `spotify:playlist:${item.id}`),
          name: String(item.name || "").trim(),
          owner: item?.owner?.display_name ?? item?.owner?.id ?? null,
          ownedByUser: false,
        });
      }
    }

    const albums = Array.isArray(payload?.albums?.items)
      ? payload.albums.items.filter(Boolean).map((item: any) => ({
        id: item?.id ?? null,
        uri: item?.uri ?? (item?.id ? `spotify:album:${item.id}` : null),
        name: item?.name ?? null,
        artists: Array.isArray(item?.artists) ? item.artists.map((a: any) => a?.name).filter(Boolean).join(", ") : null,
      }))
      : [];

    const artists = Array.isArray(payload?.artists?.items)
      ? payload.artists.items.filter(Boolean).map((item: any) => ({
        id: item?.id ?? null,
        uri: item?.uri ?? (item?.id ? `spotify:artist:${item.id}` : null),
        name: item?.name ?? null,
      }))
      : [];

    return json({ tracks, playlists, albums, artists });
  } catch (error) {
    console.error("spotify-search error:", error);
    const { payload, status } = serializeSpotifyError(error);
    return json(payload, status);
  }
});
