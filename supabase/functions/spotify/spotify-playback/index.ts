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
} from "../../_shared/spotify.ts";

type SpotifyPlaybackAction =
  | { action: "transfer"; deviceId: string; play?: boolean }
  | { action: "play"; deviceId?: string | null; uris?: string[]; contextUri?: string | null; offsetUri?: string | null; positionMs?: number | null }
  | { action: "pause" | "next" | "previous"; deviceId?: string | null }
  | { action: "volume"; volumePercent: number; deviceId?: string | null }
  | { action: "seek"; positionMs: number; deviceId?: string | null };

async function getFirstAvailableDeviceId(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const devices: any[] = data?.devices ?? [];
    const active = devices.find((d) => d.is_active);
    const first = active ?? devices[0] ?? null;
    return first?.id ?? null;
  } catch {
    return null;
  }
}

// Activate a device (Spotify "transfer playback"). A freshly-opened web player is *available*
// but not *active* — without this transfer, `play?device_id=…` keeps 404-ing NO_ACTIVE_DEVICE.
async function activateDevice(accessToken: string, deviceId: string, play = false): Promise<void> {
  await spotifyRequestRaw(
    "https://api.spotify.com/v1/me/player",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_ids: [deviceId], play }),
    },
    "spotify-playback",
  );
}

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

      await activateDevice(accessToken, payload.deviceId, Boolean(payload.play));

      return json({ ok: true });
    }

    async function resolveDeviceId(preferred?: string | null): Promise<string | null> {
      if (preferred) return preferred;
      return await getFirstAvailableDeviceId(accessToken);
    }

    if (payload.action === "play") {
      const body: Record<string, unknown> = {};
      if (Array.isArray(payload.uris) && payload.uris.length > 0) body.uris = payload.uris;
      if (payload.contextUri) body.context_uri = payload.contextUri;
      if (payload.offsetUri) body.offset = { uri: payload.offsetUri };
      if (typeof payload.positionMs === "number" && Number.isFinite(payload.positionMs)) {
        body.position_ms = payload.positionMs;
      }

      const attemptPlay = async (deviceId: string | null) => {
        const param = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
        await spotifyRequestRaw(
          `https://api.spotify.com/v1/me/player/play${param}`,
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
      };

      try {
        await attemptPlay(payload.deviceId ?? null);
      } catch (err: any) {
        const msg = err?.message ?? "";
        if (msg.includes("NO_ACTIVE_DEVICE") || msg.includes("404")) {
          const deviceId = await getFirstAvailableDeviceId(accessToken);
          if (!deviceId) {
            return json({
              error: "No active Spotify device found. Open Spotify on your phone, desktop, or browser and try again.",
              reason: "NO_ACTIVE_DEVICE",
            }, 404);
          }
          // The device exists but isn't active yet — transfer playback to activate it, give it a
          // beat to come online, then play our track on it.
          await activateDevice(accessToken, deviceId, false);
          await new Promise((r) => setTimeout(r, 600));
          await attemptPlay(deviceId);
        } else {
          throw err;
        }
      }

      return json({ ok: true });
    }

    if (payload.action === "seek") {
      // Corrective seek: a cold web player accepts play-with-position but its initial
      // state sync can reset to 0 — the client verifies progress and seeks after.
      const positionMs = Math.max(0, Math.round(Number(payload.positionMs) || 0));
      const deviceId = await resolveDeviceId(payload.deviceId ?? null);
      const params = new URLSearchParams({ position_ms: String(positionMs) });
      if (deviceId) params.set("device_id", deviceId);
      await spotifyRequestRaw(
        `https://api.spotify.com/v1/me/player/seek?${params}`,
        { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } },
        "spotify-playback",
      );
      return json({ ok: true, positionMs });
    }

    if (payload.action === "volume") {
      const volumePercent = Math.min(100, Math.max(0, Math.round(Number(payload.volumePercent) || 0)));
      const deviceId = await resolveDeviceId(payload.deviceId ?? null);
      const params = new URLSearchParams({ volume_percent: String(volumePercent) });
      if (deviceId) params.set("device_id", deviceId);
      await spotifyRequestRaw(
        `https://api.spotify.com/v1/me/player/volume?${params}`,
        { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } },
        "spotify-playback",
      );
      return json({ ok: true, volumePercent });
    }

    const deviceId = await resolveDeviceId(payload.deviceId ?? null);
    const deviceParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

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
        headers: { Authorization: `Bearer ${accessToken}` },
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
