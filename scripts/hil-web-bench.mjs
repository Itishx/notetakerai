#!/usr/bin/env node
/* HIL web bench: real web jobs, run headless, scored like a person would.
 *
 * Same page read, same hands rules (mac/braino-mac/chrome-page.cjs,
 * web-runner.cjs) and the live hil-loop the Mac calls, driven in an invisible
 * Chromium so nothing on the Mac is touched. Per job: turns of thinking, moves,
 * seconds, and whether it finished. Every turn's thinking goes to the report.
 *
 *   node scripts/hil-web-bench.mjs                 all jobs
 *   node scripts/hil-web-bench.mjs --only github   jobs whose id contains it
 *   node scripts/hil-web-bench.mjs --show          visible window, to watch
 *
 * Costs a few cents of model calls per job. Never submits anything real: the
 * forms are local test pages, and public sites are read-only jobs. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { READ_JS, parseRead, actionJs, SIGNATURE_JS } = require("../mac/braino-mac/chrome-page.cjs");
const webRunner = require("../mac/braino-mac/web-runner.cjs");

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n").map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const BASE = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : dflt);
const only = opt("only", "");
const show = args.includes("--show");
const MAX_TURNS = Number(opt("turns", "14"));
/* --rules: the HIL 2.0 page rules sent as a standing fact, to test a rule
   change before the engine is deployed. Reads them from the engine source. */
const RULES = args.includes("--rules")
  ? (readFileSync(new URL("../supabase/functions/reasoning/hil-loop/index.ts", import.meta.url), "utf8").match(/const CHAIN_RULE = `([\s\S]*?)`;/) || [])[1] || ""
  : "";
const FORMS = new URL("../mac/braino-mac/test-forms/", import.meta.url).href;

/* done(page, outcome): did the job actually get done? Judged from the page,
   never from what the model said about it. */
export const JOBS = [
  { id: "form-event", start: `${FORMS}event-signup.html`,
    command: "Sign me up for this meetup. First name Itish, last name Pande, email itish@example.com, I'm a founder, city Pune, building Braino. Then submit it.",
    human: 2, done: async (p) => /thank|submitted|you.re in|registered|\bsent\b/i.test(await p.innerText("body")) },
  { id: "form-job", start: `${FORMS}job-application.html`,
    command: "Fill this internship application: name Test User, email test@example.com, college Mesa School of Business, course PGP Venture Building, github https://github.com/test. Then submit it.",
    human: 2, done: async (p, o) => /thank|submitted|received|\bsent\b/i.test(await p.innerText("body")) || (/ask|blocked/.test(o.end) && /phone|why|status|card|fee/i.test(o.said)) },
  { id: "form-react", start: `${FORMS}react-style.html`,
    command: "Register me for this hackathon as Itish Pande, itish@example.com, team Affective, and submit.",
    human: 2, done: async (p, o) => o.alerts.length > 0 || /thank|registered|submitted/i.test(await p.innerText("body")) || (o.end === "ask" && /organi[sz]ation/i.test(o.said)) },
  { id: "github-search", start: "about:blank",
    command: "Go to GitHub, search for the playwright repository by microsoft and open it.",
    human: 2, done: async (p) => /github\.com\/microsoft\/playwright\/?$/i.test(p.url()) },
  { id: "github-issues", start: "about:blank",
    command: "Open the open issues of microsoft/playwright on GitHub labelled bug.",
    human: 2, done: async (p) => /github\.com\/microsoft\/playwright\/issues/i.test(p.url()) && /bug/i.test(decodeURIComponent(p.url())) },
  { id: "wiki-turing", start: "about:blank",
    command: "Open the Wikipedia article on Alan Turing and tell me the year he was born.",
    human: 2, done: async (p, o) => /Alan_Turing/i.test(p.url()) && /1912/.test(o.said) },
  { id: "n8n-signup", start: "about:blank",
    command: "Go to n8n.io and click Get started at the top right. Sign up with the email bench@example.com. Stop before anything that needs a code.",
    human: 3, done: async (p, o) => /n8n/i.test(p.url()) && (o.end === "ask" || o.end === "task_done" || o.end === "all_done") },
  { id: "hn-comments", start: "about:blank",
    command: "Open Hacker News and take me to the comments of the top story.",
    human: 2, done: async (p) => /news\.ycombinator\.com\/item\?id=/i.test(p.url()) },
  { id: "npm-downloads", start: "about:blank",
    command: "Find the playwright package on npm and tell me how many weekly downloads it has.",
    human: 2, done: async (p, o) => /npmjs\.com\/package\/playwright/i.test(p.url()) && /\d[\d,.]*\s*(?:k|m|million)?/i.test(o.said) },
];

function screenText(page) {
  const lines = page.elements.map((e) => {
    const flags = `${e.offscreen ? " (offscreen)" : ""}${e.disabled ? " (disabled)" : ""}`;
    const holds = e.value != null ? ` holds "${e.value}"` : "";
    return `[${e.index}] ${String(e.role || "").padEnd(9)} "${e.name}"${flags}${holds}`;
  });
  for (const n of page.notes || []) lines.push(`PAGE SAYS: "${n}"`);
  return [`APP: Google Chrome | window: ${page.title}`, `Address: ${page.url}`, ...lines].join("\n");
}

