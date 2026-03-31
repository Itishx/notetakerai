import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdentifier, title, markdown, notionPageId, images } = await req.json();

    if (!userIdentifier || !markdown) {
      return new Response(JSON.stringify({ error: "userIdentifier and markdown required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: conn, error: dbErr } = await supabase
      .from("notion_connections")
      .select("access_token")
      .eq("user_identifier", userIdentifier)
      .single();

    if (dbErr || !conn) {
      return new Response(JSON.stringify({ error: "Notion not connected. Please connect first." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = conn.access_token;

    // Upload base64 images to storage and get public URLs
    const imageUrlMap: Record<string, string> = {};
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img.base64 && img.id) {
          try {
            const binary = Uint8Array.from(atob(img.base64), c => c.charCodeAt(0));
            const filePath = `${userIdentifier}/${img.id}.png`;
            await supabase.storage.from("note-images").upload(filePath, binary, {
              contentType: "image/png",
              upsert: true,
            });
            const { data: urlData } = supabase.storage.from("note-images").getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              imageUrlMap[img.id] = urlData.publicUrl;
              imageUrlMap[img.base64] = urlData.publicUrl;
              imageUrlMap[`data:image/png;base64,${img.base64}`] = urlData.publicUrl;
              if (typeof img.source === "string" && img.source) {
                imageUrlMap[img.source] = urlData.publicUrl;
              }
            }
          } catch (e) {
            console.error("Image upload error:", e);
          }
        }
      }
    }

    // Convert markdown to Notion blocks, replacing base64 images with public URLs
    const blocks = markdownToNotionBlocks(markdown, imageUrlMap);

    // If we have an existing page ID, update it instead of creating new
    if (notionPageId) {
      await replacePageContent(notionPageId, blocks, accessToken);
      await updatePageTitle(notionPageId, title, accessToken);

      return new Response(JSON.stringify({ success: true, pageId: notionPageId, message: "Notes updated in Notion" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessiblePageId = await searchFirstAccessibleObject(accessToken, "page");

    if (accessiblePageId) {
      await replacePageContent(accessiblePageId, blocks, accessToken);
      await updatePageTitle(accessiblePageId, title, accessToken);

      return new Response(JSON.stringify({ success: true, pageId: accessiblePageId, message: "Notes synced to Notion" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parentId = await searchFirstAccessibleObject(accessToken, "database");

    if (!parentId) {
      return new Response(JSON.stringify({ error: "No accessible Notion pages or databases found. Share at least one page with the integration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pagePayload: any = {
      parent: { database_id: parentId },
      properties: { Name: { title: [{ text: { content: title || "LectureSnap Notes" } }] } },
      children: blocks.slice(0, 100),
    };

    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pagePayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Notion create page error:", errText);

      if (errText.includes("Name")) {
        pagePayload.properties = { title: { title: [{ text: { content: title || "LectureSnap Notes" } }] } };
        const retryRes = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pagePayload),
        });
        if (!retryRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to create Notion page" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const retryData = await retryRes.json();
        if (blocks.length > 100) await appendRemainingBlocks(retryData.id, blocks, accessToken);
        return new Response(JSON.stringify({ success: true, url: retryData.url, pageId: retryData.id, message: "Notes synced to Notion" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to create Notion page" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageData = await createRes.json();
    if (blocks.length > 100) await appendRemainingBlocks(pageData.id, blocks, accessToken);

    return new Response(JSON.stringify({ success: true, url: pageData.url, pageId: pageData.id, message: "Notes synced to Notion" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-to-notion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function appendRemainingBlocks(pageId: string, blocks: any[], accessToken: string) {
  for (let i = 100; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ children: chunk }),
    });
  }
}

async function replacePageContent(pageId: string, blocks: any[], accessToken: string) {
  const existingBlockIds: string[] = [];
  let nextCursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextCursor) params.set("start_cursor", nextCursor);

    const childrenRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!childrenRes.ok) {
      break;
    }

    const childrenData = await childrenRes.json();
    for (const block of childrenData.results || []) {
      if (block?.id) existingBlockIds.push(block.id);
    }

    hasMore = Boolean(childrenData.has_more);
    nextCursor = childrenData.next_cursor ?? null;
  }

  for (const blockId of existingBlockIds) {
    await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    });
  }

  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ children: chunk }),
    });
  }
}

async function updatePageTitle(pageId: string, title: string | undefined, accessToken: string) {
  try {
    await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: { title: [{ text: { content: title || "LectureSnap Notes" } }] },
        },
      }),
    });
  } catch {
    // Title update is best-effort.
  }
}

async function searchFirstAccessibleObject(accessToken: string, objectType: "page" | "database") {
  const searchRes = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filter: { property: "object", value: objectType }, page_size: 1 }),
  });

  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  return searchData.results?.[0]?.id ?? null;
}

function markdownToNotionBlocks(md: string, imageUrlMap: Record<string, string>): any[] {
  const blocks: any[] = [];
  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle markdown images: ![alt](src)
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      let imgUrl = imgMatch[2];
      if (imgUrl.startsWith("data:")) {
        const base64Key = imgUrl.split(",")[1];
        const matchingUrl = imageUrlMap[imgUrl] || (base64Key ? imageUrlMap[base64Key] : undefined);
        if (matchingUrl) {
          imgUrl = matchingUrl;
        } else {
          continue; // Skip base64 images we couldn't upload
        }
      }
      for (const [id, url] of Object.entries(imageUrlMap)) {
        if (!id.startsWith("data:") && imgUrl.includes(id)) {
          imgUrl = url;
          break;
        }
      }
      if (imgUrl.startsWith("http")) {
        blocks.push({
          object: "block",
          type: "image",
          image: { type: "external", external: { url: imgUrl } },
        });
      }
      continue;
    }

    // Skip standalone HTML img tags
    if (line.trim().startsWith("<img")) {
      // Try to extract src and find in imageUrlMap
      const srcMatch = line.match(/src="([^"]+)"/);
      if (srcMatch) {
        let imgUrl = srcMatch[1];
        if (imgUrl.startsWith("data:")) {
          const base64Key = imgUrl.split(",")[1];
          const matchingUrl = imageUrlMap[imgUrl] || (base64Key ? imageUrlMap[base64Key] : undefined);
          if (matchingUrl) {
            blocks.push({
              object: "block",
              type: "image",
              image: { type: "external", external: { url: matchingUrl } },
            });
          }
        } else if (imgUrl.startsWith("http")) {
          blocks.push({
            object: "block",
            type: "image",
            image: { type: "external", external: { url: imgUrl } },
          });
        }
      }
      continue;
    }

    // Headings
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: parseRichText(h1[1]) } });
      continue;
    }
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: parseRichText(h2[1]) } });
      continue;
    }
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: parseRichText(h3[1]) } });
      continue;
    }

    if (line.trim() === "---") {
      blocks.push({ object: "block", type: "divider", divider: {} });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      blocks.push({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: parseRichText(bullet[1]) } });
      continue;
    }

    const quote = line.match(/^>\s+(.+)/);
    if (quote) {
      blocks.push({ object: "block", type: "quote", quote: { rich_text: parseRichText(quote[1]) } });
      continue;
    }

    blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: parseRichText(line) } });
  }

  return blocks;
}

function parseRichText(text: string): any[] {
  const parts: any[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      parts.push({ type: "text", text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[3]) {
      parts.push({ type: "text", text: { content: match[3] }, annotations: { italic: true } });
    } else if (match[4]) {
      parts.push({ type: "text", text: { content: match[4] } });
    }
  }
  return parts.length > 0 ? parts : [{ type: "text", text: { content: text } }];
}
