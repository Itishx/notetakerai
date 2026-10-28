/* Handle mode (a.k.a. Play mode): Braino does the thing on screen himself.
 *
 * "Handle this for me", "fill this form for me", "play this game", "next
 * round". The loop lives in main.cjs ("Play mode" section); this file is the
 * pure half, so it can be tested without Electron: the fixed prompt, reading
 * the model's JSON, the safety rules, the exam detector and the cost sums.
 *
 * Structure first. A web page read as a list of numbered fields and buttons is
 * cheaper and far more precise than a picture of it, so a screenshot is only
 * sent when there is nothing to read (a canvas game) or every Nth step as a
 * sanity check.
 */

const MAX_STEPS = 60;
const MAX_MS = 20 * 60 * 1000;
const MAX_BATCH = 5;
const VISION_EVERY = 6; // a picture every Nth step in structure mode, to check the read

// gpt-5.6-luna, estimated: Astra is $10/M in and $50/M out, Luna is 1/50 and 1/42 of that.
const USD_PER_M_IN = 0.2;
const USD_PER_M_OUT = 1.2;
// The server appends Braino's personality to the delegate prompt; roughly this many tokens.
const SERVER_PROMPT_TOKENS = 1500;
// One 1280px-wide screenshot at high detail is about this many image tokens.
const IMAGE_TOKENS = 1100;

const SYSTEM_PROMPT = `You are Braino, operating something on the user's screen by yourself until the job is finished: a form, a web app, a dashboard, or a browser-based business/operations simulation game.
Each turn you get the user's goal, what you did so far, and the screen: either a STRUCTURE (numbered elements like "[12] input:number \\"Order quantity\\" = \\"100\\"", plus page text) or a SCREENSHOT (with OCR lines), or both.

Return ONE JSON object, nothing else:
{"thought":"one short sentence, what you see and why","actions":[ ... up to 5 ... ],"final":false}
Each action is one of:
 {"action":"set","id":12,"value":"120"}            set a field / pick a dropdown option by its words (structure only)
 {"action":"click","id":7}                          click an element by id (structure)
 {"action":"click","x":640,"y":410}                 click at screenshot pixels (screenshot only)
 {"action":"double_click","x":..,"y":..}
 {"action":"type","text":"..."}                     type into the focused field
 {"action":"key","key":"enter|tab|escape|up|down|left|right|pageup|pagedown|space"}
 {"action":"scroll","dy":600}                       positive = down
 {"action":"wait","ms":1500}
 {"action":"look"}                                  you need a screenshot next turn (canvas, images, charts)
 {"action":"done","summary":"one or two plain sentences of what you did and the result"}
 {"action":"ask","question":"one short question"}  only if truly stuck or the decision needs the user
 {"action":"refuse","reason":"exam|captcha|login|payment"}

Rules:
- Carry the job all the way: fill every field, then press Next/Continue, go through every page or section, and reach the final step. A form is not done until it is submitted (the app will ask the user before the final click). A game round is not done until its decisions are submitted.
- Several actions in one turn ONLY when they are all field fills on the same page, optionally followed by one click. Otherwise one action.
- Use only what is on screen. Read the numbers (cash, demand, inventory, prices, capacity) and make sensible, explained decisions. Never invent data. If a decision needs information that is not visible, open the relevant tab or scroll first.
- Prefer ids from the structure over coordinates. Coordinates are screenshot pixels.
- Never type passwords, card numbers, OTPs, or personal data you were not given. Never solve CAPTCHAs. Never click pay, buy, purchase, place order, or delete account.
- If the page is an exam, quiz, test, assessment, or anything proctored or graded, return refuse with reason "exam".
- If the screen did not change after your last action, try something different.
- Final actions (submit, send, confirm, book, finish, publish, delete): set "final": true on that turn.`;

/* What the model returned, as a clean list of actions. Tolerates code fences
   and a single action given without the actions array. */
function parsePlayReply(raw) {
  let text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(text.slice(start, end + 1)); } catch (_) { return null; }
  if (!obj || typeof obj !== "object") return null;
  let actions = Array.isArray(obj.actions) ? obj.actions : (obj.action ? [obj] : []);
  actions = actions.filter((a) => a && typeof a === "object" && typeof a.action === "string").map((a) => ({ ...a, action: String(a.action).toLowerCase() }));
  if (!actions.length) return null;
  // A batch is only fills plus one closing click; anything else runs alone.
  if (actions.length > 1) {
    const fills = actions.filter((a) => a.action === "set" || a.action === "type");
    const last = actions[actions.length - 1];
    const okBatch = fills.length >= actions.length - 1 && (fills.length === actions.length || last.action === "click");
    actions = okBatch ? actions.slice(0, MAX_BATCH) : [actions[0]];
  }
  return { thought: String(obj.thought || "").slice(0, 200), actions, final: obj.final === true };
}

