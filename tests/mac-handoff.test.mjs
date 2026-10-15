import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Handing Braino a checklist (2026-10-15). */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const lessons = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/use-cases.ts", import.meta.url), "utf8");
const src = main.slice(main.indexOf("const HANDOFF_STEP_LINE"), main.indexOf("async function runHandoff"));
const api = new Function(`${src}; return { parseHandoff, handoffCommand, HANDOFF_ASK };`)();

const steps = "1. Go to console.cloud.google.com, APIs & Services, Credentials.\n2. Open the OAuth 2.0 Client ID.\n3. Under Authorized redirect URIs, add https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1/google-calendar-oauth-callback\n4. Click Save.";

test("a pasted numbered list is a handoff, with every step and the exact address", () => {
  const h = api.parseHandoff(steps);
  assert.equal(h.steps.length, 4);
  const cmd = api.handoffCommand(h);
  assert.match(cmd, /^HANDOFF\./);
  assert.match(cmd, /3\. Under Authorized redirect URIs, add https:\/\/suwhgaxxdizowbyjlljj\.supabase\.co\/functions\/v1\/google-calendar-oauth-callback/);
});

test("bullets and a 'do this:' lead count too; one sentence never does", () => {
  assert.ok(api.parseHandoff("- open Gmail\n- search invoices"));
  assert.ok(api.parseHandoff("Do these steps:\nopen Notion\nmake a page called Launch"));
  assert.equal(api.parseHandoff("play something calm"), null);
  assert.equal(api.parseHandoff("Tell Riya I'm running late"), null);
});

test("'do what I copied' reads the clipboard", () => {
  for (const t of ["Braino, do what I copied", "do these steps", "follow the steps I copied", "do what's on my clipboard"]) assert.ok(api.HANDOFF_ASK.test(t), t);
  assert.ok(!api.HANDOFF_ASK.test("do you know what I copied yesterday"));
  assert.match(main, /const copied = parseHandoff\(clipboard\.readText\(\)\)/);
});

test("handoffs go straight to the loop with room to finish, and the lesson is shared", () => {
  assert.match(main, /runMacHilLoop\(handoffCommand\(h\), null, \{ noPlan: true, handoff: true \}\)/);
  assert.match(main, /opts\.handoff \? MAC_HANDOFF_TIME_MS : MAC_HIL_SOFT_TIME_MS/);
  assert.match(lessons, /12\. A handed off checklist/);
  assert.doesNotMatch(lessons, /[–—]/);
});
