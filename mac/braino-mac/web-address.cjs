// A web address said out loud means "open it".
//
// 2026-09-27, from a real run: "trybraino.com" was taken as a mishearing
// ("I only caught trybraino.com. Say that again?"), "try braino.com" as
// garbled, and "open your website" opened braino.ai, a guess. HIL had the
// right idea every time, but these answered first. So a spoken address, or
// "your website", is opened straight away, before any of that.

const BRAINO_SITE = "https://trybraino.com";
const TLDS = "com|in|ai|io|co|org|net|app|dev|me|xyz|so|tv|gg|us|uk|info|site|store|shop";
// Any way speech-to-text spells Braino's own site.
const OWN_LABELS = /^(?:try|tri)?\s*br(?:ai|ay|a|i)n(?:o|oh|e)?$/i;
// Another job in the sentence means the address is not the whole ask.
const OTHER_JOB = /\b(?:send|share|message|text|whatsapp|email|mail|write|type|paste|copy|search\s+for|google|find|look\s+up|summari[sz]e|read|explain|compare|post|tweet|save|download|book|buy|order|sign\s+(?:in|up)|log\s+in|and\s+then|then)\b/i;

function tidy(raw) {
  return String(raw || "")
    .replace(/^(?:hey\s+)?brain(?:o|elle)\b[\s,.!]*/i, "")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s*\.\s*(?=(?:com|in|ai|io|co|org|net|app|dev)\b)/gi, ".")
    .replace(/[?!]+$/, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* "your website", "Braino's site", "your own homepage": trybraino.com. */
function ownSiteAsked(raw) {
  const t = tidy(raw).toLowerCase();
  return /\b(?:your|ur)\s+(?:own\s+)?(?:website|site|web\s*site|web\s*page|home\s*page|homepage|landing\s+page)\b/.test(t)
    || /\bbraino'?s\s+(?:own\s+)?(?:website|site|homepage)\b/.test(t)
    || /\bthe\s+braino\s+(?:website|site)\b/.test(t);
}

/* The address in a sentence, as a URL, or "". Joins the word just before it
   when that is how Braino's own name was split ("try braino.com"). */
function addressIn(raw) {
  const t = tidy(raw);
  const m = t.match(new RegExp(`(?:\\b([a-z0-9-]+)\\s+)?\\b((?:[a-z0-9-]+\\.)+(?:${TLDS}))(\\/\\S*)?\\b`, "i"));
  if (!m) return "";
  const before = (m[1] || "").toLowerCase();
  let host = m[2].toLowerCase();
  const label = host.split(".").slice(-2, -1)[0] || "";
  if (OWN_LABELS.test(label) || (/^(?:try|tri)$/.test(before) && OWN_LABELS.test(label))) return BRAINO_SITE;
  if (/^(?:https?:\/\/)?(?:www\.)?$/.test(host)) return "";
  return `https://${host}${m[3] || ""}`;
}

/* The whole ask is "open this site": an address (or "your website") plus at
   most a few words around it ("open", "try", "go to", "please"). */
function spokenWebsite(raw) {
  const t = tidy(raw);
  if (!t || OTHER_JOB.test(t)) return null;
  if (ownSiteAsked(t) && t.split(" ").length <= 9) return { url: BRAINO_SITE, own: true };
  const url = addressIn(t);
  if (!url) return null;
  const rest = t.replace(new RegExp(`\\b(?:[a-z0-9-]+\\.)+(?:${TLDS})(\\/\\S*)?`, "gi"), " ")
    .replace(/\b(?:can|could|would|will|you|please|pls|open|up|go|to|visit|try|tri|launch|pull|bring|load|show|me|the|site|website|page|it's|its|ites|it|is|on|in|chrome|for|now|just|again|a|this|that|link|url|address)\b/gi, " ")
    .replace(/[,.\s]+/g, " ").trim();
  // Two leftover words at most, so "trybraino.com is slow today" stays a chat.
  if (rest && rest.split(" ").length > 2) return null;
  return { url, own: url === BRAINO_SITE };
}

module.exports = { BRAINO_SITE, spokenWebsite, ownSiteAsked, addressIn };
