// Which Chrome profiles you have, and which one is for what.
//
// Chrome lists every profile in one file ("Local State": name, signed-in
// email, folder). You tell Braino once which is your main one and what the
// others are for ("Nexus and Mesa: my Mesa profile"), in Settings, in Set him
// up, or by saying it. After that, a Nexus link opens in the Mesa profile and
// everything else in your main one. On 2026-09-26 "you're in the wrong Chrome
// profile" cost 20 seconds of thinking, because he didn't know there was a
// choice.
//
// Pure: reading the file's contents, matching, and the rules. main.cjs stores
// the choices and opens Chrome.

/* Local State JSON → [{ dir, name, email, lastUsed }] in Chrome's order. */
function listProfiles(localState) {
  const cache = localState?.profile?.info_cache || {};
  const last = localState?.profile?.last_used || "";
  return Object.entries(cache).map(([dir, v]) => ({
    dir,
    name: String(v?.name || v?.gaia_name || dir),
    email: String(v?.user_name || ""),
    lastUsed: dir === last,
  }));
}

/* How a person names a profile: its name, its email, the part before or
   after the @, or its folder. "My Mesa profile" finds forge27.mesaschool.co. */
function profileWords(p) {
  const email = String(p.email || "").toLowerCase();
  const [user, domain] = email.split("@");
  const bits = [p.name, p.dir, email, user, domain, ...(domain || "").split("."), ...(String(p.name || "").toLowerCase().split(/[\s._-]+/))];
  return [...new Set(bits.map((b) => String(b || "").toLowerCase().trim()).filter((b) => b.length > 1 && !["com", "in", "co", "gmail", "profile", "default", "org"].includes(b)))];
}

/* The profile a phrase means, or null. Exact name first, then any word. */
function findProfile(profiles, said) {
  const q = String(said || "").toLowerCase().replace(/\b(?:my|the|chrome|profile|account|one)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!q) return null;
  const exact = profiles.filter((p) => String(p.name).toLowerCase() === q || String(p.email).toLowerCase() === q || String(p.dir).toLowerCase() === q);
  if (exact.length === 1) return exact[0];
  /* Two profiles with the same name ("Itish" twice): the one whose email says
     it, else Chrome's first one. */
  if (exact.length > 1) return exact.find((p) => String(p.email).toLowerCase().includes(q)) || exact.find((p) => p.dir === "Default") || exact[0];
  // "messa" against "mesaschool": the start of the name, one letter off.
  const close = (a, b) => a === b || a.startsWith(b) || b.startsWith(a) || (a.length >= 4 && b.length >= 4 && (editDistance(a, b) <= 1 || [-1, 0, 1].some((k) => editDistance(a.slice(0, b.length + k), b) <= 1)));
  const hits = profiles.filter((p) => profileWords(p).some((w) => q.split(" ").some((word) => word.length > 2 && close(w, word))));
  if (hits.length === 1) return hits[0];
  /* "My work profile" / "college profile": the one signed in with a company or
     school address, when exactly one is not a personal mail account. */
  if (/^(?:work|office|school|college|uni|university|company)$/.test(q)) {
    const org = profiles.filter((p) => p.email && !/@(?:gmail|googlemail|icloud|me|outlook|hotmail|yahoo)\./i.test(p.email));
    if (org.length === 1) return org[0];
  }
  return null;
}

/* "Messa" is how Mesa was heard (2026-09-26): one letter off still counts. */
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/* config: { primary: dir, rules: [{ words: ["nexus","mesa"], dir }] }.
   The profile a link should open in, or "" to use whichever window is front. */
function profileForUrl(config, url) {
  const u = String(url || "").toLowerCase();
  for (const rule of config?.rules || []) {
    if ((rule.words || []).some((w) => w && u.includes(String(w).toLowerCase()))) return rule.dir;
  }
  return "";
}

/* "use my Mesa profile for Nexus", "Nexus is on my Mesa profile",
   "switch to my Braino profile", "which Chrome profiles do I have". */
