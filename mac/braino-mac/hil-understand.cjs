/* What did they just say?
 *
 * The question every one of the 2026-08-27 failures came down to, and the one
 * thing that was never asked. A word list decided it instead: "book" was not in
 * it, so booking tickets was small talk; "meeting" was in it, so opening Google
 * Meet was the meeting recorder. Each miss is a word somebody forgot, and there
 * is always another word.
 *
 * A person does not do this. Asked "how are you, and could you grab that coffee
 * from the table", they answer the question AND fetch the coffee, because they
 * understood a sentence rather than matched it. Asked to stop halfway, they
 * stop. Told "it's the first one" while working, they fold it into what they
 * are already doing instead of starting a conversation about it.
 *
 * So this asks. It is deliberately not a vocabulary, and nothing in here should
 * ever become one: the moment a verb gets hardcoded, the class of bug is back.
 */

const UNDERSTAND_PROMPT = `You work out what a person just said to Braino, an assistant that can drive a Mac and a browser.

Answer with ONLY a JSON object. No prose, no code fences.

{
  "kind": "chat" | "task" | "chat_and_task" | "correction" | "addition" | "stop",
  "reply": "",
  "task": ""
}

WHEN BRAINO IS NOT WORKING ON ANYTHING, use one of:
- "chat"          they are talking to him. No job in it.
- "task"          they want something done.
- "chat_and_task" both in one breath. "How are you, and grab me that coffee."
                  Put the job in "task" and leave "reply" empty; he answers the
                  conversational half himself.

WHEN BRAINO IS ALREADY WORKING ON A JOB, use one of:
- "correction"    they are fixing something about the job in progress.
                  "It's the first one." "No, the other cinema." "I said 4pm."
- "addition"      they are adding to the job. "Also book the late show."
- "stop"          they want him to stop. Any way a person says it, including
                  "leave it", "forget it", "that's enough", "no no no".
- "chat"          they said something that is not about the job at all.
- "task"          they want a DIFFERENT job done, replacing this one.

"task" must be a self-contained instruction that makes sense on its own, with
anything it refers to spelled out. If they said "PVR Atrium anytime after 4pm"
after asking for movie tickets, the task is the whole booking, not the fragment.
For "correction" and "addition", put what they said, in plain words, in "task".
For "chat" and "stop", leave "task" empty.

Judge what they MEANT, not which words they used. There is no list of task
words. "Book my show" is a job. "How's it going" is not. A person can tell.`;

/* Tolerant on the way in, strict on the way out.
 *
 * A model that returns prose around its JSON, or a fenced block, is still
 * telling you the answer. Refusing it and falling back to a word list would be
 * choosing the worse answer on a technicality. */
function parseUnderstanding(raw, options = {}) {
  const running = Boolean(options.running);
  const text = String(raw || "").trim();
  if (!text) return null;
  let parsed = null;
  const fenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  for (const candidate of [fenced, text]) {
    try { parsed = JSON.parse(candidate); break; } catch { /* try the next shape */ }
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(candidate.slice(start, end + 1)); break; } catch { /* not this one */ }
    }
  }
  if (!parsed || typeof parsed !== "object") return null;

  const IDLE = new Set(["chat", "task", "chat_and_task"]);
  const RUNNING = new Set(["chat", "task", "correction", "addition", "stop"]);
  const allowed = running ? RUNNING : IDLE;
  let kind = String(parsed.kind || "").trim().toLowerCase();
  /* A kind that belongs to the other situation is a real answer given in the
     wrong shape. chat_and_task while working is an addition; a correction with
     nothing running is just a task. Coerce rather than discard. */
  if (!allowed.has(kind)) {
    if (running && kind === "chat_and_task") kind = "addition";
    else if (!running && (kind === "correction" || kind === "addition")) kind = "task";
    else if (!running && kind === "stop") kind = "chat";
    else return null;
  }
  const task = String(parsed.task || "").trim();
  /* A job with nothing in it is not a job. Saying so here keeps every caller
     from having to check. */
  if ((kind === "task" || kind === "chat_and_task" || kind === "correction" || kind === "addition") && !task) {
    return kind === "correction" || kind === "addition" ? null : { kind: "chat", task: "" };
  }
  return { kind, task };
}

module.exports = { UNDERSTAND_PROMPT, parseUnderstanding };
