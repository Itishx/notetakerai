// Scores Groq-hosted models on the same prompt + nearest examples as dictation-refine.
import fs from "fs";
const [model = "llama-3.3-70b-versatile", n = "60"] = process.argv.slice(2);
const KEY = process.env.GROQ_API_KEY;
const ts = fs.readFileSync("../../supabase/functions/voice/dictation-refine/index.ts", "utf8");
const SYSTEM = eval("`" + ts.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/)[1] + "`");
const FILLER = new Set(eval(ts.match(/const FILLER = new Set\((\[[^\]]*\])\)/)[1]));
const SHAPE = new Set(eval(ts.match(/const SHAPE = new Set\((\[[^\]]*\])\)/)[1]));
const EX = JSON.parse(fs.readFileSync("../../supabase/functions/voice/dictation-refine/examples.json", "utf8"));
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !FILLER.has(w));
const INDEX = EX.map((e) => ({ e, w: new Set(words(e.i)) }));
function nearest(t, k = 8) {
  const qs = new Set(words(t));
  const sc = INDEX.map(({ e, w }) => { let s = 0; for (const x of qs) if (w.has(x)) s += SHAPE.has(x) ? 3 : 1; return { e, s: s / Math.sqrt(w.size + 1) }; }).sort((a, b) => b.s - a.s);
  const out = [], per = {};
  for (const { e } of sc) { if ((per[e.c] || 0) >= 3) continue; per[e.c] = (per[e.c] || 0) + 1; out.push(e); if (out.length >= k) break; }
  return out;
}
function parse(csv) { const rows = []; let row = [], cell = "", q = false; for (let i = 0; i < csv.length; i++) { const c = csv[i]; if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows.slice(1).filter((r) => r.length >= 4); }
const rows = [...parse(fs.readFileSync("test.csv", "utf8")), ...parse(fs.readFileSync("test-lists.csv", "utf8"))];
const pick = rows.filter((_, i) => i % Math.ceil(rows.length / Number(n)) === 0);
let exact = 0; const ms = [];
for (const r of pick) {
  const messages = [{ role: "system", content: SYSTEM }];
  for (const s of nearest(r[2])) { messages.push({ role: "user", content: s.i }, { role: "assistant", content: JSON.stringify({ formatted: s.o }) }); }
  messages.push({ role: "user", content: r[2] });
  const t = Date.now();
  let res, tries = 0;
  do { res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages }) }); if (res.status === 429) await new Promise((z) => setTimeout(z, 4000)); } while (res.status === 429 && ++tries < 6);
  const d = await res.json(); ms.push(Date.now() - t);
  let got = ""; try { got = JSON.parse(d.choices[0].message.content).formatted.trim(); } catch {}
  if (got === r[3].trim()) exact++;
  await new Promise((z) => setTimeout(z, 1500));
}
ms.sort((a, b) => a - b);
console.log(`${model}: exact ${exact}/${pick.length} (${Math.round(100 * exact / pick.length)}%), median ${ms[ms.length >> 1]}ms`);