/* A profile is called by a name: one to three words, no second job in it.
   "Open LinkedIn and search for Saurabh Jha from Messa Skola Business's
   profile" was read as a profile called "LinkedIn and search for ... Messa",
   matched Mesa by its one word, opened that window and said "Done" (2026-10-03). */
function looksLikeProfileName(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  if (n.split(/\s+/).length > 3) return false;
  return !/\b(?:and|then|search|find|for|from|open|send|message|look|with|about|on|of|in)\b|'s\b/i.test(n);
}

function parseProfileIntent(raw) {
  const intent = parseProfileIntentRaw(raw);
  if (!intent || intent.action === "list") return intent;
  return looksLikeProfileName(intent.profile) ? intent : null;
}

function parseProfileIntentRaw(raw) {
  const t = String(raw || "").trim().replace(/^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)/i, "").replace(/^(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, "").replace(/[.!?]+$/, "").trim();
  /* "You're in the wrong profile … it's my Itish profile": the last profile
     named in the sentence is the one meant. */
  if (/\bwrong\s+(?:chrome\s+)?profile\b/i.test(t)) {
    const named = [...t.matchAll(/\b(?:my|the)\s+([\w.@-]+(?:\s+[\w.@-]+)?)\s+(?:chrome\s+)?profile\b/gi)].map((x) => x[1]).filter((x) => !/^(?:wrong|correct|right|chrome|other|same)\b/i.test(x));
    return named.length ? { action: "switch", profile: named[named.length - 1].replace(/\s+chrome$/i, "") } : { action: "list" };
  }
  /* "Switch to my other Chrome profile, which is Mesa." */
  const which = t.match(/^(?:switch|go|change|move)\s+(?:over\s+)?to\s+(?:my|the)\s+(?:other|second|next|different)?\s*(?:chrome\s+)?profile,?\s+(?:which\s+is|called|named|the)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:one|profile))?$/i);
  if (which) return { action: "switch", profile: which[1].trim() };
  let m = t.match(/^(?:use|open)\s+(?:my\s+|the\s+)?(.+?)\s+(?:chrome\s+)?profile\s+for\s+(.+)$/i);
  if (m) return { action: "rule", profile: m[1].trim(), words: m[2].split(/\s*(?:,|\band\b|&)\s*/).map((w) => w.trim().toLowerCase()).filter(Boolean) };
  m = /^(?:you|i|we|it|this|that)\b/i.test(t) ? null : t.match(/^(.+?)\s+(?:is|are|goes|go|opens?)\s+(?:on|in)\s+(?:my\s+|the\s+)?(.+?)\s+(?:chrome\s+)?profile$/i);
  if (m) return { action: "rule", profile: m[2].trim(), words: m[1].split(/\s*(?:,|\band\b|&)\s*/).map((w) => w.trim().toLowerCase()).filter(Boolean) };
  m = t.match(/^(?:my\s+)?(?:main|primary|default)\s+(?:chrome\s+)?profile\s+is\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:chrome\s+)?profile)?$/i) || t.match(/^(?:make|set)\s+(?:my\s+|the\s+)?(.+?)\s+(?:chrome\s+)?profile\s+(?:my\s+|the\s+)?(?:main|primary|default)(?:\s+one)?$/i);
  if (m) return { action: "primary", profile: m[1].trim() };
  m = t.match(/^(?:switch|go|change|move)\s+(?:over\s+)?to\s+(?:my\s+|the\s+)?(.+?)\s+(?:chrome\s+)?profile$|^open\s+(?:my\s+|the\s+)?(.+?)\s+(?:chrome\s+)?profile$|^(?:you(?:'re| are) in the )?wrong (?:chrome )?profile.*?(?:use|switch to|it'?s)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:chrome\s+)?profile)?$/i);
  if (m) return { action: "switch", profile: (m[1] || m[2] || m[3] || "").trim() };
  if (/^(?:which|what|how many)\s+(?:chrome\s+)?profiles?\b|\bmy chrome profiles\b/i.test(t)) return { action: "list" };
  return null;
}

module.exports = { listProfiles, profileWords, findProfile, profileForUrl, parseProfileIntent, looksLikeProfileName };
