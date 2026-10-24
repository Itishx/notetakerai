"use strict";

/* The jobs he is holding, kept the way a person keeps a to-do list.
 *
 * 2026-10-24: a four-job handoff (meeting, Manik, Cursor prompt, ...) got
 * stuck on Manik's number. "Send it to Abhishek instead and continue the
 * tasks" started a new job with only that sentence in it, so the meeting and
 * the Cursor prompt were gone, and "just continue the Cursor task" was taken
 * as a yes to the question about Abhishek. There was one slot for a waiting
 * job, it was emptied by the next sentence, and it was forgotten after five
 * minutes either way.
 *
 * The board is that slot made into a list. Every job the loop runs is on it,
 * with what was asked, its parts, where it got to, what it is waiting on and
 * what it already tried. A job leaves the board when it is done or cancelled,
 * never because something else was said. The held run (everything the loop
 * needs to carry on from the same step) is kept with it, so "continue the
 * Cursor one" an hour later picks up where it stopped instead of starting over.
 *
 * Pure apart from the file it is saved to, so it can be tested on its own. */

const fs = require("fs");

const OPEN = new Set(["running", "waiting", "blocked", "paused"]);
const KEEP_DONE = 8;
const STALE_MS = 24 * 3600 * 1000;

function clip(v, n = 200) {
  const s = String(v || "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/* What a person would call the job: the handoff's own steps when there are
   some, else the sentence that started it. */
function jobTitle(command) {
  const text = String(command || "");
  const handoff = text.replace(/^HANDOFF\.[^\n]*\n?/, "").trim();
  const firstLine = (handoff || text).split(/\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim()).find(Boolean) || text;
  return clip(firstLine, 90);
}

const WORD_STOP = new Set(["the", "and", "for", "with", "that", "this", "then", "from", "into", "your", "you", "can", "please", "braino", "just", "now", "bro", "task", "tasks", "job", "one", "continue", "carry", "resume", "finish", "send", "open", "link", "them", "him", "her"]);
function words(v) {
  return (String(v || "").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter((w) => !WORD_STOP.has(w));
}

function createTaskBoard({ file = "", now = () => Date.now(), log = () => {} } = {}) {
  let tasks = [];
  if (file) {
    try {
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(saved?.tasks)) tasks = saved.tasks;
    } catch (_) {}
  }
  // A job that was mid-step when the app quit is not running any more.
  for (const t of tasks) if (t.status === "running") t.status = "paused";

  function save() {
    if (!file) return;
    const keep = [...tasks.filter((t) => OPEN.has(t.status)), ...tasks.filter((t) => !OPEN.has(t.status)).slice(-KEEP_DONE)];
    tasks = keep;
    try { fs.writeFileSync(file, JSON.stringify({ tasks }, null, 1)); } catch (_) {}
  }

  const byRun = (runId) => tasks.find((t) => t.runId === runId) || null;
  const open = () => tasks.filter((t) => OPEN.has(t.status) && now() - (t.updatedAt || 0) < STALE_MS);

  /* A loop started. A resumed run is the same job, not a new one. */
  function start(runId, command) {
    let t = byRun(runId);
    if (!t) {
      t = { id: runId, runId, command: String(command || ""), title: jobTitle(command), parts: [], plan: [], thinking: [], tried: [], status: "running", waitingOn: "", held: null, createdAt: now(), updatedAt: now() };
      tasks.push(t);
      log("task.added", { id: t.id, title: t.title });
    }
    t.status = "running";
    t.waitingOn = "";
    t.updatedAt = now();
    save();
    return t;
  }

  /* Each turn: the parts HIL split it into, the plan, the last few thoughts,
     and what each move did. Cheap: no model call, no screen read. */
  function progress(runId, { parts, plan, thinking, step } = {}) {
    const t = byRun(runId);
    if (!t) return;
    if (Array.isArray(parts) && parts.length) {
      // HIL's own ticks win, but a part the hands already finished stays done
      // even when HIL never said "task_done" (it rarely does mid-handoff).
      const was = new Map(t.parts.map((p) => [p.desc, p.status]));
      t.parts = parts.map((p) => {
        const desc = clip(p.desc, 140);
        const status = String(p.status || "pending");
        return { desc, status: was.get(desc) === "done" ? "done" : status };
      });
    }
    if (Array.isArray(plan) && plan.length) t.plan = plan.slice(0, 10).map((m) => clip(m, 140));
    if (thinking) t.thinking = [...t.thinking, clip(thinking, 260)].slice(-3);
    if (step) {
      t.tried = [...t.tried, { what: clip(step.what, 120), ok: step.ok !== false, error: clip(step.error, 160) }].slice(-12);
      if (step.ok !== false) tickPart(t, step.what);
    }
    t.updatedAt = now();
    save();
  }

  /* A move that worked finishes the part it was about: "Send the copied
     meeting link to Manik" ticks "Send the meeting link to Manik from Mesa".
     The board said all four jobs were pending after three were done, because
     only HIL's task_done moved a part, and in a handoff it never sent one
     (2026-10-24). The first unfinished part that shares two real words. */
  function tickPart(t, what) {
    const did = new Set(words(what));
    const part = t.parts.find((p) => p.status !== "done" && words(p.desc).filter((w) => did.has(w)).length >= 2);
    if (part) part.status = "done";
  }

  /* Stopped and holding: a question, a "keep going?", a block, or someone
     asking for something else. `held` is what the loop needs to carry on. */
  function hold(runId, status, waitingOn, held) {
    const t = byRun(runId);
    if (!t) return;
    t.status = status;
    t.waitingOn = clip(waitingOn, 240);
    if (held) t.held = held;
    t.updatedAt = now();
    log("task.held", { id: t.id, status, waitingOn: t.waitingOn });
    save();
  }

  function finish(runId, outcome, status = "done") {
    const t = byRun(runId);
    if (!t) return;
    t.status = status;
    t.outcome = clip(outcome, 240);
    t.held = null;
    t.waitingOn = "";
    t.updatedAt = now();
    log("task.finished", { id: t.id, status });
    save();
  }

  function cancel(id) {
    const t = tasks.find((x) => x.id === id);
    if (t) finish(t.runId, "cancelled", "cancelled");
  }

  function clearAll() {
    const n = open().length;
    for (const t of open()) finish(t.runId, "cleared", "cancelled");
    return n;
  }

  /* Which open job a sentence is about, or null.
   *
   * "Continue the Cursor task", "send it to Abhishek instead", "skip Manik",
   * "what about the meeting": a job is meant when the sentence shares a real
   * word with it, or when it only makes sense about a job ("instead", "skip
   * that", "carry on") and one job is waiting. */
  const ABOUT_A_JOB = /\b(?:instead|skip(?:\s+(?:it|that|this|him|her))?|carry on|keep going|go on|continue|resume|pick (?:it|that) (?:back )?up|finish (?:it|that|the rest)|the rest|baaki|aage)\b/i;
  function about(sentence, { newOrder = false } = {}) {
    const live = open();
    if (!live.length) return null;
    const pointsAtJob = ABOUT_A_JOB.test(sentence);
    // "Open YouTube" shares a word with an old YouTube job and is still a new
    // order. Only "instead", "continue", "skip" and the like reach back.
    if (newOrder && !pointsAtJob) return null;
    const said = new Set(words(sentence));
    let best = null;
    for (const t of live) {
      const pool = new Set(words([t.command, t.title, t.waitingOn, ...t.parts.map((p) => p.desc), ...t.plan].join(" ")));
      const hits = [...said].filter((w) => pool.has(w)).length;
      if (hits && (!best || hits > best.hits || (hits === best.hits && t.updatedAt > best.t.updatedAt))) best = { t, hits };
    }
    if (best && (best.hits >= 2 || pointsAtJob)) return best.t;
    if (pointsAtJob) {
      const waiting = live.filter((t) => t.status !== "running").sort((a, b) => b.updatedAt - a.updatedAt);
      if (waiting.length) return waiting[0];
    }
    return null;
  }

  /* One job, said the way a person would say it. */
  function describe(t) {
    const doneParts = t.parts.filter((p) => p.status === "done").map((p) => p.desc);
    const left = t.parts.filter((p) => p.status !== "done").map((p) => p.desc);
    const lines = [`"${t.title}"`];
    if (t.status === "running") lines.push("working on it now");
    if (t.status === "waiting") lines.push(`waiting on you: ${t.waitingOn}`);
    if (t.status === "blocked") lines.push(`stuck: ${t.waitingOn}`);
    if (t.status === "paused") lines.push(t.waitingOn ? `paused: ${t.waitingOn}` : "paused");
    if (doneParts.length) lines.push(`done: ${doneParts.join("; ")}`);
    if (left.length) lines.push(`left: ${left.join("; ")}`);
    const did = t.tried.filter((s) => s.ok).map((s) => s.what.replace(/[.!?]+$/, ""));
    if (did.length) lines.push(`what I actually did: ${did.slice(-5).join("; ")}`);
    const failed = t.tried.filter((s) => !s.ok).slice(-2);
    if (failed.length && t.status !== "running") lines.push(`tried: ${failed.map((s) => `${s.what} (${s.error || "failed"})`).join("; ")}`);
    return lines.join(". ");
  }

  /* For the loop's context and for "what are you doing?". Short on purpose:
     a line per open job, nothing when there is none. */
  function summary({ except = "" } = {}) {
    return open().filter((t) => t.runId !== except).map((t, i) => `Job ${i + 1}: ${describe(t)}`).join("\n");
  }

  /* "What are you stuck on?": the open jobs, newest first, plain. */
  function report() {
    const live = open().sort((a, b) => b.updatedAt - a.updatedAt);
    const last = tasks.filter((t) => !OPEN.has(t.status)).slice(-1)[0];
    if (!live.length) {
      if (!last) return "Nothing open right now.";
      const did = last.tried.filter((s) => s.ok).map((s) => s.what.replace(/[.!?]+$/, ""));
      return `All done, nothing open. Last job: "${last.title}"${did.length ? `. What I did: ${did.slice(-5).join("; ")}` : ""}${last.outcome ? `. I finished with: ${last.outcome}` : ""}.`;
    }
    return live.map(describe).join("\n");
  }

  return { start, progress, hold, finish, cancel, clearAll, about, summary, report, open, byRun, all: () => tasks.slice() };
}

/* "What are you doing", "what are you stuck on", "what's left", "kya kar rahe
   ho": a question about his own jobs, answered from the board. */
const ASKS_ABOUT_JOBS = /^(?:(?:hey\s+)?brain(?:o|elle)[,\s]+)?(?:(?:so|and|okay|ok|bro)[,\s]+)*(?:what(?:'s| is| are)?\s+(?:you\s+)?(?:doing|working on|up to|stuck on|struggling with|finding (?:hard|difficult|trouble with)|having trouble with|confused about|waiting (?:on|for))|what(?:'s| is)\s+(?:left|pending|remaining|open|the status|going on with (?:the|my) (?:tasks?|jobs?))|where are you (?:at|with (?:it|that|the tasks?))|(?:any|how many|which)\s+(?:tasks?|jobs?)\s+(?:open|pending|left|running)|(?:show|list|tell me)\s+(?:me\s+)?(?:your|my|the)\s+(?:tasks?|jobs?|to ?do)|why (?:did|are) you (?:fail|stuck|stop)|(?:have|did) you (?:complete|completed|finish|finished|do|done|send|sent)\b(?:\s+(?:all|everything|it|that|the|my|those|these))*\s*(?:tasks?|jobs?|it|that|everything|steps?)?|(?:are|is) (?:you|it|everything|that|the (?:tasks?|jobs?)) (?:done|finished|complete|completed|sent)|how(?:'s| is| did)\s+(?:it|the (?:tasks?|jobs?)|that) go(?:ing)?|status(?: update)?(?=\s*[?.!]*$)|kya kar rahe ho|kahan atke ho|kya bacha hai|ho gaya|hogaya|kaam ho gaya)\b/i;

function asksAboutJobs(raw) {
  return ASKS_ABOUT_JOBS.test(String(raw || "").trim());
}

const CLEAR_JOBS = /^(?:(?:hey\s+)?brain(?:o|elle)[,\s]+)?(?:clear|drop|forget|cancel)\s+(?:all\s+)?(?:my|your|the)\s+(?:tasks|jobs|to ?do(?: list)?)\b/i;
function clearsJobs(raw) {
  return CLEAR_JOBS.test(String(raw || "").trim());
}

module.exports = { createTaskBoard, asksAboutJobs, clearsJobs, jobTitle };
