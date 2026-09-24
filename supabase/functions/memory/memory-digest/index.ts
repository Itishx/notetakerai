// memory-digest: one hour of a person's Mac becomes memory.
//
// Step 2 of AffectiveOS Remembers. The Mac sends a compact text of one hour
// from its local activity log; this returns a summary, the hour's episodes and
// loose ends (the Mac keeps those locally, permanently), and writes the durable
// facts into braino_memories through the memory engine's own store, so they
// are deduplicated and capped exactly like every other memory.
//
// The raw hour is sent to the model to be summarised and is NOT stored here,
// and nothing about it goes to engine_runs: that table is shown on a public
// page. Only counts are logged.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyMemoryOps, getTierLimits, type MemoryOp } from "../../_shared/memory-engine/index.ts";
import { buildDigestPrompt, DIGEST_VERSION } from "../../_shared/affective-memory/prompts.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const CATEGORIES = new Set(["identity", "preference", "relationship", "project", "fact", "event"]);
const NO_DASH = (s: string) => String(s || "").replace(/[–—]/g, ", ");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openai = Deno.env.get("OPENAI_API_KEY");
    const auth = req.headers.get("Authorization") || "";
    const { data: who } = await createClient(url, anon, { global: { headers: { Authorization: auth } } }).auth.getUser();
    const userId = who?.user?.id;
    if (!userId) return json({ error: "signed_out" }, 401);
    if (!openai) return json({ error: "no model key" }, 500);

    const { activity, hourStart, hourEnd } = await req.json();
    const text = String(activity || "").slice(0, 40000);
    if (text.trim().length < 40) return json({ summary: "", episodes: [], looseEnds: [], applied: { added: 0, updated: 0, archived: 0 } });

    const db = createClient(url, service);
    const { data: existingRows } = await db.from("braino_memories").select("id,content,category")
      .eq("user_id", userId).eq("status", "active")
      .order("salience", { ascending: false }).order("updated_at", { ascending: false }).limit(80);
    const existing = (existingRows || []).map((m: any) => ({ id: m.id, content: m.content, category: m.category || "fact" }));

    const started = Date.now();
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        max_completion_tokens: 1800,
        messages: [
          { role: "system", content: buildDigestPrompt(existing) },
          { role: "user", content: `Hour: ${hourStart} to ${hourEnd}\n\n${text}` },
        ],
      }),
    });
    if (!ai.ok) return json({ error: `model ${ai.status}` }, 502);
    const payload = await ai.json();
    let out: any = {};
    try { out = JSON.parse(payload?.choices?.[0]?.message?.content || "{}"); } catch (_) { out = {}; }

    const known = new Set(existing.map((m) => m.id));
    const ops: MemoryOp[] = (Array.isArray(out.facts) ? out.facts : []).map((f: any) => {
      const content = NO_DASH(String(f?.content || "")).trim().slice(0, 400);
      if (!content) return null;
      if (f?.op === "update" && known.has(String(f.id))) return { op: "update", id: String(f.id), content };
      const category = CATEGORIES.has(f?.category) ? f.category : "fact";
      const salience = [1, 2, 3].includes(Number(f?.salience)) ? Number(f.salience) : 1;
      return { op: "add", content, category, salience };
    }).filter(Boolean).slice(0, 8) as MemoryOp[];

    const { data: profile } = await db.from("profiles").select("is_premium,memory_enabled").eq("id", userId).maybeSingle();
    const applied = profile?.memory_enabled === false
      ? { added: 0, updated: 0, archived: 0 }
      : await applyMemoryOps(db, userId, ops, getTierLimits(profile?.is_premium), "mac" as any);

    console.log("memory-digest", { userId, chars: text.length, ms: Date.now() - started, facts: ops.length, applied, version: DIGEST_VERSION });
    return json({
      summary: NO_DASH(String(out.summary || "")).slice(0, 900),
      episodes: (Array.isArray(out.episodes) ? out.episodes : []).slice(0, 8).map((e: any) => ({
        from: String(e?.from || ""), to: String(e?.to || ""), title: NO_DASH(String(e?.title || "")).slice(0, 120),
        where: NO_DASH(String(e?.where || "")).slice(0, 120), detail: NO_DASH(String(e?.detail || "")).slice(0, 400),
      })),
      looseEnds: (Array.isArray(out.looseEnds) ? out.looseEnds : []).slice(0, 6).map((s: any) => NO_DASH(String(s)).slice(0, 240)),
      facts: ops.map((o: any) => ({ op: o.op, content: o.content })),
      applied,
      version: DIGEST_VERSION,
    });
  } catch (error) {
    return json({ error: (error as Error)?.message || "memory-digest failed" }, 500);
  }
});
