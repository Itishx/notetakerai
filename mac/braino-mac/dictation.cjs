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

    /* "Oh my God" is not "0 my God", and "one data point" stays a word: a lone
       small number word (zero to nine, or "oh") is left as spoken; "oh" only
       means zero inside a run of digits, as in a phone number (2026-10-26). */
    const lone = run.length === 1 && (run[0] === "oh" || (NUMBER_UNITS[run[0]] !== undefined && NUMBER_UNITS[run[0]] < 10));
    if (lone && clean(words[j]) !== "point") { out.push(...words.slice(i, j)); i = j; continue; }
    if (run[0] === "oh") { out.push(words[i]); i += 1; continue; }
    // Digits said one by one (phone numbers, PINs, OTPs) are written in order,
    // never added up: "five six zero zero three eight" is 560038, not 22.
    const digitsOnly = run.length >= 2 && run.every((w) => w === "oh" || (NUMBER_UNITS[w] !== undefined && NUMBER_UNITS[w] < 10));
    let text = digitsOnly ? run.map((w) => (w === "oh" ? "0" : String(NUMBER_UNITS[w]))).join("") : String(foldNumberWords(run));

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
// Hindi / Hinglish spellings of rupees, so "₹" reads as the word that was said.
const DICTATION_RUPEE_WORDS = new Map(["rupaye", "rupay", "rupaiya", "rupaiye", "rupee", "rs", "रुपये", "रुपए", "रुपया", "रुपय"].map((w) => [w.normalize("NFKC"), "rupees"]));
function dictationSemanticTokens(value) {
  // Spoken and written numbers fold to the same token here, so converting
  // "two point five" to "2.5" reads as formatting rather than as changed words.
  return spokenNumbersToDigits(String(value || ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    /* A contraction is a faithful rewrite of two words, so both forms have to
       reduce to the same tokens. Without this, "if it is not" becoming "if it
       isn't" reads as one invented word and one lost pair, and the whole
       clean-up is refused: a real sixty-five word dictation was rejected on
       exactly that, with the model's output otherwise perfect.

       The apostrophe forms are expanded first, because "we're" and "were" are
       different words and stripping the apostrophe would merge them. */
    .replace(/'re\b/g, " are")
    .replace(/'ve\b/g, " have")
    .replace(/'ll\b/g, " will")
    .replace(/'m\b/g, " am")
    .replace(/'d\b/g, " would")
    // "let's" and "lets" are the same word to this comparison. Splitting on the
    // apostrophe instead would make "let" + "s" look like invented tokens.
    .replace(/'/g, "")
    /* Now the bare forms, which is how speech models write them: a transcript
       says "cant", the clean-up says "can't", and both mean "can not". */
    .replace(/\b(?:cannot|cant)\b/g, "can not")
    .replace(/\b(?:wont|willnot)\b/g, "will not")
    .replace(/\bshant\b/g, "shall not")
    .replace(/\bisnt\b/g, "is not")
    .replace(/\barent\b/g, "are not")
    .replace(/\bwasnt\b/g, "was not")
    .replace(/\bwerent\b/g, "were not")
    .replace(/\bhasnt\b/g, "has not")
    .replace(/\bhavent\b/g, "have not")
    .replace(/\bhadnt\b/g, "had not")
    .replace(/\bdoesnt\b/g, "does not")
    .replace(/\bdont\b/g, "do not")
    .replace(/\bdidnt\b/g, "did not")
    .replace(/\bcouldnt\b/g, "could not")
    .replace(/\bshouldnt\b/g, "should not")
    .replace(/\bwouldnt\b/g, "would not")
    .replace(/\bmustnt\b/g, "must not")
    .replace(/\b([0-9]{1,2}):00\b/g, "$1")
    .replace(/\ba\s*\.?\s*m\b\s*\.?/g, " am ")
    .replace(/\bp\s*\.?\s*m\b\s*\.?/g, " pm ")
    .replace(/\bo['’]?clock\b/g, " ")
    .replace(/\$(\d+(?:\.\d+)?)/g, "$1 dollars ")
    .replace(/£(\d+(?:\.\d+)?)/g, "$1 pounds ")
    .replace(/€(\d+(?:\.\d+)?)/g, "$1 euros ")
    // "do lakh rupaye" written "₹2 lakh": the rupees follow the scale word.
    .replace(/₹\s?(\d+(?:\.\d+)?)\s*(lakhs?|crores?|लाख|करोड़)/gu, "$1 $2 rupees ")
    .replace(/₹(\d+(?:\.\d+)?)/g, "$1 rupees ")
    .replace(/(\d+(?:\.\d+)?)%/g, "$1 percent ")
    /* Letters in any script are words (2026-10-27, Hindi): Devanagari vowel
       signs and viramas are combining marks (\p{M}) and must stay inside the
       word, and zero-width joiners never split one. Everything else, including
       "।", is punctuation. */
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => DICTATION_NUMBER_WORDS.get(token) || DICTATION_RUPEE_WORDS.get(token) || token);
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

/* How much of what was spoken a cleaned-up version has to keep.
   Below this it stopped being dictation and started being a summary. */
const DICTATION_EDIT_MIN_COVERAGE = 0.55;

/* Alignment prices. Dropping a word is ordinary; swapping one for a word that
   sounds like it is a real correction but has to stay rare; adding a word that
   was never spoken is the thing this gate exists to stop, so it is priced out
   of every path rather than merely discouraged. */
const DICTATION_SUBSTITUTE_COST = 10;
const DICTATION_INSERT_COST = 1000;

function characterEditDistance(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a === b) return 0;
  let previous = new Uint16Array(b.length + 1);
  let current = new Uint16Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) previous[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const swap = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(swap, previous[j] + 1, current[j - 1] + 1);
    }
    const spent = previous; previous = current; current = spent;
  }
  return previous[b.length];
}

/* Two tokens close enough to be one word heard two ways.

   Speech models mishear words that sound alike, and a formatter reading the
   whole sentence often has the context to put them right: a real microphone
   pass produced "tell the teen thanks", which is plainly "team". Refusing that
   correction threw away the entire clean-up over one letter.

   Same stem counts too, so "cant" may become "cannot" and "deploy" may become
   "deployment". Words that merely appear in the same sentence do not: "deploy"
   never becomes "expired", and digits never move at all, because a wrong number
   is the one mistake nobody catches by rereading. */
function dictationTokensAreClose(left, right) {
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long = left.length <= right.length ? right : left;
  // A number is never close to another number.
  if (/\d/.test(left) || /\d/.test(right)) return false;
  if (short.length >= 4 && long.startsWith(short) && long.length - short.length <= 4) return true;
  if (short.length < 3) return false;
  return characterEditDistance(left, right) <= 2;
}

/* Aligns the spoken words against the cleaned-up ones, in order, and reports
   what it took to get from one to the other. Order-preserving by construction,
   so a candidate whose clauses have been shuffled can only be explained as
   insertions, and insertions are what the caller refuses. */
function alignDictationEdit(sourceTokens, candidateTokens) {
  const n = sourceTokens.length;
  const m = candidateTokens.length;
  const cost = [];
  const back = [];
  for (let i = 0; i <= n; i += 1) {
    cost.push(new Float64Array(m + 1).fill(Infinity));
    back.push(new Array(m + 1).fill(""));
  }
  cost[0][0] = 0;
  for (let i = 1; i <= n; i += 1) { cost[i][0] = i; back[i][0] = "delete"; }
  for (let j = 1; j <= m; j += 1) { cost[0][j] = j * DICTATION_INSERT_COST; back[0][j] = "insert"; }

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      let best = cost[i - 1][j] + 1;
      let move = "delete";
      const inserted = cost[i][j - 1] + DICTATION_INSERT_COST;
      if (inserted < best) { best = inserted; move = "insert"; }
      const same = sourceTokens[i - 1] === candidateTokens[j - 1];
      if (same || dictationTokensAreClose(sourceTokens[i - 1], candidateTokens[j - 1])) {
        const diagonal = cost[i - 1][j - 1] + (same ? 0 : DICTATION_SUBSTITUTE_COST);
        if (diagonal < best) { best = diagonal; move = same ? "match" : "substitute"; }
      }
      cost[i][j] = best;
      back[i][j] = move;
    }
  }

  let i = n;
  let j = m;
  const counts = { matched: 0, substituted: 0, deleted: 0, inserted: 0 };
  const insertedTokens = [];
  const deletedTokens = [];
  while (i > 0 || j > 0) {
    const move = back[i][j];
    if (move === "match") { counts.matched += 1; i -= 1; j -= 1; }
    else if (move === "substitute") { counts.substituted += 1; i -= 1; j -= 1; }
    else if (move === "delete") { counts.deleted += 1; deletedTokens.push(sourceTokens[i - 1]); i -= 1; }
    else { counts.inserted += 1; insertedTokens.push(candidateTokens[j - 1]); j -= 1; }
  }
  return { counts, insertedTokens, deletedTokens };
}

/* Words a clean-up may move, a short list on purpose: moving any of them keeps
   the meaning. Negations, numbers, names and every other word stay where they
   were said. */
const DICTATION_MOVABLE_WORDS = new Set([
  "maybe", "perhaps", "probably", "also", "just", "really", "actually", "still",
  "then", "too", "definitely", "basically", "literally", "again", "already",
  "honestly", "obviously", "anyway",
]);
const DICTATION_MAX_MOVES = 3;

/* How many inserted words are really moved ones, or 0 when any of them is not.
   Each inserted word must be a movable word that the alignment also deleted
   elsewhere. */
function dictationHarmlessMoves(insertedTokens = [], deletedTokens = []) {
  if (!insertedTokens.length || insertedTokens.length > DICTATION_MAX_MOVES) return 0;
  const available = [...deletedTokens];
  for (const token of insertedTokens) {
    if (!DICTATION_MOVABLE_WORDS.has(token)) return 0;
    const at = available.indexOf(token);
    if (at < 0) return 0;
    available.splice(at, 1);
  }
  return insertedTokens.length;
}

/* Clean-up models sometimes answer like a chat assistant: "Sure! Here's the
   cleaned text: ...". The text after that is often exactly right, and those
   five unspoken words were enough to refuse all of it. The preamble, wrapping
   quotes and a "let me know" tail are removed before anything is judged. */
const FORMATTER_PREAMBLE = /^\s*(?:(?:sure|okay|ok|certainly|of course|absolutely|alright|got it)\s*[!.,]*\s*)?(?:here(?:'s|’s|\s+is)\s+(?:the|your|a)\s+(?:cleaned(?:[- ]up)?|corrected|formatted|edited|polished|clean|tidied(?:[- ]up)?)\s+(?:up\s+)?(?:text|transcript|version|dictation|sentence|transcription)(?:\s+of\s+[^:\n]{0,40})?\s*[:：]\s*)/i;
const FORMATTER_SIGNOFF = /\s*(?:let me know if[^\n]*|i hope this helps[^\n]*)$/i;

function stripFormatterChatter(text) {
  const value = String(text || "").trim();
  let cleaned = value.replace(FORMATTER_PREAMBLE, "").replace(FORMATTER_SIGNOFF, "").trim();
  const quoted = cleaned.match(/^["“](.+)["”]$/s);
  if (quoted) cleaned = quoted[1].trim();
  return cleaned || value;
}

/* The gate for cleaned-up dictation, as opposed to lossless formatting.

   assessDictationRefinement above demands the exact same words in the exact
   same order, which is right for a formatter that may only touch punctuation.
   It is the wrong contract for the thing people actually want from dictation:
   "meet at five, um, actually six" should arrive as "Meet at 6." Under the
   strict gate that edit is rejected every single time — measured at
   sourceCoverage 0.71 on a real transcript — so the raw text is what lands and
   the clean-up may as well not exist.

   So this gate is DELETE-ONLY. The editor may drop words (fillers, false
   starts, the abandoned half of a self-correction), repunctuate, recase, and
   write spoken numbers as digits. It may not add a word that was not spoken,
   move a word, or quietly lose an address, URL, handle, or code token. Those
   are the failure modes that turn a cleanup into a fabrication, and they stay
   forbidden.

   Rejection is never fatal: the caller pastes the raw transcript instead. */
function assessDictationEdit(source, candidate) {
  const raw = String(source || "").trim();
  const edited = String(candidate || "").trim();
  if (!raw) return { accepted: false, reason: "empty_source" };
  if (!edited) return { accepted: false, reason: "empty_candidate" };

  // Deleting words shortens text; punctuation and digits move it a little the
  // other way. Growing well past the original means something was added.
  const lengthRatio = edited.length / Math.max(1, raw.length);
  if (lengthRatio > 1.8) return { accepted: false, reason: "length_grew", lengthRatio };

  const foldedCandidate = edited.normalize("NFKC").toLowerCase();
  const missingProtectedToken = protectedDictationTokens(raw).find(
    (token) => !foldedCandidate.includes(token.normalize("NFKC").toLowerCase()),
  );
  if (missingProtectedToken) {
    return { accepted: false, reason: "protected_token_changed", token: missingProtectedToken };
  }

  const sourceTokens = dictationSemanticTokens(raw);
  const candidateTokens = dictationSemanticTokens(edited);
  if (!sourceTokens.length || !candidateTokens.length) {
    return { accepted: false, reason: "missing_words" };
  }

  const aligned = alignDictationEdit(sourceTokens, candidateTokens);
  const align = aligned.counts;

  // A word with no counterpart in the speech is an invention, and a candidate
  // whose clauses have moved can only be explained as one. Either way it never
  // reaches the caret, with one exception: a few words that sit anywhere in a
  // sentence without changing who did what ("we can maybe go" -> "maybe we
  // can go"). Those are moves, not inventions, and refusing them refused
  // otherwise perfect clean-ups.
  if (align.inserted > 0) {
    const moves = dictationHarmlessMoves(aligned.insertedTokens, aligned.deletedTokens);
    /* The trained clean-up (96% exact on Itish's held-out lines) adds small
       format words on purpose: "list:", "to-do", "₹", digits. A handful of new
       tokens is formatting; more than that is an invention (2026-10-25). */
    // Digits count only when they are new (spoken as words), never a swap of digits already said.
    const FORMAT = /^(?:list|lists|todo|to-do|₹|%|am|pm)$/i;
    const said = new Set(sourceTokens.map(String));
    // Light grammar a person would add when typing it ("what you mean by"), a few at most.
    const GLUE = /^(?:by|is|are|the|a|an|to|of|that|for|in|on|and|was)$/i; // never pronouns: he->it is a real change
    let glue = Math.max(2, Math.floor(sourceTokens.length / 15));
    const inventions = aligned.insertedTokens.filter((t) => {
      if (FORMAT.test(String(t)) || (/^[0-9][0-9.,:]*$/.test(String(t)) && !said.has(String(t)))) return false;
      if (GLUE.test(String(t)) && glue > 0) { glue -= 1; return false; }
      return true;
    }).length;
    if (!moves && inventions > 0) return { accepted: false, reason: "words_added_or_reordered", ...align };
    align.inserted = 0;
    align.deleted -= moves;
    align.moved = moves;
  }

  const sourceCoverage = (align.matched + align.substituted) / sourceTokens.length;
  if (sourceCoverage < DICTATION_EDIT_MIN_COVERAGE) {
    return { accepted: false, reason: "too_much_removed", sourceCoverage, ...align };
  }

  /* Correcting a misheard word is useful; correcting many is a rewrite wearing
     a clean-up's clothes. A handful per utterance, and never most of it. */
  const substitutionCap = Math.min(4, Math.max(1, Math.ceil(sourceTokens.length * 0.15)));
  if (align.substituted > substitutionCap) {
    return { accepted: false, reason: "too_many_words_changed", substitutionCap, ...align };
  }

  return {
    accepted: true,
    reason: align.substituted === 0 && align.deleted === 0 ? "faithful" : "cleaned",
    sourceCoverage,
    ...align,
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
  dictationSemanticTokens,
  stripFormatterChatter,
  assessDictationEdit,
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
