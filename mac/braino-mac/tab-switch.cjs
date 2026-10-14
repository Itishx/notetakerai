// "Switch to the Pinterest tab." One AppleScript reads every tab in every
// Chrome window, pickTab() decides which one you meant, one more brings it to
// the front. No model, well under a second: a person looks along the tab bar
// and clicks, and so does he.
//
// Pure: parsing and matching. main.cjs reads the tabs and switches.

const ORDINALS = { first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3, fourth: 4, "4th": 4, four: 4, fifth: 5, "5th": 5, last: -1, other: 0, another: 0 };

/* A name people say for a site whose tab says something else. */
const ALIASES = {
  meet: ["meet.google.com", "google meet"], "google meet": ["meet.google.com"],
  gmail: ["mail.google.com", "gmail", "inbox"], mail: ["mail.google.com", "gmail", "inbox"], email: ["mail.google.com", "gmail"],
  docs: ["docs.google.com"], doc: ["docs.google.com"], "google doc": ["docs.google.com"], sheets: ["docs.google.com/spreadsheets"], sheet: ["docs.google.com/spreadsheets"],
  slides: ["docs.google.com/presentation"], drive: ["drive.google.com"], calendar: ["calendar.google.com"],
  yt: ["youtube.com"], youtube: ["youtube.com", "youtube"], insta: ["instagram.com"], instagram: ["instagram.com"],
  twitter: ["x.com", "twitter.com"], x: ["x.com"], chatgpt: ["chatgpt.com", "chat.openai.com"], gpt: ["chatgpt.com"],
  claude: ["claude.ai"], github: ["github.com"], linkedin: ["linkedin.com"], whatsapp: ["web.whatsapp.com"],
  netflix: ["netflix.com"], prime: ["primevideo.com"], hotstar: ["hotstar.com"], spotify: ["open.spotify.com"],
  nexus: ["nexus", "mesa"], mesa: ["mesa"], notion: ["notion.so", "notion.site", "notion.com"], figma: ["figma.com"], canva: ["canva.com"],
  amazon: ["amazon."], flipkart: ["flipkart.com"], pinterest: ["pinterest."], reddit: ["reddit.com"], maps: ["google.com/maps", "maps"],
};

function clean(raw) {
  return String(raw || "").trim()
    .replace(/^(?:(?:hey|ok|okay|so|now|and)[\s,.!]+)*/i, "")
    .replace(/^(?:hey\s+)?(?:brain(?:o|elle)|bruno|brino|reno)\b[\s,.!]*/i, "")
    .replace(/^(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:now\s+)?/i, "")
    .replace(/[.?!]+$/, "")
    .replace(/(?:\s+(?:for me|please|now|right now))+$/i, "")
    .trim();
}

/* { query, nth, saidTab } or null. nth: 1-based, -1 last, 0 "the other one". */
function parseTabSwitch(raw) {
  const t = clean(raw).toLowerCase();
  if (!t || t.length > 80 || /\b(?:and then|then|after that|and (?:play|send|search|open|close))\b/.test(t)) return null;
  /* "Open the localhost link in a new tab" is opening something, not finding
     a tab called "localhost link in a new" (2026-10-03). */
  if (/\b(?:in|into|on)\s+(?:a\s+)?new\s+(?:tab|window)\b|\bnew\s+tab\b/.test(t)) return null;
  const m = t.match(/^(?:switch|go|jump|move|take me|bring me|get me)\s+(?:back\s+)?(?:over\s+)?(?:to|onto)\s+(?:the\s+|my\s+)?(.+?)$|^(?:open|show|show me|bring up|pull up)\s+(?:the\s+|my\s+)(.+?)\s+tab$/);
  if (!m) return null;
  let rest = (m[1] || m[2] || "").trim();
  const saidTab = /\btab\b/.test(t);
  rest = rest.replace(/\s+(?:tab|page|window|one)s?$/, "").replace(/\s+(?:in|on)\s+chrome$/, "").trim();
  let nth = 1;
  const o = rest.match(/^(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last|other|another)\s+(.+)$/);
  if (o) { nth = ORDINALS[o[1]]; rest = o[2].trim(); }
  rest = rest.replace(/\s+(?:tab|page|one)$/, "").replace(/^(?:the|a|an|that)\s+/, "").trim();
  if (!rest || rest.length > 40) return null;
  // "switch to the next tab" is the instant key, not a search for "next".
  if (/^(?:next|previous|last one|new)$/.test(rest)) return null;
  return { query: rest, nth, saidTab };
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
}

