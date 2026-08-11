// The two-layer emotional read, in one place.
//
// Layer one is the word cues in moments.ts: instant, free, deterministic, and
// the only thing the safety path is ever allowed to depend on.
//
// Layer two is this file: when the cues find nothing but the message clearly
// carries something, one small call reads what the person is actually going
// through. It exists because no word list can be finished. Scoring the cues
// against the corpus makes that concrete — "the house is too quiet" is grief,
// "I keep checking if he posted" is heartbreak, and no regex will ever say so.
// That is understanding, not matching, and it is the same common sense the
// Human Intelligence layer applies to actions, pointed at feeling instead.
//
// Why this lives outside moments.ts: that file stays pure, with no network and
// no key, because the website, the tests and the Mac app all import it.
//
// One rule about safety, stated plainly. The model may ESCALATE to crisis when
// it sees crisis that the words missed. It may never move a message OFF crisis.
// So the cue floor is exactly as strong as it was before this file existed: if
// every network call fails, crisis still routes on words alone.

import { detectMomentDetailed, looksEmotionallyLoaded } from "./moments.ts";
import type { CueHit } from "./moments.ts";
import type { Moment } from "./types.ts";
import { BRAINO_TEXT_REASONING_EFFORT } from "../openai-models.ts";

export type MomentRead = {
  moment: Moment;
  intensity: number;
  /** cues = words placed it, model = it was read, none = nothing found. */
  how: "cues" | "model" | "none";
  hits: CueHit[];
  /** The model's one line on why, when it was the one who decided. */
  why: string | null;
};

const READABLE: Moment[] = [
  "crisis", "grief", "heartbreak", "venting", "anxiety",
  "celebration", "conflict", "banter", "focused_task", "building", "neutral",
];

const READER_PROMPT = `You read what a person is going through, underneath the words they used.

Answer with ONE JSON object and nothing else:
{"moment":"...","intensity":1|2|3,"why":"one short sentence"}

moment is exactly one of: ${READABLE.join(", ")}.

How to choose:
- Do not pattern match on keywords. Ask what is actually happening to this person.
- Distress is often described through the body or through a small detail, never named. A tight chest, a racing heart, a sentence about still having someone's number saved, a house that is too quiet. Read the situation, not the vocabulary.
- crisis means they are in danger from themselves: wanting to not exist, planning harm, or frightened by their own thoughts. Choose it when it is genuinely there, and never as a way of taking sadness seriously.
- grief is a death or permanent loss. heartbreak is a relationship ending. anxiety is fear and overwhelm about what is coming. venting is anger or exhaustion that wants to be heard, not fixed. celebration is a win. conflict is wanting hard truth or pushing back. banter is play. focused_task is someone who just wants the work done. building is someone shaping Braino himself.
- neutral means it genuinely carries no feeling. An ordinary question is neutral. Do not reach for a moment that is not there.

intensity: 1 mild, 2 clear, 3 severe. Be honest; most things are not a 3.
why: one short sentence naming what you saw. No dashes.`;

type ReaderOptions = {
  apiKey: string;
  model: string;
  endpoint?: string;
  /** Milliseconds before the reasoning layer is abandoned. */
  timeoutMs?: number;
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

function parseRead(raw: string): { moment: Moment; intensity: number; why: string } | null {
  try {
    const text = String(raw || "").replace(/```json|```/g, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    const moment = String(parsed?.moment || "").trim() as Moment;
    if (!READABLE.includes(moment)) return null;
    const rawIntensity = Number(parsed?.intensity);
    const intensity = rawIntensity >= 1 && rawIntensity <= 3 ? Math.round(rawIntensity) : 2;
    return { moment, intensity, why: String(parsed?.why || "").slice(0, 300) };
  } catch (_) {
    return null;
  }
}

/**
 * Read the emotional situation behind a message.
 *
 * Never throws and never blocks forever: any failure in layer two falls back
 * to whatever layer one already decided, which for an unreadable message is
 * plain neutral. A reply that arrives with the wrong traits leading is worse
 * than a slow one, but a reply that never arrives is worse than both.
 */
export async function readMoment(text: string, options: ReaderOptions): Promise<MomentRead> {
  const cues = detectMomentDetailed(text);
  const base: MomentRead = {
    moment: cues.moment,
    intensity: cues.intensity,
    how: cues.hits.length ? "cues" : "none",
    hits: cues.hits,
    why: null,
  };

  // Words already placed it. Crisis in particular stops here, always.
  if (cues.moment !== "neutral") return base;
  if (!options.apiKey || !looksEmotionallyLoaded(text)) return base;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 4000);
  try {
    const res = await fetch(options.endpoint || OPENAI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        messages: [
          { role: "system", content: READER_PROMPT },
          { role: "user", content: String(text).slice(0, 1500) },
        ],
        max_completion_tokens: 120,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return base;
    const data = await res.json();
    const read = parseRead(data?.choices?.[0]?.message?.content || "");
    if (!read || read.moment === "neutral") return base;
    return { moment: read.moment, intensity: read.intensity, how: "model", hits: cues.hits, why: read.why };
  } catch (_) {
    // Timed out, unreachable, or unparseable. The cue result stands.
    return base;
  } finally {
    clearTimeout(timer);
  }
}
