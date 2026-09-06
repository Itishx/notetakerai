// One text-and-vision default for every Braino surface backed by an Edge Function.
// Purpose-built realtime, transcription, TTS, embedding, and moderation models stay
// separate because this model cannot replace those API contracts.
export const BRAINO_TEXT_MODEL = "gpt-5.6-luna";

// GPT-5.4 Mini effectively ran without reasoning. GPT-5.6 defaults to medium,
// so callers moving to Luna must send this explicitly to preserve latency and cost.
export const BRAINO_TEXT_REASONING_EFFORT = "none" as const;

// ── The rescue model ─────────────────────────────────────────────────────────
// Astra is not a second brain, it is the same loop with a better thinker behind
// it for the turns HIL could not get through. It is only ever reached by the
// escalation path in hilLoopEngine, never by a caller asking for it, because a
// public endpoint that lets you pick the expensive model is a bill waiting to
// happen.
export const BRAINO_RESCUE_MODEL = "gpt-6-astra";

// Astra's effort scale is low | medium | high | xhigh | max, and it has no
// "none". Sending BRAINO_TEXT_REASONING_EFFORT here would be rejected by the
// API, which is exactly the kind of failure that only shows up on the first
// real rescue, so the two constants stay separate on purpose.
//
// medium, not high: output is billed at $50/M against $10/M for input, so the
// thinking is the expensive half of a rescue. A stuck loop needs better
// judgement about ONE next action, not a research project.
export const BRAINO_RESCUE_REASONING_EFFORT = "medium" as const;

// Reasoning tokens are billed and counted as completion, so a ceiling sized for
// a non-reasoning model can be swallowed whole by the thinking and leave no room
// for the JSON. The turn then comes back empty and reads exactly like a broken
// model. Roomier than the standard loop for that reason alone.
export const BRAINO_RESCUE_MAX_TOKENS = 6000;

// ── Which brain drives ───────────────────────────────────────────────────────
// "hil"   — he thinks, and Astra is called in only when he gets stuck.
// "astra" — Astra thinks on every turn and he never touches the wheel.
//
// This branch runs "astra" on purpose, to find out how good the ceiling actually
// is when nothing cheap is in the way. It is an experiment, not a default, and
// the two numbers that decide whether it survives are both worse than his:
// roughly 5.5s a turn against 1.7s, and roughly a dollar a task against cents.
//
// Read once here rather than per call so both surfaces that share hil-loop, the
// lab and the extension's delegate, can never disagree about who is driving.
export const BRAINO_BRAIN: "hil" | "astra" = "astra";

// Effort is the cost dial, and it is set differently for the two modes on
// purpose. A rescue is one hard judgement after a wall, and worth medium. Every
// turn of an ordinary run is not: most of them are "click the obvious button",
// and paying medium reasoning for those is how a task that should cost cents
// costs a dollar. Low is the default when Astra drives everything.
export const BRAINO_ASTRA_ALL_REASONING_EFFORT = "low" as const;
