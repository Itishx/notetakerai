import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const EDGE_MODEL_CALLERS = [
  "supabase/functions/chat/braino-chat/index.ts",
  "supabase/functions/chat/braino-reply/index.ts",
  "supabase/functions/chat/chat-about-notes/index.ts",
  "supabase/functions/chat/transcribe-and-notes/index.ts",
  "supabase/functions/chat/vision-point/index.ts",
  "supabase/functions/reasoning/hil-loop/index.ts",
  "supabase/functions/reasoning/hil-reason/index.ts",
  "supabase/functions/reasoning/hil-router/index.ts",
  "supabase/functions/research/reddit-assistant/index.ts",
  "supabase/functions/research/web-research/index.ts",
  "supabase/functions/x/x-assistant/index.ts",
  "supabase/functions/x/x-auto-engage/index.ts",
  "supabase/functions/x/x-auto-generate/index.ts",
];

test("pins Braino's shared text and vision model to GPT-5.6 Luna", () => {
  const shared = read("supabase/functions/_shared/openai-models.ts");
  assert.match(shared, /BRAINO_TEXT_MODEL\s*=\s*"gpt-5\.6-luna"/);
  assert.match(shared, /BRAINO_TEXT_REASONING_EFFORT\s*=\s*"none"/);

  for (const path of EDGE_MODEL_CALLERS) {
    const source = read(path);
    assert.match(source, /BRAINO_TEXT_MODEL/, `${path} must use the shared Braino model`);
    assert.doesNotMatch(source, /gpt-5\.(?:4|5)(?:-mini)?/, `${path} still pins an old GPT-5 model`);
  }
});

test("keeps source, downloadable, and built extension model defaults aligned", () => {
  const sourceModels = read("extension/lib/models.js");
  assert.match(sourceModels, /STEP:\s*"gpt-5\.6-luna"/);
  assert.match(sourceModels, /STRATEGIST:\s*"gpt-5\.6-luna"/);

  for (const prefix of ["public/sidebrain-extension", "dist/sidebrain-extension"]) {
    assert.equal(read(`${prefix}/lib/models.js`), sourceModels, `${prefix} model registry drifted`);
    assert.equal(
      read(`${prefix}/background.js`),
      read("extension/background.js"),
      `${prefix} background fallback drifted`,
    );
  }
});

test("preserves GPT-5.4 Mini's no-reasoning behavior on Luna chat calls", () => {
  const shared = read("supabase/functions/_shared/openai-models.ts");
  assert.match(shared, /BRAINO_TEXT_REASONING_EFFORT\s*=\s*"none"/);

  const callersThatNeedNone = EDGE_MODEL_CALLERS.filter((path) => ![
    "supabase/functions/chat/vision-point/index.ts",
    "supabase/functions/research/web-research/index.ts",
  ].includes(path));

  for (const path of callersThatNeedNone) {
    assert.match(
      read(path),
      /BRAINO_TEXT_REASONING_EFFORT/,
      `${path} must preserve the previous no-reasoning default`,
    );
  }
});
