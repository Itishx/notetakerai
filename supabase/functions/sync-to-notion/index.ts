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
    const { userIdentifier, title, markdown } = await req.json();

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

    // Convert markdown to Notion blocks
    const blocks = markdownToNotionBlocks(markdown);

    // Search for a page to use as parent, or use the first available page
    // First try to find accessible pages
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

    // If no page found, try databases
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
      return new Response(JSON.stringify({ error: "No accessible Notion pages found. Make sure you've shared at least one page with the integration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the page
    const pagePayload: any = {
      parent: { [parentType]: parentId },
      properties: parentType === "page_id"
        ? { title: { title: [{ text: { content: title || "LectureSnap Notes" } }] } }
        : { Name: { title: [{ text: { content: title || "LectureSnap Notes" } }] } },
      children: blocks.slice(0, 100), // Notion limit: 100 blocks per request
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
      
      // If the property name doesn't work, try with "title" property for databases
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
        return new Response(JSON.stringify({ success: true, url: retryData.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to create Notion page" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageData = await createRes.json();

    // If more than 100 blocks, append the rest
    if (blocks.length > 100) {
      const pageId = pageData.id;
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

    return new Response(JSON.stringify({ success: true, url: pageData.url }), {
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

function markdownToNotionBlocks(md: string): any[] {
  const blocks: any[] = [];
  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // Skip HTML img tags (can't embed base64 images in Notion)
    if (line.trim().startsWith("<img")) continue;

    // Headings
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: parseRichText(h1[1]) },
      });
      continue;
    }

    const h2 = line.match(/^## (.+)/);
    if (h2) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: parseRichText(h2[1]) },
      });
      continue;
    }

    const h3 = line.match(/^### (.+)/);
    if (h3) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: parseRichText(h3[1]) },
      });
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      blocks.push({ object: "block", type: "divider", divider: {} });
      continue;
    }

    // Bullet list
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseRichText(bullet[1]) },
      });
      continue;
    }

    // Blockquote
    const quote = line.match(/^>\s+(.+)/);
    if (quote) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: parseRichText(quote[1]) },
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: parseRichText(line) },
    });
  }

  return blocks;
}

function parseRichText(text: string): any[] {
  const parts: any[] = [];
  // Simple bold/italic parsing
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      parts.push({ type: "text", text: { content: match[2] }, annotations: { bold: true } });
    } else if (match[3]) {
      // Italic
      parts.push({ type: "text", text: { content: match[3] }, annotations: { italic: true } });
    } else if (match[4]) {
      parts.push({ type: "text", text: { content: match[4] } });
    }
  }

  return parts.length > 0 ? parts : [{ type: "text", text: { content: text } }];
}
