// Scores a cleanup endpoint on test.csv. Usage: node eval.mjs <label> [functionName]
import fs from "node:fs";
const [label = "baseline", fn = "dictation-refine", mode = "", model = ""] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync("../../.env", "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const url = `https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/${fn}`;
function parse(csv) {
  const out = []; let row = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const [h, ...rs] = out; return rs.filter((r) => r.length >= 4).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const rows = parse(fs.readFileSync(process.env.TEST || "test.csv", "utf8"));
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const loose = (s) => norm(s).toLowerCase().replace(/[.!?,]+$/, "");
const results = []; let i = 0;
async function worker() {
  while (i < rows.length) {
    const r = rows[i++];
    let got = "", ms = 0;
    for (let a = 0; a < 3 && !got; a++) {
      try {
        const t = Date.now();
        const res = await fetch(url, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ transcript: r.input, ...(mode ? { mode } : {}), ...(model ? { model, eval: true } : {}) }) });
        const d = await res.json(); got = d.formatted || ""; ms = Date.now() - t;
      } catch (_) {}
    }
    results.push({ ...r, got, ms, exact: norm(got) === norm(r.output), close: loose(got) === loose(r.output) });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const by = {};
for (const r of results) { by[r.category] ||= { n: 0, exact: 0, close: 0 }; by[r.category].n++; by[r.category].exact += r.exact; by[r.category].close += r.close; }
const tot = results.reduce((a, r) => ({ n: a.n + 1, exact: a.exact + r.exact, close: a.close + r.close }), { n: 0, exact: 0, close: 0 });
const ms = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(`${label}: exact ${tot.exact}/${tot.n} (${Math.round(100 * tot.exact / tot.n)}%), near ${Math.round(100 * tot.close / tot.n)}%, median ${ms[ms.length >> 1]}ms`);
for (const [c, v] of Object.entries(by).sort()) console.log(`  ${c.padEnd(18)} ${String(Math.round(100 * v.exact / v.n)).padStart(3)}% exact  (${v.exact}/${v.n})`);
fs.writeFileSync(`results-${label}.json`, JSON.stringify(results, null, 1));
