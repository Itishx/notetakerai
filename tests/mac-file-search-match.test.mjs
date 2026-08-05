import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  candidateMatchesQuery,
  fuzzyWordIncluded,
} = require("../mac/braino-mac/file-search-match.cjs");

const cases = [
  {
    name: "does not match the PNG from the reported bug",
    candidate: "A _ Signature _ Hi_ I_m Braino (1).png",
    query: "Claude settings usage",
    expected: false,
  },
  {
    name: "does not match another unrelated image",
    candidate: "Let's Launch a Website That Speaks to Your Dream Clients.jpeg",
    query: "Claude settings usage",
    expected: false,
  },
  {
    name: "matches an exact requested filename",
    candidate: "Claude settings usage.png",
    query: "Claude settings usage",
    expected: true,
  },
  {
    name: "matches all requested words inside a longer filename",
    candidate: "July invoice final 2026.pdf",
    query: "invoice july",
    expected: true,
  },
  {
    name: "keeps small typo tolerance",
    candidate: "Claude settings usage.png",
    query: "Cloude settings usage",
    expected: true,
  },
  {
    name: "requires every requested word",
    candidate: "Claude settings.png",
    query: "Claude settings usage",
    expected: false,
  },
];

for (const testCase of cases) {
  assert.equal(
    candidateMatchesQuery(testCase.candidate, testCase.query),
    testCase.expected,
    testCase.name,
  );
  console.log(`ok  ${testCase.name}`);
}

assert.equal(
  fuzzyWordIncluded(["a", "signature", "hi", "i", "m", "braino"], "claude"),
  false,
  "one-letter filename fragments must not match longer query words",
);
console.log("ok  one-letter filename fragments cannot satisfy longer words");

console.log(`\n${cases.length + 1} passed, 0 failed`);
