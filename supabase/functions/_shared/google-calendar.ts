/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-resource-uri, x-goog-message-number, x-goog-channel-expiration",
};

export type CalendarEnv = {
  authHeader: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type CalendarConnection = {
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  scope?: string | null;
  primary_calendar_id?: string | null;
  google_email?: string | null;
  google_user_id?: string | null;
  updated_at?: string | null;
  watch_channel_id?: string | null;
  watch_resource_id?: string | null;
  watch_token?: string | null;
  watch_expires_at?: string | null;
  last_sync_at?: string | null;
};

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const CALENDAR_CALLBACK_PATH = "/functions/v1/google-calendar-oauth-callback";
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function compactText(value: string, max = 700) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error: error.message || "Unknown error",
      details: error.stack ? compactText(error.stack) : null,
    };
  }
  if (typeof error === "string") return { error, details: null };
  try {
    return { error: "Unexpected backend error", details: compactText(JSON.stringify(error)) };
  } catch {
    return { error: "Unknown error", details: null };
  }
}

export function getCalendarEnv(req: Request): CalendarEnv {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") || Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") || Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "";
  const redirectUri =
    Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI") ||
    `${supabaseUrl.replace(/\/$/, "")}${CALENDAR_CALLBACK_PATH}`;

  if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret) {
    throw new Error("Google Calendar integration is not configured correctly.");
  }

  return { authHeader, supabaseUrl, anonKey, serviceRoleKey, clientId, clientSecret, redirectUri };
}

export function getCalendarOAuthEnv(): Omit<CalendarEnv, "authHeader" | "anonKey"> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") || Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") || Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "";
  const redirectUri =
    Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI") ||
    `${supabaseUrl.replace(/\/$/, "")}${CALENDAR_CALLBACK_PATH}`;

  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Calendar OAuth is not configured correctly.");
  }

  return { supabaseUrl, serviceRoleKey, clientId, clientSecret, redirectUri };
}

export async function requireAuthedCalendarUser(req: Request, env: CalendarEnv) {
  const userClient = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: env.authHeader } },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) throw new Error("Not signed in.");
  return user;
}

export function createCalendarAdmin(env: Pick<CalendarEnv, "supabaseUrl" | "serviceRoleKey">) {
  return createClient(env.supabaseUrl, env.serviceRoleKey);
}

export async function getCalendarConnection(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("google_calendar_connections")
    .select("access_token, refresh_token, token_expires_at, scope, primary_calendar_id, google_email, google_user_id, updated_at, watch_channel_id, watch_resource_id, watch_token, watch_expires_at, last_sync_at")
    .eq("user_identifier", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Google Calendar is not connected yet.");
  return data as CalendarConnection;
}

export async function getValidCalendarAccessToken({
  admin,
  userId,
  env,
  connection,
  logPrefix,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  env: Pick<CalendarEnv, "clientId" | "clientSecret">;
  connection: CalendarConnection;
  logPrefix: string;
}) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token && (!expiresAt || expiresAt > Date.now() + 60_000)) return connection.access_token;

  if (!connection.refresh_token) {
    throw new Error("Calendar connection is missing a refresh token. Please reconnect Google Calendar.");
  }

  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    const errorText = await refreshRes.text();
    console.error(`${logPrefix} refresh error:`, errorText);
    throw new Error(`Failed to refresh Google Calendar access. ${compactText(errorText)}`);
  }

  const refreshed = await refreshRes.json();
  const accessToken = String(refreshed.access_token || "");
  if (!accessToken) throw new Error("Google refresh returned no access token.");

  const expiresAtIso = refreshed.expires_in
    ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
    : null;

  const { error: updateError } = await admin
    .from("google_calendar_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  if (updateError) throw updateError;
  return accessToken;
}

export async function calendarRequestJson<T = any>(url: string, init: RequestInit, logPrefix: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`${logPrefix} calendar api error:`, errorText);
    throw new Error(compactText(errorText) || "Google Calendar request failed.");
  }
  if (res.status === 204) return {} as T;
  return await res.json();
}

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return atob(padded);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function signOAuthStatePayload(encodedPayload: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(encodedPayload));
  return bytesToHex(new Uint8Array(signature));
}

