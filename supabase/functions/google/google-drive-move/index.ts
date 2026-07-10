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
    console.log("[google-drive-move] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, itemName, destinationFolderName, targetKind } = await req.json();
    console.log("[google-drive-move] payload", { userIdentifier, itemName, destinationFolderName, targetKind });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(itemName || "").trim() || !String(destinationFolderName || "").trim()) {
      return json({ error: "Both itemName and destinationFolderName are required." }, 400);
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
      logPrefix: "google-drive-move",
    });

    const item = await resolveDriveItemByName({
      token,
      name: itemName,
      folderOnly: folderOnly || undefined,
      expectedKindLabel,
      logPrefix: "google-drive-move",
    });

    const destinationFolder = await resolveDriveItemByName({
      token,
      name: destinationFolderName,
      folderOnly: true,
      expectedKindLabel: "folder",
      logPrefix: "google-drive-move",
    });

    const existingParents = Array.isArray(item.parents) ? item.parents.filter(Boolean) : [];
    const moveUrl = new URL(`https://www.googleapis.com/drive/v3/files/${item.id}`);
    moveUrl.searchParams.set("supportsAllDrives", "true");
    moveUrl.searchParams.set("fields", "id,name,parents,webViewLink");
    moveUrl.searchParams.set("addParents", destinationFolder.id);
    if (existingParents.length) {
      moveUrl.searchParams.set("removeParents", existingParents.join(","));
    }

    const moved = await driveRequestJson<any>(
      moveUrl.toString(),
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
      "google-drive-move",
    );

    return json({
      id: moved.id,
      name: moved.name,
      destinationFolderName: destinationFolder.name,
      url: moved.webViewLink || null,
    });
  } catch (e) {
    console.error("google-drive-move error:", e);
    return json(serializeError(e), 500);
  }
});
