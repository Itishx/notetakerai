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
  serializeError,
} from "../_shared/google-drive.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, noteId } = await req.json();

    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);
    if (!noteId) return json({ error: "noteId is required." }, 400);

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({ admin, userId: user.id, env, connection, logPrefix: "google-docs-save-note" });

    // Fetch the note
    const { data: note, error: noteError } = await admin
      .from("notes")
      .select("id, title, source_title, source_url, structured_notes, use_case, created_at")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (noteError) throw new Error(noteError.message);
    if (!note) return json({ error: "Note not found." }, 404);

    const docTitle = String(note.title || "Braino Note").trim();

    // Step 1: Create empty Google Doc via Drive API
    const created = await driveRequestJson<{ id: string; webViewLink?: string }>(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,webViewLink",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: docTitle, mimeType: "application/vnd.google-apps.document" }),
      },
      "google-docs-save-note",
    );

    const docId = created.id;

    // Step 2: Build the text content
    const lines: string[] = [];
    lines.push(docTitle);
    lines.push("");

    const meta: string[] = [];
    if (note.source_title) meta.push(note.source_title);
    if (note.source_url) meta.push(note.source_url);
    const dateStr = new Date(note.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    meta.push(`Saved ${dateStr}`);
    lines.push(meta.join("  ·  "));
    lines.push("");
    lines.push("─".repeat(48));
    lines.push("");

    if (note.structured_notes) {
      // Strip markdown fences and clean up for plain-text doc
      const cleaned = note.structured_notes
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/^#{1,3} /gm, "")
        .trim();
      lines.push(cleaned);
    } else {
      lines.push("(No content)");
    }
    lines.push("");

    const fullText = lines.join("\n");

    // Step 3: Write content via Docs API batchUpdate
    await driveRequestJson(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            // Insert the body text first (at index 1, after the empty paragraph)
            {
              insertText: {
                location: { index: 1 },
                text: fullText,
              },
            },
            // Style the first line (title) as Heading 1
            {
              updateParagraphStyle: {
                range: { startIndex: 1, endIndex: docTitle.length + 1 },
                paragraphStyle: { namedStyleType: "HEADING_1" },
                fields: "namedStyleType",
              },
            },
          ],
        }),
      },
      "google-docs-save-note",
    );

    return json({
      docId,
      docUrl: created.webViewLink || `https://docs.google.com/document/d/${docId}/edit`,
      docName: docTitle,
    });
  } catch (e) {
    console.error("google-docs-save-note error:", e);
    return json(serializeError(e), 500);
  }
});
