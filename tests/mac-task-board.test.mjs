import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createTaskBoard, asksAboutJobs, clearsJobs, jobTitle } = require("../mac/braino-mac/task-board.cjs");
const { findContactBySound, sameNameContacts, spokenNameQuery, phoneFromRecipient } = require("../mac/braino-mac/contact-match.cjs");

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

/* The 2026-10-24 run: a four-job handoff, stuck on Manik. */
const HANDOFF = "HANDOFF. The person handed you these steps. Follow them exactly.\n1. Schedule a meeting tomorrow at 5 PM\n2. Send its link to Manik from Mesa on WhatsApp\n3. Ask Claude in Cursor to fix the AI crawlability\n4. Summarise what you did";

function board() {
  let t = 1000;
  const file = join(mkdtempSync(join(tmpdir(), "board-")), "task-board.json");
  const now = () => (t += 1000);
  return { b: createTaskBoard({ file, now }), file, now, tick: (ms) => { t += ms; } };
}

test("a contact is found from the way people say it, not the way it is saved", () => {
  const contacts = {
    "manik ug mesa rj": { name: "Manik UG mesa RJ", phone: "8299758524" },
    "abhishek gaur mesa": { name: "Abhishek Gaur Mesa", phone: "9000000001" },
    "main basecamp": { name: "Main basecamp", phone: "9000000002" },
  };
  assert.equal(findContactBySound("Manik from Mesa", contacts)?.contact?.name, "Manik UG mesa RJ");
  assert.equal(findContactBySound("manik mesa", contacts)?.contact?.name, "Manik UG mesa RJ");
  assert.equal(findContactBySound("Abhishek Gaur from Mesa", contacts)?.contact?.name, "Abhishek Gaur Mesa");
  assert.equal(sameNameContacts("Manik from Mesa", contacts).length, 1);
  // A real name that is a filler word is still that name.
  assert.equal(spokenNameQuery("Main"), "main");
});

test("a number is a number, not a person called 8299758524", () => {
  assert.equal(phoneFromRecipient("8299758524"), "8299758524");
  assert.equal(phoneFromRecipient("+91 82997 58524"), "918299758524");
  assert.equal(phoneFromRecipient("Manik"), "");
  assert.equal(phoneFromRecipient("12345"), "");
  assert.match(main, /const bareNumber = phoneFromRecipient\(recipientRaw\);/);
});

