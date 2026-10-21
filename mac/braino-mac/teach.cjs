"use strict";

/* Teach Braino (2026-10-20). You show him a job once; he learns what it is
 * for, what changes each time, and the steps, then does it when asked.
 *
 * What he watched arrives as a timeline: the app and Chrome tab in front,
 * every click by the name of what was clicked (read the way a screen reader
 * reads it), and finished typing. Password fields are never read.
 *
 * This file is pure: tidying the timeline, the one model prompt that turns it
 * into a job, reading the answer, and which taught jobs a request is about.
 * main.cjs owns recording, storage and running. */

const MAX_EVENTS = 400;
const MAX_TAUGHT = 100;

/* Braino's own windows and the system furniture are not part of the job. */
const IGNORE_APPS = /^(?:braino|braino mac|electron|dock|controlcenter|control center|notification ?center|systemuiserver|window ?server)$/i;

/* Phone numbers, OTPs, card and account numbers, emails: never kept, never
   sent to the model. A Blinkit login put a mobile number in a lesson
   (2026-10-20); a password filter alone is not enough. */
function redact(text) {
  return String(text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{5,}\d/g, "[number]");
}
const SIGN_IN = /\b(?:log ?in|sign ?in|otp|one time password|verification code|mobile number|phone number|password)\b/i;

function compactTimeline(events = []) {
  const out = [];
  let lastFocus = "";
  for (const e of events) {
    if (!e || !e.t) continue;
    if (e.app && IGNORE_APPS.test(String(e.app).trim())) continue;
    if (e.t === "focus") {
      const key = `${e.app}|${e.url || e.title || ""}`;
      if (key === lastFocus) continue;
      lastFocus = key;
      out.push(e.url ? `Opened ${e.url}${e.title ? ` ("${e.title}")` : ""} in ${e.app}` : `Switched to ${e.app}${e.title ? `, window "${e.title}"` : ""}`);
      continue;
    }
    if (e.t === "click") {
      const label = redact(String(e.label || "").slice(0, 60));
      const value = redact(String(e.value || "").slice(0, 60));
      const what = [label, value && value !== label ? `showing "${value}"` : "", redact(e.help || "")].filter(Boolean).join(", ");
      // A click with no name tells him nothing he can find again.
      if (!what) continue;
      out.push(`Clicked ${what ? `"${what}"` : "something"}${e.role ? ` (${String(e.role).replace(/^AX/, "").toLowerCase()})` : ""} in ${e.app}`);
      continue;
    }
    if (e.t === "typed" && e.text) {
      const field = String(e.field || "").split(":").slice(1).join(":").trim();
      if (SIGN_IN.test(field)) { out.push(`Signed in (details not kept) in ${e.app}`); continue; }
      out.push(`Typed "${redact(e.text)}"${field ? ` into "${field}"` : ""} in ${e.app}`);
    }
  }
  // Two clicks on the same thing in a row is one click.
  return out.filter((line, i) => line !== out[i - 1]).slice(-MAX_EVENTS);
}

function learnPrompt(lines, { said = "" } = {}) {
  return [
    "You watched a person do a job on their Mac so you can do it for them next time.",
    said ? `Before starting they said: "${said}"` : "",
    "What they did, in order:",
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    "",
    "Work out the job the way a person learning it would: what it is for, what would change if they did it again (the inputs), and the steps.",
    "Steps are instructions for yourself, not a replay: name the app or site, the button or field by its visible name, and use {input_name} where an input goes. Skip mistakes, detours, signing in and anything incidental.",
    "If they did the same thing for several items (two products, three people), make ONE input that is a list (e.g. \"products\") and a step that repeats for each, never product_1 and product_2.",
    "\"say\" is a real example sentence with real example values, never {placeholders}.",
    "Reply with JSON only:",
    '{"name": "short job name, like Buy a book on Amazon", "say": "how the person would ask for it", "goal": "one sentence", "inputs": [{"name": "title", "example": "Atomic Habits", "ask": "Which book?"}], "steps": ["Open amazon.in in Chrome", "Search for {title}"], "done_when": "how you know it worked", "stop_before": "the step that spends money or sends something, if any, else empty"}',
  ].filter(Boolean).join("\n");
}

function parseLearned(reply) {
  const text = String(reply || "");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let job;
  try { job = JSON.parse(json); } catch (_) { return null; }
  const steps = (Array.isArray(job?.steps) ? job.steps : []).map((s) => String(s || "").trim()).filter(Boolean).slice(0, 30);
  const name = String(job?.name || "").trim().slice(0, 80);
  if (!name || !steps.length) return null;
  return {
    name,
    say: String(job.say || "").trim().slice(0, 160),
    goal: String(job.goal || "").trim().slice(0, 240),
    inputs: (Array.isArray(job.inputs) ? job.inputs : []).map((i) => ({
      name: String(i?.name || "").trim().replace(/[^a-z0-9_]+/gi, "_").toLowerCase().slice(0, 32),
      example: String(i?.example || "").trim().slice(0, 80),
      ask: String(i?.ask || "").trim().slice(0, 100),
    })).filter((i) => i.name).slice(0, 6),
    steps,
    done_when: String(job.done_when || "").trim().slice(0, 200),
    stop_before: String(job.stop_before || "").trim().slice(0, 200),
  };
}

/* Which taught jobs this request might be. Not a decider: it only chooses
   which jobs are worth showing the brain, which then decides. */
const STOP = new Set(["the", "a", "an", "to", "on", "in", "my", "me", "for", "of", "and", "please", "braino", "can", "you", "could", "would", "it", "this", "that", "with", "from", "do", "go"]);
function words(text) {
  return new Set((String(text || "").toLowerCase().match(/[a-z0-9ऀ-ॿ]{2,}/g) || []).filter((w) => !STOP.has(w)));
}
function relevantTaught(jobs = [], command = "", max = 2) {
  const said = words(command);
  if (!said.size) return [];
  return jobs
    .map((job) => {
      const own = words(`${job.name} ${job.say} ${job.goal}`);
      let hit = 0;
      for (const w of own) if (said.has(w)) hit += 1;
      return { job, score: own.size ? hit / Math.min(own.size, 4) : 0 };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.job);
}

function taughtContextLines(jobs = [], command = "") {
  const hits = relevantTaught(jobs, command);
  if (!hits.length) return "";
  return [
    "The person TAUGHT you these jobs by doing them while you watched. If the request is one of them, follow its steps in order, filling each {input} from what they said (ask once, in one line, for any input they did not give). When a search has no exact match, take the obvious closest one, as the person would, and say which in your final line; ask only if nothing is close. Stop before the stop_before step and ask to confirm.",
    ...hits.map((j) => `- "${j.name}". Goal: ${j.goal}. Inputs: ${j.inputs.map((i) => `${i.name} (e.g. ${i.example})`).join(", ") || "none"}. Steps: ${j.steps.map((s, i) => `${i + 1}) ${s}`).join(" ")}. Done when: ${j.done_when || "the goal is visible"}.${j.stop_before ? ` Stop before: ${j.stop_before}.` : ""}`),
  ].join("\n");
}

module.exports = { compactTimeline, learnPrompt, parseLearned, relevantTaught, taughtContextLines, MAX_EVENTS, MAX_TAUGHT };
