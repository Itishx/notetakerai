import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
  driveRequestJson,
  getDriveConnection,
  getValidAccessToken,
  json,
  requireAuthedDriveUser,
  requireDriveEnv,
  resolveDriveItemByName,
  serializeError,
} from "../_shared/google-drive.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-create-folder] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, folderName, parentId, parentFolderName } = await req.json();
    console.log("[google-drive-create-folder] payload", {
      userIdentifier,
      folderName,
      hasParentId: !!parentId,
      parentFolderName: parentFolderName || null,
    });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(folderName || "").trim()) {
      return json({ error: "Folder name required." }, 400);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-create-folder",
    });

    let resolvedParentId = parentId ? String(parentId) : null;
    if (!resolvedParentId && parentFolderName) {
      const parentFolder = await resolveDriveItemByName({
        token,
        name: parentFolderName,
        folderOnly: true,
        expectedKindLabel: "folder",
        logPrefix: "google-drive-create-folder",
      });
      resolvedParentId = parentFolder.id;
    }

    const created = await driveRequestJson<any>(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(folderName).trim(),
          mimeType: "application/vnd.google-apps.folder",
          ...(resolvedParentId ? { parents: [resolvedParentId] } : {}),
        }),
      },
      "google-drive-create-folder",
    );

    console.log("[google-drive-create-folder] success", {
      id: created.id,
      name: created.name || String(folderName).trim(),
    });
    return json({
      id: created.id,
      name: created.name || String(folderName).trim(),
      url: created.webViewLink || null,
    });
  } catch (e) {
    console.error("google-drive-create-folder error:", e);
    return json(serializeError(e), 500);
  }
});
