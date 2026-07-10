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
} from "../../_shared/google-drive.ts";

// Generic append-to-doc endpoint.
// Body: { userIdentifier, docId, text, heading? (h1|h2|h3) }
// Appends `text` at the end of the document.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, docId, text, heading } = await req.json();

    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);
    if (!docId) return json({ error: "docId is required." }, 400);
    if (!text || !String(text).trim()) return json({ error: "text is required." }, 400);

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({ admin, userId: user.id, env, connection, logPrefix: "google-docs-append" });

    // Get current doc to find the end index
    const doc = await driveRequestJson<{ body?: { content?: Array<{ endIndex?: number }> } }>(
      `https://docs.googleapis.com/v1/documents/${docId}?fields=body.content`,
      { headers: { Authorization: `Bearer ${token}` } },
      "google-docs-append",
    );

    const content = doc?.body?.content ?? [];
    // Last element is always an end-of-doc sentinel; we insert just before it
    const lastSentinel = content[content.length - 1];
    const endIndex = Math.max(1, (lastSentinel?.endIndex ?? 2) - 1);

    const insertText = "\n" + String(text).trim() + "\n";
    const requests: unknown[] = [
      {
        insertText: {
          location: { index: endIndex },
          text: insertText,
        },
      },
    ];

    if (heading) {
      const styleMap: Record<string, string> = { h1: "HEADING_1", h2: "HEADING_2", h3: "HEADING_3" };
      const namedStyleType = styleMap[heading];
      if (namedStyleType) {
        const firstLineEnd = endIndex + 1 + (insertText.indexOf("\n", 1) - 1);
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: endIndex + 1, endIndex: firstLineEnd },
            paragraphStyle: { namedStyleType },
            fields: "namedStyleType",
          },
        });
      }
    }

    await driveRequestJson(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      },
      "google-docs-append",
    );

    return json({
      docId,
      docUrl: `https://docs.google.com/document/d/${docId}/edit`,
    });
  } catch (e) {
    console.error("google-docs-append error:", e);
    return json(serializeError(e), 500);
  }
});
