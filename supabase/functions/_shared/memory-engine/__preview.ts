// Memory Engine — preview / smoke test for the pure logic (no AI, no DB).
//   npx tsx supabase/functions/_shared/memory-engine/__preview.ts

import { shouldCapture } from "./gate.ts";
import { parseMemoryOps } from "./extract.ts";
import { selectRelevantMemories } from "./retrieve.ts";
import { renderMemoryBlock } from "./render.ts";
import type { Memory } from "./types.ts";

const rule = (s: string) => `\n${"═".repeat(70)}\n${s}\n${"═".repeat(70)}`;
let fails = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${label}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
};

console.log(rule("gate.shouldCapture()"));
for (const [msg, want] of [
  ["my name is Itish and I'm building Braino", true],
  ["remember that I prefer short answers", true],
  ["my girlfriend's name is Anya", true],
  ["what's the capital of France?", false],
  ["summarize this page", false],
  ["fix this bug for me", false],
] as Array<[string, boolean]>) {
  check(`"${msg}" → ${want}`, shouldCapture(msg), want);
}

console.log(rule("extract.parseMemoryOps()"));
const sample = '```json\n{"ops":[{"op":"add","content":"User is building Braino","category":"project","salience":3},{"op":"update","id":"abc","content":"User lives in SF","salience":2},{"op":"archive","id":"def"},{"op":"bogus"}]}\n```';
const ops = parseMemoryOps(sample);
check("parsed 3 valid ops (bogus dropped)", ops.length, 3);
check("first op is add/project/sal3", [ops[0].op, (ops[0] as any).category, (ops[0] as any).salience], ["add", "project", 3]);
check("update normalizes missing category to fact", (ops[1] as any).category, "fact");
check("empty/garbage → []", parseMemoryOps("not json at all").length, 0);

console.log(rule("retrieve.selectRelevantMemories()"));
const mk = (id: string, content: string, salience: 1 | 2 | 3): Memory => ({
  id, content, category: "fact", salience, source: "auto", status: "active",
  created_at: new Date().toISOString(),
});
const mems: Memory[] = [
  mk("1", "User is named Itish", 3),
  mk("2", "User likes spicy food", 1),
  mk("3", "User is building a Chrome extension called Braino", 2),
  mk("4", "User has a dog named Pixel", 1),
];
const picked = selectRelevantMemories(mems, "how's my chrome extension going?", 2);
check("topical memory (#3) surfaces for an extension question", picked.some((m) => m.id === "3"), true);
check("returns exactly the limit", picked.length, 2);

console.log(rule("render.renderMemoryBlock()"));
const block = renderMemoryBlock(mems.slice(0, 2));
console.log(block);
check("empty list → empty string", renderMemoryBlock([]), "");

console.log(`\n${fails === 0 ? "ALL CHECKS PASSED ✓" : `${fails} CHECK(S) FAILED ✗`}`);
