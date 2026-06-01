import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type SpotifyConnection = {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  spotify_email: string | null;
  display_name: string | null;
  product: string | null;
  country: string | null;
  spotify_user_id: string | null;
};

export type SpotifyEnv = {
  authHeader: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type SpotifyTaggedError = Error & {
  spotifyStatus?: number;
  reconnectRequired?: boolean;
};

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function compactText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 500);
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error: error.message || "Unknown error",
      details: error.stack ? compactText(error.stack) : null,
    };
  }
  if (typeof error === "string") {
    return { error, details: null };
  }
  try {
    return {
      error: "Unexpected backend error",
      details: compactText(JSON.stringify(error)),
    };
  } catch {
    return { error: "Unknown error", details: null };
  }
}

export function createSpotifyError(
  message: string,
  options?: {
    spotifyStatus?: number;
    reconnectRequired?: boolean;
  },
) {
  const error = new Error(message) as SpotifyTaggedError;
  if (typeof options?.spotifyStatus === "number") {
    error.spotifyStatus = options.spotifyStatus;
  }
  if (options?.reconnectRequired) {
    error.reconnectRequired = true;
  }
  return error;
}

export function serializeSpotifyError(error: unknown) {
  const tagged = error as SpotifyTaggedError | null;
  const reconnectRequired = Boolean(tagged?.reconnectRequired) || tagged?.spotifyStatus === 401;
  const payload = serializeError(error);

  return {
    payload: reconnectRequired
      ? { ...payload, reconnectRequired: true }
      : payload,
    status: reconnectRequired ? 400 : 500,
  };
}

export function requireSpotifyEnv(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI") || "";

  if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify integration is not configured correctly.");
  }

  return {
    authHeader,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    clientId,
    clientSecret,
    redirectUri,
  } satisfies SpotifyEnv;
}

export function requireSpotifyServerEnv() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify integration is not configured correctly.");
  }

  return {
    authHeader: "",
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    clientId,
    clientSecret,
    redirectUri,
  } satisfies SpotifyEnv;
}

export async function requireAuthedSpotifyUser(env: SpotifyEnv) {
  const userClient = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: env.authHeader } },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error("Not signed in.");
  }

  return user;
}

export function createSpotifyAdmin(env: SpotifyEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey);
}

export async function getSpotifyConnection(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("spotify_connections")
    .select("access_token, refresh_token, token_expires_at, scope, spotify_email, display_name, product, country, spotify_user_id")
    .eq("user_identifier", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw createSpotifyError("Spotify is not connected yet.", { reconnectRequired: true });
  }

  return data as SpotifyConnection;
}

export async function getValidSpotifyAccessToken({
  admin,
  userId,
  env,
  connection,
  logPrefix,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  env: SpotifyEnv;
  connection: SpotifyConnection;
  logPrefix: string;
}) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token && (!expiresAt || expiresAt > Date.now() + 60_000)) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw createSpotifyError("Spotify connection is missing a refresh token. Please reconnect Spotify.", {
      reconnectRequired: true,
    });
  }

  const refreshRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.clientId}:${env.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }).toString(),
  });

  if (!refreshRes.ok) {
    const errorText = await refreshRes.text();
    console.error(`${logPrefix} refresh error:`, errorText);
    throw createSpotifyError(`Failed to refresh Spotify access. ${compactText(errorText)}`, {
      spotifyStatus: refreshRes.status,
      reconnectRequired: refreshRes.status === 400 || refreshRes.status === 401,
    });
  }

  const refreshed = await refreshRes.json();
  const accessToken = String(refreshed.access_token || "");
  if (!accessToken) {
    throw new Error("Spotify refresh returned no access token.");
  }

  const expiresAtIso = refreshed.expires_in
    ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
    : null;

  const { error: updateError } = await admin
    .from("spotify_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  if (updateError) {
    throw updateError;
  }

  return accessToken;
}

export async function spotifyRequestRaw(url: string, init: RequestInit, logPrefix: string) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`${logPrefix} spotify api error:`, errorText);
    throw createSpotifyError(compactText(errorText) || "Spotify request failed.", {
      spotifyStatus: res.status,
      reconnectRequired: res.status === 401,
    });
  }
  return res;
}

export async function spotifyRequestJson<T = any>(url: string, init: RequestInit, logPrefix: string): Promise<T> {
  const res = await spotifyRequestRaw(url, init, logPrefix);
  if (res.status === 204) {
    return null as T;
  }
  return await res.json();
}

export function normalizeSpotifyTrack(track: any) {
  if (!track) {
    return null;
  }

  const images = Array.isArray(track.album?.images)
    ? track.album.images
    : Array.isArray(track.images)
      ? track.images
      : [];

  return {
    id: track.id ?? null,
    uri: track.uri ?? null,
    name: track.name ?? null,
    artists: Array.isArray(track.artists) ? track.artists.map((artist: any) => artist?.name).filter(Boolean) : [],
    albumName: track.album?.name ?? null,
    imageUrl: images[0]?.url ?? null,
    externalUrl: track.external_urls?.spotify ?? null,
    durationMs: typeof track.duration_ms === "number" ? track.duration_ms : null,
    type: track.type ?? "track",
  };
}

export function normalizeSpotifyDevice(device: any) {
  if (!device) {
    return null;
  }

  return {
    id: device.id ?? null,
    isActive: Boolean(device.is_active),
    isPrivateSession: Boolean(device.is_private_session),
    isRestricted: Boolean(device.is_restricted),
    name: device.name ?? null,
    type: device.type ?? null,
    volumePercent: typeof device.volume_percent === "number" ? device.volume_percent : null,
  };
}
