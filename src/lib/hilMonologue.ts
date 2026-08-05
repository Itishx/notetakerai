// Braino's live thinking, in his own words: derived, not generated.
//
// Every sentence here comes from the exact same reasoning object the graph and the
// summary card render. There is no second model call producing a parallel narration
// that could say something different from what the graph shows: one source of truth,
// three views of it (monologue, graph, summary).

export type HilChecks = {
  vague_referent: boolean;
  unresolved_person: boolean;
  delivery_fork: boolean;
};

export type HilReasoning = {
  restated_goal: string;
  steps: string[];
  checks: HilChecks;
  ambiguous: boolean;
  clarifying_question: string | null;
  verdict: "proceed" | "ask";
  action: string;
  // Hardcoded server-side from a regex, never from the model: "who/what is this"
  // always means look at the screen. Stated here unconditionally, not derived
  // from restated_goal text, so the monologue can't drift from the guarantee.
  screen_referent: boolean;
};

export type HilMoment = { id: string; label: string; leads: string[]; intensity: number };

// The engine's own MOMENT_LABEL strings are written for its internal steering
// sentence and don't all survive being dropped into a different one ("a moment of
// real distress moment"). The moment id always reads fine built fresh, so that's
// what both the summary card and this monologue use.
function momentPhrase(id: string): string {
  const name = id.replace(/_/g, " ");
  return `${/^[aeiou]/.test(name) ? "an" : "a"} ${name} moment`;
}

const ORDINALS = ["First,", "Then", "After that,", "Next,", "Finally,"];

function planSentence(steps: string[]): string {
  if (!steps.length) return "";
  if (steps.length === 1) return steps[0].replace(/\.$/, "") + ".";
  const parts = steps.map((s, i) => {
    const word = i === steps.length - 1 ? "Finally," : ORDINALS[i] || "Then";
    const body = s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
    return `${word} ${body}`;
  });
  return parts.join(". ") + ".";
}

function checkSentences(checks: HilChecks): string[] {
  const out: string[] = [];
  if (checks.vague_referent) out.push("But something in there is a vague referent, a “this” or “that” I can't actually resolve.");
  if (checks.unresolved_person) out.push("There's a person named here, and I'm not confident which one they mean.");
  if (checks.delivery_fork) out.push("There are two genuinely different ways I could hand this back, and picking wrong wastes their time.");
  if (!out.length) out.push("None of that is actually unclear. This is safe to just go do.");
  return out;
}

// Four beats, matching the graph's four post-goal columns (goal, plan, checks,
// verdict) one for one — the SAME index that drives HilTraceGraph's litCols also
// reveals these, so the two views can never fall out of sync.
export function buildMonologue(moment: HilMoment, r: HilReasoning): string[][] {
  const beat1: string[] = [];
  // Hardcoded, said first, every time this fires: not a guess the model made,
  // a fact about the word "this" that never needs re-deriving.
  if (r.screen_referent) {
    beat1.push("They said \"this\" or \"that\". That always means one thing: I look at the screen first, no need to ask.");
  }
  if (moment.id !== "neutral") {
    const leads = moment.leads.length ? ` I'm leaning on ${moment.leads.join(", ")} before anything else.` : "";
    beat1.push(`They sound like they're in ${momentPhrase(moment.id)} right now.${leads}`);
  }
  beat1.push(`Okay, what do they actually want? ${r.restated_goal}`);

  const beat2: string[] = [`Here's how I'd get there. ${planSentence(r.steps)}`];

  const beat3: string[] = ["Before I move, let me check myself.", ...checkSentences(r.checks)];

  const beat4: string[] = r.verdict === "ask"
    ? [`That's enough real doubt that guessing isn't worth it. I'm going to ask: “${r.clarifying_question}”`]
    : [`Nothing's holding me back. ${r.action}`];

  return [beat1, beat2, beat3, beat4];
}
