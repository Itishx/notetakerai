"use strict";

/* Talk me through it (2026-10-10). While Braino works on a long job he says
 * what he is doing, the way a person helping you would: first what he heard
 * ("Got it. Finding the cheapest flights."), then a short line as each real
 * step starts ("Opening Google Flights."). Seeing a silent thing click around
 * your screen is unnerving; hearing it is someone helping.
 *
 * Lines come from what he already knows (the goal he restated, the step's own
 * label), so this costs no model call. Pure and tested; main.cjs owns sending.
 * House rule: no dashes in anything he says. */

const IRREGULAR = { step: "stepping", tap: "tapping", drop: "dropping", grab: "grabbing", chat: "chatting", swap: "swapping", skip: "skipping", pin: "pinning", ship: "shipping", dig: "digging", win: "winning", get: "getting", run: "running", put: "putting", set: "setting", shop: "shopping", stop: "stopping", plan: "planning", sit: "sitting", hit: "hitting", see: "seeing", be: "being", die: "dying", lie: "lying", tie: "tying" };

function clean(text) {
  return String(text || "")
    .replace(/[—–]/g, ",")
    .replace(/^\s*(?:the user|user|they|he|she)\s+(?:wants?|would like|needs?|asked)\s+(?:me\s+)?to\s+/i, "")
    .replace(/^\s*(?:i\s+(?:will|need to|should|am going to|'ll)|let me|now|next|then|so)\s+/i, "")
    /* The goal is written about you ("so the user can confirm it"), and he
       says it to you (2026-10-17). */
    .replace(/\bthe user's\b/gi, "your")
    .replace(/\bthe user\s+(their|his|her)\b/gi, "you your")
    .replace(/\bthe user\b/gi, "you")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;:]+$/, "");
}

/* "fill both HSN fields" -> "Filling both HSN fields." */
function asDoing(phrase) {
  const text = clean(phrase);
  if (!text) return "";
  const [first, ...rest] = text.split(" ");
  const verb = first.toLowerCase();
  let doing;
  if (/ing$/.test(verb) && verb.length > 4) doing = verb;
  else if (IRREGULAR[verb]) doing = IRREGULAR[verb];
  else if (/[^aeiouy]e$/.test(verb) || /[^e]ue$/.test(verb)) doing = verb.slice(0, -1) + "ing";
  else doing = verb + "ing";
  const line = [doing, ...rest].join(" ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

/* What a loop step is doing, said from the action itself. The step's
   "intent" is his private reason ("A draft has to exist before I can address
   it"), and the bare decision type is just "step", which came out as
   "Steping." (2026-10-11). Looking and waiting are not worth saying. */
const ACTION_LINES = { navigate: "Opening the page.", open_url: "Opening the page.", click: "Clicking that.", type: "Typing it in.", fill: "Filling it in.", scroll: "Scrolling.", key: "Pressing keys.", press_keys: "Pressing keys.", select: "Picking it.", upload: "Uploading it." };
const SILENT_ACTIONS = new Set(["look", "wait", "screenshot", "observe", "read", "screen_vision", "step"]);
function stepLine(action, plainTool) {
  const type = String(action?.type || "").toLowerCase();
  if (!type || SILENT_ACTIONS.has(type)) return "";
  if (type === "tool") {
    const tool = String(action?.tool || action?.name || "");
    if (!tool || SILENT_ACTIONS.has(tool)) return "";
    const plain = plainTool ? plainTool(tool) : "";
    return plain ? asDoing(plain) : "";
  }
  return ACTION_LINES[type] || "";
}

/* One short job is worth saying back: "Got it. Finding flights to Goa." A
   handoff of six read the whole list out, cut off at 140 characters halfway
   through a flight (2026-10-24). A list is acknowledged like a person would:
   short, and then the work. */
const ACK_SHORT = [
  "Got it, getting it done for you.",
  "On it, handing it over now.",
  "Got it, clearing it out for you now.",
  "On it. I'll tell you when it's done.",
];
let ackTurn = 0;
function ackLine(goal) {
  const text = String(goal || "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const many = words > 12 || /[,;]|\b(?:then|and then|after that)\b/i.test(text) || /\band\b.*\band\b/i.test(text);
  if (many) return ACK_SHORT[(ackTurn++) % ACK_SHORT.length];
  const doing = asDoing(text);
  return doing ? `Got it. ${doing}` : "Got it.";
}

/* One narrator per job: never the same line twice, never two lines on top of
   each other (a gap between them), and the opening "Got it" always goes. */
function createNarrator(send, { minGapMs = 4500, now = () => Date.now(), maxLines = 6 } = {}) {
  let lastAt = 0;
  let count = 0;
  let acked = false;
  const said = new Set();
  function out(text, force) {
    const line = String(text || "").slice(0, 140);
    if (!line || said.has(line.toLowerCase()) || count >= maxLines) return false;
    if (!force && now() - lastAt < minGapMs) return false;
    said.add(line.toLowerCase());
    lastAt = now();
    count += 1;
    send(line);
    return true;
  }
  return {
    ack(goal) { if (acked) return false; acked = true; return out(ackLine(goal), true); },
    step(label) { return out(asDoing(label), false); },
    line(text) { return out(text, false); },
    get acked() { return acked; },
  };
}

module.exports = { asDoing, ackLine, stepLine, createNarrator };
