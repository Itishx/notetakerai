"use strict";

/* Who "Iloo" is.
 *
 * "Braino, FaceTime Iloo", then "FaceTime Elu", both failed: the contact is
 * saved as "Ilu😍", and the lookup only knew exact spellings. A person hearing
 * "call Ilu" does not check the spelling, they know who you mean, partly from
 * how the name sounds and partly from who you usually call. This does the
 * same: names are compared by sound, and someone you contact often wins a tie.
 *
 * Pure functions, so the matching can be tested without Electron or Contacts. */

function cleanContactName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* The same name however a transcriber spelled it: "Iloo", "Elu" and "Ilu" all
   come out as "ilu", "Prakar" and "Prakhar" as "prakar". */
function soundKey(word) {
  const w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  return w
    .replace(/ph/g, "f")
    .replace(/([kgtdcsbpj])h/g, "$1")
    .replace(/ck/g, "k")
    .replace(/q/g, "k")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/y/g, "i")
    .replace(/oo|ou|uu/g, "u")
    .replace(/ee|ea|ie|ii/g, "i")
    .replace(/aa/g, "a")
    .replace(/(.)\1+/g, "$1")
    // An opening e and i are the same sound to a transcriber: "Elu" is "Ilu".
    .replace(/^e/, "i");
}

function editDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, j) => j);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1]
        : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]);
    }
    previous = current;
  }
  return previous[right.length];
}

/* Every part of a name, not only the first.
 *
 * People are called by a surname, a nickname, or where they work. The lookup
 * only ever read the first word of a contact, so "Salvaji" and "Tarkshaya"
 * came back as "who's that?" while both were sitting in the address book. A
 * later word scores below a first word, so a real first name always wins. */

/* "Manik from Mesa" is Manik UG mesa RJ (2026-10-24).
 *
 * The send looked for all three words and "from" is in nobody's name, so a
 * contact the address book tool found in ten milliseconds came back as "no
 * number for Manik from Mesa", three times. People join a name to where they
 * know someone from with little words; those words are not the name. Only
 * dropped when something is left, so a contact really called "Main" is safe. */
const NAME_FILLER = new Set(["from", "at", "of", "in", "the", "my", "se", "wala", "wali", "vala", "vali", "ka", "ki", "ke", "and"]);
function spokenNameQuery(query) {
  const q = cleanContactName(query);
  const kept = q.split(" ").filter((w) => w && !NAME_FILLER.has(w));
  return kept.length && kept.length < q.split(" ").length ? kept.join(" ") : q;
}

/* "8299758524", "+91 82997 58524": already a number, so nothing to look up.
   Returns the digits, or "" when it is a name. */
