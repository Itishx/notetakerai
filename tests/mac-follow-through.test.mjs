import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
const preload = read("../mac/braino-mac/preload.cjs");
const main = read("../mac/braino-mac/main.cjs");

/* Round 007. A real session: "book my show ... and book me the movie listing
   for Insidious", he asked which cinema, was told "PVR Atrium anytime after
   4 pm", said give me a moment, and the session idled out 26 seconds later
   having run nothing. Both turns logged route:"realtime_chat" with zero
   delegate and zero hil events. */

test("a promise is what starts the work, not a word list", () => {
  /* Two independent triggers, neither of them a vocabulary: HIL saw a job in
     what YOU said, or he gave himself away by promising. The first is what
     stops him refusing — "I can't book that from here" no longer buries the
     job, because HIL read your sentence, not his. */
  assert.match(renderer, /window\.brainoMac\.promisesAction\(finalText\)/);
  assert.match(renderer, /seen\.kind === "task" \|\| seen\.kind === "chat_and_task"/);
  assert.match(renderer, /if \(!promiseEscalated && \(hilTask \|\| promised\)\)/);
  assert.match(renderer, /voice\.promise\.escalated/);
  /* Recorded BEFORE the run, so a later "go ahead" can still resume it. */
  const block = renderer.slice(renderer.indexOf("if (!promiseEscalated && (hilTask || promised))"));
  const remember = block.indexOf("rememberOwedTask(job");
  const run = block.indexOf("runDelegate(job");
  assert.ok(remember > 0 && run > remember, "the owed task must be remembered before the run");
});

/* One implementation of "is that a promise", shared with the extension. */
test("the detector is bridged, not copied", () => {
  assert.match(preload, /require\(path\.join\(__dirname, "hil-verify\.cjs"\)\)/);
  assert.match(preload, /promisesAction: \(text\) => macPromisesAction\(text\)/);
  assert.doesNotMatch(renderer, /ALREADY_DONE|var PROMISE\b/);
});

