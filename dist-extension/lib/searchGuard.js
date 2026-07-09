// Redundant-search guard — PURE decision logic, extracted from bgRunDelegateLoop so it
// can be unit-tested in node against the exact code that ships (tests/search-guard.test.mjs).
//
// Contract (the owner's spec, hardened over v9.1.1 → v9.2.2):
//   BLOCKED, and nothing else:
//     a) typing/searching the synth query while ALREADY on that thing's product/detail
//        page (URL slug matches ≥60% of query tokens) — next step is acting on the page;
//     b) re-running the IDENTICAL query on the SAME site after its results page LOADED.
//   Always allowed: navigation anywhere (incl. back to results), new sites, new queries,
//   partial/autocomplete typing, retries of searches that never executed, multi-product
//   and comparison research.
//   A search is only "done" when the results page for the query is actually up —
//   typing without submit is NOT a search.
(function initBrainoSearchGuard(global) {
  "use strict";

  const norm = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
  const hostOf = (u) => {
    try { return new URL(String(u || "")).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
  };
  // URL text for matching: decode %XX and treat + as space so "s?k=atomic+habits"
  // matches the query "atomic habits".
  const decodeUrlText = (u) => {
    let s = String(u || "");
    try { s = decodeURIComponent(s); } catch (_) { /* malformed escapes — match raw */ }
    return norm(s.replace(/\+/g, " "));
  };
  const RESULTS_URL_RE = /[?&](k|q)=|\/s(\?|earch)/i;
  const DETAIL_URL_RE = /\/(dp|gp\/product)\/|\/product\/|\/item\/|\/p\/[a-z0-9]/i;

  function tokensOf(query) {
    return norm(query).split(" ").filter((t) => t.length >= 3);
  }
  function tokenShare(query, hayLower) {
    const toks = tokensOf(query);
    if (!toks.length) return 0;
    return toks.filter((t) => hayLower.includes(t)).length / toks.length;
  }

  // What is this action "searching" for? "" when the action isn't search-shaped.
  function actionQueryOf(action) {
    if (!action || typeof action !== "object") return "";
    if (action.type === "type") return norm(action.text);
    if (action.type === "web_search") return norm(action.query);
    if (action.type === "navigate" && RESULTS_URL_RE.test(String(action.url || ""))) return decodeUrlText(action.url);
    return "";
  }

  // Is this action running THE synth search (vs typing a pincode, a quantity, or a
  // few autocomplete characters)? Partial typing under 8 chars is not "the search".
  function isSearchLike(actionQuery, synthQuery) {
    const q = norm(synthQuery);
    if (!q || !actionQuery || actionQuery.length < 4) return false;
    if (actionQuery.includes(q)) return true;
    return q.includes(actionQuery) && actionQuery.length >= Math.min(8, q.length);
  }

  // Decide whether to skip this action. Returns { blocked, searchLike, host, note? }.
  // searchesDone: [{host, query}] — the run's un-evictable record of executed searches.
  function evaluate({ action, pageUrl, synthQuery, searchesDone }) {
    const q = norm(synthQuery);
    const actionQuery = actionQueryOf(action);
    if (!isSearchLike(actionQuery, q)) return { blocked: false, searchLike: false, host: "" };
    const url = String(pageUrl || "");
    const currentHost = hostOf(url);
    const host = action.type === "web_search" ? "web"
      : action.type === "navigate" ? hostOf(action.url)
      : currentHost;
    // Navigation is NEVER blocked — going back to a results page, or moving from a
    // stranded tab to the right site, must always stay legal.
    if (action.type !== "navigate") {
      const onThisProductsPage = DETAIL_URL_RE.test(url) && tokenShare(q, decodeUrlText(url)) >= 0.6;
      if (onThisProductsPage && host === currentHost) {
        return {
          blocked: true, searchLike: true, host,
          note: `You are ALREADY on the product page for this (${url.slice(0, 120)}). Do not search again — the next step is acting on THIS page (e.g. Add to Cart).`,
        };
      }
      const exactRepeat = (Array.isArray(searchesDone) ? searchesDone : []).some(
        (s) => s && s.host === host && norm(s.query) === actionQuery,
      );
      if (exactRepeat) {
        return {
          blocked: true, searchLike: true, host,
          note: `This exact search already ran on ${host} and its results page loaded. Do not retype the query — open the matching result on THIS page (scroll if needed), or search for something DIFFERENT if the task needs it.`,
        };
      }
    }
    return { blocked: false, searchLike: true, host };
  }

  // Is the results page for the synth query actually up at this URL? Independent of
  // WHICH action got there (type+submit, separate pressKey Enter, navigate, or a race
  // that resolved a step later) — the URL is the proof. Product/detail pages never
  // count: some carry the query as a &q= referral param without any search having run.
  // Returns {host, query} to record, or null.
  function shouldMark({ newUrl, synthQuery, searchesDone }) {
    const q = norm(synthQuery);
    const url = String(newUrl || "");
    if (!q || !RESULTS_URL_RE.test(url)) return null;
    if (DETAIL_URL_RE.test(url)) return null;
    if (tokenShare(q, decodeUrlText(url)) < 0.6) return null;
    const host = hostOf(url);
    if (!host) return null;
    const already = (Array.isArray(searchesDone) ? searchesDone : []).some(
      (s) => s && s.host === host && norm(s.query) === q,
    );
    if (already) return null;
    return { host, query: q };
  }

  const api = { evaluate, shouldMark, _internals: { actionQueryOf, isSearchLike, tokenShare, hostOf, decodeUrlText } };
  global.BrainoSearchGuard = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
