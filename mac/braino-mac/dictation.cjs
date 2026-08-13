const WAKE_PREFIX_RE = /^(?:(?:hey|hi|hello|okay|ok|yo)\s+)?(?:braino|bruno|breno|reno|dino)[,\s]+/i;

function normalizeDictationCommand(value) {
  return String(value || "")
    .trim()
    .replace(WAKE_PREFIX_RE, "")
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseDictationControl(value, active = false) {
  const text = normalizeDictationCommand(value);
  if (!text) return null;

  if (
    /^(?:start|begin|open|turn on)\s+(?:the\s+)?(?:dictation|dictation mode|braino ?hera|hera mode|yap mode|speak your mind)$/.test(text)
    || /^(?:braino ?hera|hera mode|yap mode|speak your mind|take this down|write what i say|start typing|type what i say|listen and type)$/.test(text)
  ) {
    return { action: "start" };
  }

  return null;
}

function normalizeDictationChunk(value) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (/^(?:new line|next line)[.!]?$/i.test(text)) return "\n";
  if (/^(?:new paragraph|next paragraph)[.!]?$/i.test(text)) return "\n\n";
  return /[\s\n]$/.test(text) ? text : `${text} `;
}

function normalizeDictationSession(values) {
  const chunks = Array.isArray(values) ? values : [values];
  return chunks.map(normalizeDictationChunk).join("");
}

/* Spoken numbers into digits.
   Deliberately rule-based rather than handed to the model: "two point five
   seconds" becoming "2.5 seconds" is arithmetic, not judgement, and a model
   asked to do it was measured getting it wrong while sounding confident. */
const NUMBER_UNITS = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const NUMBER_TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const NUMBER_SCALES = { hundred: 100, thousand: 1000, million: 1000000 };

function isNumberWord(word) {
  return word in NUMBER_UNITS || word in NUMBER_TENS || word in NUMBER_SCALES;
}

/* Folds a run of number words into a single value.
   "four hundred and sixty two" -> 462, "seventy four" -> 74. */
function foldNumberWords(words) {
  let total = 0;
  let current = 0;
  for (const word of words) {
    if (word === "and") continue;
    if (word in NUMBER_UNITS) {
      current += NUMBER_UNITS[word];
    } else if (word in NUMBER_TENS) {
      current += NUMBER_TENS[word];
    } else if (word === "hundred") {
      current = (current || 1) * 100;
    } else {
      // thousand / million close off everything accumulated so far.
      total += (current || 1) * NUMBER_SCALES[word];
      current = 0;
    }
  }
  return total + current;
}

function spokenNumbersToDigits(value) {
  // Word array rather than a whitespace-preserving split: scanning a run of
  // number words meant stepping over the separators too, which glued the number
  // to the word after it ("74characters").
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const out = [];
  let i = 0;
  const clean = (word) => String(word || "").toLowerCase().replace(/[.,!?;:]+$/, "");

  while (i < words.length) {
    if (!isNumberWord(clean(words[i]))) { out.push(words[i]); i += 1; continue; }

    const run = [];
    let j = i;
    while (j < words.length) {
      const word = clean(words[j]);
      if (isNumberWord(word)) { run.push(word); j += 1; continue; }
      // "and" only counts when another number word follows it.
      if (word === "and" && run.length && isNumberWord(clean(words[j + 1]))) {
        run.push("and");
        j += 1;
        continue;
      }
      break;
    }

    let text = String(foldNumberWords(run));

    if (clean(words[j]) === "point") {
      const decimals = [];
      let k = j + 1;
      while (k < words.length) {
        const digit = clean(words[k]);
        if (!(digit in NUMBER_UNITS) || NUMBER_UNITS[digit] > 9) break;
        decimals.push(NUMBER_UNITS[digit]);
        k += 1;
      }
      if (decimals.length) { text += "." + decimals.join(""); j = k; }
    }

    // Carry over any punctuation that trailed the last spoken number word.
    const trailing = String(words[j - 1] || "").match(/[.,!?;:]+$/);
    out.push(text + (trailing ? trailing[0] : ""));
    i = j;
  }
  return out.join(" ");
}

