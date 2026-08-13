// Public-facing. Called by the widget (public/embed/braino-embed.js) from
// whatever third-party site it's mounted on. No Supabase user auth — the
// visitor is anonymous — so trust comes from two checks instead: the
// site_id must exist and be active, and the request's Origin must be on
// that site's allowed_origins list. This is the same trust model as a
// Stripe publishable key or an Intercom app_id: the id is public, the
// allowlist is the actual gate.
//
// Personality/voice/memory infra stays entirely server-side and shared
// with the rest of Braino (buildBrainoSystemPrompt, BRAINO_TEXT_MODEL) —
// the embedded site never gets any of that, only replies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildBrainoSystemPrompt } from "../../_shared/braino-prompt.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRIDGE_TIMEOUT_MS = 5000;
const MAX_HISTORY_TURNS = 8;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function originAllowed(origin: string | null, allowedOrigins: string[]) {
  if (!origin) return false;
  const normalized = origin.replace(/\/$/, "");
  return allowedOrigins.some((o) => o.replace(/\/$/, "") === normalized);
}

async function signBridgeRequest(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The bridge contract is deliberately one endpoint, one shape: the target
// site decides what "relevant" means for its own schema and hands back
// plain context text. See skills/braino-embed/SKILL.md for what the other
// side implements.
async function fetchBridgeContext(
  bridgeUrl: string,
  bridgeSecret: string | null,
  query: string,
  pageUrl: string | null,
) {
  try {
    const body = JSON.stringify({ query, page_url: pageUrl });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (bridgeSecret) headers["X-Braino-Signature"] = await signBridgeRequest(bridgeSecret, body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT_MS);
    const res = await fetch(bridgeUrl, { method: "POST", headers, body, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const context = data && typeof data.context === "string" ? data.context.trim() : "";
    return context ? context.slice(0, 6000) : null;
  } catch (_err) {
    // The bridge being slow, down, or unimplemented yet is never fatal —
    // Braino just answers without site-specific grounding for that turn.
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.site_id === "string" ? body.site_id.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pageContext = body.page_context && typeof body.page_context === "object" ? body.page_context : null;
    const history = Array.isArray(body.history)
      ? body.history
          .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-MAX_HISTORY_TURNS)
      : [];

    if (!siteId) return json({ error: "site_id is required" }, 400);
    if (!message) return json({ error: "message is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: site, error: siteError } = await service
      .from("embedded_sites")
      .select("id, name, allowed_origins, status, bridge_url, bridge_secret")
      .eq("site_id", siteId)
      .maybeSingle();

    if (siteError || !site) return json({ error: "Unknown site" }, 404);
    if (site.status !== "active") return json({ error: "This Braino integration is disabled" }, 403);

    const origin = req.headers.get("Origin") || req.headers.get("Referer");
    if (!originAllowed(origin, site.allowed_origins || [])) {
      return json({ error: "Origin not allowed for this site" }, 403);
    }

    const pageUrl = pageContext && typeof pageContext.url === "string" ? pageContext.url : null;
    const bridgeContext = site.bridge_url
      ? await fetchBridgeContext(site.bridge_url, site.bridge_secret, message, pageUrl)
      : null;

    const systemPrompt = buildBrainoSystemPrompt({
      // "voice" medium, not "text": every reply is spoken aloud by default here
      // (fish-audio-tts) and shown in a small plain-text bubble with no markdown
      // renderer, so this is the branch (diction.ts) that keeps him short and
      // markdown-free instead of writing **bold**/lists into a plain bubble.
      responseMedium: "voice",
      pageContext,
      notes: bridgeContext
        ? `Live knowledge from ${site.name}'s own systems, fetched just now for this question (this is the site's data, not the visitor's personal notes):\n${bridgeContext}`
        : `You are running as Braino embedded on ${site.name}. You do not have live access to this site's data yet for this question; answer from the page context you can see and general help, and say so plainly if you'd need the site's own data to answer precisely.`,
    });

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "API key not configured" }, 500);

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: BRAINO_TEXT_MODEL, reasoning_effort: BRAINO_TEXT_REASONING_EFFORT, messages }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      return json({ error: `Braino backend error: ${errText.slice(0, 300)}` }, 502);
    }

    const aiData = await aiRes.json();
    const reply = aiData?.choices?.[0]?.message?.content?.trim() || "";

    return json({ reply, grounded: Boolean(bridgeContext) });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
