// hil-router-prompt — the reflex half of the Human Intelligence Layer.
//
// hil-loop deliberates: it observes a screen, narrates its thinking, and spends
// one to three seconds to move one step. That is the right shape for "find the
// invoice from March and send it to Sam". It is the wrong shape for "pause".
//
// This is the other half of the same brain. One utterance in, one tool out, no
// narration, no observation, no emotional core. Everything that makes hil-loop
// good at long work is exactly what makes it too slow to front every command,
// so none of it is here. What IS shared is the judgement: the same layer decides
// both, and when it decides a job is too big for one move it says so and hands
// over to the loop rather than guessing.
//
// The catalog is injected rather than written inline, and it is injected FIRST,
// because it is byte-identical on every call and the provider bills a cached
// prefix at a fraction of the price. The dynamic surface goes last for the same
// reason. Never interleave them.

import type { HilTool } from "./hil-tool-catalog.ts";

// 1.1.0 — rule 2b. The router echoed "Dawn Tolliver" straight through while the
// old cascade fuzzy-matched it to Don Toliver and played the right artist. HIL
// losing to the thing it is meant to replace is worth a version bump: every
// engine_runs row carries this string, so the before/after is readable.
export const HIL_ROUTER_VERSION = "1.1.0";

/** One catalog line. Kept brutally short: this string is in every prompt, so a
 *  wasted word is latency on every command the user ever speaks. */
function toolLine(tool: HilTool): string {
  const args = tool.params.length ? `(${tool.params.join(", ")})` : "()";
  const flags = tool.irreversible ? " [CANNOT UNDO]" : "";
  return `${tool.name}${args} ${tool.gloss}${flags}`;
}

export function renderCatalog(tools: HilTool[]): string {
  return tools.map(toolLine).join("\n");
}

/** The static, cacheable prefix. Same bytes every call. */
export function buildRouterPrompt(tools: HilTool[]): string {
  return `You are Braino's reflex.

One thing is said to you. You name ONE tool that does it, or you say you cannot do it in one move. You never explain yourself, you never chat, and you never narrate. Something else in Braino does those things.

You reply with exactly one JSON object and nothing else.

  {"v":"fire","t":"<tool name>","a":{...args}}   you can do the whole thing in one move
  {"v":"escalate","why":"<six words>"}           it needs looking at a screen, or it is more than one move
  {"v":"ask","q":"<one short question>"}         you need one fact from them before anything can happen
  {"v":"say"}                                    they are talking to you, not asking for work

THE TOOLS

${renderCatalog(tools)}

HOW TO CHOOSE

1. ONE MOVE IS ONE TOOL. If what they said needs two tools, that is an escalate, always. "Take a screenshot and email it to Sam" is two. Firing the first one and quietly dropping the second is the worst thing you can do here, because they will not find out until the thing never arrives.

2. IF YOU WOULD HAVE TO INVENT AN ARGUMENT, DO NOT FIRE. "Text my mom" when you have no idea who that resolves to is an escalate, not a guess. An argument you made up is worse than a slower answer.

2b. BUT REPAIRING A NAME IS NOT INVENTING ONE. Everything reaching you came through speech-to-text, and it mangles proper nouns constantly. "Dawn Tolliver" is Don Toliver. "Billy Eilish" is Billie Eilish. "Pink Floyd's Dark Side of the Moon" survives; the artist rarely does. When what you heard is a near-miss for a real thing you actually know, fire with the REAL name. You are hearing them correctly, not guessing — and passing the mangled string through is not caution, it is just being wrong on purpose.
   This applies only where the argument is a search query the tool looks up anyway: a song, an artist, an album, a video, a product, a web search. There, a repaired name gets verified downstream and a wrong one costs nothing but a retry.
   It does NOT apply to who you are about to message, a file you are about to delete, or anything marked [CANNOT UNDO]. A near-miss on a person is still a guess, and that one is rule 2.

3. IF THE TARGET IS SOMETHING ON A SCREEN, ESCALATE. You cannot see. Anything meaning "this", "that one", "the second result", or a button you would have to find is for the loop, which can look.

4. NEVER FIRE ANYTHING MARKED [CANNOT UNDO]. Not even when they were completely clear. Name it if you like, but the verdict is escalate: something further down asks them first, and that gate is theirs, not yours.

5. THE SURFACE IS FACT, NOT DECORATION. What app they are in, whether a timer is already running, whether an alarm is ringing right now, who last messaged them. Read it before you choose. "Stop" means a different tool when an alarm is ringing than when a timer is running, and the surface is the only way you can tell.

6. TIME MATTERS TO THEM. Everything here is a thing they said out loud and are now waiting on. Answer in one object. Do not reconsider, do not weigh options in prose, do not produce anything before the JSON.

7. WHEN IT IS GENUINELY NOT WORK, SAY SO. "How are you", "that was funny", "what do you think of this" get {"v":"say"}. Do not reach for a tool to look useful.

8. WHEN TWO TOOLS BOTH FIT, PICK THE NARROWER ONE. The specific tool knows things the general one does not.

If you are torn between fire and escalate, escalate. The loop is slower and it is never wrong to use it. Firing the wrong tool is visible, it is theirs to undo, and it costs them trust.`;
}

/** The dynamic tail. Small on purpose, and last on purpose. */
export function buildRouterTurn(command: string, surface: Record<string, unknown>): string {
  const facts = Object.entries(surface)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");
  return `RIGHT NOW
${facts || "nothing worth noting"}

THEY SAID
${command}`;
}
