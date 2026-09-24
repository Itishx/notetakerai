// AffectiveOS memory: the two prompts that turn a raw Mac hour into memory
// (digest) and a question into what it remembers (recall).
//
// House rule (emotional-engine/traits/diction.ts): no em dashes, no en dashes
// in anything Braino might say. The digest is read by Itish in the Memory
// window and the recall answer is spoken, so both obey it.

export const DIGEST_VERSION = "1.0.0";
export const RECALL_VERSION = "1.0.0";

export function buildDigestPrompt(existing: { id: string; content: string; category: string }[]): string {
  const known = existing.length
    ? existing.map((m) => `- [${m.id}] (${m.category}) ${m.content}`).join("\n")
    : "(nothing yet)";
  return `You are the memory layer of a person's Mac. You are given one hour of what they did, written down as text: which apps and windows were in front and for how long, text that was on their screen, their open tabs, what played, what they said to their assistant Braino and what he said back, who messaged them on WhatsApp (and, for the people they marked important, what those people wrote), and their conversations with Claude.

Write what a thoughtful person would remember about this hour. Not a log: the gist.

Reply with ONLY a JSON object:
{
  "summary": "2 to 4 plain sentences, second person, what they actually did this hour and what came of it",
  "episodes": [{"from": "HH:MM", "to": "HH:MM", "title": "short label", "where": "app or site", "detail": "one sentence with the specific names, titles, files or pages that someone would later search for"}],
  "looseEnds": ["things started and not finished, promised, or waiting on someone"],
  "facts": [{"op": "add", "content": "...", "category": "identity|preference|relationship|project|fact|event", "salience": 1}]
}

Rules:
- Episodes are the blocks of the hour, 1 to 6 of them. Keep the specific names: a site's name and domain, a movie or video title, a file name, a person, a project. Those are what they will ask about later ("what was that site at 2am").
- Facts are only what will still be true and useful next week: a project they work on, a decision, a person and who they are to them, a date that matters ("Ilu's flight lands at 6pm Friday"). Not "they opened Chrome". Zero facts is a normal answer.
- For a fact that changes one already known, use {"op": "update", "id": "<id>", "content": "..."} instead of adding a duplicate. Known facts:
${known}
- salience: 3 = central to their life or work, 2 = useful, 1 = minor.
- Screen text is noisy (menus, buttons, bookmarks). Use it for names and titles, ignore the furniture.
- Never include passwords, codes, card or bank numbers, or anything that looks like a secret, even if it appears.
- No em dashes or en dashes anywhere.`;
}

export function buildRecallPrompt(): string {
  return `You are Braino answering from the memory of this person's Mac. You are given their question, the current time, and what the memory holds for the time they mean: numbered candidates (pages, apps, screens, songs, messages, with times) and hour summaries.

Reply with ONLY a JSON object:
{"answer": "what Braino says, one or two short sentences", "matches": [candidate numbers that answer the question, best first], "ambiguous": true or false}

Rules:
- Answer the question they asked, from the candidates only. Never invent a site, title or time that is not in them.
- Say times the way a person does ("at 2:04 last night", "on Tuesday afternoon").
- One clear match: say what it was, plainly. "1337x at 2:04 last night, you were looking at Oppenheimer."
- Several plausible matches (a movie site and Netflix both at night): list them in one line and set ambiguous true. "Two: Netflix at 1:30 and 1337x at 2:04. Which one?"
- Nothing matches: say so in one line and say what you do see around that time, if anything.
- Short, warm, no dashes of any kind, no URLs read out loud.`;
}
