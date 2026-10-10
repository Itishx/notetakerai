// "Type Savannah Watson videos" / "search for Savannah" — typed where you are
// and entered, instantly, with no model. A person saying "type X" means type
// it and press Enter; "search for X" means search for it right here: in the
// page's own search box if it has one, otherwise on the site (YouTube's
// results, say), otherwise Google, in the same tab.
//
// On 2026-09-26 "type Savannah Watson videos" went to the planner, which
// clicked around the screen for 20 seconds. This is the skill instead.
//
// Pure: parsing, the page script and the fallback address. main.cjs runs them.

function clean(raw) {
  return String(raw || "").trim()
    .replace(/^(?:(?:hey|hi|hello|ok|okay|so|now|and|alright)[\s,.!]+)*/i, "")
    .replace(/^(?:hey\s+)?(?:brain(?:o|elle)|bruno|brino|reno)\b[\s,.!]*/i, "")
    .replace(/^(?:(?:okay|ok|so|now|and)[\s,.!]+)*/i, "")
    .replace(/^(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:just\s+)?/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

// Jobs that happen to start with these words but are not "type this here".
const NOT_TYPING = /\b(?:an?\s+(?:email|mail|note|message|doc(?:ument)?|letter|essay|post|tweet|reply)|to\s+\w+\s+on\s+whats\s*app|my\s+(?:files?|folders?|downloads|documents|mail|email|inbox|messages|notes|mac|computer|laptop))\b/i;
/* A reference to something he is meant to WRITE, not words to type.
   2026-09-29: "just write the goddam post" typed "the goddam post" into
   LinkedIn, and "write the post I told you to" typed "the post I told you to".
   Those are the job itself; the thinking loop writes the post. */
const REFERS_TO_A_JOB = /^(?:the|that|this|my|your|our)\b(?:\s+\w+){0,3}?\s+(?:post|posts|email|mail|message|note|reply|draft|caption|comment|tweet|thread|article|bio|summary|essay|letter|one|thing|stuff)\b|\b(?:i\s+(?:told|asked)\s+you|i\s+said|we\s+(?:discussed|talked about)|you\s+were\s+(?:writing|doing)|like\s+i\s+said)\b/i;
const NOT_WEB_SEARCH = /\b(?:files?|folders?|documents?|downloads|e-?mails?|inbox|my notes|messages|whatsapp|on my (?:mac|computer|laptop)|my (?:mac|computer|laptop))\b/i;
const SITES = {
  youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  amazon: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  pinterest: (q) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`,
  spotify: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  github: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  linkedin: (q) => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`,
  reddit: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  x: (q) => `https://x.com/search?q=${encodeURIComponent(q)}`,
  twitter: (q) => `https://x.com/search?q=${encodeURIComponent(q)}`,
  flipkart: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  /* 2026-10-01: "search medium for machine learning articles" googled the
     whole sentence, because Medium was not in this list. */
  medium: (q) => `https://medium.com/search?q=${encodeURIComponent(q)}`,
  wikipedia: (q) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
  quora: (q) => `https://www.quora.com/search?q=${encodeURIComponent(q)}`,
  stackoverflow: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  producthunt: (q) => `https://www.producthunt.com/search?q=${encodeURIComponent(q)}`,
  substack: (q) => `https://substack.com/search/${encodeURIComponent(q)}`,
  instagram: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
};
const SITE_NAMES = Object.keys(SITES).join("|");
/* "stack overflow", "product hunt", "medium.com": said the way people say them. */
function siteKey(word) {
  return String(word || "").toLowerCase().replace(/\.com$|\.org$|\.in$/, "").replace(/\s+/g, "");
}

/* { mode: "type"|"search", text, site?, enter } or null. */
function parseTypeSearch(raw) {
  const t = clean(raw);
  if (!t || t.length > 120) return null;
  if (/\b(?:and\s+(?:then\s+)?(?:send|open|play|tell|book|share|save)|then|after that)\b/i.test(t)) return null;
  let m = t.match(/^(?:type|write|enter|put)\s+(?:in\s+|out\s+|down\s+)?(?:the\s+words?\s+|this:?\s+)?["“']?(.+?)["”']?(?:,?\s+(?:and\s+(?:then\s+)?)?(?:press\s+|hit\s+)?(?:enter|search|go|submit))?(?:\s+(?:here|in\s+(?:the\s+)?(?:search(?:\s+bar|\s+box)?|box|field)))?$/i);
  if (m && !NOT_TYPING.test(t) && !REFERS_TO_A_JOB.test(m[1])) {
    const text = m[1].trim();
    if (text && text.split(/\s+/).length <= 16 && !/^(?:it|that|this|something|here)$/i.test(text)) return { mode: "type", text, enter: true };
  }
  /* "search" and "google" only. "Look up the weather" and "find me a place to
     eat" want an answer said back, and "find X and book it" is a whole job. */
  if (/\b(?:and\s+(?:then\s+)?(?:book|buy|order|send|open|play|tell|add|compare|share|save)|then|after that)\b/i.test(t)) return null;
  m = t.match(new RegExp(`^(?:search|google)\\s+(?:for\\s+|up\\s+)?["“']?(.+?)["”']?(?:\\s+(?:on|in)\\s+(${SITE_NAMES}|stack\\s+overflow|product\\s+hunt|[a-z]+\\.(?:com|org|in)|this\\s+(?:site|page)|here))?$`, "i"));
  if (m && !NOT_WEB_SEARCH.test(t)) {
    let text = m[1].trim();
    const site = (m[2] || "").toLowerCase();
    if (!text || text.split(/\s+/).length > 14) return null;
    // "search youtube for cats"
    const lead = text.match(/^((?:stack\s+overflow|product\s+hunt|[a-z]+(?:\.(?:com|org|in))?))\s+for\s+(.+)$/i);
    if (lead) {
      const key = siteKey(lead[1]);
      if (SITES[key]) return { mode: "search", text: lead[2].trim(), site: key, enter: true };
      /* "search <somewhere> for <thing>" names a place this list does not
         know. Googling the whole sentence is the wrong job, so step aside
         and let HIL do it. */
      return null;
    }
    /* "search for my roadmap on notion": on + a name it does not know is a
       place too. Only "on"; "hotels in goa" is still a plain search. */
    if (!site && /\son\s+[a-z][\w.]*$/i.test(text) && !/\son\s+(?:sale|weekends?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|time|it|this|that|them)$/i.test(text)) return null;
    const where = siteKey(site);
    if (where && !/^this|^here/.test(site) && !SITES[where]) return null;
    return { mode: "search", text, site: /^this|^here/.test(site) ? "" : where, enter: true };
  }
  return null;
}

/* The page's own site, from its address: search there when it can. */
function siteOf(url) {
  const h = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return ""; } })();
  if (/youtube\.com$/.test(h)) return "youtube";
  if (/google\./.test(h)) return "google";
  if (/amazon\./.test(h)) return "amazon";
  if (/pinterest\./.test(h)) return "pinterest";
  if (/github\.com$/.test(h)) return "github";
  if (/reddit\.com$/.test(h)) return "reddit";
  if (/linkedin\.com$/.test(h)) return "linkedin";
  if (/(?:^|\.)x\.com$|twitter\.com$/.test(h)) return "x";
  if (/flipkart\.com$/.test(h)) return "flipkart";
  return "";
}

function searchUrl(site, text) {
  return (SITES[site] || SITES.google)(text);
}

/* Put the text where you'd type it. "search" mode prefers the page's search
   box and replaces what is in it; "type" mode types at the caret of whatever
   is focused, and only falls back to a search box when nothing is. Returns
   "typed" or "none". execCommand("insertText") fires the same events a
   keyboard does, so React, YouTube and Google all see it. */
function typeJs(text, mode) {
  return `(function(t,mode){
  function editable(e){ return e && (e.isContentEditable || (/^(INPUT|TEXTAREA)$/.test(e.tagName) && !/^(button|submit|checkbox|radio|file|hidden|range|color)$/i.test(e.type||""))); }
  var e = document.activeElement;
  var box = document.querySelector('input[name="search_query"],input[type="search"],textarea[name="q"],input[name="q"],[role="searchbox"],input[role="combobox"],input[aria-label*="earch" i],input[placeholder*="earch" i]');
  if (mode === "search" || !editable(e)) { if (box) e = box; else if (!editable(e)) return "none"; }
  e.focus();
  if (mode === "search" && e.select) e.select();
  var ok = document.execCommand("insertText", false, t);
  if (!ok && !e.isContentEditable) {
    var d = Object.getOwnPropertyDescriptor(e.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value");
    d.set.call(e, (mode === "search" ? "" : (e.value || "")) + t);
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return "typed";
})(${JSON.stringify(String(text))}, ${JSON.stringify(mode)})`;
}

module.exports = { parseTypeSearch, siteOf, searchUrl, typeJs };
