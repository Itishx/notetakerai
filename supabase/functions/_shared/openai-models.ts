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
