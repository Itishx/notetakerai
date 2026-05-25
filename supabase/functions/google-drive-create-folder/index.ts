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
    console.log("[google-drive-create-folder] request received");
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const clientId = Deno.env.get("GOOGLE_DRIVE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET");

    if (!authHeader || !supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret) {
      return json({ error: "Drive folder creation is not configured correctly." }, 500);
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

    const { userIdentifier, folderName, parentId } = await req.json();
    console.log("[google-drive-create-folder] payload", { userIdentifier, folderName, hasParentId: !!parentId });
    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(folderName || "").trim()) {
      return json({ error: "Folder name required." }, 400);
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

    const createRes = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(folderName).trim(),
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [String(parentId)] } : {}),
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("google-drive-create-folder drive api error:", errorText);
      return json({ error: "Google Drive folder creation failed." }, 502);
    }

    const created = await createRes.json();
    console.log("[google-drive-create-folder] success", { id: created.id, name: created.name || String(folderName).trim() });
    return json({
      id: created.id,
      name: created.name || String(folderName).trim(),
      url: created.webViewLink || null,
    });
  } catch (e) {
    console.error("google-drive-create-folder error:", e);
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
    console.error("google-drive-create-folder refresh error:", errorText);
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
