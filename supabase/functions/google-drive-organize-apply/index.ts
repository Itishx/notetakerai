import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
  driveRequestJson,
  getDriveConnection,
  getValidAccessToken,
  hasFullDriveScope,
  json,
  listDriveItems,
  requireAuthedDriveUser,
  requireDriveEnv,
  serializeError,
  type DriveItem,
} from "../_shared/google-drive.ts";

const FOLDER_MIME = "application/vnd.google-apps.folder";

type OrganizeMove = {
  fileId: string;
  fileName: string;
  currentParentIds?: string[];
  targetFolderName: string;
};

function normalize(value: string) {
  return String(value || "").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-organize-apply] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, plan } = await req.json();

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }
    if (!plan || !Array.isArray(plan.moves) || !Array.isArray(plan.foldersToCreate)) {
      return json({ error: "A valid organization plan is required." }, 400);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    if (!hasFullDriveScope(connection)) {
      return json({
        error: "Google Drive needs to be reconnected with full Drive access before Braino can organize all files.",
        reconnectRequired: true,
      }, 400);
    }

    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-organize-apply",
    });

    const existingFolders = await listDriveItems({
      token,
      query: `trashed = false and mimeType = '${FOLDER_MIME}'`,
      pageSize: 200,
      logPrefix: "google-drive-organize-apply",
    });

    const rootFoldersByName = new Map<string, DriveItem>();
    for (const folder of existingFolders) {
      const inRoot = !Array.isArray(folder.parents) || folder.parents.length === 0 || folder.parents.includes("root");
      if (inRoot && !rootFoldersByName.has(normalize(folder.name))) {
        rootFoldersByName.set(normalize(folder.name), folder);
      }
    }

    const createdFolders: Array<{ id: string; name: string }> = [];
    for (const folderName of plan.foldersToCreate as string[]) {
      if (rootFoldersByName.has(normalize(folderName))) continue;
      const created = await driveRequestJson<any>(
        "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,parents",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: String(folderName).trim(),
            mimeType: FOLDER_MIME,
            parents: ["root"],
          }),
        },
        "google-drive-organize-apply",
      );
      rootFoldersByName.set(normalize(created.name), created);
      createdFolders.push({ id: created.id, name: created.name });
    }

    const moved: Array<{ fileId: string; fileName: string; targetFolderName: string }> = [];
    for (const move of plan.moves as OrganizeMove[]) {
      const targetFolder = rootFoldersByName.get(normalize(move.targetFolderName));
      if (!targetFolder) continue;
      const moveUrl = new URL(`https://www.googleapis.com/drive/v3/files/${move.fileId}`);
      moveUrl.searchParams.set("supportsAllDrives", "true");
      moveUrl.searchParams.set("fields", "id,name");
      moveUrl.searchParams.set("addParents", targetFolder.id);
      const removeParents = Array.isArray(move.currentParentIds) ? move.currentParentIds.filter(Boolean) : [];
      if (removeParents.length) moveUrl.searchParams.set("removeParents", removeParents.join(","));

      const updated = await driveRequestJson<any>(
        moveUrl.toString(),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
        "google-drive-organize-apply",
      );
      moved.push({
        fileId: updated.id,
        fileName: updated.name || move.fileName,
        targetFolderName: targetFolder.name,
      });
    }

    return json({
      createdFolderCount: createdFolders.length,
      movedCount: moved.length,
      createdFolders,
      sampleMoves: moved.slice(0, 15),
    });
  } catch (e) {
    console.error("google-drive-organize-apply error:", e);
    return json(serializeError(e), 500);
  }
});
