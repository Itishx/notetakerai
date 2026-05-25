import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-search] request received");
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");

    if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret) {
      return json({ error: "Drive search is not configured correctly." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Not signed in." }, 401);
    }

    const { userIdentifier, query, folderOnly } = await req.json();
    console.log("[google-drive-search] payload", { userIdentifier, query, folderOnly });
    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(query || "").trim()) {
      return json({ error: "Search query required." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: connection, error: connectionError } = await admin
      .from("google_drive_connections")
      .select("access_token, refresh_token, expires_at")
      .eq("user_identifier", user.id)
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) return json({ error: "Google Drive is not connected yet." }, 400);

    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      clientId,
      clientSecret,
      connection,
    });

    const trimmedQuery = String(query).trim().replace(/'/g, "\\'");
    const clauses = [`name contains '${trimmedQuery}'`, "trashed = false"];
    if (folderOnly) clauses.push("mimeType = 'application/vnd.google-apps.folder'");

    const driveUrl = new URL("https://www.googleapis.com/drive/v3/files");
    driveUrl.searchParams.set("q", clauses.join(" and "));
    driveUrl.searchParams.set("pageSize", "8");
    driveUrl.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime)");
    driveUrl.searchParams.set("orderBy", "modifiedTime desc");
    driveUrl.searchParams.set("includeItemsFromAllDrives", "true");
    driveUrl.searchParams.set("supportsAllDrives", "true");

    const driveRes = await fetch(driveUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      console.error("google-drive-search drive api error:", errorText);
      return json({ error: "Google Drive search failed." }, 502);
    }

    const driveData = await driveRes.json();
    const files = Array.isArray(driveData?.files) ? driveData.files : [];
    console.log("[google-drive-search] success", { count: files.length });

    return json({
      results: files.map((file: any) => ({
        id: file.id,
        name: file.name,
        kind: file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
        url: file.webViewLink || null,
        modifiedTime: file.modifiedTime || null,
      })),
    });
  } catch (e) {
    console.error("google-drive-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function getValidAccessToken({
  admin,
  userId,
  clientId,
  clientSecret,
  connection,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  clientId: string;
  clientSecret: string;
  connection: { access_token: string; refresh_token?: string | null; expires_at?: string | null };
}) {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
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
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    const errorText = await refreshRes.text();
    console.error("google-drive-search refresh error:", errorText);
    throw new Error("Failed to refresh Google Drive access.");
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
      expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  if (updateError) throw updateError;
  return accessToken;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
