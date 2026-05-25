import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
  getDriveConnection,
  getValidAccessToken,
  json,
  listDriveItemsByName,
  requireAuthedDriveUser,
  requireDriveEnv,
  serializeError,
} from "../_shared/google-drive.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-search] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, query, folderOnly } = await req.json();
    console.log("[google-drive-search] payload", { userIdentifier, query, folderOnly });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(query || "").trim()) {
      return json({ error: "Search query required." }, 400);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-search",
    });

    const files = await listDriveItemsByName({
      token,
      name: query,
      folderOnly: !!folderOnly,
      logPrefix: "google-drive-search",
    });
    console.log("[google-drive-search] success", { count: files.length });

    return json({
      results: files.map((file) => ({
        id: file.id,
        name: file.name,
        kind: file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
        url: file.webViewLink || null,
        modifiedTime: file.modifiedTime || null,
      })),
    });
  } catch (e) {
    console.error("google-drive-search error:", e);
    return json(serializeError(e), 500);
  }
});
