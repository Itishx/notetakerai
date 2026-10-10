// Instant fire: commands that are one keystroke, one address or one volume
// change, done in well under a second, with no model anywhere near them.
//
// "Stop the task" and "stop listening" have always felt right because they are
// exactly this. Everything below was going to the step-by-step loop instead,
// and the log for 2026-09-25 shows what that cost: "go back to Instagram and
// open Reels" 77 seconds and a give-up, "click the reels tab" 60 seconds,
// "scroll down to the next reel" answered with "I can skip tracks on Spotify",
// "navigate to the Reels tab" opening Google Maps directions to a place called
// the Reels tab, "reduce the volume by 20%" setting it to 100%, "open an
// incognito window" failing and then taking 18 seconds to say it could not.
//
// Pure: this only decides. main.cjs does it.

function clean(raw) {
  return String(raw || "")
    .trim()
    .replace(/^(?:(?:hey|okay|ok|so|cool|now|alright|and)[\s,.!]+)*/i, "")
    .replace(/^(?:hey\s+)?brain(?:o|elle)\b[\s,.!]*/i, "")
    .replace(/^(?:(?:okay|ok|so|cool|now|alright|and|then|no|nah|not that)[\s,.!]+)*/i, "")
    .replace(/^(?:i\s+(?:want|need|would like)\s+(?:you\s+)?to|let'?s)\s+/i, "")
    .replace(/^(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:just\s+)?/i, "")
    .replace(/[.?!]+$/, "")
    .replace(/(?:\s+(?:for me|please|pls|now|right now|real quick))+$/i, "")
    .trim();
}

/* Anything with a second job in it is not instant: the loop owns those. */
const SECOND_JOB = /\b(?:and then|then|after that|and also|and (?:open|play|send|search|find|click|go|tell|show))\b/i;

function frontIsSocialFeed(ctx) {
  const where = `${ctx?.browserUrl || ""} ${ctx?.browserTitle || ""} ${ctx?.windowTitle || ""}`.toLowerCase();
  return /instagram\.com|instagram|tiktok|youtube\.com\/shorts|reels?\b|shorts\b/.test(where);
}
function frontIsBrowser(ctx) {
  return /chrome|safari|arc|brave|edge|firefox/i.test(String(ctx?.appName || "")) || Boolean(ctx?.browserUrl);
}

/* Returns { kind, ... , say } or null. ctx is the front window as the overlay
   last read it (activeMacContext). */
function parseInstantFire(raw, ctx = {}) {
  const t = clean(raw);
  if (!t) return null;
  const l = t.toLowerCase();
  /* "Go back to Instagram and navigate to the Reels tab, I want to watch
     Reels" is one wish, however it is phrased: Instagram's reels. */
  if (/\breels?\b/.test(l) && (/\binstagram\b/.test(l) || /instagram/i.test(`${ctx?.browserUrl || ""} ${ctx?.browserTitle || ""}`))
    && /\b(?:open|go|navigate|show|take|watch|switch|click)\b/.test(l) && !/\b(?:send|share|post|upload|reply|message|comment|like)\b/.test(l) && l.length <= 140) {
    return { kind: "url", url: "https://www.instagram.com/reels/", say: "" };
  }
  if (t.length > 90 || SECOND_JOB.test(t)) return null;

  // Feed and page movement.
  if (/^(?:go\s+|scroll\s+(?:down\s+)?(?:to\s+)?)?(?:the\s+)?next\s+(?:reel|video|short|post|slide|story|one)$|^(?:scroll|swipe)\s+down(?:\s+(?:to\s+the\s+next\s+\w+|a bit|a little|once))?$|^(?:skip|move on)\s+(?:this|the)\s+(?:reel|video|short|post)$/.test(l)) {
    return frontIsSocialFeed(ctx) || /reel|short|post|story|slide/.test(l)
      ? { kind: "key", keys: "down", say: "" }
      : { kind: "key", keys: "pagedown", say: "" };
  }
  if (/^(?:go\s+)?(?:back\s+to\s+)?(?:the\s+)?previous\s+(?:reel|video|short|post|slide|story|one)$|^(?:scroll|swipe)\s+up(?:\s+(?:a bit|a little|once))?$|^(?:go\s+)?(?:back|up)\s+(?:one|a)\s+(?:reel|video|short|post)$/.test(l)) {
    return frontIsSocialFeed(ctx) || /reel|short|post|story|slide/.test(l)
      ? { kind: "key", keys: "up", say: "" }
      : { kind: "key", keys: "pageup", say: "" };
  }
  if (/^(?:scroll\s+(?:to\s+)?(?:the\s+)?top|go\s+to\s+(?:the\s+)?top)$/.test(l)) return { kind: "key", keys: "cmd+up", say: "" };
  if (/^(?:scroll\s+(?:to\s+)?(?:the\s+)?bottom|go\s+to\s+(?:the\s+)?bottom)$/.test(l)) return { kind: "key", keys: "cmd+down", say: "" };

  // The browser.
  if (frontIsBrowser(ctx) || /\btab\b|\bwindow\b|incognito|private/.test(l)) {
    if (/^(?:go\s+)?back(?:\s+a\s+page)?$|^(?:go\s+to\s+)?(?:the\s+)?previous\s+page$/.test(l)) return { kind: "key", keys: "cmd+[", say: "" };
    if (/^(?:go\s+)?forward(?:\s+a\s+page)?$|^(?:go\s+to\s+)?(?:the\s+)?next\s+page$/.test(l)) return { kind: "key", keys: "cmd+]", say: "" };
    if (/^(?:reload|refresh)(?:\s+(?:the|this))?(?:\s+page)?$/.test(l)) return { kind: "key", keys: "cmd+r", say: "" };
    if (/^(?:open\s+(?:a\s+)?)?new\s+tab$/.test(l)) return { kind: "key", keys: "cmd+t", say: "" };
    if (/^close\s+(?:this|the|current)\s+tab$|^close\s+tab$/.test(l)) return { kind: "key", keys: "cmd+w", say: "" };
    if (/^(?:reopen|restore|bring back)\s+(?:the\s+)?(?:last\s+)?(?:closed\s+)?tab$|^undo\s+close\s+tab$/.test(l)) return { kind: "key", keys: "cmd+shift+t", say: "" };
    if (/^(?:go\s+to\s+)?(?:the\s+)?next\s+tab$|^switch\s+(?:to\s+)?(?:the\s+)?next\s+tab$/.test(l)) return { kind: "key", keys: "ctrl+tab", say: "" };
    if (/^(?:go\s+to\s+)?(?:the\s+)?previous\s+tab$|^switch\s+(?:to\s+)?(?:the\s+)?previous\s+tab$/.test(l)) return { kind: "key", keys: "ctrl+shift+tab", say: "" };
  }
  /* The front window. "Maximize my Chrome tab" was a 7.4s plan that clicked
     the green button (2026-09-26). */
  if (/^(?:maximi[sz]e|enlarge|expand|fill the screen with)\s+(?:the\s+|my\s+|this\s+)?(?:\w+\s+)?(?:window|tab|app|screen)?$|^make\s+(?:it|this|the window|chrome)\s+(?:full\s*screen|bigger|big)$/.test(l)) return { kind: "maximize", say: "" };
  if (/^(?:minimi[sz]e|hide)\s+(?:the\s+|my\s+|this\s+)?(?:\w+\s+)?(?:window|tab|app)$/.test(l)) return { kind: "key", keys: "cmd+m", say: "" };
  if (/^(?:go\s+|make\s+it\s+|enter\s+)?full\s*screen$/.test(l)) return { kind: "key", keys: "ctrl+cmd+f", say: "" };
  if (/^(?:open|start|launch)\s+(?:an?\s+)?(?:new\s+)?(?:incognito|private)(?:\s+(?:browsing\s+)?(?:window|tab|mode))?$|^(?:go|switch)\s+incognito$/.test(l)) {
    return { kind: "incognito", say: "Incognito's open." };
  }

  // Instagram's own tabs, by address: nobody needs to find the icon.
  const insta = /instagram/i.test(`${ctx?.browserUrl || ""} ${ctx?.browserTitle || ""}`) || /\binstagram\b/.test(l);
  const tab = l.match(/^(?:open|go\s+to|navigate\s+to|show\s+me|take\s+me\s+to|switch\s+to|click\s+(?:on\s+)?)\s*(?:the\s+)?(?:instagram\s+)?(reels?|explore|messages|inbox|dms?|notifications|profile|home)(?:\s+(?:tab|page|section|feed|icon))?(?:\s+on\s+instagram)?$/);
  if (insta && tab) {
    const map = { reel: "reels/", reels: "reels/", explore: "explore/", messages: "direct/inbox/", inbox: "direct/inbox/", dm: "direct/inbox/", dms: "direct/inbox/", notifications: "notifications/", home: "", profile: "accounts/edit/" };
    return { kind: "url", url: `https://www.instagram.com/${map[tab[1]] ?? ""}`, say: "" };
  }

  // Volume, relative or absolute. "Reduce the volume by 20%" was setting 100%.
  const vol = l.match(/^(?:(reduce|lower|decrease|drop|turn\s+down|bring\s+down)|(increase|raise|turn\s+up|bring\s+up|boost))\s+(?:the\s+)?(?:volume|sound|music)(?:\s+(?:by\s+)?(\d{1,3})\s*(?:%|percent)?)?$|^(?:(?:reduce|lower|decrease|turn\s+down)|(?:increase|raise|turn\s+up))\s+it(?:\s+by\s+(\d{1,3})\s*(?:%|percent)?)?$/);
  if (vol) {
    const down = Boolean(vol[1]) || /^(?:reduce|lower|decrease|turn\s+down)/.test(l);
    const by = Number(vol[3] || vol[4] || 15);
    return { kind: "volume", mode: "relative", value: Math.max(1, Math.min(100, by)), direction: down ? -1 : 1, say: "" };
  }
  const setVol = l.match(/^(?:set|put|make)\s+(?:the\s+)?(?:volume|sound)\s+(?:to|at)\s+(\d{1,3})\s*(?:%|percent)?$|^volume\s+(\d{1,3})\s*(?:%|percent)?$/);
  if (setVol) return { kind: "volume", mode: "absolute", value: Math.max(0, Math.min(100, Number(setVol[1] || setVol[2]))), direction: 1, say: "" };

  return null;
}

/* "cmd+shift+t" as an AppleScript line for System Events. */
const KEY_CODES = { down: 125, up: 126, left: 123, right: 124, pagedown: 121, pageup: 116, return: 36, escape: 53, space: 49, tab: 48 };
function appleScriptForKeys(keys) {
  const parts = String(keys || "").toLowerCase().split("+").map((s) => s.trim()).filter(Boolean);
  const key = parts.pop();
  const mods = parts.map((m) => ({ cmd: "command down", command: "command down", shift: "shift down", ctrl: "control down", control: "control down", alt: "option down", option: "option down" }[m])).filter(Boolean);
  const using = mods.length ? ` using {${mods.join(", ")}}` : "";
  if (Object.prototype.hasOwnProperty.call(KEY_CODES, key)) return `tell application "System Events" to key code ${KEY_CODES[key]}${using}`;
  return `tell application "System Events" to keystroke ${JSON.stringify(key)}${using}`;
}

module.exports = { parseInstantFire, appleScriptForKeys, clean };