test("the send never tells the person to say a script back", () => {
  assert.doesNotMatch(main, /say: `I could not find a number for \$\{recipientRaw\}\. Say "Braino, remember/);
});

test("opening a chat checks WhatsApp's chat list before claiming it opened", () => {
  assert.match(main, /const searchName = await whatsAppChatNameFor\(name\);/);
  assert.match(main, /There's no WhatsApp chat or contact called/);
});

test("before asking for a number, he checks the address book", () => {
  const src = main.match(/function numberAskedFor[\s\S]*?\n}\n/)[0];
  const numberAskedFor = new Function(`${src}; return numberAskedFor;`)();
  assert.equal(numberAskedFor("What is Manik from Mesa's phone number?"), "Manik from Mesa");
  assert.equal(numberAskedFor("What is Abhishek Gaur from Mesa's WhatsApp number? I don't have him saved"), "Abhishek Gaur from Mesa");
  assert.equal(numberAskedFor("I need the number for Riya Khurana before I send it."), "Riya Khurana");
  assert.equal(numberAskedFor("What is your number?"), "");
  assert.equal(numberAskedFor("Which tab should I close?"), "");
  assert.match(main, /hil\.loop\.contact_checked/);
});

test("a held job survives the next sentence, a restart and five minutes", () => {
  const { b, file, now, tick } = board();
  b.start("run-1", HANDOFF);
  b.progress("run-1", { parts: [
    { desc: "Schedule the meeting", status: "done" },
    { desc: "Send the link to Manik from Mesa", status: "active" },
    { desc: "Ask Claude in Cursor to fix AI crawlability", status: "pending" },
  ] });
  b.hold("run-1", "waiting", "What is Manik from Mesa's phone number?", { runId: "run-1", command: HANDOFF, state: { tasks: [] } });
  tick(30 * 60 * 1000);
  const again = createTaskBoard({ file, now });
  assert.equal(again.open().length, 1);
  assert.equal(again.open()[0].held.runId, "run-1");
  assert.equal(again.open()[0].title, "Schedule a meeting tomorrow at 5 PM");
});

test("'instead' and 'continue the Cursor task' are about the held job, not new jobs", () => {
  const { b } = board();
  b.start("run-1", HANDOFF);
  b.progress("run-1", { parts: [{ desc: "Ask Claude in Cursor to fix AI crawlability", status: "pending" }] });
  b.hold("run-1", "waiting", "What is Manik from Mesa's phone number?", { runId: "run-1" });
  assert.equal(b.about("send the link to abhishek gaur mesa instead and continue the tasks", { newOrder: false })?.runId, "run-1");
  assert.equal(b.about("just continue the cursor task from now bro")?.runId, "run-1");
  assert.equal(b.about("skip Manik")?.runId, "run-1");
  // A new order that only shares a word stays a new job.
  assert.equal(b.about("open cursor", { newOrder: true }), null);
  assert.equal(b.about("play billie jean"), null);
});

test("a job that is done leaves the board; cancelled ones go too", () => {
  const { b } = board();
  b.start("a", "open youtube");
  b.finish("a", "Opened it.");
  b.start("c", HANDOFF);
  b.hold("c", "blocked", "no number", { runId: "c" });
  assert.equal(b.open().length, 1);
  assert.equal(b.clearAll(), 1);
  assert.equal(b.open().length, 0);
});

test("he can say what he is doing and what he is stuck on", () => {
  const { b } = board();
  b.start("run-1", HANDOFF);
  b.progress("run-1", { parts: [{ desc: "Schedule the meeting", status: "done" }, { desc: "Send the link to Manik", status: "active" }], step: { what: "Send the link to Manik", ok: false, error: "nobody matches Manik from Mesa" } });
  b.hold("run-1", "blocked", "WhatsApp could not find Manik", { runId: "run-1" });
  const said = b.report();
  assert.match(said, /stuck: WhatsApp could not find Manik/);
  assert.match(said, /done: Schedule the meeting/);
  assert.match(said, /tried: Send the link to Manik \(nobody matches Manik from Mesa\)/);
  for (const q of ["what are you stuck on?", "Braino, what are you doing", "what's left", "what are you having trouble with", "kya kar rahe ho", "any tasks pending"]) {
    assert.ok(asksAboutJobs(q), q);
  }
  for (const q of ["what is the weather", "open whatsapp", "what are the best flights"]) assert.ok(!asksAboutJobs(q), q);
  assert.ok(clearsJobs("clear my tasks"));
});

test("a handoff's title is its first step, not the instructions", () => {
  assert.equal(jobTitle(HANDOFF), "Schedule a meeting tomorrow at 5 PM");
  assert.equal(jobTitle("open youtube"), "open youtube");
});

test("every way a run ends is written to the board, and the router runs first", () => {
  assert.match(main, /async function runMacHilLoopInner\(/);
  assert.match(main, /taskBoard\.hold\(runId, "paused", "you asked for something else", snapshot\)/);
  assert.match(main, /const onBoard = await routeToTaskBoard\(raw\);/);
  assert.match(main, /const boardResult = await routeToTaskBoard\(raw\);/);
  // Resuming a job pauses whatever is running: one pair of hands.
  assert.match(main, /One pair of hands[\s\S]{0,200}macHilGeneration \+= 1;/);
});

/* Second run, 2026-10-24: everything happened, and he thought nothing had. */
test("a move that worked ticks off its part, even when HIL never says task_done", () => {
  const { b } = board();
  b.start("r", HANDOFF);
  b.progress("r", { parts: [
    { desc: "Schedule a meeting tomorrow at 5 PM", status: "active" },
    { desc: "Send the meeting link to Manik from Mesa on WhatsApp", status: "pending" },
    { desc: "Open Cursor and ask Claude to add a robots.txt", status: "pending" },
  ] });
  b.progress("r", { step: { what: "Create the requested meeting for tomorrow at 5 PM", ok: true } });
  b.progress("r", { step: { what: "Send the copied meeting link to Manik from Mesa on WhatsApp", ok: true } });
  b.progress("r", { step: { what: "The Claude Code editor tab is visible, so I switch to it", ok: false, error: "stale" } });
  // HIL re-sends its parts unchanged: the ticks stay.
  b.progress("r", { parts: [
    { desc: "Schedule a meeting tomorrow at 5 PM", status: "active" },
    { desc: "Send the meeting link to Manik from Mesa on WhatsApp", status: "pending" },
    { desc: "Open Cursor and ask Claude to add a robots.txt", status: "pending" },
  ] });
  const parts = b.byRun("r").parts.map((p) => p.status);
  assert.deepEqual(parts, ["done", "done", "pending"]);
  assert.match(b.report(), /what I actually did: Create the requested meeting/);
});

test("a finished job is still something he can tell you about", () => {
  const { b } = board();
  b.start("r", HANDOFF);
  b.progress("r", { step: { what: "Sent the link to Manik", ok: true } });
  b.finish("r", "All four done.");
  assert.match(b.report(), /All done, nothing open\. Last job: .*What I did: Sent the link to Manik/);
});

test("every way of asking whether he finished reaches the board", () => {
  for (const q of ["Have you completed all the tasks", "did you finish", "are you done?", "is it sent", "status", "how did it go", "kaam ho gaya"]) assert.ok(asksAboutJobs(q), q);
  for (const q of ["status of my amazon order", "did you know sharks sleep", "what is the weather"]) assert.ok(!asksAboutJobs(q), q);
});

test("a send that makes its own button vanish is not a failure, and the stop line tells the truth", () => {
  assert.match(main, /const softCheck = !verified\.ok && result\?\.ok !== false && \["type", "pressKey"\]/);
  assert.doesNotMatch(main, /\. Nothing was sent or deleted\. Want me to keep going\?/);
  assert.match(main, /So far: \$\{did\.slice\(-4\)/);
  assert.match(main, /Braino's own job record/);
});

/* The week-plan routine (2026-10-24): what it needed that he did not have. */
test("a change said mid-job is folded into the running job, not a new one", () => {
  const src = main.match(/const TELLS_RUNNING_JOB = [^\n]+/)[0];
  const TELLS = new Function(`${src}; return TELLS_RUNNING_JOB;`)();
  for (const q of ["actually make it Saturday morning instead", "skip the music, just finish the rest", "also send it to Param", "change it to Friday"]) assert.ok(TELLS.test(q), q);
  for (const q of ["open YouTube", "play billie jean", "what are you doing?"]) assert.ok(!TELLS.test(q), q);
  assert.match(main, /if \(macTellRunningJob\(text\)\)/);
  assert.match(main, /what they tell you mid-job wins over this list/);
});

test("files have hands in the loop: move, make a folder, find the newest", () => {
  assert.match(main, /file_move: \(a\) => moveFileForHil\(a\)/);
  assert.match(main, /folder_create: \(a\) => createMacFolder\(/);
  assert.match(main, /file_latest: async \(a\) =>/);
  const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  for (const name of ["file_move", "folder_create", "file_latest"]) assert.match(catalog, new RegExp(`name: "${name}"`));
});

test("'send it to myself' is the owner's own card", () => {
  const src = main.match(/const MEANS_MYSELF = [^\n]+/)[0];
  const MEANS = new Function(`${src}; return MEANS_MYSELF;`)();
  for (const q of ["myself", "me", "my own number", "khud ko"]) assert.ok(MEANS.test(q), q);
  for (const q of ["Manik", "mom", "me and Riya"]) assert.ok(!MEANS.test(q), q);
});

test("a long handoff gets time for its steps, and only web pages move to his browser", () => {
  assert.match(main, /handoffSteps \* 2 \* 60 \* 1000/);
  assert.match(main, /Mac apps and tools \(WhatsApp, Spotify, files, notes, calendar, Cursor\) work as normal; only websites move\./);
});

test("every WhatsApp send is checked in WhatsApp's own database, and myself is the user's own chat", () => {
  assert.match(main, /const landed = await whatsAppLandedIn\(phone\);/);
  assert.match(main, /That went to \$\{landed\.name\}, not \$\{resolved\.name\}/);
  assert.match(main, /pass recipientRaw \\"myself\\": that is their own chat/);
});

test("a job typed in the app's chat never speaks its steps", () => {
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(main, /sendToRenderer\("braino-mac:narrate", \{ text: String\(text\)\.slice\(0, 140\), quiet: macTypedJob \}\)/);
  assert.match(main, /macTypedJob = Boolean\(runOptions\.typed\);/);
  assert.match(renderer, /narrateQuiet = Boolean\(payload\?\.quiet\);/);
});

test("an old stuck job is not resumed just because a new command shares its words (2026-10-25)", () => {
  let t = 1e12;
  const file = join(mkdtempSync(join(tmpdir(), "board-")), "b.json");
  const b = createTaskBoard({ file, now: () => t });
  b.start("old", "HANDOFF.\n1. Open Cursor and ask Claude Code to add a robots.txt");
  b.hold("old", "blocked", "switch to the Claude Code tab", { runId: "old" });
  t += 20 * 3600e3;
  assert.equal(b.about("Braino, can you please give my Claude Code agent in Cursor a prompt"), null);
  assert.equal(b.about("continue the cursor one")?.runId, "old");
});

test("a lesson that only opens something is never kept for a command that asks to do it", () => {
  assert.match(main, /function skillOnlyOpensForADoCommand\(said, steps\)/);
  assert.match(main, /why: "opens_for_a_do_command"/);
});

/* Swiggy run, 2026-10-25: "delete both" was forgotten after one turn, he asked
   three times, the ask limit dropped the job mid-question, and "The gourmet
   delivery" became a new job with no context. */
test("an answer is pinned for the whole job, not one turn", () => {
  assert.match(main, /macHilPin\(state, `They already answered/);
  assert.match(main, /This holds for the whole job; act on it and do not ask it again\./);
});

test("a job that ends on a question stays waiting, and the answer finds it", () => {
  assert.match(main, /taskBoard\.hold\(runId, "waiting", result\.say, \{ \.\.\.snapshot, askedConsent:/);
  const { b } = board();
  b.start("swiggy", "delete my Swiggy email");
  b.hold("swiggy", "waiting", "Which Swiggy email should I delete: the Gourmet delivery, the on-time delivery, or the feast-ival offer?", { runId: "swiggy" });
  assert.equal(b.about("The gourmet delivery")?.runId, "swiggy");
});
