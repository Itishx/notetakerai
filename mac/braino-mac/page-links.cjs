// "Send the first photo to Param": which link is "the first photo" on this
// page? A person looks; Braino reads the page. One script lists the links a
// person would call the results (pins on Pinterest, videos on YouTube, results
// on Google, posts on Instagram, products on Amazon, else links around images
// and headings in the main content), in reading order, top to bottom and left
// to right. No screenshot, no model: well under a second.
//
// On 2026-09-26 "send the link of the first photo to Param" went to the step
// by step loop, looked at the screen, and stopped at 20 seconds.
//
// Pure: the page script, the ordinal words and the recipe match. main.cjs runs it.

const ORDINAL = { first: 1, top: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, fifth: 5, "5th": 5, last: -1, this: 0, that: 0 };

/* The script: [{ url, title }] in reading order, at most 30. kind narrows
   it: "photo" wants links with an image in them, "video" video links. */
function pageLinksJs(kind) {
  return `(function(kind){
  var h = location.hostname, sel;
  if (/pinterest\\./.test(h)) sel = 'a[href*="/pin/"]';
  else if (/youtube\\.com$/.test(h)) sel = 'a#video-title, a#video-title-link, a#thumbnail[href*="watch"], a[href^="/shorts/"], ytd-rich-item-renderer a[href*="watch"]';
  else if (/google\\./.test(h)) sel = '#search a:has(h3), #rso a:has(h3)';
  else if (/instagram\\.com$/.test(h)) sel = 'a[href*="/p/"], a[href*="/reel/"]';
  else if (/amazon\\./.test(h)) sel = 'a[href*="/dp/"]';
  else if (/reddit\\.com$/.test(h)) sel = 'a[href*="/comments/"]';
  else if (/(^|\\.)x\\.com$|twitter\\.com$/.test(h)) sel = 'a[href*="/status/"]';
  else sel = 'main a, article a, [role="main"] a, #content a, a:has(img), a:has(h2), a:has(h3)';
  var seen = {}, out = [];
  var els = Array.prototype.slice.call(document.querySelectorAll(sel));
  els.forEach(function(a){
    var r = a.getBoundingClientRect(); if (!r.width || !r.height) return;
    if (a.closest('nav,header,footer,[role="navigation"],[role="banner"]')) return;
    var u = a.href; if (!u || /^javascript:|#$/.test(u) || seen[u]) return;
    var img = a.querySelector('img,video,picture');
    if (kind === "photo" && !img && !/\\/pin\\/|\\/p\\//.test(u)) return;
    if (kind === "video" && !/watch|shorts|\\/reel\\/|video/.test(u)) return;
    seen[u] = 1;
    var t = ((a.querySelector('h3,h2') || {}).innerText || a.innerText || a.getAttribute('aria-label') || (img && img.alt) || '').replace(/\\s+/g,' ').trim().slice(0, 90);
    out.push({ url: u, title: t, y: Math.round(r.top + window.scrollY), x: Math.round(r.left) });
  });
  out.sort(function(p, q){ return Math.abs(p.y - q.y) < 24 ? p.x - q.x : p.y - q.y; });
  return JSON.stringify(out.slice(0, 30).map(function(o){ return { url: o.url, title: o.title }; }));
})(${JSON.stringify(String(kind || "any"))})`;
}

/* The one meant: nth is 1-based, -1 last, 0 "this one" (the first). */
function pickLink(links, nth) {
  if (!Array.isArray(links) || !links.length) return null;
  if (nth === -1) return links[links.length - 1];
  return links[Math.max(0, (nth || 1) - 1)] || null;
}

/* "send (the link of) the first photo to Param", "share the second video with
   Ilu on WhatsApp", "send Param the top result". { nth, kind, to } or null. */
function parseSendPageLink(raw) {
  const t = String(raw || "").trim().replace(/^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)/i, "").replace(/^(?:(?:can|could|would) you\s+)?(?:please\s+)?/i, "").replace(/[.!?]+$/, "").trim();
  const TARGET = "(first|top|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last|this|that)\\s+(photo|picture|image|pic|pin|video|reel|post|result|link|product|one)";
  let m = t.match(new RegExp(`^(?:send|share|forward|text|whatsapp)\\s+(?:the\\s+)?(?:link\\s+(?:of|to|for)\\s+)?(?:the\\s+)?${TARGET}(?:'s\\s+link)?\\s+(?:to|with)\\s+([A-Za-z][\\w .'-]{0,30}?)(?:\\s+(?:on|via|over)\\s+whats\\s*app)?$`, "i"));
  if (m) return { nth: ORDINAL[m[1].toLowerCase()] ?? 1, kind: kindOf(m[2]), to: m[3].trim() };
  m = t.match(new RegExp(`^(?:send|share)\\s+([A-Za-z][\\w .'-]{0,30}?)\\s+(?:the\\s+)?(?:link\\s+(?:of|to)\\s+)?(?:the\\s+)?${TARGET}(?:\\s+(?:on|via|over)\\s+whats\\s*app)?$`, "i"));
  if (m && !/^(?:the|a|this|that|link)$/i.test(m[1])) return { nth: ORDINAL[m[2].toLowerCase()] ?? 1, kind: kindOf(m[3]), to: m[1].trim() };
  return null;
}
function kindOf(w) {
  const x = String(w || "").toLowerCase();
  return /photo|picture|image|pic|pin/.test(x) ? "photo" : /video|reel/.test(x) ? "video" : "any";
}

module.exports = { pageLinksJs, pickLink, parseSendPageLink, ORDINAL };