function phoneFromRecipient(value) {
  const raw = String(value || "").trim();
  if (!raw || /[a-z]/i.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

/* How well a spoken name fits a saved contact, 0 when it does not. */
function scoreContactName(query, contactName) {
  const q = spokenNameQuery(query);
  const name = cleanContactName(contactName);
  if (!q || !name) return 0;
  if (name === q) return 100;
  const tokens = name.split(" ");
  const queryTokens = q.split(" ");
  if (tokens[0] === q) return tokens.length === 1 ? 95 : 90;
  if (name.startsWith(`${q} `)) return 88;
  const queryKey = queryTokens.map(soundKey).join(" ");
  if (!queryKey.trim()) return 0;
  const fullKey = tokens.map(soundKey).join(" ");
  const leadKey = tokens.slice(0, queryTokens.length).map(soundKey).join(" ");
  if (fullKey === queryKey) return 85;
  if (leadKey === queryKey) return 75;
  // One slip on a longer name, never on a short one: "Elu" is two letters from
  // half the phone book.
  if (queryKey.length >= 5 && editDistance(queryKey, leadKey) <= 1) return 60;

  if (queryTokens.length === 1) {
    // A surname or a middle name: "Salvaji" is Balraj Salvaji.
    const laterKeys = tokens.slice(1).map(soundKey);
    if (tokens.slice(1).includes(q)) return 80;
    if (laterKeys.includes(queryKey)) return 70;
    if (queryKey.length >= 5 && laterKeys.some((key) => editDistance(queryKey, key) <= 1)) return 62;
    return 0;
  }
  // The same words in another order: "Salvaji Balraj" is the same person.
  const spare = tokens.map(soundKey);
  const allFit = queryTokens.map(soundKey).every((key) => {
    const at = spare.indexOf(key);
    if (at === -1) return false;
    spare.splice(at, 1);
    return true;
  });
  if (allFit) return 78;
  return 0;
}

/* The number to ring, whichever field it is sitting in. */
function contactPhone(entry) {
  if (!entry) return "";
  const direct = String(entry.phone || "").trim();
  if (direct) return direct;
  const first = (entry.phones || []).map((row) => String(row?.value || "").trim()).find(Boolean);
  return first || "";
}

/* A nickname is nearly as good as a name; a company is a long way behind one,
   because everyone at a company shares it. */
const NICKNAME_CEILING = 88;
const COMPANY_CEILING = 62;

function scoreContactEntry(query, entry) {
  if (!entry?.name) return 0;
  let best = scoreContactName(query, entry.name);
  if (entry.nickname) {
    best = Math.max(best, Math.min(NICKNAME_CEILING, scoreContactName(query, entry.nickname)));
  }
  if (entry.company && cleanContactName(query).length >= 4) {
    best = Math.max(best, Math.min(COMPANY_CEILING, scoreContactName(query, entry.company)));
  }
  return best;
}

const CONTACT_MATCH_MIN_SCORE = 60;

/* The best contact for a spoken name, preferring people you call.
   Returns { contact, score } or { ambiguous: [contacts] } or null. */
function findContactBySound(query, contacts, history = {}) {
  const q = spokenNameQuery(query);
  if (q.length < 2) return null;
  const scored = [];
  for (const entry of Object.values(contacts || {})) {
    if (!entry?.name) continue;
    const base = scoreContactEntry(q, entry);
    if (base < CONTACT_MATCH_MIN_SCORE) continue;
    const used = Number(history?.[cleanContactName(entry.name)]?.count) || 0;
    scored.push({ entry, base, used, score: base + Math.min(20, used * 5) });
  }
  if (!scored.length) return null;
  // A tie goes to the person you can actually reach: a contact saved with no
  // number is a name, not a way to call anybody.
  scored.sort((a, b) => b.score - a.score
    || (contactPhone(b.entry) ? 1 : 0) - (contactPhone(a.entry) ? 1 : 0)
    || a.entry.name.length - b.entry.name.length);
  const [best] = scored;
  const tied = scored.filter((row) => row.score === best.score && Boolean(contactPhone(row.entry)) === Boolean(contactPhone(best.entry)));
  // The same person saved twice is not two people: one number, no question.
  const numbers = new Set(tied.map((row) => contactPhone(row.entry)).filter(Boolean));
  // Two people who fit equally well, and you have called neither: ask.
  if (tied.length > 1 && !best.used && numbers.size !== 1) {
    return { ambiguous: tied.slice(0, 3).map((row) => row.entry) };
  }
  return { contact: best.entry, score: best.score };
}

/* A contact name as it should be said out loud: "Ilu😍" is "Ilu". */
function speakableContactName(name) {
  const spoken = String(name || "").replace(/[^\p{L}\p{N}\s.'&-]/gu, " ").replace(/\s+/g, " ").trim();
  return spoken || String(name || "").trim();
}

const CORRECTION_LEAD = /^(?:no|nope|nah|sorry|oh|okay|ok|i said|i meant|i mean|it's|its|it is|that's|thats|call|facetime|face time|ring|dial|please)\b\s*/i;
const NOT_A_NAME = /\b(?:open|close|play|pause|search|find|show|go|switch|delete|download|start|launch|quit|create|make|write|send|message|what|how|why|when|where|who|stop|cancel|never ?mind)\b/i;

/* "Ilu", "ILU Braino", "No, I said Ilu", "not Elu, Ilu": the name someone
   meant, when they are correcting a name. Empty when it is not just a name. */
function parseCorrectedName(raw) {
  let text = String(raw || "")
    .replace(/[.!?]+$/g, "")
    .replace(/,/g, " ")
    .replace(/\b(?:hey\s+)?brain(?:o|elle)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const notThat = text.match(/^(?:no\s+)?not\s+\S+(?:\s+but)?\s+(.+)$/i);
  if (notThat) text = notThat[1].trim();
  for (let i = 0; i < 4 && CORRECTION_LEAD.test(text); i += 1) {
    text = text.replace(CORRECTION_LEAD, "").trim();
  }
  text = text.replace(/\s+please$/i, "").trim();
  if (!text || NOT_A_NAME.test(text)) return "";
  const words = text.split(" ");
  if (words.length > 3 || words.some((word) => !/^[\p{L}][\p{L}'.-]*$/u.test(word))) return "";
  return text;
}

/* Everyone a spoken name could be, before anything is sent (2026-10-03).
 *
 * "Send this link to Riya" went to "Riya 🐣" with nobody asked: she scored
 * 100 once the emoji was dropped, "Riya Khurana Mesa" scored less, and only an
 * exact tie used to count as a question. A person would ask "which Riya?".
 * So for a message or a call, every contact whose first name IS the one said
 * (for a bare first name), or who fits about as well as the best (for a fuller
 * name), is a candidate, and two or more people means asking. The same person
 * saved twice, one number, is still one person. Who you talk to only decides
 * the order of the choices, never the choice. */
const SAME_NAME_MARGIN = 12;
function sameNameContacts(query, contacts) {
  const q = spokenNameQuery(query);
  if (q.length < 2) return [];
  const qWords = q.split(" ");
  const rows = [];
  for (const entry of Object.values(contacts || {})) {
    if (!entry?.name || !contactPhone(entry)) continue;
    const score = scoreContactEntry(q, entry);
    if (score < CONTACT_MATCH_MIN_SCORE) continue;
    const first = cleanContactName(entry.name).split(" ")[0] || "";
    rows.push({ entry, score, first });
  }
  if (!rows.length) return [];
  const best = Math.max(...rows.map((r) => r.score));
  const fits = rows.filter((r) => (qWords.length === 1 && soundKey(r.first) === soundKey(qWords[0])) || r.score >= best - SAME_NAME_MARGIN);
  const seen = new Set();
  const out = [];
  for (const r of fits.sort((a, b) => b.score - a.score)) {
    const number = String(contactPhone(r.entry)).replace(/\D/g, "").slice(-10);
    if (seen.has(number)) continue;
    seen.add(number);
    out.push(r.entry);
  }
  return out;
}

/* Which of the offered people an answer means: "Khurana", "the first one",
   "the second", "the other one", "the one I talk to most", or the full name.
   `choices` are in the order they were offered, most talked to first.
   Returns the index, or -1 when the answer names nobody. */
function pickContactChoice(answer, choices) {
  const said = cleanContactName(answer);
  const list = Array.isArray(choices) ? choices : [];
  if (!said || !list.length) return -1;
  const ORDINALS = [/\b(first|1st|one|top|1)\b/, /\b(second|2nd|two|2)\b/, /\b(third|3rd|three|3)\b/];
  // A word only one of them has ("Khurana", "Mesa") is the clearest answer.
  const words = list.map((c) => cleanContactName(c.name || c).split(" ").filter((w) => w.length > 1));
  const saidWords = said.split(" ");
  const unique = list.map((_, i) => words[i].filter((w) => !words.some((other, j) => j !== i && other.includes(w))));
  const byWord = unique.map((ws) => ws.some((w) => saidWords.some((s) => s === w || (s.length > 3 && soundKey(s) === soundKey(w)))));
  if (byWord.filter(Boolean).length === 1) return byWord.indexOf(true);
  if (/\b(cancel|never ?mind|nobody|no one|neither|stop|forget it)\b/.test(said)) return -2;
  if (/\b(talk to|message|text|chat with)\b.*\b(most|more|usually|always)\b|\b(usual|regular|main)\b/.test(said)) return 0;
  if (list.length === 2 && /\b(other|another|not that|not her|not him|different)\b/.test(said)) return 1;
  if (/\b(last|latter)\b/.test(said)) return list.length - 1;
  for (let i = 0; i < Math.min(ORDINALS.length, list.length); i++) if (ORDINALS[i].test(said)) return i;
  return -1;
}

/* "Which Riya? Riya Khurana Mesa, who you talk to most, or the other Riya?"
   A choice whose spoken name is only the name you said is "the other Riya",
   because "Riya or Riya" helps nobody. */
function contactChoiceQuestion(query, choices) {
  const said = speakableContactName(query) || query;
  const labels = choices.map((c, i) => {
    const spoken = speakableContactName(c.name);
    const bare = cleanContactName(spoken) === cleanContactName(said);
    if (i === 0) return bare ? `the ${said} you talk to most` : `${spoken}${choices.length > 1 && c.chats > (choices[1].chats || 0) ? ", who you talk to most" : ""}`;
    return bare ? (choices.length === 2 ? `the other ${said}` : `${said}, saved without a surname`) : spoken;
  });
  const head = labels.slice(0, -1).join(", ");
  const list = labels.length > 1 ? `${head}${head.includes(",") ? "," : ""} or ${labels[labels.length - 1]}` : labels[0];
  return `Which ${said}? ${list[0].toUpperCase()}${list.slice(1)}?`;
}

module.exports = {
  spokenNameQuery,
  phoneFromRecipient,
  sameNameContacts,
  pickContactChoice,
  contactChoiceQuestion,
  cleanContactName,
  soundKey,
  scoreContactName,
  scoreContactEntry,
  contactPhone,
  findContactBySound,
  speakableContactName,
  parseCorrectedName,
  CONTACT_MATCH_MIN_SCORE,
};
