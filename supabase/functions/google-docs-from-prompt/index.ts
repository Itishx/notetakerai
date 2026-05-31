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

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = requireDriveEnv(req);
    const user = await requireAuthedDriveUser(req, env);
    const { userIdentifier, topic, instructions } = await req.json();

    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);
    if (!String(topic || "").trim()) return json({ error: "topic is required." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured." }, 500);

    const admin = createDriveAdmin(env);
    const connection = await getDriveConnection(admin, user.id);
    const token = await getValidAccessToken({ admin, userId: user.id, env, connection, logPrefix: "google-docs-from-prompt" });

    const cleanTopic = String(topic).trim();
    const extraInstructions = instructions ? `\n\nAdditional instructions: ${instructions}` : "";

    // Step 1: Generate content with AI
    const aiRes = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a research and writing expert. Write a comprehensive, well-structured document about the given topic.

Format rules:
- Use clear headings and subheadings
- Write in plain text (no markdown asterisks or hashes — the doc will use native Docs formatting)
- Be thorough but scannable — use short paragraphs
- Include key concepts, examples, and practical takeaways
- Length: 600-1200 words depending on topic depth
- Do NOT include a title — that will be added separately${extraInstructions}`,
          },
          {
            role: "user",
            content: `Write a comprehensive document about: ${cleanTopic}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`AI generation failed: ${aiRes.status}`);
    const aiData = await aiRes.json();
    const generatedContent = String(aiData?.choices?.[0]?.message?.content || "").trim();
    if (!generatedContent) throw new Error("AI returned no content.");

    const docTitle = `${cleanTopic} — Braino Research`;

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
    const fullText = `${docTitle}\n\n${generatedContent}\n`;

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
    const wordCount = generatedContent.split(/\s+/).length;

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
