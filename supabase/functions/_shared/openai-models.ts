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

// The "Astra drives every turn" experiment lived here and is gone. It answered
// its question: 50x Luna's input price and 42x its output, six dollars in a day
// of testing, for judgement that four written rules recover most of. Everything
// it was actually worth is still here and is not Astra-shaped, because it was
// the endpoint and the prompt all along. Astra remains the rescue above, which
// is where it started. Git has the mode if the question ever needs asking again;
// a live switch that costs six dollars a day does not belong in a file people
// edit for other reasons.

// ── The fast lane for search ─────────────────────────────────────────────────
// A quick search is a lookup, not an essay, and it was being answered by the
// full model because the fast lane defaulted back to it whenever the env var
// was unset. Measured on the Mac that is nine to twenty three seconds per
// search, and a search sits between two Astra turns, so one lookup costs the
// better part of a minute of someone waiting.
//
// A named default rather than a fallback to the big model. An unset secret
// should cost a little quality, not the entire point of the setting, and the
// silent version of this has been shipping for weeks.
export const BRAINO_WEB_SEARCH_FAST_MODEL = "gpt-5.4-mini";
