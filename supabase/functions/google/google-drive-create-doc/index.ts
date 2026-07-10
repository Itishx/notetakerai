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
} from "../../_shared/google-drive.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-create-doc] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, docName, parentFolderName } = await req.json();
    console.log("[google-drive-create-doc] payload", { userIdentifier, docName, parentFolderName: parentFolderName || null });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(docName || "").trim()) {
      return json({ error: "docName is required." }, 400);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-create-doc",
    });

    let parentId: string | null = null;
    if (parentFolderName) {
      const parentFolder = await resolveDriveItemByName({
        token,
        name: parentFolderName,
        folderOnly: true,
        expectedKindLabel: "folder",
        logPrefix: "google-drive-create-doc",
      });
      parentId = parentFolder.id;
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
          name: String(docName).trim(),
          mimeType: "application/vnd.google-apps.document",
          ...(parentId ? { parents: [parentId] } : {}),
        }),
      },
      "google-drive-create-doc",
    );

    return json({
      id: created.id,
      name: created.name || String(docName).trim(),
      url: created.webViewLink || null,
    });
  } catch (e) {
    console.error("google-drive-create-doc error:", e);
    return json(serializeError(e), 500);
  }
});
