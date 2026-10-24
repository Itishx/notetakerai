import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 2026-10-25: in a fluent back-and-forth, plain replies ("That was uncalled
   for.", "I got very drunk") were dropped as not said to him, sentences
   spoken while he worked were thrown away, and main dropped a follow-up the
   voice side had already accepted. These run the real gate functions from
   the renderer with only the microphone state stubbed. */
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");

const grabFn = (name) => {
  const start = renderer.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  let depth = 0, i = renderer.indexOf("{", start);
  for (; i < renderer.length; i += 1) {
    if (renderer[i] === "{") depth += 1;
    else if (renderer[i] === "}" && --depth === 0) break;
  }
  return renderer.slice(start, i + 1);
};
const grabConst = (name) => renderer.match(new RegExp(`const ${name} = [^\\n]+`))[0];

function gate(state) {
  const src = [
    "NAMED_FOLLOW_UP_MS", "NAMED_EXCHANGE_MAX_MS", "FOLLOW_UP_IMMEDIATE_MS", "SPOKEN_SENTENCE", "ACTIVE_EXCHANGE_MS",
    "TALKING_OVER_HIM", "ANSWER_REPLY", "ANSWER_STOPWORDS", "SAID_TO_HIM_QUESTION", "SAID_TO_HIM_ORDER", "SAID_TO_HIM_CORRECTION", "BUSY_INTERRUPT",
  ].map(grabConst).join("\n") + "\n" + [
    "namedFollowUpWindowOpen", "startedRightAfterHim", "inActiveExchange", "heardOverHimInExchange",
    "followsHisReply", "saidToBraino", "sharesAWordWithQuestion",
  ].map(grabFn).join("\n");
  const body = `
    let namedModeOn = true, speaking = ${Boolean(state.speaking)}, mediaAudioPlaying = false, rtLastHeardText = "";
    let lastSpokenLine = ${JSON.stringify(state.lastSpokenLine)};
    let lastUserTurnAt = ${state.lastUserTurnAt}, lastSpokenTurnAt = ${state.lastSpokenTurnAt ?? state.lastUserTurnAt};
    let rtSpeechStartedAt = ${state.speechStartedAt};
    const mediaMaybePlaying = () => ${Boolean(state.media)};
    const isSelfEcho = (t) => ${JSON.stringify(state.echo || "")} && String(t).includes(${JSON.stringify(state.echo || "")});
    const voiceExplicitlyAddressesBraino = (t) => /\\bbrain(?:o|elle)\\b/i.test(t);
    ${src}
    return { followsHisReply, heardOverHimInExchange, BUSY_INTERRUPT };`;
  return new Function("Date", body)({ now: () => state.now });
}

const replyEnd = 1_000_000;
const exchange = (extra = {}) => ({
  now: replyEnd + 9000,
  lastSpokenLine: { ts: replyEnd - 15000, endedTs: replyEnd, text: "Three tries in a row did not work, so I stopped." },
  lastUserTurnAt: replyEnd - 30000,
  speechStartedAt: replyEnd + 8000,
  ...extra,
});

test("a plain reply right after he speaks is heard, whatever its shape", () => {
  const g = gate(exchange());
  for (const said of ["That was uncalled for.", "I got very drunk", "But it's Sunday today.", "I am saying that was uncalled for."]) {
    assert.ok(g.followsHisReply(said), said);
  }
});

test("noise right after him is still noise: a reply is a sentence, not a fragment", () => {
  const g = gate(exchange());
  for (const heard of ["Hamburger menu.", "Push, push, always push.", "link newsletters signup", "Liquid mineral.", "stay straight"]) {
    assert.ok(!g.followsHisReply(heard), heard);
  }
});

test("the room still has to sound like it is talking to him once the moment has passed", () => {
  const g = gate(exchange({ now: replyEnd + 31000, speechStartedAt: replyEnd + 30000 }));
  assert.ok(!g.followsHisReply("That was uncalled for."));
  assert.ok(g.followsHisReply("Why are you complaining so much?"));
});

test("his own voice and playing media are never taken as your reply", () => {
  assert.ok(!gate(exchange({ echo: "uncalled for" })).followsHisReply("That was uncalled for."));
  assert.ok(!gate(exchange({ media: true })).followsHisReply("That was uncalled for."));
});

test("while he works in your conversation, what you say is kept, not binned", () => {
  const g = gate(exchange({ lastSpokenTurnAt: replyEnd + 2000 }));
  assert.ok(g.heardOverHimInExchange("What do you have to say to that."));
  assert.ok(g.heardOverHimInExchange("I'm gonna stop the task."));
  assert.ok(g.BUSY_INTERRUPT.test("I'm gonna stop the task."));
  assert.ok(g.BUSY_INTERRUPT.test("listen, that's not what I meant"));
});

test("while he is talking, only what is clearly aimed at him gets through", () => {
  const g = gate(exchange({ speaking: true, lastSpokenTurnAt: replyEnd + 2000, echo: "Ultron is a robot" }));
  assert.ok(g.heardOverHimInExchange("Listen, I'm talking about what do you think of."));
  assert.ok(!g.heardOverHimInExchange("Ultron is a robot bent on eradicating humanity"));
  assert.ok(!g.heardOverHimInExchange("the weather is nice"));
});

test("no conversation, no open door: the room is not let in", () => {
  const g = gate(exchange({ lastSpokenTurnAt: replyEnd - 200000, lastUserTurnAt: replyEnd - 200000 }));
  assert.ok(!g.heardOverHimInExchange("What do you have to say to that."));
  assert.ok(!g.followsHisReply("That was uncalled for."));
});

test("a typed chat turn does not open the mic's door", () => {
  assert.match(renderer, /if \(accepted && !dictationMode && !opts\.typed\) lastSpokenTurnAt = Date\.now\(\);/);
});

test("main trusts the voice side's verdict instead of dropping an accepted follow-up", () => {
  assert.match(renderer, /addressed: Boolean\(options\.keepRealtime && namedModeOn && Date\.now\(\) - namedAcceptedAt < 15000\)/);
  assert.match(main, /macHeardAddressed = Boolean\(options\.typed\) \|\| Boolean\(options\.addressed\)/);
});
