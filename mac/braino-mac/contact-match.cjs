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

/* How well a spoken name fits a saved contact, 0 when it does not. */
function scoreContactName(query, contactName) {
  const q = cleanContactName(query);
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
  const q = cleanContactName(query);
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

module.exports = {
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
