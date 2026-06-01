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

type ResearchSource = {
  title?: string;
  url?: string;
  publishedDate?: string | null;
};

async function buildResearchDraft({
  env,
  topic,
  instructions,
}: {
  env: ReturnType<typeof requireDriveEnv>;
  topic: string;
  instructions?: string;
}) {
  const response = await fetch(`${env.supabaseUrl}/functions/v1/web-research`, {
    method: "POST",
    headers: {
      Authorization: env.authHeader,
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: topic,
      purpose: "google_doc",
      instructions,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Web research failed: ${response.status}`);
  }

  const title = String(data?.title || `${topic} - Braino Research`).trim();
  const body = String(data?.body || "").trim();
  if (!body) throw new Error("Web research returned an empty draft.");

  const sources = Array.isArray(data?.sources) ? (data.sources as ResearchSource[]) : [];
  return { title, body, sources };
}

function formatSourcesSection(sources: ResearchSource[]) {
  const lines = sources
    .filter((source) => source?.url)
    .slice(0, 8)
    .map((source, index) => {
      const title = String(source.title || source.url).trim();
      const date = source.publishedDate ? ` (${source.publishedDate})` : "";
      return `${index + 1}. ${title}${date}\n${source.url}`;
    });

  return lines.length ? `\n\nSources\n\n${lines.join("\n\n")}` : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, topic, instructions } = await req.json();

    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);
    if (!String(topic || "").trim()) return json({ error: "topic is required." }, 400);

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({ admin, userId: user.id, env, connection, logPrefix: "google-docs-from-prompt" });

    const cleanTopic = String(topic).trim();
    const draft = await buildResearchDraft({ env, topic: cleanTopic, instructions });
    const docTitle = draft.title || `${cleanTopic} - Braino Research`;

    // Step 2: Create empty Google Doc
    const created = await driveRequestJson<{ id: string; webViewLink?: string }>(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,webViewLink",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: docTitle, mimeType: "application/vnd.google-apps.document" }),
      },
      "google-docs-from-prompt",
    );

    const docId = created.id;
    const docUrl = created.webViewLink || `https://docs.google.com/document/d/${docId}/edit`;

    // Step 3: Write content via Docs API batchUpdate
    // Insert title + body, then style the title as Heading 1
    const sourcesSection = formatSourcesSection(draft.sources);
    const fullText = `${docTitle}\n\n${draft.body}${sourcesSection}\n`;

    await driveRequestJson(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: fullText,
              },
            },
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
      "google-docs-from-prompt",
    );

    // Step 4: Generate a one-line summary for the chat reply
    const wordCount = draft.body.split(/\s+/).filter(Boolean).length;

    return json({
      docId,
      docUrl,
      docName: docTitle,
      wordCount,
      topic: cleanTopic,
    });
  } catch (e) {
    console.error("google-docs-from-prompt error:", e);
    return json(serializeError(e), 500);
  }
});
