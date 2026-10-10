import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };
const liftLine = (start) => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf("\n", at) + 1); };

/* 30-day log (2026-10-05): "Bruno" for Braino 132 times, "effective" for
   Affective, foreign transcripts ending in play/open, stops lost mid-job. */

test("the command transcriber writes every word and knows his names", () => {
  const build = lift("function buildRealtimeSessionUpdate() {");
  assert.match(build, /Write down exactly what the user says to Braino, every word, in English\./);
  assert.doesNotMatch(build, /Transcribe the user's direct command/);
  assert.match(build, /Spell these as written when you hear them: \$\{commandSpellings\(\)\.join\(", "\)\}/);
  assert.match(lift("function commandSpellings() {"), /COMMAND_VOCABULARY, \.\.\.commandContactNames/);
  for (const name of ["Braino", "Affective", "Forge", "Laya", "Cowork"]) assert.match(liftLine("const COMMAND_VOCABULARY ="), new RegExp(`"${name}"`));
});

test("the word list read back over noise is dropped; his name alone is not", () => {
  const echo = Function(`${liftLine("const COMMAND_VOCABULARY =")}${liftLine("const COMMAND_VOCABULARY_SET =")} let commandContactNames = ["Param", "Subhash Mama"]; ${lift("function isVocabularyEcho(text) {")} return isVocabularyEcho;`)();
  assert.equal(echo("Braino, Affective."), true);
  assert.equal(echo("Pinterest, Medium, Uber."), true);
  assert.equal(echo("Param, Subhash Mama."), true, "contact names read back over noise too");
  assert.equal(echo("Braino"), false);
  assert.equal(echo("Braino, open Pinterest."), false);
});

test("foreign scripts and accents are a mishearing; Hinglish stays", () => {
  const re = eval(js.match(/const FOREIGN_TRANSCRIPT_RE = (\/.*\/);/)[1]);
  for (const t of ["Što su nasla.", "Es muy extraño.", "¿Qué?", "ทีนี้ก็เล่าไปแล้ว", "is this how you去?", "Привет"]) assert.equal(re.test(t), true, t);
  for (const t of ["Open YouTube.", "मुझे opportunity कभी explore नहीं किया", "200 روپے? صحیح بات ہے.", "Braino, play Billie Jean"]) assert.equal(re.test(t), false, t);
  const gate = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.ok(gate.indexOf("FOREIGN_TRANSCRIPT_RE.test") < gate.indexOf("transcriptStats(text)"), "checked first");
});

test("while a job runs, a misheard stop still stops it", () => {
  const stop = Function(`
    ${liftLine("const STOP_LISTENING_WAKE =")}${liftLine("const STOP_LISTENING_LEAD =")}
    ${liftLine("const STOP_TASK_NAMED_JOB =")}
    ${lift("const STOP_TASK_BARE = [", "];\n")}
    ${liftLine("const STOP_TASK_BRAINELLE_WAKE =")}
    ${liftLine("const STOP_TASK_FUZZY =")}
    ${lift("function stopEditDistance(a, b) {")}
    ${lift("function isStopTaskPhrase(text, { jobRunning = false } = {}) {")}
    return isStopTaskPhrase;`)();
  for (const t of ["Refuse it.", "stuff it", "Top it!", "stopped it", "ruko", "bas karo", "shop it"]) {
    assert.equal(stop(t, { jobRunning: true }), true, t);
    assert.equal(stop(t, { jobRunning: false }), false, `${t} with no job is not a stop`);
  }
  assert.equal(stop("open it", { jobRunning: true }), false);
  assert.equal(stop("do it", { jobRunning: true }), false);
  assert.equal(stop("stop the task"), true, "a named job stop works without a job flag");
  assert.match(js, /if \(isStopTaskPhrase\(transcript, \{ jobRunning: voiceTurnInFlight \}\)\) \{/);
});

test("a contact name answering 'Which Riya?' is never dropped as an echo", () => {
  const gate = lift("function shouldAcceptVoiceTranscript(text) {");
  assert.match(gate, /const awaitingAnswer = hasPendingDelegateFollowup\(\) \|\| namedAnswerWindowOpen\(\);\s*if \(!herMode && !awaitingAnswer && isVocabularyEcho\(text\)\)/);
  // Run the echo step of the gate with "Riya Khurana" as a top contact.
  const run = (pending) => Function("hasPendingDelegateFollowup", "namedAnswerWindowOpen", "logRenderer", `
    const herMode = false;
    ${liftLine("const COMMAND_VOCABULARY =")}${liftLine("const COMMAND_VOCABULARY_SET =")}
    let commandContactNames = ["Riya Khurana", "Riya Sharma", "Abhishek Gour"];
    ${lift("function isVocabularyEcho(text) {")}
    const text = "Riya Khurana";
    const awaitingAnswer = hasPendingDelegateFollowup() || namedAnswerWindowOpen();
    return !herMode && !awaitingAnswer && isVocabularyEcho(text);
  `)(() => pending, () => false, () => {});
  assert.equal(run(true), false, "after 'Which Riya?' it is an answer");
  assert.equal(run(false), true, "with no question waiting, a bare name list is still an echo");
});

test("a question about what is playing is never treated as the song bleeding in", () => {
  const re = eval(js.match(/const ASKS_ABOUT_MEDIA = (\/.*\/i);/)[1]);
  for (const t of ["Which song did you play?", "What was that song?", "Who is the artist?", "Okay, what's playing right now?"]) assert.equal(re.test(t), true, t);
  for (const t of ["play it again", "I wanna dance with somebody", "turn it up"]) assert.equal(re.test(t), false, t);
  assert.match(lift("function shouldAcceptVoiceTranscript(text) {"), /!explicitlyAddressed && !asksAboutMedia && \(stats\.wordCount < 3 \|\| actionLike\)/);
});
