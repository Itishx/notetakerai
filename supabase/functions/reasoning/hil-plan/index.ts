// hil-plan: think once, then the hands run.
//
// The loop decides one action, looks, decides the next: 5 to 8 seconds of
// model per step, which is why "start a Meet and send the link to Ilu" took
// 40 to 90 seconds. This asks the model ONCE for the whole plan, as concrete
// tool calls, and the Mac runs them back to back. The model is only asked
// again if a step fails. A job that genuinely has to look at the screen and
// find things returns mode "loop", and goes to the loop as before.
//
// Nothing about the command is stored; engine_runs gets a row like every
// other HIL engine (command and plan), because tuning needs the plans.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HIL_TOOL_CATALOG } from "../../_shared/human-intelligence/hil-tool-catalog.ts";
import { renderCatalog } from "../../_shared/human-intelligence/hil-router-prompt.ts";
import { HIL_USE_CASES } from "../../_shared/human-intelligence/use-cases.ts";
import { logEngineRun } from "../../_shared/engine-log.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

export const HIL_PLAN_VERSION = "1.0.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

/* Hands the Mac has that are not in the catalog: small, instant, and exactly
   what plans are made of. */
const EXTRA = `current_tab_url() The address of the tab in front, as the step's value
wait_for_url(contains, timeoutMs) Wait until the front tab's address contains the text, value is the address
press_keys(keys) A keyboard shortcut in the front app, e.g. "cmd+shift+n", "down", "cmd+w"
wait(ms) Pause, only when a page must load
page_link(nth, kind) The link of a result on the page in front, read from the page itself (no looking): nth 1 = first, 2 = second, -1 = last; kind "photo", "video" or "any". Value is the link. Use it for "the first photo", "the second video", "the top result"`;

function prompt(tools: string): string {
  return `You are the planning half of Braino's Human Intelligence Layer, on a Mac. You get one spoken command and the context. You write the WHOLE plan now, as tool calls the Mac will run one after another without asking you again. Think here, once; after this the hands just execute.

Reply with ONLY a JSON object:
{"mode": "plan" | "loop", "why": "six words", "steps": [{"tool": "<name>", "args": {...}}], "done": "what Braino says when it worked, short and warm, no dashes"}

Rules:
- mode "plan" when every step is a tool below with arguments you already know or that an earlier step produces. Most jobs are this.
- mode "loop" ONLY when the job needs looking at a screen to find something you cannot name in advance (click "the red button", "the second result", fill this form, pick from what is on screen). Then steps is [].
- An argument can use an earlier step's result: "{{1}}" is step 1's value, "{{last}}" the previous step's. Values come from current_tab_url, wait_for_url, now_playing, spotify_now_playing, and any tool that reads something.
- Prefer the direct address over clicking: a new Google Meet is open_url "https://meet.new" then wait_for_url contains "meet.google.com/" (its value is the link). A new Google Doc is "https://docs.new". Instagram reels "https://www.instagram.com/reels/".
- WhatsApp goes through whatsapp_send with recipientRaw and message. Never WhatsApp Web.
- Keep plans short: the fewest steps that finish the job. No reading or checking steps that nothing uses.
- "done" is spoken: one short line, like "Sent Ilu the Meet link." Never read a URL out loud.
- "done" is said AFTER the steps have run, as the result. Never a promise ("I'll check", "Let me look"). If the last step finds an answer, Braino says that answer instead.
${HIL_USE_CASES}
TOOLS
${tools}
${EXTRA}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { command, context, tools } = await req.json();
    const text = String(command || "").trim();
    if (!text) return json({ error: "no command" }, 400);
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "no model key" }, 500);
    const have = new Set(Array.isArray(tools) ? tools.map(String) : []);
    const catalog = renderCatalog(have.size ? HIL_TOOL_CATALOG.filter((t) => have.has(t.name)) : HIL_TOOL_CATALOG);
    const started = Date.now();
    /* Fixed instructions, cached under one name for 24h; sent again without the
       cache fields if the API ever refuses them. */
    const planBody = (cache: boolean) => JSON.stringify({
        ...(cache ? { prompt_cache_key: "braino-hil-plan", prompt_cache_retention: "24h" } : {}),
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        max_completion_tokens: 900,
        messages: [
          { role: "system", content: prompt(catalog) },
          { role: "user", content: `${String(context || "").slice(0, 3000)}\n\nThey said: ${text}` },
        ],
      });
    let ai = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: planBody(true) });
    if (ai.status === 400 && /prompt_cache/i.test(await ai.clone().text().catch(() => ""))) {
      ai = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: planBody(false) });
    }
    if (!ai.ok) return json({ error: `model ${ai.status}` }, 502);
    const payload = await ai.json();
    let out: any = {};
    try { out = JSON.parse(payload?.choices?.[0]?.message?.content || "{}"); } catch (_) { out = {}; }
    const steps = (Array.isArray(out.steps) ? out.steps : []).slice(0, 10)
      .map((s: any) => ({ tool: String(s?.tool || "").trim(), args: s?.args && typeof s.args === "object" ? s.args : {} }))
      .filter((s: any) => s.tool);
    const plan = {
      mode: out.mode === "plan" && steps.length ? "plan" : "loop",
      why: String(out.why || "").slice(0, 80),
      steps,
      done: String(out.done || "Done.").replace(/[–—]/g, ", ").slice(0, 200),
    };
    logEngineRun({
      engine: "hil-router", command: text, response: { plan }, verdict: `plan:${plan.mode}:${steps.length}`,
      model: BRAINO_TEXT_MODEL, usage: payload?.usage ?? null, elapsed_ms: Date.now() - started, ok: true,
      prompt_version: `hil-plan ${HIL_PLAN_VERSION}`,
    });
    return json({ plan, ms: Date.now() - started, version: HIL_PLAN_VERSION });
  } catch (error) {
    return json({ error: (error as Error)?.message || "hil-plan failed" }, 500);
  }
});