/* The escalated job must not re-enter the cascade that lost it. */
test("an escalated promise goes to the brain, not back to the lists", () => {
  assert.match(renderer, /forceBrain: true, reason: "promise"/);
  assert.match(preload, /"braino-mac:delegate", prompt, options \|\| \{\}/);
  assert.match(main, /async function runDelegate\(prompt, options = \{\}\)/);
  assert.match(main, /if \(options\.forceBrain && macHilEnabled\(\)\) \{[\s\S]{0,200}return runMacHilLoop\(raw\)/);
});

/* The last thing said is usually not the job. */
test("the job is the exchange, not the last sentence", () => {
  const source = renderer.slice(renderer.indexOf("function escalationPrompt"));
  const body = source.slice(0, source.indexOf("\n}") + 2);
  const escalationPrompt = new Function("localChatMemory", `${body}; return escalationPrompt;`)([
    { role: "user", content: "Book my show in India and Hyderabad and book me the movie listing for Insidious maybe." },
    { role: "assistant", content: "Which cinema and what time works for you?" },
  ]);
  assert.equal(
    escalationPrompt("PVR Atrium anytime after 4 pm."),
    "Book my show in India and Hyderabad and book me the movie listing for Insidious maybe. PVR Atrium anytime after 4 pm.",
  );
  /* A first turn that needs no context is left exactly as spoken. */
  const alone = new Function("localChatMemory", `${body}; return escalationPrompt;`)([]);
  assert.equal(alone("open my downloads folder"), "open my downloads folder");
});

/* The shared detector has to keep telling a promise from a report. */
test("saying it and having done it are different", () => {
  const shared = require_("../extension/lib/hilShared.js");
  for (const said of ["Give me a moment.", "Let me check.", "On it.", "One sec, let me pull that up."]) {
    assert.equal(shared.promisesAction(said), true, said);
  }
  for (const said of ["Which cinema and what time?", "Done, tickets are booked.", "Here they are."]) {
    assert.equal(shared.promisesAction(said), false, said);
  }
});

/* Round 008. "How are you, and could you grab that coffee from the table" is
   one breath with two things in it, and a person does both. */
test("understanding is asked for, never matched", () => {
  const understand = read("../mac/braino-mac/hil-understand.cjs");
  /* The one rule this file must never break. */
  assert.match(understand, /There is no list of task\s*\n?words/);
  assert.doesNotMatch(understand, /\/\\b\(open\|launch\|play/);
  /* Started before he answers, collected after, so talk-only turns pay nothing. */
  const chat = renderer.slice(renderer.indexOf("async function answerViaRealtimeChat"));
  assert.ok(
    chat.indexOf("const understandingPromise") < chat.indexOf("const waiter = createRealtimeResponseWaiter"),
    "the understanding must be in flight before he starts answering",
  );
  assert.match(chat, /const verdict = await understandingPromise/);
});

test("what he is told mid-job reaches the job", () => {
  const main_ = read("../mac/braino-mac/main.cjs");
  /* state.facts is how the loop already tells itself things mid-run. */
  assert.match(main_, /function macTellRunningJob[\s\S]{0,400}state\.facts\.push/);
  /* Only ever clear my own registration: a superseding run registers first. */
  assert.match(main_, /if \(macActiveHilRun\?\.runId === runId\) macActiveHilRun = null;/);
  /* Stop rides the existing cancellation, so it lands within a step. */
  assert.match(main_, /"braino-mac:stop-running-job"[\s\S]{0,320}macHilGeneration \+= 1/);
});

test("a classifier that is down cannot swallow a command", () => {
  const understand = read("../mac/braino-mac/hil-understand.cjs");
  const main_ = read("../mac/braino-mac/main.cjs");
  /* Every failure path returns null, and null means carry on as before. */
  assert.match(main_, /catch \(error\) \{[\s\S]{0,200}hil\.understand\.failed[\s\S]{0,120}return null;/);
  assert.equal(require_("../mac/braino-mac/hil-understand.cjs").parseUnderstanding("not json", { running: true }), null);
  assert.ok(understand.includes("return null"));
  /* And an unhandled interjection falls back to being a normal turn. */
  const route = renderer.slice(renderer.indexOf("async function routeInterjectionIntoRunningJob"));
  assert.match(route, /if \(!verdict\?\.running \|\| !verdict\.understanding\) return false;/);
});

test("the parser is tolerant in, strict out", () => {
  const { parseUnderstanding } = require_("../mac/braino-mac/hil-understand.cjs");
  assert.deepEqual(parseUnderstanding('```json\n{"kind":"stop","task":""}\n```', { running: true }), { kind: "stop", task: "" });
  /* A kind from the wrong situation is a real answer in the wrong shape. */
  assert.equal(parseUnderstanding('{"kind":"chat_and_task","task":"also book the late show"}', { running: true }).kind, "addition");
  assert.equal(parseUnderstanding('{"kind":"correction","task":"x"}', {}).kind, "task");
  /* A job with nothing in it is not a job. */
  assert.equal(parseUnderstanding('{"kind":"task","task":""}', {}).kind, "chat");
});

/* A real run opened the only Insidious on the page, rejected it for not being
   spelled the way the user spelled it, searched four more times for a title
   that does not exist, and ended saying the film was not showing. */
test("a name the user gave is a description, not a string to match", () => {
  const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
  assert.match(prompt, /THE NAME THEY USED IS NOT THE NAME ON THE SCREEN/);
  assert.match(prompt, /If the page shows ONE plausible match for what they described, that IS the thing/);
  assert.match(prompt, /NEVER end a run with "not available", "not found", or "not showing" when something on the page plausibly matches/);
});

/* The instruction that produced "I can't book it, but here's how you can". */
test("he is told he has hands", () => {
  const chat = renderer.slice(renderer.indexOf("function buildRealtimeChatInstructions"));
  const body = chat.slice(0, chat.indexOf("\n}"));
  assert.doesNotMatch(body, /let the app route the action next time/);
  assert.match(body, /never say you cannot do it, that you lack access, or that you can only guide them/);
  assert.match(body, /Do not claim a job is done either/);
});

/* Seeing him take the job on, in the same style as Thinking and Calibrating. */
test("the notch says when a conversation became a job", () => {
  assert.match(renderer, /renderThinkingCanvas\("Taking it on"/);
  assert.match(renderer, /state: "Taking it on", className: ""/);
});

/* Half of every conversation was missing from the record. */
test("what he says is logged too", () => {
  const chat = renderer.slice(renderer.indexOf("async function answerViaRealtimeChat"));
  assert.match(chat, /logRenderer\("voice\.out", \{ text: finalText[\s\S]{0,60}route: "realtime_chat" \}\)/);
  /* Only when the streamer spoke it, or the speak() fallback logs it twice. */
  assert.match(chat, /if \(finalText && streamState\?\.spoke\)/);
});

/* Round 009. The BookMyShow run: HIL classified all three corrections
   correctly and voice.interjection fired zero times, because the router hung
   off "he is being interrupted mid-sentence" and he was not speaking, he was
   working. */
test("a running job is the condition, not his mouth being open", () => {
  const flush = renderer.slice(renderer.indexOf("async function flushRealtimeTranscript"));
  const body = flush.slice(0, flush.indexOf("\n}\n"));
  const router = body.indexOf("routeInterjectionIntoRunningJob(transcript)");
  const interrupting = body.indexOf("const interrupting = voiceTurnInFlight");
  assert.ok(router > 0, "the router must be reachable from the flush");
  assert.ok(router < interrupting, "it must run BEFORE the mid-sentence interrupt branch");
  /* And it must not be gated on him talking. */
  const guard = body.slice(body.lastIndexOf("if (", router), router);
  assert.match(guard, /if \(accepted\) \{/);
  assert.doesNotMatch(guard, /voiceTurnInFlight/);
});

/* Asking costs 3.6 to 6.5 seconds in the real logs. */
test("the slow question is only asked when it can change something", () => {
  const route = renderer.slice(renderer.indexOf("async function routeInterjectionIntoRunningJob"));
  const body = route.slice(0, route.indexOf("\n}\n"));
  assert.ok(
    body.indexOf("window.brainoMac.jobRunning()") < body.indexOf("window.brainoMac.understand("),
    "the cheap check must come before the expensive one",
  );
  assert.match(body, /if \(!busy\?\.running\) return false;/);
  const main_ = read("../mac/braino-mac/main.cjs");
  /* No model call on that path. */
  const handler = main_.slice(main_.indexOf('"braino-mac:job-running"'), main_.indexOf('"braino-mac:understand"'));
  assert.doesNotMatch(handler, /macUnderstandUtterance|fetch\(/);
});

/* One question per sentence, not two. */
test("the chat path reuses the answer instead of asking again", () => {
  assert.match(renderer, /lastUnderstanding = \{ text: String\(transcript \|\| ""\), verdict \};/);
  assert.match(renderer, /lastUnderstanding\.text === text && lastUnderstanding\.verdict/);
});

/* The reply text ran out past the rounded edges and over the page behind it. */
test("the answer box grows but never shrinks", () => {
  assert.match(renderer, /nfAnswerMode = nfAnswerModeLocked === "long" \|\| presentation\.kind === "long" \? "long" : "short";/);
  /* The old lock pinned the first classification for the whole reply. */
  assert.doesNotMatch(renderer, /nfAnswerMode = nfAnswerModeLocked \|\| presentation\.kind;/);
});

/* He said "Insidious-right, that's got a creepy vibe" out loud. */
test("every instruction branch carries the house rule", () => {
  const count = (renderer.match(/never use em dashes or en dashes/g) || []).length;
  assert.equal(count, 4, "Monday, Her, voice persona and the normal branch");
  const chat = renderer.slice(renderer.indexOf("function buildRealtimeChatInstructions"));
  assert.match(chat.slice(0, chat.indexOf("\n}")), /never use em dashes or en dashes/);
});

/* Eleven searches in ninety seconds for a mis-transcribed title, and the word
   it was searching was never said out loud. */
test("a name that matches nothing twice ends the search", () => {
  const prompt = read("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts");
  assert.match(prompt, /IF THE NAME MATCHES NOTHING AT ALL, THE NAME IS WRONG, NOT THE SITE/);
  assert.match(prompt, /Do not run the same search a third time/);
  /* Not pinned to an exact version: the prompt is deployed and versioned, and
     an exact pin turns every legitimate bump into a red test. */
  const v = prompt.match(/HIL_LOOP_VERSION = "(\d+)\.(\d+)\.\d+"/);
  assert.ok(v, "the prompt must carry a version");
  assert.ok(Number(v[1]) > 2 || Number(v[2]) >= 7, `version ${v[0]} predates this rule`);
});

/* Round 010. The Book tickets button was in the middle of the screen and he
   scrolled five times looking for it, because Chrome had given the
   accessibility tree browser furniture and nothing else. He was not blind: the
   look action screenshots the screen and has always worked. He simply never
   chose it, and a tree with nothing in it looks exactly like a page not
   scrolled far enough. */
test("he looks when he is stuck, and not before", () => {
  const main_ = read("../mac/braino-mac/main.cjs");
  /* Exactly one implementation. An earlier attempt at this round added a
     second macLookAtScreen and the later declaration silently won. */
  assert.equal((main_.match(/async function macLookAtScreen/g) || []).length, 1);
  const loop = main_.slice(main_.indexOf("async function runMacHilLoop"));
  /* Never at the top of a run. A screenshot and a vision call on every job
     buys nothing on the runs that were already working, which is most of
     them, and the cost is paid before anything has gone wrong. */
  const start = loop.slice(0, loop.indexOf("for (let step = startStep"));
  assert.doesNotMatch(start, /macLookAtScreen/);
  /* Circling is the moment a person stops and looks properly. */
  const circling = loop.slice(loop.indexOf('logMac("hil.loop.circling"'));
  assert.ok(circling.indexOf("macLookAtScreen") < circling.indexOf('say: said ||'), "it must look BEFORE it gives up");
  assert.match(circling, /rescuedByLooking = true/);
  /* One rescue, and a ceiling for the run. */
  assert.match(main_, /const MAC_HIL_MAX_LOOKS = 3;/);
  assert.match(circling, /!rescuedByLooking && looks < MAC_HIL_MAX_LOOKS/);
});

/* A page with nothing on it and a page whose content fell off the end of the
   cap need opposite fixes, and the log could tell them apart. */
test("what he was handed is on the record", () => {
  const main_ = read("../mac/braino-mac/main.cjs");
  assert.match(main_, /logMac\("hil\.observed", \{[\s\S]{0,200}hidden: Number\(data\?\.hidden\) \|\| 0,[\s\S]{0,60}cap: MAC_HIL_OBSERVE_CAP,/);
});

/* "Deciding" was printed through his reply. */
test("thinking never draws over an answer", () => {
  const css = read("../mac/braino-mac/renderer/braino-mac.css");
  const hide = css.slice(css.indexOf("#notch-face.nf-answer-open .nf-band,"));
  const block = hide.slice(0, hide.indexOf("}") + 1);
  /* The list was written against the old furniture and never updated. */
  assert.match(block, /#notch-face\.nf-answer-open \.nf-think-chip,/);
  assert.match(block, /#notch-face\.nf-answer-open \.nf-thinking-canvas,/);
  assert.match(block, /display: none !important/);
});

/* A run that stood down because you asked for something else is not a failure
   with an empty answer. */
test("a handover reads as a handover", () => {
  const main_ = read("../mac/braino-mac/main.cjs");
  assert.match(main_, /result\?\.superseded[\s\S]{0,80}\(stood down, you asked for something else\)/);
});
