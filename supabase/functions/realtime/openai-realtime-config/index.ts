import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildBrainoSystemPrompt } from "../../_shared/braino-prompt.ts";
import { loadUserKnowledge } from "../../_shared/user-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!anonKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const notes = sanitizePromptText(payload?.notes, 5000);
    const selectedText = sanitizePromptText(payload?.selectedText, 1500);
    const pageContext = sanitizePageContext(payload?.pageContext);
    const languagePolicy = String(payload?.languagePolicy || "mirror_user").trim() || "mirror_user";
    const voiceSurface = String(payload?.voiceSurface || "").trim().toLowerCase() || "floating_mascot";

    const userKnowledge = await loadUserKnowledge(supabase, user.id, {
      includeMemoryNotes: true,
      includeXPersona: true,
      includeXContentSource: false,
    });

    const instructions = buildBrainoSystemPrompt({
      notes,
      pageContext,
      selectedText,
      persistentUserContext: userKnowledge?.combinedContext || "",
      responseMedium: "voice",
      languagePolicy,
      // Emotional Engine: apply the user's personality toggles. The voice session prompt is
      // built once, so moment stays "neutral" — the full engine is present and the realtime
      // model self-selects per turn. (Per-turn voice routing is a planned follow-up.)
      personalitySettings: userKnowledge?.personalitySettings ?? null,
    });

    return json({
      instructions,
      fingerprint: await hashPrompt(`${voiceSurface}::${languagePolicy}::${instructions}`),
    });
  } catch (error) {
    console.error("openai-realtime-config error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizePromptText(value: unknown, maxChars: number) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!normalized) return "";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}… [truncated]`;
}

function sanitizePageContext(pageContext: any) {
  if (!pageContext || typeof pageContext !== "object") return null;
  return {
    title: sanitizePromptText(pageContext.title, 220) || "Untitled",
    url: sanitizePromptText(pageContext.url, 400),
    text: sanitizePromptText(pageContext.text, 8000),
    hoveredContext: sanitizeHoveredContext(pageContext.hoveredContext),
  };
}

function sanitizeHoveredContext(hoveredContext: any) {
  if (!hoveredContext || typeof hoveredContext !== "object") return null;
  return {
    tag: sanitizePromptText(hoveredContext.tag, 60),
    role: sanitizePromptText(hoveredContext.role, 80),
    inputType: sanitizePromptText(hoveredContext.inputType, 80),
    label: sanitizePromptText(hoveredContext.label, 220),
    text: sanitizePromptText(hoveredContext.text, 320),
    heading: sanitizePromptText(hoveredContext.heading, 220),
    nearbyText: sanitizePromptText(hoveredContext.nearbyText, 420),
    href: sanitizePromptText(hoveredContext.href, 220),
  };
}

async function hashPrompt(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}
