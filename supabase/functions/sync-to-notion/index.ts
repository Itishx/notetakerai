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
      // Delete existing children first
      const childrenRes = await fetch(`https://api.notion.com/v1/blocks/${notionPageId}/children?page_size=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (childrenRes.ok) {
        const childrenData = await childrenRes.json();
        // Delete each existing block
        for (const block of childrenData.results || []) {
          await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Notion-Version": "2022-06-28",
            },
          });
        }
      }

      // Append new blocks in chunks of 100
      for (let i = 0; i < blocks.length; i += 100) {
        const chunk = blocks.slice(i, i + 100);
        await fetch(`https://api.notion.com/v1/blocks/${notionPageId}/children`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ children: chunk }),
        });
      }

      // Update title
      try {
        await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
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
        // Title update is best-effort
      }

      return new Response(JSON.stringify({ success: true, pageId: notionPageId, message: "Notes updated in Notion" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // First sync: find parent and create new page
    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filter: { property: "object", value: "page" }, page_size: 1 }),
    });

    let parentId: string | null = null;
    let parentType: "page_id" | "database_id" = "page_id";

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.results?.length > 0) {
        parentId = searchData.results[0].id;
      }
    }

    if (!parentId) {
      const dbSearchRes = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 1 }),
      });
      if (dbSearchRes.ok) {
        const dbData = await dbSearchRes.json();
        if (dbData.results?.length > 0) {
          parentId = dbData.results[0].id;
          parentType = "database_id";
        }
      }
    }

    if (!parentId) {
      return new Response(JSON.stringify({ error: "No accessible Notion pages found. Share at least one page with the integration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pagePayload: any = {
      parent: { [parentType]: parentId },
      properties: parentType === "page_id"
        ? { title: { title: [{ text: { content: title || "LectureSnap Notes" } }] } }
        : { Name: { title: [{ text: { content: title || "LectureSnap Notes" } }] } },
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

      if (parentType === "database_id" && errText.includes("Name")) {
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
      // Check if it's a base64 data URL - look up in imageUrlMap
      if (imgUrl.startsWith("data:")) {
        // Try to find a matching public URL from our uploaded images
        const matchingUrl = Object.values(imageUrlMap).find(u => u);
        if (matchingUrl) {
          imgUrl = matchingUrl;
        } else {
          continue; // Skip base64 images we couldn't upload
        }
      }
      // Check if it matches an image ID in the map
      for (const [id, url] of Object.entries(imageUrlMap)) {
        if (imgUrl.includes(id)) {
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
          const matchingUrl = Object.values(imageUrlMap).find(u => u);
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
