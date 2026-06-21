// Emotional Engine — preview / smoke test. Not used at runtime.
//
// Prints Braino's composed personality core for a few moments and settings, and checks that
// detectMoment() labels sample messages correctly. Run it to SEE the engine work:
//
//   npx tsx supabase/functions/_shared/emotional-engine/__preview.ts
//
// (Pure text + regex — no AI, no network.)

import { buildEmotionalCore } from "./engine.ts";
import { detectMoment } from "./moments.ts";
import { DEFAULT_PERSONALITY_SETTINGS, resolvePersonalitySettings } from "./settings.ts";

const rule = (s: string) => `\n${"═".repeat(78)}\n${s}\n${"═".repeat(78)}`;

// 1) detectMoment sanity check
console.log(rule("detectMoment() — sample messages"));
const samples: Array<[string, string]> = [
  ["my girlfriend just broke up with me", "heartbreak"],
  ["my dog passed away last night", "grief"],
  ["I'm so overwhelmed I can't even start", "anxiety"],
  ["I GOT THE JOB!!! 🎉", "celebration"],
  ["be brutally honest, is this idea any good?", "conflict"],
  ["fix this function for me", "focused_task"],
  ["lol say something funny", "banter"],
  ["what's the capital of France?", "neutral"],
];
let pass = 0;
for (const [msg, expected] of samples) {
  const got = detectMoment(msg).moment;
  const ok = got === expected;
  if (ok) pass++;
  console.log(`${ok ? "✓" : "✗"}  "${msg}"  →  ${got}${ok ? "" : `  (expected ${expected})`}`);
}
console.log(`\n${pass}/${samples.length} moment cues correct`);

// 2) Composed core for a few moments (text + voice)
for (const moment of ["neutral", "heartbreak", "celebration", "focused_task"] as const) {
  console.log(rule(`CORE — moment="${moment}", medium="text", default settings`));
  console.log(buildEmotionalCore({ moment, medium: "text", settings: DEFAULT_PERSONALITY_SETTINGS }));
}

// 3) Toggle demo — dad jokes off vs on (humor section only differs)
console.log(rule(`TOGGLE — dadJokes:false vs true (banter moment, text)`));
const off = buildEmotionalCore({ moment: "banter", settings: resolvePersonalitySettings({ dadJokes: false }) });
const on = buildEmotionalCore({ moment: "banter", settings: resolvePersonalitySettings({ dadJokes: true }) });
console.log("dadJokes OFF includes 'Dad jokes are switched on':", off.includes("Dad jokes are switched on"));
console.log("dadJokes ON  includes 'Dad jokes are switched on':", on.includes("Dad jokes are switched on"));

// 4) humor:"off" omits the humor trait entirely
const noHumor = buildEmotionalCore({ settings: resolvePersonalitySettings({ humor: "off" }) });
console.log("\nhumor:'off' omits the Humor block:", !noHumor.includes("Humor:"));
