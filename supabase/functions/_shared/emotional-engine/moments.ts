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
  { moment: "crisis", weight: 3, re: /\b(kill myself|end (it|my life)|suicid(e|al)|don'?t want to (be here|live|wake up)|no reason to live|life (isn'?t|is not) worth living|rather be dead|want to die|wish i (was|were) dead|self[-\s]?harm|hurt myself|harm myself|cut myself|can'?t (go on|keep going)|done with life)\b/i },

  // GRIEF — a death / permanent loss.
  { moment: "grief", weight: 3, re: /\b(passed away|died|death of|funeral|cremat(ed|ion)|lost (someone|a friend|a loved one)|lost my (mom|mum|dad|father|mother|brother|sister|son|daughter|grand\w+|friend|dog|cat|pet)|is gone forever|no longer with us)\b/i },

  // HEARTBREAK — a relationship ending.
  { moment: "heartbreak", weight: 3, re: /\b(broke up|breakup|broken up|dumped( me)?|she left me|he left me|they left me|ended things|got divorced|divorce|heart ?broken|my ex\b|got ghosted|ghosted me|rejected me|doesn'?t love me|don'?t love me back|situationship ended)\b/i },

  // ANXIETY / overwhelm.
  { moment: "anxiety", weight: 2, re: /\b(anxious|anxiety|panic(king|ked)?|panic attack|can'?t breathe|overwhelmed|overstimulated|can'?t cope|so stressed|stressed out|freaking out|terrified|scared (about|of)|dread(ing)?|nervous wreck|spiral(l?ing)?|everything is too much|too much to handle|falling apart|breaking down|i'?m not okay|not okay right now)\b/i },

  // CELEBRATION — a win.
  { moment: "celebration", weight: 2, re: /(\b(i|we) (got|landed|nailed|aced|shipped|launched|finished|passed|won|finally did)\b|got the job|got promoted|she said yes|we did it|so happy|best day|!!!+|🎉|🥳)/i },

  // CONFLICT — they want hard critique, or are pushing a claim to test.
  { moment: "conflict", weight: 1, re: /\b(be honest|brutal(ly)? honest|roast|tear (it|this) apart|what'?s wrong with|am i wrong|prove me wrong|devil'?s advocate|don'?t sugar ?coat|real(ly)? feedback|harsh)\b/i },

  // VENTING — needs to be heard.
  { moment: "venting", weight: 2, re: /\b(i (just )?need to vent|rant|so done|fed up|hate my (job|boss|life)|nobody (gets|understands|cares)|ugh|i'?m exhausted|burnt? out|nothing'?s working|nothing is working|i feel (alone|lonely|empty|sad|awful|terrible|bad|broken|lost|stuck|worthless|useless|unlovable|like a failure)|i'?m (alone|lonely|sad|depressed|tired of this|tired of everything|done with this)|i hate myself|i keep crying|can'?t stop crying|bad day|rough day|everything sucks|life sucks)\b/i },

  // BANTER — playful, casual.
  { moment: "banter", weight: 1, re: /\b(lol|lmao|haha+|joke|you'?re funny|roast me( for fun)?|just messing|bored|entertain me|say something funny)\b/i },

  // BUILDING — the user is shaping Braino himself: ideating features, reviewing what's new, asking
  // what to build next, or reflecting on their own work. Checked BEFORE focused_task so "build you"
  // doesn't get swallowed by the generic "build" action verb below.
  { moment: "building", weight: 1, re: /\b(what (else )?(can|should) i (add|build|do)|make you better|improve you|what'?s new (in|with) you|ideate|brainstorm|what'?s next|next feature|work(ed|ing)? on you|when did i last|what did i (build|ship|change)|how long (was|have) i|redesign you|design you|what if you (looked|could)|make you (dance|move|wave)|new look|new animation|a pose|mock ?up|whip up)\b/i },

  // FOCUSED TASK — they just want the thing done. Action verbs / code asks.
  { moment: "focused_task", weight: 1, re: /\b(fix|debug|refactor|write (me )?(a|the|some)|code|function|implement|build|summari[sz]e|translate|convert|generate|how do i|give me the|just (tell|show) me|tldr)\b/i },
];

// Which cue actually fired, for the breakdown UI. Empty when nothing matched.
export type CueHit = { moment: Moment; matched: string; weight: 1 | 2 | 3 };

export function detectMomentDetailed(text: string | null | undefined): MomentReading & { hits: CueHit[] } {
  const t = String(text || "").trim();
  if (!t) return { moment: "neutral", intensity: 1, hits: [] };

  const hits: CueHit[] = [];
  for (const cue of CUES) {
    const m = t.match(cue.re);
    if (m) hits.push({ moment: cue.moment, matched: m[0], weight: cue.weight });
  }
  if (!hits.length) return { moment: "neutral", intensity: 1, hits: [] };

  // Crisis is absolute: if any safety cue fired at all, it wins, full stop. That
  // stays a hard-coded word match on purpose, so a life-or-death moment never
  // depends on a model being reachable or in a good mood.
  const crisis = hits.find((h) => h.moment === "crisis");
  if (crisis) return { moment: "crisis", intensity: 3, hits };

  // Otherwise STRONGEST match wins, not first. "I got the job but I'm terrified"
  // used to land on whichever cue happened to be listed higher in the file; now
  // the heavier signal takes it, and ties fall back to declaration order.
  const best = hits.reduce((a, b) => (b.weight > a.weight ? b : a));
  return { moment: best.moment, intensity: best.weight, hits };
}

export function detectMoment(text: string | null | undefined): MomentReading {
  const { moment, intensity } = detectMomentDetailed(text);
  return { moment, intensity };
}

// Does a message that matched NO cue still look emotionally loaded? Used to decide
// whether it is worth one cheap model read to find the real moment. Deliberately
// cheap and conservative: "open gmail" must never trip this, because the whole point
// is that ordinary quick asks cost nothing extra.
const SELF_REFERENTIAL = /\b(i|i'?m|im|me|my|myself|we|our)\b/i;
const FEELING_SHAPED = /\b(feel|feeling|felt|been|lately|today|tonight|again|anymore|honestly|kind of|kinda|sort of|really|just)\b/i;
const ACTION_ONLY = /^\s*(open|play|search|find|go to|show|navigate|close|read|summari[sz]e|translate|convert|email|send|add|buy|book|check)\b/i;

export function looksEmotionallyLoaded(text: string | null | undefined): boolean {
  const t = String(text || "").trim();
  if (t.length < 12) return false;          // "hey", "ok", "yes"
  if (ACTION_ONLY.test(t)) return false;    // a command, not a feeling
  if (!SELF_REFERENTIAL.test(t)) return false;
  const words = t.split(/\s+/).length;
  return words >= 5 && (FEELING_SHAPED.test(t) || words >= 14);
}

// For each moment, the trait ids that should lead the response. The engine moves these to the
// front and adds a short steering line. Order within the array is the lead order.
export const MOMENT_EMPHASIS: Record<Moment, string[]> = {
  neutral: [], // nothing special — use the natural manifest order
  // Safety leads with attunement's playbook; authenticity sits right behind it so no clever
  // bot-lines creep into a crisis.
  crisis: ["attunement", "presence", "warmth", "authenticity"],
  // The rest of the high-emotion moments OPEN with authenticity (react like a friend, no
  // AI-tells), then fall into attunement's playbook.
  grief: ["authenticity", "attunement", "presence", "warmth"],
  heartbreak: ["authenticity", "attunement", "warmth", "presence"],
  venting: ["authenticity", "presence", "attunement", "warmth"],
  anxiety: ["authenticity", "attunement", "presence"],
  celebration: ["authenticity", "warmth", "humor"],
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