export async function buildCalendarOAuthState(userIdentifier: string, secret: string) {
  const payload = {
    userIdentifier: String(userIdentifier || ""),
    issuedAt: Date.now(),
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signOAuthStatePayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyCalendarOAuthState(state: string, secret: string) {
  const [encodedPayload, signature] = String(state || "").split(".");
  if (!encodedPayload || !signature) throw new Error("Invalid state parameter");

  const expectedSignature = await signOAuthStatePayload(encodedPayload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error("Calendar authorization state check failed");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
    userIdentifier?: string;
    issuedAt?: number;
  };
  const issuedAt = Number(payload.issuedAt || 0);
  if (!payload.userIdentifier) throw new Error("Missing user identifier");
  if (!issuedAt || Math.abs(Date.now() - issuedAt) > OAUTH_STATE_TTL_MS) {
    throw new Error("Calendar authorization link expired. Please reconnect from Braino.");
  }

  return { userIdentifier: String(payload.userIdentifier) };
}

export async function ensureCalendarEventWatch({
  admin,
  userId,
  connection,
  accessToken,
  logPrefix,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  connection: CalendarConnection;
  accessToken: string;
  logPrefix: string;
}) {
  const address = Deno.env.get("GOOGLE_CALENDAR_PUSH_WEBHOOK_URL") || "";
  if (!address) {
    return { ok: false, skipped: "webhook_not_configured" as const };
  }

  const currentWatchExpiresAt = connection.watch_expires_at ? new Date(connection.watch_expires_at).getTime() : 0;
  if (
    connection.watch_channel_id &&
    connection.watch_resource_id &&
    currentWatchExpiresAt > Date.now() + 6 * 60 * 60 * 1000
  ) {
    return {
      ok: true,
      reused: true,
      channelId: connection.watch_channel_id,
      resourceId: connection.watch_resource_id,
      expiresAt: connection.watch_expires_at || null,
    };
  }

  const calendarId = encodeURIComponent(String(connection.primary_calendar_id || "primary"));
  const channelId = crypto.randomUUID();
  const channelToken = crypto.randomUUID();
  const watch = await calendarRequestJson<any>(`${CALENDAR_API}/calendars/${calendarId}/events/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address,
      token: channelToken,
    }),
  }, `${logPrefix}:watch`);

  const expiresAt = watch?.expiration ? new Date(Number(watch.expiration)).toISOString() : null;
  const { error } = await admin
    .from("google_calendar_connections")
    .update({
      watch_channel_id: channelId,
      watch_resource_id: watch?.resourceId || null,
      watch_token: channelToken,
      watch_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  if (error) throw error;

  return {
    ok: true,
    reused: false,
    channelId,
    resourceId: watch?.resourceId || null,
    expiresAt,
  };
}

export function normalizeAttendees(attendees: unknown) {
  if (!Array.isArray(attendees)) return [];
  return attendees
    .map((item) => {
      if (typeof item === "string") return { email: item.trim() };
      if (item && typeof item === "object" && "email" in item) {
        return { email: String((item as { email?: unknown }).email || "").trim() };
      }
      return { email: "" };
    })
    .filter((item) => item.email && item.email.includes("@"));
}

export function summarizeCalendarEvent(event: any) {
  const meetUrl =
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find((entry: any) => entry?.entryPointType === "video")?.uri ||
    null;

  return {
    id: event?.id || null,
    summary: event?.summary || "Untitled event",
    description: event?.description || "",
    location: event?.location || "",
    htmlLink: event?.htmlLink || null,
    meetUrl,
    start: event?.start || null,
    end: event?.end || null,
    // displayName is what a meeting recorder needs to put a name on a voice, and Google has
    // been sending it all along — it was simply being dropped here.
    attendees: Array.isArray(event?.attendees)
      ? event.attendees.map((a: any) => ({
        email: a.email,
        displayName: a.displayName || null,
        responseStatus: a.responseStatus || null,
      }))
      : [],
    status: event?.status || null,
  };
}
