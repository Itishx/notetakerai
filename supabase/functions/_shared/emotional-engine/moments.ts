// Emotional Engine — moment routing. This is the "which traits lead?" brain.
//
// detectMoment() reads the user's message and labels the emotional situation using plain word
// cues — NO extra AI call, no latency, no cost. It mirrors how the extension's __sbDetectIntent
// already routes tasks, just for feeling instead of action.
//
// MOMENT_EMPHASIS says, for each moment, which traits should move to the front of Braino's mind.
// The engine reads both of these. If you want Braino to handle a situation differently, you edit
// the cues here and/or the emphasis list — you never touch the trait prose.

import type { Moment, MomentReading } from "./types.ts";

// Ordered most-urgent / most-specific first. The first match wins, so safety beats everything.
const CUES: Array<{ moment: Moment; re: RegExp; weight: 1 | 2 | 3 }> = [
  // CRISIS / safety — check first, always. Kept deliberately conservative.
  { moment: "crisis", weight: 3, re: /\b(kill myself|end (it|my life)|suicid(e|al)|don'?t want to (be here|live|wake up)|no reason to live|self[-\s]?harm|hurt myself|want to die)\b/i },

  // GRIEF — a death / permanent loss.
  { moment: "grief", weight: 3, re: /\b(passed away|died|death of|funeral|lost my (mom|mum|dad|father|mother|brother|sister|son|daughter|grand\w+|friend|dog|cat|pet))\b/i },

  // HEARTBREAK — a relationship ending.
  { moment: "heartbreak", weight: 3, re: /\b(broke up|breakup|broken up|dumped( me)?|she left me|he left me|they left me|ended things|got divorced|divorce|heart ?broken|my ex\b)\b/i },

  // ANXIETY / overwhelm.
  { moment: "anxiety", weight: 2, re: /\b(anxious|anxiety|panic(king|ked)?|overwhelmed|can'?t cope|so stressed|freaking out|terrified|scared (about|of)|dread(ing)?|nervous wreck|spiral(l?ing)?)\b/i },

  // CELEBRATION — a win.
  { moment: "celebration", weight: 2, re: /(\b(i|we) (got|landed|nailed|aced|shipped|launched|finished|passed|won|finally did)\b|got the job|got promoted|she said yes|we did it|so happy|best day|!!!+|🎉|🥳)/i },

  // CONFLICT — they want hard critique, or are pushing a claim to test.
  { moment: "conflict", weight: 1, re: /\b(be honest|brutal(ly)? honest|roast|tear (it|this) apart|what'?s wrong with|am i wrong|prove me wrong|devil'?s advocate|don'?t sugar ?coat|real(ly)? feedback|harsh)\b/i },

  // VENTING — needs to be heard.
  { moment: "venting", weight: 1, re: /\b(i (just )?need to vent|rant|so done|fed up|hate my (job|boss|life)|nobody (gets|understands)|ugh|i'?m exhausted|burnt? out|nothing'?s working)\b/i },

  // BANTER — playful, casual.
  { moment: "banter", weight: 1, re: /\b(lol|lmao|haha+|joke|you'?re funny|roast me( for fun)?|just messing|bored|entertain me|say something funny)\b/i },

  // BUILDING — the user is shaping Braino himself: ideating features, reviewing what's new, asking
  // what to build next, or reflecting on their own work. Checked BEFORE focused_task so "build you"
  // doesn't get swallowed by the generic "build" action verb below.
  { moment: "building", weight: 1, re: /\b(what (else )?(can|should) i (add|build|do)|make you better|improve you|what'?s new (in|with) you|ideate|brainstorm|what'?s next|next feature|work(ed|ing)? on you|when did i last|what did i (build|ship|change)|how long (was|have) i|redesign you|design you|what if you (looked|could)|make you (dance|move|wave)|new look|new animation|a pose|mock ?up|whip up)\b/i },

  // FOCUSED TASK — they just want the thing done. Action verbs / code asks.
  { moment: "focused_task", weight: 1, re: /\b(fix|debug|refactor|write (me )?(a|the|some)|code|function|implement|build|summari[sz]e|translate|convert|generate|how do i|give me the|just (tell|show) me|tldr)\b/i },
];

export function detectMoment(text: string | null | undefined): MomentReading {
  const t = String(text || "").trim();
  if (!t) return { moment: "neutral", intensity: 1 };

  for (const cue of CUES) {
    if (cue.re.test(t)) {
      return { moment: cue.moment, intensity: cue.weight };
    }
  }
  return { moment: "neutral", intensity: 1 };
}

// For each moment, the trait ids that should lead the response. The engine moves these to the
// front and adds a short steering line. Order within the array is the lead order.
export const MOMENT_EMPHASIS: Record<Moment, string[]> = {
  neutral: [], // nothing special — use the natural manifest order
  crisis: ["attunement", "presence", "warmth"],
  grief: ["attunement", "presence", "warmth"],
  heartbreak: ["attunement", "warmth", "presence"],
  venting: ["presence", "attunement", "warmth"],
  anxiety: ["attunement", "presence"],
  celebration: ["warmth", "humor"],
  conflict: ["honesty", "boundaries"],
  banter: ["humor", "warmth"],
  focused_task: ["boundaries", "diction"],
  building: ["ideation", "honesty", "warmth"],
};

// A short, human label for each moment — used in the steering line the engine prepends.
export const MOMENT_LABEL: Record<Moment, string> = {
  neutral: "an ordinary",
  crisis: "a moment of real distress",
  grief: "grief",
  heartbreak: "heartbreak",
  venting: "a venting",
  anxiety: "an anxious",
  celebration: "a celebratory",
  conflict: "a give-it-to-me-straight",
  banter: "a playful",
  focused_task: "a just-get-it-done",
  building: "a let's-build-you-together",
};
