import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
  getDriveConnection,
  getValidAccessToken,
  hasFullDriveScope,
  json,
  listDriveItems,
  requireAuthedDriveUser,
  requireDriveEnv,
  serializeError,
} from "../_shared/google-drive.ts";

const FOLDER_MIME = "application/vnd.google-apps.folder";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-list-files] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, pageSize } = await req.json().catch(() => ({}));

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    if (!hasFullDriveScope(connection)) {
      return json({
        error: "Google Drive needs to be reconnected with the latest permissions before Braino can see all your files.",
        reconnectRequired: true,
      }, 400);
    }
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-list-files",
    });

    const [files, folders] = await Promise.all([
      listDriveItems({
        token,
        query: `trashed = false and mimeType != '${FOLDER_MIME}'`,
        pageSize: Math.min(Math.max(Number(pageSize) || 200, 1), 400),
        logPrefix: "google-drive-list-files",
      }),
      listDriveItems({
        token,
        query: `trashed = false and mimeType = '${FOLDER_MIME}'`,
        pageSize: 300,
        logPrefix: "google-drive-list-files",
      }),
    ]);

    const folderById = new Map(folders.map((folder) => [folder.id, folder]));

    return json({
      files: files.map((file) => {
        const parentIds = Array.isArray(file.parents) ? file.parents.filter(Boolean) : [];
        const parentNames = parentIds
          .map((id) => folderById.get(id)?.name)
          .filter(Boolean);
        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime || null,
          parentIds,
          parentNames,
          url: file.webViewLink || null,
        };
      }),
    });
  } catch (e) {
    console.error("google-drive-list-files error:", e);
    return json(serializeError(e), 500);
  }
});
