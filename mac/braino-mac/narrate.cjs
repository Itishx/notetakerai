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

const IRREGULAR = { get: "getting", run: "running", put: "putting", set: "setting", shop: "shopping", stop: "stopping", plan: "planning", sit: "sitting", hit: "hitting", see: "seeing", be: "being", die: "dying", lie: "lying", tie: "tying" };

function clean(text) {
  return String(text || "")
    .replace(/[—–]/g, ",")
    .replace(/^\s*(?:the user|user|they|he|she)\s+(?:wants?|would like|needs?|asked)\s+(?:me\s+)?to\s+/i, "")
    .replace(/^\s*(?:i\s+(?:will|need to|should|am going to|'ll)|let me|now|next|then|so)\s+/i, "")
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

function ackLine(goal) {
  const doing = asDoing(goal);
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
    get acked() { return acked; },
  };
}

module.exports = { asDoing, ackLine, createNarrator };