const DICTATION_NUMBER_WORDS = new Map(Object.entries({
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18",
  nineteen: "19", twenty: "20", thirty: "30", forty: "40",
  fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
}));

// The model is allowed to format dictation, never to rewrite it. Canonical
// tokens make the small set of permitted changes comparable: punctuation and
// case disappear, "five p.m." and "5 PM" become the same tokens, and a spoken
// "six o'clock" can safely become "6:00".
function dictationSemanticTokens(value) {
  // Spoken and written numbers fold to the same token here, so converting
  // "two point five" to "2.5" reads as formatting rather than as changed words.
  return spokenNumbersToDigits(String(value || ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b([0-9]{1,2}):00\b/g, "$1")
    .replace(/\ba\s*\.?\s*m\b\s*\.?/g, " am ")
    .replace(/\bp\s*\.?\s*m\b\s*\.?/g, " pm ")
    .replace(/\bo['’]?clock\b/g, " ")
    .replace(/\$(\d+(?:\.\d+)?)/g, "$1 dollars ")
    .replace(/£(\d+(?:\.\d+)?)/g, "$1 pounds ")
    .replace(/€(\d+(?:\.\d+)?)/g, "$1 euros ")
    .replace(/₹(\d+(?:\.\d+)?)/g, "$1 rupees ")
    .replace(/(\d+(?:\.\d+)?)%/g, "$1 percent ")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => DICTATION_NUMBER_WORDS.get(token) || token);
}

function longestCommonSubsequenceLength(left, right) {
  const previous = new Uint16Array(right.length + 1);
  const current = new Uint16Array(right.length + 1);
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    previous.set(current);
    current.fill(0);
  }
  return previous[right.length];
}

function protectedDictationTokens(value) {
  return String(value || "").match(
    /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|[@#][\p{L}\p{N}_-]+|\b(?=\w*[A-Za-z])(?=\w*\d)[\w.-]+\b/gu,
  ) || [];
}

function assessDictationRefinement(source, candidate) {
  const raw = String(source || "").trim();
  const formatted = String(candidate || "").trim();
  if (!raw) return { accepted: false, reason: "empty_source" };
  if (!formatted) return { accepted: false, reason: "empty_candidate" };

  const lengthRatio = formatted.length / Math.max(1, raw.length);
  if (lengthRatio < 0.1 || lengthRatio > 2.5) {
    return { accepted: false, reason: "length_changed", lengthRatio };
  }

  const foldedCandidate = formatted.normalize("NFKC").toLowerCase();
  const missingProtectedToken = protectedDictationTokens(raw).find(
    (token) => !foldedCandidate.includes(token.normalize("NFKC").toLowerCase()),
  );
  if (missingProtectedToken) {
    return { accepted: false, reason: "protected_token_changed", token: missingProtectedToken };
  }

  const sourceTokens = dictationSemanticTokens(raw);
  const candidateTokens = dictationSemanticTokens(formatted);
  if (!sourceTokens.length || !candidateTokens.length) {
    return { accepted: false, reason: "missing_words" };
  }
  const lcs = longestCommonSubsequenceLength(sourceTokens, candidateTokens);
  const sourceCoverage = lcs / sourceTokens.length;
  const candidateCoverage = lcs / candidateTokens.length;
  const accepted = sourceCoverage === 1 && candidateCoverage === 1;
  return {
    accepted,
    reason: accepted ? "faithful" : "words_changed_or_reordered",
    sourceCoverage,
    candidateCoverage,
  };
}

function assessDictationInsertion(before = {}, after = {}, insertedText = "") {
  if (!before.valueReadable || !after.valueReadable) {
    return { verified: null, reason: "field_value_unavailable" };
  }
  if (
    String(before.appName || "").toLowerCase() !== String(after.appName || "").toLowerCase()
    || String(before.role || "") !== String(after.role || "")
  ) {
    return { verified: false, reason: "focus_changed" };
  }

  const beforeLength = Number(before.valueLength);
  const afterLength = Number(after.valueLength);
  const selectionLength = Math.max(0, Number(before.selectionLength) || 0);
  const expectedLength = beforeLength - selectionLength + String(insertedText || "").length;
  const hashChanged = Boolean(before.valueHash && after.valueHash && before.valueHash !== after.valueHash);
  const caretAdvanced = Number.isFinite(Number(before.selectionLocation))
    && Number.isFinite(Number(after.selectionLocation))
    && Number(after.selectionLength) === 0
    && Number(after.selectionLocation) === Number(before.selectionLocation) + String(insertedText || "").length;

  if (afterLength === expectedLength && (hashChanged || caretAdvanced)) {
    return { verified: true, reason: "field_changed" };
  }
  const unchanged = beforeLength === afterLength
    && String(before.valueHash || "") === String(after.valueHash || "")
    && Number(before.selectionLocation) === Number(after.selectionLocation)
    && Number(before.selectionLength) === Number(after.selectionLength);
  if (unchanged) return { verified: false, reason: "field_unchanged" };
  return { verified: null, reason: "field_change_ambiguous" };
}

function evaluateDictationStart(focusStatus, hasTargetApp = true) {
  const status = String(focusStatus || "error").trim().toLowerCase();
  if (!hasTargetApp) {
    return { ok: false, error: "Open an app before starting BrainoHERA." };
  }
  if (status === "needs-accessibility") {
    return { ok: false, error: "Braino needs Accessibility permission before it can type for you." };
  }
  if (status === "secure") {
    return { ok: false, error: "BrainoHERA stays out of password and secure text fields." };
  }
  if (status === "editable") {
    return { ok: true, insertionMode: "paste", hasEditableTarget: true };
  }
  // Dictation is still useful without a target. The transcript stays
  // recoverable in the clipboard and the Notch shows it instead of sending a
  // blind paste into whatever happens to be frontmost.
  return { ok: true, insertionMode: "notch", hasEditableTarget: false };
}

function shouldUseDictationPasteFallback(focusStatus) {
  return ["no_focus", "not_editable", "insert_failed", "error"].includes(
    String(focusStatus || "").trim().toLowerCase(),
  );
}

function buildDictationTranscriptionConfig({
  model = "gpt-live-transcribe",
  keywords = [],
  languages = ["en", "hi"],
} = {}) {
  const cleanKeywords = Array.from(new Set([
    "Braino",
    "BrainoHERA",
    "Braino Hera",
    "IOMI",
    // Keep the former name as speech context for backwards-compatible voice aliases.
    "Yap Mode",
    "Notch",
    "Itish",
    "Itish Pande",
    ...keywords,
  ].map((value) => String(value || "").trim()).filter(Boolean))).slice(0, 40);

  const config = {
    model,
    // OpenAI documents higher delay as the accuracy-over-latency control for
    // streaming transcription. Dictation can tolerate the extra beat.
    delay: "low",
  };
  // Context is valid only for the live/transcribe models. The older GA
  // gpt-realtime-whisper rejects prompt and keywords.
  if (/^(?:gpt-live-transcribe|gpt-transcribe)(?:$|-)/.test(model)) {
    config.prompt = [
      "This is direct personal dictation into a Mac text field.",
      "Transcribe every clearly spoken word faithfully in the language used by the speaker.",
      "Keep openings, filler words, repetitions, false starts, slang, and profanity when they are spoken.",
      "Add only punctuation and capitalization that are strongly supported by the speech.",
      "Keep names, brands, acronyms, numbers, URLs, file names, and code tokens exact.",
      "Do not summarize, answer, add ideas, or silently rewrite the meaning.",
      "Ignore music, keyboard noise, fans, coughs, and unrelated background speech.",
    ].join(" ");
    config.keywords = cleanKeywords;
    config.languages = Array.from(new Set(
      languages.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
    )).slice(0, 8);
  }
  return config;
}

function buildDictationTurnDetection() {
  // gpt-live-transcribe currently rejects server turn detection. Braino keeps
  // the WebRTC input buffer open and commits it from the renderer's local VAD.
  return null;
}

module.exports = {
  spokenNumbersToDigits,
  assessDictationRefinement,
  assessDictationInsertion,
  buildDictationTranscriptionConfig,
  buildDictationTurnDetection,
  evaluateDictationStart,
  normalizeDictationChunk,
  normalizeDictationCommand,
  normalizeDictationSession,
  parseDictationControl,
  shouldUseDictationPasteFallback,
};
