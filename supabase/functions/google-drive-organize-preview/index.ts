import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createDriveAdmin,
  getDriveConnection,
  getValidAccessToken,
  json,
  listDriveItems,
  requireAuthedDriveUser,
  requireDriveEnv,
  serializeError,
  type DriveItem,
} from "../_shared/google-drive.ts";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const PLAN_LIMIT = 120;

type OrganizeMove = {
  fileId: string;
  fileName: string;
  mimeType: string;
  currentParentIds: string[];
  currentParentName: string | null;
  targetFolderName: string;
};

function normalize(value: string) {
  return String(value || "").trim().toLowerCase();
}

function categorizeDriveItem(item: DriveItem) {
  const name = normalize(item.name);
  const mime = String(item.mimeType || "").toLowerCase();

  if (/\b(invoice|receipt|payment|bank|tax|gst|salary|payroll|finance|budget|expense)\b/.test(name)) return "Finance";
  if (/\b(resume|cv|candidate|interview|hiring|recruit|job)\b/.test(name)) return "Hiring";
  if (/\b(meeting|minutes|agenda|notes|call)\b/.test(name)) return "Meetings";
  if (/\b(contract|agreement|nda|legal|proposal)\b/.test(name)) return "Legal";
  if (/\b(prd|spec|roadmap|launch|product|strategy)\b/.test(name)) return "Product";
  if (/\b(deck|pitch|slides|presentation)\b/.test(name)) return "Decks";

  if (mime === "application/vnd.google-apps.spreadsheet" || /sheet|csv|excel/.test(name)) return "Sheets";
  if (mime === "application/vnd.google-apps.presentation") return "Decks";
  if (mime === "application/pdf") return "PDFs";
  if (mime.startsWith("image/")) return "Images";
  if (mime.startsWith("video/")) return "Videos";
  if (mime.startsWith("audio/")) return "Audio";
  if (/zip|compressed|rar|tar/.test(mime) || /\.(zip|rar|tar|gz|7z)$/i.test(item.name || "")) return "Archives";
  if (
    mime.includes("javascript") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("x-python") ||
    mime.includes("x-sh") ||
    /\.(js|ts|tsx|jsx|py|json|md|html|css|sh)$/i.test(item.name || "")
  ) return "Code";
  if (mime === "application/vnd.google-apps.document" || mime.startsWith("text/")) return "Docs";
  return "Misc";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[google-drive-organize-preview] request received");
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier } = await req.json().catch(() => ({}));

    if (!userIdentifier || userIdentifier !== user.id) {
      return json({ error: "User mismatch." }, 403);
    }

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-drive-organize-preview",
    });

    const [files, folders] = await Promise.all([
      listDriveItems({
        token,
        query: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
        pageSize: PLAN_LIMIT,
        logPrefix: "google-drive-organize-preview",
      }),
      listDriveItems({
        token,
        query: "trashed = false and mimeType = 'application/vnd.google-apps.folder'",
        pageSize: 200,
        logPrefix: "google-drive-organize-preview",
      }),
    ]);

    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const rootFoldersByName = new Map<string, DriveItem>();
    for (const folder of folders) {
      const inRoot = !Array.isArray(folder.parents) || folder.parents.length === 0 || folder.parents.includes("root");
      if (inRoot && !rootFoldersByName.has(normalize(folder.name))) {
        rootFoldersByName.set(normalize(folder.name), folder);
      }
    }

    const moves: OrganizeMove[] = [];
    const folderCounts = new Map<string, number>();

    for (const file of files) {
      const targetFolderName = categorizeDriveItem(file);
      const parentIds = Array.isArray(file.parents) ? file.parents.filter(Boolean) : [];
      const currentParent = parentIds.map((id) => folderById.get(id)).find(Boolean) || null;
      const currentParentName = currentParent?.name || null;
      if (normalize(currentParentName || "") === normalize(targetFolderName)) continue;
      moves.push({
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        currentParentIds: parentIds,
        currentParentName,
        targetFolderName,
      });
      folderCounts.set(targetFolderName, (folderCounts.get(targetFolderName) || 0) + 1);
    }

    const targetFolderNames = Array.from(new Set(moves.map((move) => move.targetFolderName)));
    const foldersToCreate = targetFolderNames.filter((name) => !rootFoldersByName.has(normalize(name)));
    const byFolder = targetFolderNames
      .map((folderName) => ({ folderName, count: folderCounts.get(folderName) || 0 }))
      .sort((a, b) => b.count - a.count || a.folderName.localeCompare(b.folderName));

    return json({
      scannedCount: files.length,
      moveCount: moves.length,
      unchangedCount: Math.max(0, files.length - moves.length),
      foldersToCreate,
      byFolder,
      sampleMoves: moves.slice(0, 12),
      plan: {
        generatedAt: new Date().toISOString(),
        scannedCount: files.length,
        moves,
        foldersToCreate,
      },
    });
  } catch (e) {
    console.error("google-drive-organize-preview error:", e);
    return json(serializeError(e), 500);
  }
});
