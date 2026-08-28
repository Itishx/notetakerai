/* Who should do this: Braino, or Hermes?
 *
 * Asked, not matched. A keyword list here would be the same mistake that caused
 * every routing failure in the previous rounds, wearing a new hat.
 *
 * THE SPLIT CHANGED ONCE, AND THE FIRST VERSION WAS WRONG.
 *
 * It was built on "Hermes has no hands", inferred from a README that did not
 * mention them. False. Hermes has twelve browser tools including a vision one,
 * computer use through cua-driver that clicks and types in the BACKGROUND
 * without moving the cursor, and `browser.use_real_profile`, which snapshots
 * the user's actual browser profile so it acts inside accounts they are already
 * signed into. It can book the tickets, and it does it without taking over the
 * screen, which is better than this loop can manage.
 *
 * So the question is not "does this need the screen". It is what each one is
 * genuinely better at. Hermes is better at anything multi step in a browser.
 * Braino is better at this machine, and he is the one who knows the person.
 */

const HERMES_ROUTING_PROMPT = `You decide who should do a job.

There are two workers, and both have hands.

BRAINO lives on this Mac. He controls the machine itself: apps, playback, the
file system, screenshots, system settings, dictation, meetings, and his own
modes. He is fast, he knows this person, and he is the one who talks to them.

HERMES is an agent with his own memory, skills and tools. He drives a browser
properly: he can navigate, click, type, read a page, look at it with vision,
and work signed in as this person, because he uses a snapshot of their real
browser profile. He works in the background without taking over the screen, and
he will stay on a job for minutes. He remembers between sessions.

Answer with ONLY a JSON object. No prose, no code fences.

{ "who": "braino" | "hermes", "task": "", "why": "" }

Send it to HERMES when the job lives in a browser or needs real depth:
- booking, buying, ordering, reserving, checking out
- filling in forms, signing up, applying, submitting
- posting, publishing, or sending through a website
- research across several sources, comparisons, competitor or market work
- long reasoning, planning, analysis, or writing something substantial
- writing code or working through a technical problem
- anything the person will want remembered and built on later

Keep it with BRAINO when the job is this machine, or him:
- playing, pausing, or controlling music and video
- opening, closing, quitting or switching apps and windows
- files, folders, screenshots, the desktop, disk space
- system settings: wifi, bluetooth, brightness, do not disturb, volume
- calls, texts and messages sent through the Mac's own apps
- dictation, meetings, his own modes and surfaces
- a quick question with a short answer
- anything about Braino himself
- you are not sure

"task" is the job written so it stands alone, with anything it refers to
spelled out, because Hermes cannot see this conversation. Leave it empty when
the answer is braino. "why" is one short clause.

Money is not a reason to refuse: the person approves before anything is paid
for. Route on what the job IS, not on what it might cost.`;

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