/* tabs: [{ w, i, title, url, active }] in tab-bar order. Returns one or null. */
function pickTab(tabs, parsed) {
  if (!parsed || !Array.isArray(tabs) || !tabs.length) return null;
  const q = parsed.query.toLowerCase();
  const needles = [q, ...(ALIASES[q] || [])];
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const score = (tab) => {
    const host = hostOf(tab.url).toLowerCase();
    const url = String(tab.url || "").toLowerCase();
    const title = String(tab.title || "").toLowerCase();
    let s = 0;
    for (const n of needles) {
      if (host && (host === n || host.startsWith(`${n}.`) || host.includes(n))) s = Math.max(s, 3);
      else if (url.includes(n)) s = Math.max(s, 2.5);
      else if (title.includes(n)) s = Math.max(s, 2);
    }
    if (!s && words.length && words.every((w) => title.includes(w) || url.includes(w))) s = 1.5;
    /* Heard a little wrong ("Samir Ana" for "Samir Rana", 2026-09-26): most
       of the words, each within a letter, still point at the tab. */
    if (!s && words.length) {
      const tw = `${title} ${url}`.replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((x) => x.length > 2);
      const near = (w) => tw.some((x) => x === w || (w.length >= 3 && x.length >= 3 && (x.includes(w) || lev(x, w) <= 1)));
      const hit = words.filter(near).length;
      if (hit && hit / words.length >= 0.5) s = 1 + hit / words.length / 2;
    }
    return s;
  };
  const hits = tabs.map((tab) => ({ tab, s: score(tab) })).filter((h) => h.s > 0);
  if (!hits.length) return null;
  const best = Math.max(...hits.map((h) => h.s));
  const matches = hits.filter((h) => h.s >= best - 0.5).map((h) => h.tab);
  if (parsed.nth === -1) return matches[matches.length - 1];
  if (parsed.nth === 0) return matches.find((tab) => !tab.active) || matches[0];
  if (parsed.nth > 1) return matches[parsed.nth - 1] || null;
  // Plain "switch to YouTube" while on a YouTube tab means the other one.
  return matches.find((tab) => !tab.active) || matches[0];
}

/* Every tab of every Chrome window, with its window and position. Two calls
   per window, not two per tab: per tab took 2.9s for eight tabs. */
const LIST_TABS_SCRIPT = `
set TB to (ASCII character 9)
tell application "Google Chrome"
  if (count of windows) = 0 then return ""
  set out to ""
  repeat with wi from 1 to (count of windows)
    try
      set u to URL of every tab of window wi
      set n to title of every tab of window wi
      set act to active tab index of window wi
      repeat with ti from 1 to (count of u)
        set out to out & wi & TB & ti & TB & (ti = act) & TB & (item ti of u) & TB & (item ti of n) & linefeed
      end repeat
    end try
  end repeat
  return out
end tell`;

function parseTabList(stdout) {
  const tabs = [];
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const [w, i, act, url, ...title] = line.split("\t");
    if (!w || !i) continue;
    tabs.push({ w: Number(w), i: Number(i), active: act === "true" && Number(w) === 1, url: url || "", title: title.join("\t").trim() });
  }
  return tabs;
}

function switchScript(w, i) {
  return `tell application "Google Chrome"
  set active tab index of window ${Number(w)} to ${Number(i)}
  set index of window ${Number(w)} to 1
  activate
end tell`;
}

module.exports = { parseTabSwitch, pickTab, parseTabList, switchScript, LIST_TABS_SCRIPT, hostOf };
