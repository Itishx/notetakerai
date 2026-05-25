import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
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
    console.log("[google-drive-delete] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, itemName, targetKind } = await req.json();
    console.log("[google-drive-delete] payload", { userIdentifier, itemName, targetKind });

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!String(itemName || "").trim()) {
      return json({ error: "itemName is required." }, 400);
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
      logPrefix: "google-drive-delete",
    });

    const item = await resolveDriveItemByName({
      token,
      name: itemName,
      folderOnly: folderOnly || undefined,
      expectedKindLabel,
      logPrefix: "google-drive-delete",
    });

    const deleteRes = await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}?supportsAllDrives=true`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      throw new Error(errorText || "Google Drive delete failed.");
    }

    return json({
      id: item.id,
      name: item.name,
      deleted: true,
    });
  } catch (e) {
    console.error("google-drive-delete error:", e);
    return json(serializeError(e), 500);
  }
});
