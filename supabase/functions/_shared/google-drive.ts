import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type DriveConnection = {
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
};

export type DriveEnv = {
  authHeader: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  clientId: string;
  clientSecret: string;
};

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  modifiedTime?: string | null;
  parents?: string[] | null;
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

export function getDriveEnv(): DriveEnv {
  const authHeader = Deno.env.get("AUTHORIZATION_OVERRIDE") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "";
  return { authHeader, supabaseUrl, anonKey, serviceRoleKey, clientId, clientSecret };
}

export function requireDriveEnv(req: Request): DriveEnv {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "";

  if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret) {
    throw new Error("Google Drive integration is not configured correctly.");
  }

  return { authHeader, supabaseUrl, anonKey, serviceRoleKey, clientId, clientSecret };
}

export async function requireAuthedDriveUser(req: Request, env: DriveEnv) {
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

export function createDriveAdmin(env: DriveEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey);
}

export async function getDriveConnection(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("google_drive_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_identifier", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Google Drive is not connected yet.");
  return data as DriveConnection;
}

export async function getValidAccessToken({
  admin,
  userId,
  env,
  connection,
  logPrefix,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  env: DriveEnv;
  connection: DriveConnection;
  logPrefix: string;
}) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token && (!expiresAt || expiresAt > Date.now() + 60_000)) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Drive connection is missing a refresh token. Please reconnect Google Drive.");
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
    throw new Error(`Failed to refresh Google Drive access. ${compactText(errorText)}`);
  }

  const refreshed = await refreshRes.json();
  const accessToken = String(refreshed.access_token || "");
  if (!accessToken) throw new Error("Google refresh returned no access token.");

  const expiresAtIso = refreshed.expires_in
    ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
    : null;

  const { error: updateError } = await admin
    .from("google_drive_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  if (updateError) throw updateError;
  return accessToken;
}

export async function driveRequestJson<T = any>(url: string, init: RequestInit, logPrefix: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`${logPrefix} drive api error:`, errorText);
    throw new Error(compactText(errorText) || "Google Drive request failed.");
  }
  return await res.json();
}

export async function listDriveItemsByName({
  token,
  name,
  folderOnly,
  logPrefix,
}: {
  token: string;
  name: string;
  folderOnly?: boolean;
  logPrefix: string;
}): Promise<DriveItem[]> {
  const trimmedName = String(name || "").trim();
  const safeName = trimmedName.replace(/'/g, "\\'");
  const clauses = [`name contains '${safeName}'`, "trashed = false"];
  if (folderOnly) clauses.push("mimeType = 'application/vnd.google-apps.folder'");

  const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
  driveUrl.searchParams.set("q", clauses.join(" and "));
  driveUrl.searchParams.set("pageSize", "10");
  driveUrl.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime,parents)");
  driveUrl.searchParams.set("orderBy", "modifiedTime desc");
  driveUrl.searchParams.set("includeItemsFromAllDrives", "true");
  driveUrl.searchParams.set("supportsAllDrives", "true");

  const data = await driveRequestJson<{ files?: DriveItem[] }>(driveUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  }, logPrefix);

  return Array.isArray(data?.files) ? data.files : [];
}

export async function resolveDriveItemByName({
  token,
  name,
  folderOnly,
  expectedKindLabel,
  logPrefix,
}: {
  token: string;
  name: string;
  folderOnly?: boolean;
  expectedKindLabel: string;
  logPrefix: string;
}) {
  const items = await listDriveItemsByName({ token, name, folderOnly, logPrefix });
  if (!items.length) {
    throw new Error(`I couldn't find ${expectedKindLabel} "${name}" in Google Drive.`);
  }

  const normalizedTarget = String(name).trim().toLowerCase();
  const exactMatches = items.filter((item) => String(item.name || "").trim().toLowerCase() === normalizedTarget);

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    throw new Error(`I found multiple ${expectedKindLabel}s named "${name}". Please rename one or be more specific.`);
  }

  if (items.length > 1) {
    throw new Error(`I found multiple close matches for "${name}" in Google Drive. Please be more specific.`);
  }

  return items[0];
}
