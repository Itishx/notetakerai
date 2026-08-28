/* Who should do this: Braino, or Hermes?
 *
 * Asked, not matched. The whole 2026-08-27 run of failures came from keyword
 * lists deciding routing, and a list here would be the same mistake wearing a
 * new hat: the word "research" in a sentence does not mean the job needs an
 * agent, and a job that needs one often contains no special word at all.
 *
 * The question is NOT "is this hard". It is "does this need the user's own
 * screen". Braino is the one with hands on this Mac and this signed-in
 * browser. Hermes has neither, and no amount of capability changes that.
 */

const HERMES_ROUTING_PROMPT = `You decide who should do a job.

There are two workers.

BRAINO has hands on the user's own Mac. He can click, type, scroll, open apps,
play music, read files, and drive the browser the user is already signed into.
Anything that has to happen ON THEIR SCREEN, or in an account they are logged
into, or on this machine, is his and only his. He is also the fast one, so
quick answers and small jobs stay with him.

HERMES is a separate agent with its own memory, tools and skills. He has NO
access to the user's screen, browser session, or logged-in accounts. What he
has is depth and patience: he will work a problem across many steps and many
sources, and he remembers between sessions.

Answer with ONLY a JSON object. No prose, no code fences.

{ "who": "braino" | "hermes", "task": "", "why": "" }

Send it to HERMES when it needs no screen and does need depth or time:
- research across several sources, comparisons, market or competitor work
- long reasoning, planning, analysis, or writing something substantial
- writing code or working through a technical problem
- anything the user will want remembered and built on later

Keep it with BRAINO when:
- it touches this Mac, this screen, or a site the user is signed into
- it is booking, buying, posting, messaging, playing, opening or finding
- it is a quick question with a short answer
- you are not sure

"task" is the job written so it stands alone, with anything it refers to
spelled out, because Hermes cannot see the conversation. Leave it empty when
the answer is braino. "why" is one short clause.

If both apply, it is Braino: a job that needs the screen at any point cannot be
done by a worker without one.`;

function parseHermesRoute(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let parsed = null;
  const fenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  for (const candidate of [fenced, text]) {
    try { parsed = JSON.parse(candidate); break; } catch { /* try the next shape */ }
    const a = candidate.indexOf("{"), b = candidate.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try { parsed = JSON.parse(candidate.slice(a, b + 1)); break; } catch { /* not this one */ }
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const who = String(parsed.who || "").trim().toLowerCase();
  if (who !== "hermes" && who !== "braino") return null;
  const task = String(parsed.task || "").trim();
  /* Hermes cannot see the conversation, so a handover with nothing to hand
     over is not a handover. Falling back to Braino is always safe. */
  if (who === "hermes" && !task) return { who: "braino", task: "", why: "no self-contained task" };
  return { who, task, why: String(parsed.why || "").trim().slice(0, 120) };
}

module.exports = { HERMES_ROUTING_PROMPT, parseHermesRoute };
