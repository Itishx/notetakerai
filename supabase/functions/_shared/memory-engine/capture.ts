// Memory Engine — the capture orchestrator.
//
// This ties the pure pieces together and does the IO: gate → load existing → ask a cheap LLM what
// to remember → write the ops. It's designed to run in the BACKGROUND (EdgeRuntime.waitUntil) after
// Braino has already replied, so it never adds latency to the user's turn.

import type { ExistingMemoryRef, MemoryCategory } from "./types.ts";
import { shouldCapture } from "./gate.ts";
import { buildExtractionPrompt, parseMemoryOps } from "./extract.ts";
import { applyMemoryOps, type ApplyResult } from "./store.ts";
import { getTierLimits } from "./tiers.ts";

type ChatMsg = { role: string; content: string };

export type CaptureInput = {
  supabase: any;            // service-role client
  userId: string;
  messages: ChatMsg[];      // recent conversation including the latest user message + Braino's reply
  isPremium?: boolean;
  memoryEnabled?: boolean;  // profiles.memory_enabled (default true)
  source?: "auto" | "voice";
};

// Guard the Deno access so this module is import-safe in plain Node test harnesses too.
const EXTRACT_MODEL =
  (typeof Deno !== "undefined" ? Deno.env.get("MEMORY_EXTRACT_MODEL") : "") || "gpt-4o-mini";

// Returns what changed (or null if it didn't run). Never throws — memory must not break a chat turn.
export async function captureFromConversation(input: CaptureInput): Promise<ApplyResult | null> {
  try {
    const { supabase, userId, messages } = input;
    if (!userId || !Array.isArray(messages) || !messages.length) return null;
    if (input.memoryEnabled === false) return null;

    // Gate on the latest USER message — most turns carry nothing worth remembering.
    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    if (!shouldCapture(lastUser?.content)) return null;

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return null;

    // Existing active memories so the model can update/dedupe rather than pile up.
    const { data: existingRows } = await supabase
      .from("braino_memories")
      .select("id,content,category")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("salience", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(80);
    const existing: ExistingMemoryRef[] = (existingRows || []).map((m: any) => ({
      id: m.id,
      content: m.content,
      category: (m.category || "fact") as MemoryCategory,
    }));

    const prompt = buildExtractionPrompt(messages, existing);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("memory capture: extractor call failed", res.status);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const ops = parseMemoryOps(content);
    if (!ops.length) return { added: 0, updated: 0, archived: 0 };

    const limits = getTierLimits(input.isPremium);
    const result = await applyMemoryOps(supabase, userId, ops, limits, input.source || "auto");
    console.log(`memory capture: +${result.added} ~${result.updated} -${result.archived} for ${userId}`);
    return result;
  } catch (err) {
    console.warn("memory capture failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
