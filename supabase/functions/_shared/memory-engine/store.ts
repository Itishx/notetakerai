// Memory Engine — storage. Applies the extractor's ops to the braino_memories table.
//
// This is the only file that writes memory. It handles three things the prompt can't:
//   - dedup: never store the same fact twice.
//   - cap: keep at most storeCap active memories per user (overflow is archived, never deleted).
//   - bookkeeping: timestamps, source, status.

import type { MemoryOp, TierLimits } from "./types.ts";

export type ApplyResult = { added: number; updated: number; archived: number };

// A loose normalized key so "User is building Braino." and "user is building braino" collapse.
function dedupKey(content: string): string {
  return String(content || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 12)
    .join(" ");
}

export async function applyMemoryOps(
  supabase: any,
  userId: string,
  ops: MemoryOp[],
  limits: TierLimits,
  source: "auto" | "voice" = "auto",
): Promise<ApplyResult> {
  const result: ApplyResult = { added: 0, updated: 0, archived: 0 };
  if (!ops.length) return result;

  // Existing active memories — for dedup of adds.
  const { data: existing } = await supabase
    .from("braino_memories")
    .select("id,dedup_key,content")
    .eq("user_id", userId)
    .eq("status", "active");
  const existingKeys = new Set((existing || []).map((m: any) => m.dedup_key || dedupKey(m.content)));

  const now = new Date().toISOString();
  const inserts: any[] = [];

  for (const op of ops) {
    if (op.op === "add") {
      const key = dedupKey(op.content);
      if (!key || existingKeys.has(key)) continue; // already known — skip
      existingKeys.add(key);
      inserts.push({
        user_id: userId,
        content: op.content,
        category: op.category,
        salience: op.salience,
        source,
        status: "active",
        dedup_key: key,
        last_used_at: now,
      });
    } else if (op.op === "update") {
      const patch: any = { content: op.content, dedup_key: dedupKey(op.content), updated_at: now };
      if (op.category) patch.category = op.category;
      if (op.salience) patch.salience = op.salience;
      const { error } = await supabase
        .from("braino_memories")
        .update(patch)
        .eq("id", op.id)
        .eq("user_id", userId);
      if (!error) result.updated += 1;
    } else if (op.op === "archive") {
      const { error } = await supabase
        .from("braino_memories")
        .update({ status: "archived", updated_at: now })
        .eq("id", op.id)
        .eq("user_id", userId);
      if (!error) result.archived += 1;
    }
  }

  if (inserts.length) {
    const { error } = await supabase.from("braino_memories").insert(inserts);
    if (!error) result.added += inserts.length;
  }

  if (result.added || result.updated) {
    await enforceCap(supabase, userId, limits.storeCap);
  }
  return result;
}

// Keep active memories under the tier cap by archiving the least important / oldest overflow.
async function enforceCap(supabase: any, userId: string, storeCap: number): Promise<void> {
  const { count } = await supabase
    .from("braino_memories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  const overflow = (count || 0) - storeCap;
  if (overflow <= 0) return;

  // Lowest salience first, then oldest last-used — those are the safest to retire.
  const { data: victims } = await supabase
    .from("braino_memories")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("salience", { ascending: true })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(overflow);

  const ids = (victims || []).map((v: any) => v.id);
  if (ids.length) {
    await supabase
      .from("braino_memories")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .in("id", ids);
  }
}