/* Words that mean "you cannot take this back". Asked before, once per label per run. */
const FINAL_RE = /\b(submit|send|pay|confirm|book|delete|remove|finish|finali[sz]e|publish|place order|purchase|checkout|apply now|transfer)\b/i;
/* Never, even with a yes. */
const FORBIDDEN_CLICK_RE = /\b(pay(?:\s+now)?|buy(?:\s+now)?|purchase|place\s+order|delete\s+(?:my\s+)?account|close\s+(?:my\s+)?account)\b/i;
const SECRET_FIELD_RE = /\b(password|passcode|otp|one[- ]time|cvv|cvc|card\s*number|credit\s*card|debit\s*card|expiry|expiration|security\s*code|upi\s*pin|pin)\b/i;
const CAPTCHA_RE = /\b(captcha|recaptcha|hcaptcha|i'?m not a robot|verify you are human)\b/i;

function isFinalLabel(label) { return FINAL_RE.test(String(label || "")); }
function isForbiddenClick(label) { return FORBIDDEN_CLICK_RE.test(String(label || "")); }
function isSecretField(role, label) {
  return /password/i.test(String(role || "")) || SECRET_FIELD_RE.test(String(label || ""));
}

/* Does this look like a test someone is being graded on? Strong words alone
   (exam, quiz, assessment, proctored) count; a bare "test" only with exam
   furniture beside it (question N of M, time remaining, marks). Returns the
   reason, or "". Can be wrong, which is why the user can override it. */
function detectExam(text) {
  const t = String(text || "").slice(0, 12000);
  if (CAPTCHA_RE.test(t)) return "";
  const strong = t.match(/\b(exam(?:ination)?|quiz(?:zes)?|assessment|proctor(?:ed|ing)?|mid-?term|end-?term|viva)\b/i);
  const qOfN = /\bquestion\s+\d+\s*(?:of|\/)\s*\d+\b/i.test(t);
  const timer = /\b(time\s+(?:remaining|left)|remaining\s+time)\b/i.test(t);
  const marks = /\b\d+\s*(?:marks?|points?)\b/i.test(t) && /\bquestion\b/i.test(t);
  const test = /\b(test|mcq)\b/i.test(t);
  if (strong && (qOfN || timer || marks || /\b(exam|quiz|proctor)/i.test(strong[0]))) return `"${strong[0]}"${qOfN ? " + question N of M" : ""}${timer ? " + timer" : ""}`;
  if (test && (qOfN || timer || marks)) return `"test"${qOfN ? " + question N of M" : ""}${timer ? " + timer" : ""}${marks ? " + marks" : ""}`;
  if (qOfN && timer) return "question N of M + timer";
  return "";
}
function detectCaptcha(text) { return CAPTCHA_RE.test(String(text || "")); }

/* Screenshot pixels to screen points. The capture was of the window rect in
   points; the image may be any size (Retina, downscaled), so scale by width. */
function mapPoint(x, y, rect, img) {
  const sx = rect.width / (img.width || rect.width);
  const sy = rect.height / (img.height || rect.height);
  const px = Math.round(rect.x + Number(x) * sx);
  const py = Math.round(rect.y + Number(y) * sy);
  const inside = px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
  return { x: px, y: py, inside };
}

function estimateTokens(chars, hasImage) {
  return Math.ceil(Number(chars || 0) / 4) + SERVER_PROMPT_TOKENS + (hasImage ? IMAGE_TOKENS : 0);
}
function estimateCostUsd(inTok, outTok) {
  return (Number(inTok || 0) * USD_PER_M_IN + Number(outTok || 0) * USD_PER_M_OUT) / 1e6;
}

/* One short line for the notch trail, from an action and what it touched. */
function stepLine(a, label) {
  const name = String(label || "").replace(/\s+/g, " ").trim().slice(0, 40);
  switch (a.action) {
    case "set": return `Set ${name || "a field"} to ${String(a.value ?? "").slice(0, 30)}`;
    case "click": return name ? `Clicked ${name}` : "Clicked";
    case "double_click": return "Double clicked";
    case "type": return `Typed ${String(a.text || "").slice(0, 30)}`;
    case "key": return `Pressed ${a.key}`;
    case "scroll": return Number(a.dy) < 0 ? "Scrolled up" : "Scrolled down";
    case "wait": return "Waiting for the page";
    case "look": return "Taking a closer look";
    default: return "";
  }
}

const TRIGGER_RE = /\b(handle this|take care of this|do this for me|fill (?:this|the) form|finish this|complete this|play (?:this|the) game|solve this|next round|play the next round)\b/i;
const OVERRIDE_RE = /\b(do it anyway|it'?s not a test|not a test)\b/i;
const YES_RE = /^(?:yes|yeah|yep|yup|sure|ok(?:ay)?|go|go ahead|do it|send|send it|submit|haan|ha|han|approve[d]?|confirm)\b/i;
const NO_RE = /^(?:no|nope|nah|don'?t|stop|cancel|mat|nahi|wait)\b/i;

module.exports = {
  MAX_STEPS, MAX_MS, MAX_BATCH, VISION_EVERY, SYSTEM_PROMPT,
  parsePlayReply, isFinalLabel, isForbiddenClick, isSecretField, detectExam, detectCaptcha,
  mapPoint, estimateTokens, estimateCostUsd, stepLine,
  TRIGGER_RE, OVERRIDE_RE, YES_RE, NO_RE, USD_PER_M_IN, USD_PER_M_OUT, IMAGE_TOKENS,
};
