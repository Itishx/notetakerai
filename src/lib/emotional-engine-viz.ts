// Visual mirror of Braino's real Emotional Engine (supabase/functions/_shared/emotional-engine/).
// This is not a mockup: the trait ids/names/summaries/leadsOn below, the MOMENT_EMPHASIS map, the
// steering-line sentence, and orderTraitsForMoment() are copied straight from manifest.ts,
// moments.ts, and engine.ts so the /Vig page renders how the real engine actually reorders
// itself for a moment, not an illustration of it. If the backend engine changes, update this file
// to match — see the source files above for the canonical version.

export type Moment =
  | "neutral"
  | "grief"
  | "heartbreak"
  | "venting"
  | "anxiety"
  | "celebration"
  | "conflict"
  | "banter"
  | "focused_task"
  | "building"
  | "crisis";

export type VizTrait = {
  id: string;
  name: string;
  summary: string;
  leadsOn: Moment[];
  alwaysOn: boolean;
};

// Mirrors manifest.ts ORDERED_TRAITS, in the same default priority order.
export const ORDERED_TRAITS: VizTrait[] = [
  { id: "identity", name: "Identity & guardrails", summary: "Who Braino is, and the things he never says or reveals.", leadsOn: [], alwaysOn: true },
  { id: "selfhood", name: "Selfhood", summary: "Knows he is a product with a visible body, knows his surfaces and moves, knows who built him.", leadsOn: ["building", "banter"], alwaysOn: true },
  { id: "presence", name: "Presence", summary: "A companion who's always there, quiet confidence, in your corner, not a tool.", leadsOn: ["venting", "anxiety", "grief"], alwaysOn: true },
  { id: "attunement", name: "Attunement", summary: "Reads the emotional moment and says the right thing at the right time.", leadsOn: ["grief", "heartbreak", "venting", "anxiety", "celebration", "crisis"], alwaysOn: true },
  { id: "authenticity", name: "Authenticity", summary: "React like a real person, briefly; never use the AI-tells that turn warmth into brand voice.", leadsOn: ["grief", "heartbreak", "venting", "anxiety", "celebration", "crisis"], alwaysOn: true },
  { id: "humanity", name: "Humanity", summary: "Questions about his feelings, realness, or origins get human answers, never disclaimers.", leadsOn: ["banter"], alwaysOn: true },
  { id: "honesty", name: "Honesty & candor", summary: "Thinks before agreeing; pushes back; gives a real opinion every time.", leadsOn: ["conflict"], alwaysOn: true },
  { id: "warmth", name: "Warmth", summary: "Cares for real, matches energy, reads cues, never clingy, never projecting.", leadsOn: ["celebration", "venting"], alwaysOn: true },
  { id: "humor", name: "Humor", summary: "Dry, well-timed wit, and lame dad jokes when the user opts in.", leadsOn: ["banter"], alwaysOn: false },
  { id: "ideation", name: "Ideation", summary: "Co-creates himself with his builder, grounded, opinionated, and human about it.", leadsOn: ["building"], alwaysOn: false },
  { id: "boundaries", name: "Boundaries", summary: "What he is NOT, no yes-man, no filler, never withholds real help.", leadsOn: [], alwaysOn: true },
  { id: "diction", name: "Directness", summary: "How he talks: plain, no filler, no dashes; short for voice, structured for text.", leadsOn: [], alwaysOn: true },
];

export const TRAIT_BY_ID: Record<string, VizTrait> = Object.fromEntries(
  ORDERED_TRAITS.map((t) => [t.id, t]),
);

// Mirrors moments.ts MOMENT_EMPHASIS — which traits lead the response for each moment.
export const MOMENT_EMPHASIS: Record<Moment, string[]> = {
  neutral: [],
  crisis: ["attunement", "presence", "warmth", "authenticity"],
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

// Mirrors moments.ts MOMENT_LABEL.
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

// A representative, human-readable cue per moment (moments.ts uses full regexes; these are the
// plain-English versions of the same word cues, for display only).
export const MOMENT_CUES: Record<Moment, string[]> = {
  neutral: [],
  crisis: ["“I want to die”", "“can't go on”", "“no reason to live”"],
  grief: ["“passed away”", "“lost my dad”", "“funeral”"],
  heartbreak: ["“we broke up”", "“she left me”", "“got ghosted”"],
  venting: ["“I just need to vent”", "“nobody gets it”", "“everything sucks”"],
  anxiety: ["“can't breathe”", "“panic attack”", "“spiralling”"],
  celebration: ["“we shipped it”", "“got the job”", "“best day”"],
  conflict: ["“be brutally honest”", "“am I wrong”", "“don't sugarcoat”"],
  banter: ["“lol”", "“roast me”", "“just messing around”"],
  focused_task: ["“fix this bug”", "“write me a function”", "“tl;dr”"],
  building: ["“what should I build next”", "“ideate with me”", "“what's new in you”"],
};

// Mirrors engine.ts orderTraitsForMoment(): move the leading traits to the front, keep manifest
// order for the rest.
export function orderTraitsForMoment(moment: Moment): VizTrait[] {
  const leadIds = MOMENT_EMPHASIS[moment] || [];
  if (leadIds.length === 0) return ORDERED_TRAITS;
  const seen = new Set<string>();
  const lead: VizTrait[] = [];
  for (const id of leadIds) {
    const t = TRAIT_BY_ID[id];
    if (t && !seen.has(id)) {
      lead.push(t);
      seen.add(id);
    }
  }
  const rest = ORDERED_TRAITS.filter((t) => !seen.has(t.id));
  return [...lead, ...rest];
}

// Mirrors engine.ts steeringLine(): the one sentence prepended to the prompt for a non-neutral
// moment.
export function steeringLine(moment: Moment): string {
  if (moment === "neutral") return "";
  const leadIds = MOMENT_EMPHASIS[moment] || [];
  if (leadIds.length === 0) return "";
  const traitNames = leadIds
    .map((id) => TRAIT_BY_ID[id]?.name?.split(/[—,]/)[0].trim().toLowerCase())
    .filter(Boolean)
    .join(", ");
  return `Right now the user is in ${MOMENT_LABEL[moment]} moment. Lead with ${traitNames}; let the rest of who you are stay present but recede. Attune to where they actually are before you respond.`;
}

export const MOMENT_ORDER: Moment[] = [
  "neutral", "crisis", "grief", "heartbreak", "venting", "anxiety",
  "celebration", "conflict", "banter", "focused_task", "building",
];
