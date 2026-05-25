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
    console.log("[google-drive-rename] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, currentName, newName, targetKind } = await req.json();
    console.log("[google-drive-rename] payload", { userIdentifier, currentName, newName, targetKind });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(currentName || "").trim() || !String(newName || "").trim()) {
      return json({ error: "Both currentName and newName are required." }, 400);
    }

    const folderOnly = targetKind === "folder";
    const expectedKindLabel = folderOnly ? "folder" : targetKind === "file" ? "file" : "item";

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-rename",
    });

    const item = await resolveDriveItemByName({
      token,
      name: currentName,
      folderOnly: folderOnly || undefined,
      expectedKindLabel,
      logPrefix: "google-drive-rename",
    });

    const renamed = await driveRequestJson<any>(
      `https://www.googleapis.com/drive/v3/files/${item.id}?supportsAllDrives=true&fields=id,name,webViewLink`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: String(newName).trim() }),
      },
      "google-drive-rename",
    );

    return json({
      id: renamed.id,
      oldName: item.name,
      name: renamed.name,
      url: renamed.webViewLink || null,
    });
  } catch (e) {
    console.error("google-drive-rename error:", e);
    return json(serializeError(e), 500);
  }
});