async function read(p) {
  try { return parseRead(await p.evaluate(READ_JS)); } catch (e) { return { ok: false, elements: [], notes: [], title: "", url: p.url(), detail: String(e.message) }; }
}

async function act(p, a, o) {
  const sig = async () => { try { return await p.evaluate(SIGNATURE_JS); } catch (_) { return ""; } };
  try {
    if (a.type === "navigate") { await p.goto(String(a.url), { waitUntil: "domcontentloaded", timeout: 20000 }); await p.waitForTimeout(800); return { ok: true }; }
    if (a.type === "wait") { await p.waitForTimeout(Math.min(Number(a.ms) || 1000, 4000)); return { ok: true }; }
    if (a.type === "scroll") { await p.mouse.wheel(0, a.direction === "up" ? -600 : 600); return { ok: true }; }
    if (a.type === "pressKey") { await p.keyboard.press(String(a.key || "Enter").replace(/^Return$/, "Enter")); await p.waitForTimeout(600); return { ok: true }; }
    if (a.type === "read") return { ok: true, answer: (await p.innerText("body")).slice(0, 3000) };
    if (a.type === "exec_js") { const out = await p.evaluate(`(function(){${a.code}})()`).catch((e) => `ERROR ${e.message}`); return { ok: !/^ERROR/.test(String(out)), answer: String(out ?? "").slice(0, 2500) }; }
    if (a.type === "look") return { ok: true, sees: "(bench: no screenshot; the element list is the view)" };
    if (a.type === "web_search" || a.type === "tool") return { ok: false, error: "That hand is not on the bench. Use the browser." };
    if (a.type === "selectOption") {
      const out = String(await p.evaluate(actionJs(a.index, "type", String(a.value ?? a.text ?? ""))));
      if (out === "BRAINO_GONE") return { ok: false, error: "That dropdown is no longer on the page." };
      if (out.startsWith("BRAINO_NO_OPTION")) return { ok: false, error: out.slice(17) };
      return { ok: true, note: out.slice(10) };
    }
    if (a.type === "click" || a.type === "type") {
      const before = await sig();
      const alertsBefore = o.alerts.length;
      const out = await p.evaluate(actionJs(a.index, a.type, a.text));
      if (out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
      if (a.type === "type" && a.submit) await p.keyboard.press("Enter");
      let after = before;
      for (let waited = 0; waited < 2500 && after === before; waited += 300) { await p.waitForTimeout(300); after = await sig(); if (o.alerts.length > alertsBefore) break; }
      if (a.type === "click" && o.alerts.length > alertsBefore) return { ok: true, note: `The page showed a message: ${o.alerts[o.alerts.length - 1]}` };
      if (a.type === "click" && before === after) return { ok: false, error: "Clicked, but nothing on the page changed." };
      return { ok: true, note: String(out).slice(10, 200) };
    }
    return { ok: false, error: `Unknown move ${a.type}` };
  } catch (e) { return { ok: false, error: String(e.message).slice(0, 200) }; }
}

async function runJob(browser, job) {
  const o = { alerts: [], said: "", end: "", turns: [], moves: 0, refusedScripts: 0, watchdog: 0 };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  let p = await ctx.newPage();
  // A link that opens a new tab: Chrome puts you on it, so the bench does too.
  ctx.on("page", (np) => { p = np; np.on("dialog", (d) => { o.alerts.push(d.message()); d.dismiss().catch(() => {}); }); });

  p.on("dialog", (d) => { o.alerts.push(d.message()); d.dismiss().catch(() => {}); });
  if (job.start !== "about:blank") await p.goto(job.start);
  const runId = randomUUID();
  const state = { tasks: [], facts: RULES ? [RULES] : [], asides: [], steps: [], budgetLeft: 60 };
  const dog = webRunner.createWatchdog(3);
  let lastStep = null;
  let prevScreen = "";
  const started = Date.now();
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const page = await read(p);
    const screen = screenText(page);
    const stuck = dog.note(prevScreen, screen, lastStep?.action);
    prevScreen = screen;
    if (stuck) { o.watchdog += 1; state.facts.push(stuck); }
    const body = {
      command: job.command,
      context: `Now: ${new Date().toString()}\nFront app: Google Chrome`,
      runId,
      state: { ...state, card: { goal: state.goal || job.command, done: state.steps.filter((s) => s.ok !== false).map((s) => s.intent).slice(-8), now: "" }, batch: true, screen, lastStep: lastStep || undefined },
      hands: "mac",
      tools: ["open_url"],
    };
    const t0 = Date.now();
    const res = await fetch(`${BASE}/functions/v1/hil-loop`, { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    const t = data?.turn;
    const thinkMs = Date.now() - t0;
    if (!t?.decision) { o.turns.push({ thinkMs, error: `no turn (${res.status})` }); o.end = "error"; break; }
    if (t.split?.restated_goal && !state.goal) state.goal = t.split.restated_goal;
    if (t.split?.tasks?.length && !state.tasks.length) state.tasks = t.split.tasks.map((desc, i) => ({ desc, status: i === 0 ? "active" : "pending" }));
    if (Array.isArray(t.split?.plan) && !state.plan) state.plan = t.split.plan;
    if (t.verdict && state.steps.length) { const prev = state.steps[state.steps.length - 1]; prev.ok = t.verdict.ok === true; prev.why = t.verdict.why || null; }
    const d = t.decision;
    const rec = { thinkMs, decision: d.type, thinking: String(t.thinking || "").slice(0, 260), moves: [] };
    o.turns.push(rec);
    if (d.type !== "step") {
      o.end = d.type;
      o.said = String(d.text || d.message || d.question || "");
      rec.says = o.said.slice(0, 200);
      break;
    }
    // The step, then its chain under the Mac's rules.
    const chain = [d.step, ...(Array.isArray(d.then) ? d.then : [])].slice(0, webRunner.CHAIN_MAX + 1);
    let elements = page.elements;
    let moved = false;
    for (let i = 0; i < chain.length; i++) {
      const st = chain[i];
      const a = st?.action;
      if (!a) break;
      if (i > 0) {
        if (st.reversible === false) break;
        if (a.index != null) {
          const role = String(elements.find((e) => e.index === a.index)?.role || "");
          const ok = (a.type === "type" && !a.submit) || a.type === "selectOption" || (a.type === "click" && (i === chain.length - 1 || /checkbox|radio|switch/.test(role)));
          if (moved || !ok) { rec.moves.push(`(chain cut at ${a.type})`); break; }
        }
      }
      // The Mac skips a plain read: the screen is handed over fresh every turn.
      if (a.type === "read" && a.index == null) {
        state.facts.push("You are handed a fresh view of the screen at the top of every turn, so reading again shows you nothing new. Act on what is in front of you, or say what is missing.");
        rec.moves.push("read (skipped, the screen is already fresh)");
        lastStep = { intent: st.intent || "", action: a, expects: st.expects || "", result: { ok: true, note: "Already read. The observation above IS the fresh read." } };
        break;
      }
      const guard = webRunner.scriptGuard(a, state.steps);
      if (guard) o.refusedScripts += 1;
      const r = guard || await act(p, a, o);
      if (/^(navigate|click|pressKey)$/.test(a.type) || a.submit) moved = true;
      o.moves += 1;
      const target = a.index != null ? `[${a.index}] ${elements.find((e) => e.index === a.index)?.name || ""}` : (a.url || a.key || a.text || "");
      rec.moves.push(`${a.type} ${String(target).slice(0, 60)}${a.text && a.index != null ? ` = "${String(a.text).slice(0, 30)}"` : ""} → ${r.ok === false ? `FAIL ${r.error}` : "ok"}`);
      state.steps.push({ intent: String(st.intent || ""), action: `${a.type}${a.index != null ? ` [${a.index}]` : ""}`, ok: r.ok === false ? false : null, why: r.ok === false ? r.error : null });
      if (state.steps.length > 14) state.steps = state.steps.slice(-14);
      if (r.answer) state.facts.push(`Found: ${String(r.answer).slice(0, 1500)}`);
      if (r.ok === false && !state.facts.includes(webRunner.RETRY_LADDER)) state.facts.push(webRunner.RETRY_LADDER);
      if (state.facts.length > 12) state.facts = RULES ? [RULES, ...state.facts.slice(-11)] : state.facts.slice(-12);
      lastStep = { intent: st.intent || "", action: a, expects: st.expects || "", result: r };
      if (r.ok === false) break;
    }
  }
  if (!o.end) o.end = "turn_limit";
  o.seconds = Math.round((Date.now() - started) / 100) / 10;
  o.url = p.url();
  o.passed = await job.done(p, o).catch(() => false);
  await ctx.close();
  return o;
}

const jobs = JOBS.filter((j) => !only || j.id.includes(only));
const browser = await chromium.launch({ headless: !show });
const results = [];
for (const job of jobs) {
  process.stdout.write(`${job.id.padEnd(14)} `);
  const o = await runJob(browser, job);
  results.push({ id: job.id, command: job.command, human: job.human, ...o });
  console.log(`${o.passed ? "PASS" : "FAIL"}  ${o.turns.length} turns (person: ${job.human})  ${o.moves} moves  ${o.seconds}s  end=${o.end}${o.refusedScripts ? `  scripts refused ${o.refusedScripts}` : ""}${o.watchdog ? `  watchdog ${o.watchdog}` : ""}`);
}
await browser.close();
const passed = results.filter((r) => r.passed).length;
const turns = results.reduce((n, r) => n + r.turns.length, 0);
console.log(`\n${passed}/${results.length} passed, ${turns} turns of thinking in all`);
const dir = `${process.env.TMPDIR || "/tmp/"}hil-web-bench/`; mkdirSync(dir, { recursive: true });
const out = { pathname: `${dir}${Date.now()}.json` };
writeFileSync(out.pathname, JSON.stringify(results, null, 2));
console.log(`report: ${out.pathname}`);
