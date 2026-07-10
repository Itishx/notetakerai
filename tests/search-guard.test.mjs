// Exhaustive scenario suite for the delegate redundant-search guard.
// Tests the EXACT module that ships (extension/lib/searchGuard.js) — no logic copies.
// Run: node tests/search-guard.test.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// package.json is type:module, so the lib loads as ESM (no CJS `module`) — it attaches
// to globalThis, which is exactly how the MV3 service worker consumes it via importScripts.
const req = require("../extension/lib/searchGuard.js");
const Guard = req && typeof req.evaluate === "function" ? req : globalThis.BrainoSearchGuard;

const Q = "atomic habits";
const AMZ_HOME = "https://www.amazon.in/";
const AMZ_RESULTS = "https://www.amazon.in/s?k=atomic+habits&crid=ABC123";
const AMZ_DETAIL = "https://www.amazon.in/Atomic-Habits-Proven-Build-Break/dp/0735211299";
const AMZ_OTHER_DETAIL = "https://www.amazon.in/Deep-Work-Rules-Focused-Success/dp/1455586692";
const DONE_AMZ = [{ host: "amazon.in", query: Q }];

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = got === want;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}  (got ${got}, want ${want})`);
}
const evalBlocked = (action, pageUrl, searchesDone = [], synthQuery = Q) =>
  Guard.evaluate({ action, pageUrl, synthQuery, searchesDone }).blocked;
const marks = (newUrl, searchesDone = [], synthQuery = Q) =>
  Guard.shouldMark({ newUrl, synthQuery, searchesDone }) !== null;

// ── The original bug class: redundancy that MUST be blocked ──
check("1. type query while ON its product page → BLOCK",
  evalBlocked({ type: "type", text: "Atomic Habits" }, AMZ_DETAIL), true);
check("2. re-type identical query after results loaded → BLOCK",
  evalBlocked({ type: "type", text: "atomic habits" }, AMZ_RESULTS, DONE_AMZ), true);
check("3. web_search identical query after results loaded on same host? (host differs: web) → allow",
  evalBlocked({ type: "web_search", query: "atomic habits" }, AMZ_RESULTS, DONE_AMZ), false);

// ── The v9.1.1 regression class: exploration that MUST stay allowed ──
check("4. navigate stranded-tab → amazon search URL → allow",
  evalBlocked({ type: "navigate", url: "https://www.amazon.in/s?k=atomic+habits" }, "https://vercel.com/x"), false);
check("5. navigate BACK to results from product page → allow",
  evalBlocked({ type: "navigate", url: AMZ_RESULTS }, AMZ_DETAIL, DONE_AMZ), false);
check("6. same query on a DIFFERENT site (flipkart) → allow",
  evalBlocked({ type: "type", text: "atomic habits" }, "https://www.flipkart.com/", DONE_AMZ), false);
check("7. DIFFERENT product query on same site (multi-buy) → allow",
  evalBlocked({ type: "type", text: "deep work cal newport" }, AMZ_RESULTS, DONE_AMZ), false);
check("8. second product query while on product-1's page → allow",
  evalBlocked({ type: "type", text: "deep work cal newport" }, AMZ_DETAIL, DONE_AMZ), false);

// ── The v9.2.1 deepest-bug class: retry of a search that never executed ──
check("9. type query on homepage, NO prior results → allow (first attempt)",
  evalBlocked({ type: "type", text: "atomic habits" }, AMZ_HOME), false);
check("10. typing did NOT navigate (still homepage) → NOT marked done",
  marks(AMZ_HOME), false);
check("11. re-type after unexecuted search (no fact) → allow (the amazon.in strand)",
  evalBlocked({ type: "type", text: "atomic habits" }, AMZ_HOME, []), false);
check("12. results page up (typed+Enter or navigate) → marked done",
  marks(AMZ_RESULTS), true);
check("13. pressKey-Enter path: mark is action-agnostic (URL is the proof)",
  marks("https://www.amazon.in/s?k=atomic+habits"), true);
check("14. + and %20 encodings decode for matching",
  marks("https://www.amazon.in/s?k=atomic%20habits"), true);
check("15. results page for a DIFFERENT query → NOT marked as ours",
  marks("https://www.amazon.in/s?k=deep+work"), false);
check("16. already marked → no duplicate fact",
  marks(AMZ_RESULTS, DONE_AMZ), false);

// ── False-positive protection: everyday typing must never trip the guard ──
check("17. partial autocomplete 'atomic' (6 chars) → not search-like → allow",
  evalBlocked({ type: "type", text: "atomic" }, AMZ_DETAIL), false);
check("18. typing a quantity '2' on product page → allow",
  evalBlocked({ type: "type", text: "2" }, AMZ_DETAIL), false);
check("19. typing a pincode on product page → allow",
  evalBlocked({ type: "type", text: "500075" }, AMZ_DETAIL), false);
check("20. on a DIFFERENT product's detail page, typing our query → allow (fresh search)",
  evalBlocked({ type: "type", text: "atomic habits" }, AMZ_OTHER_DETAIL), false);

// ── Degenerate inputs: never crash, always fail open ──
check("21. no synth query → allow everything",
  evalBlocked({ type: "type", text: "atomic habits" }, AMZ_DETAIL, [], null), false);
check("22. malformed page URL → allow",
  evalBlocked({ type: "type", text: "atomic habits" }, "not a url", DONE_AMZ), false);
check("23. malformed action → allow",
  evalBlocked(null, AMZ_DETAIL), false);
check("24. malformed results URL → not marked, no crash",
  marks("::::"), false);

// ── Review-driven scenarios (adversarial findings F5 + shape checks) ──
check("25. flipkart product URL with &q= referral param → NOT marked (detail page)",
  marks("https://www.flipkart.com/atomic-habits-james-clear/p/itm123abc?pid=X&q=atomic+habits"), false);
check("26. type query on flipkart product page (slug matches) → BLOCK",
  evalBlocked({ type: "type", text: "atomic habits" }, "https://www.flipkart.com/atomic-habits-james-clear/p/itm123abc"), true);
check("27. amazon detail URL with keywords param → NOT marked",
  marks("https://www.amazon.in/Atomic-Habits-Proven/dp/0735211299?keywords=atomic+habits&qid=1"), false);
const shape = Guard.shouldMark({ newUrl: AMZ_RESULTS, synthQuery: Q, searchesDone: [] });
check("28. mark shape has host", shape && shape.host === "amazon.in", true);
check("29. mark shape has normalized query", shape && shape.query === "atomic habits", true);
check("30. navigate to results of already-searched query → still allowed (back-nav)",
  evalBlocked({ type: "navigate", url: AMZ_RESULTS }, AMZ_RESULTS, DONE_AMZ), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
