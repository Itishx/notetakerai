// Who is who (5 Oct): "what did my mother text" got "No messages from mother".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const body = main.slice(main.indexOf("const RELATIONS = {"), main.indexOf("\nasync function lookupWhatsAppMessages")).replace(/const RELATIONS_PATH[^\n]*\n/, "");
const { relationKey, parseRelationTeach } = Function("fs", "path", "logMac", "AUTH_STORE_DIR", "waDbAvailable", "queryWhatsAppDb", `${body}; return { relationKey, parseRelationTeach };`)(null, null, () => {}, "", () => false, null);

test("relations in English and Hindi", () => {
  for (const [w, r] of [["my mother", "mother"], ["mummy", "mother"], ["maa", "mother"], ["papa", "father"], ["bhai", "brother"], ["didi", "sister"], ["nani", "grandmother"]]) assert.equal(relationKey(w), r, w);
  assert.equal(relationKey("Param"), "");
});

test("he learns who is who when told", () => {
  assert.deepEqual(parseRelationTeach("my mom is Shubha"), { rel: "mother", name: "Shubha" });
  assert.deepEqual(parseRelationTeach("Shubha Pande is my mother"), { rel: "mother", name: "Shubha Pande" });
  assert.equal(parseRelationTeach("my name is Itish"), null);
  assert.equal(parseRelationTeach("Param is my friend"), null);
});

test("messages, sends and HIL all use it", () => {
  assert.match(main, /const relation = relationKey\(contact\) \? await resolveRelation\(contact\) : null;/);
  assert.match(main, /if \(relationKey\(recipientRaw\)\) \{\n    const relation = await resolveRelation\(recipientRaw\);/);
  assert.match(main, /if \(!resolved\.ok && resolved\.error === "relation"\) return \{ ok: false, say: resolved\.say \};/);
  assert.match(main, /relationsLine\(\),/);
});
