// channel-writers/voice.ts — how the founder writes, learnt once, used by every writer.
//
// A voice is read from things they actually wrote (pasted samples, their sent
// emails) plus what they say about themselves. What they SAY about their voice
// outranks what was inferred, the same priority the X writer uses: a person
// knows who they are trying to sound like; old messages only show who they
// have been.

export type VoiceProfile = {
  summary?: string;              // two sentences: how they come across
  formality?: string;            // e.g. "casual", "warm professional"
  sentence_shape?: string;       // short and punchy, long and layered…
  openers?: string[];            // how they actually start messages
  sign_offs?: string[];          // how they actually end them
  signature_phrases?: string[];  // words and turns of phrase that are theirs
  language_mix?: string;         // e.g. "English with Hindi words (yaar, na)"
  punctuation?: string;          // lowercase starts, ellipses, emoji habits
  never?: string[];              // things they never do
  examples?: string[];           // 3-6 short verbatim lines that are unmistakably them
};

export const VOICE_EXTRACT_SYSTEM = `You study how one person writes, from things they wrote themselves, so other writers can sound exactly like them.

Return JSON only:
{
  "summary": "two plain sentences on how they come across in writing",
  "formality": "one phrase",
  "sentence_shape": "how long their sentences run and how they break lines",
  "openers": ["how they actually start messages, quoted or paraphrased closely"],
  "sign_offs": ["how they actually end them"],
  "signature_phrases": ["words or turns of phrase that are recognisably theirs"],
  "language_mix": "languages and slang they mix, or 'English only'",
  "punctuation": "capitals, emoji, exclamation marks, ellipses, lowercase habits",
  "never": ["things they never do in writing"],
  "examples": ["3-6 short verbatim lines from the samples that are unmistakably them"]
}

Describe what is actually in the samples. Do not flatter, do not invent habits, and quote rather than summarise wherever you can. If the person also described their own voice, include that, and where it conflicts with the samples, side with what they said.`;

/* The block every writer puts at the top of its prompt. */
export function voiceBlock(voice: VoiceProfile | null | undefined, selfDescribed?: string) {
  const has = voice && Object.keys(voice).length;
  if (!has && !selfDescribed) {
    return "# THE FOUNDER'S VOICE\nNot learnt yet. Write plainly, warmly and briefly, like a founder writing one message by hand. Do not imitate a marketing voice.";
  }
  const v = voice || {};
  const list = (xs?: string[]) => (xs && xs.length ? xs.map((x) => `"${x}"`).join(", ") : "");
  return [
    "# THE FOUNDER'S VOICE (write as them, not like a copywriter)",
    selfDescribed ? `What they said about how they write (highest authority): ${selfDescribed}` : "",
    v.summary ? `How they come across: ${v.summary}` : "",
    v.formality ? `Formality: ${v.formality}` : "",
    v.sentence_shape ? `Sentences: ${v.sentence_shape}` : "",
    list(v.openers) ? `They open with things like: ${list(v.openers)}` : "",
    list(v.sign_offs) ? `They sign off with: ${list(v.sign_offs)}` : "",
    list(v.signature_phrases) ? `Their words: ${list(v.signature_phrases)}` : "",
    v.language_mix ? `Language: ${v.language_mix}` : "",
    v.punctuation ? `Punctuation and habits: ${v.punctuation}` : "",
    list(v.never) ? `They never: ${list(v.never)}` : "",
    v.examples?.length ? `Lines that are unmistakably them (match the rhythm, never copy the content):\n${v.examples.map((e) => `- ${e}`).join("\n")}` : "",
    "Adapt the voice to the platform's rules below, but the person must stay recognisable on every platform.",
  ].filter(Boolean).join("\n");
}
