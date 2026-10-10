// Skills he learned: a job that worked, saved under the words you used, so the
// same words next time run it instantly instead of thinking it through again.
//
// Exact phrases, or the same words in another order (see findSkill). "Open github and show my repos" learned today replays
// for exactly that sentence (after the usual clean-up: no "please", no name,
// no punctuation, any case). A different sentence is thought through as
// normal. No guessing at what is "similar", so a learned skill can't fire on
// words that meant something else.
//
// Pure: phrase keys and the rules for what may be saved. main.cjs stores it.

const MAX_SKILLS = 300;

function skillKey(cleaned) {
  return String(cleaned || "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9ऀ-ॿ ]+/g, " ")
    .replace(/\b(?:please|pls|braino|bruno|brino|reno|for me|now|right now|can you|could you|would you)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Worth saving: it ran with no failure, has at least one step, nothing in it
   can't be taken back, and every argument is filled in (a "{{2}}" is fine: it
   is filled from an earlier step when it runs). Answers to questions are not
   saved: "what's my attendance" must be looked up fresh every time. */
const LOOKUPS = /(?:_lookup|_query|_report|_messages|_stats|_mentions|_census|_status|_current|_summary|_list)$|^(?:now_playing|spotify_now_playing|memory_search|web_search|count_items|recent_download|whats_new|describe_image|screen_vision|read_selection|answer_question_conversationally)$/;

/* What a step searches for or opens has to come from what was said
   (2026-10-05): "open the diagram of a human body's anatomy" was planned as
   a YouTube search for "Sabrina Carpenter earliest video", the job before
   it, and saved to replay instantly. Eight shortcuts like that were found. */
const NOT_CONTENT = new Set(["open", "show", "play", "find", "search", "the", "and", "for", "with", "from", "that", "this", "your", "what", "video", "videos", "youtube", "google", "http", "https", "www", "com"]);
function contentWords(value) {
  return new Set((String(value || "").toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((w) => !NOT_CONTENT.has(w)));
}
function stepsComeFromCommand(steps, command) {
  const said = contentWords(command);
  return steps.every((step) => {
    const args = step?.args || {};
    const asked = contentWords(["query", "text", "url", "q", "search"].map((f) => args[f] || "").join(" "));
    return !asked.size || [...asked].some((w) => said.has(w));
  });
}

function canSaveSkill(steps, isIrreversible, command = null) {
  if (!Array.isArray(steps) || !steps.length || steps.length > 8) return false;
  if (command != null && !stepsComeFromCommand(steps, command)) return false;
  return steps.every((step) => {
    if (!step || !step.tool || LOOKUPS.test(step.tool)) return false;
    if (typeof isIrreversible === "function" && isIrreversible(step)) return false;
    const args = step.args || {};
    return Object.values(args).every((v) => v !== "" && v != null);
  });
}

/* Same words, any order (2026-10-01). "open my repos on github" finds
   "open github my repos": the same verb first, then exactly the same set of
   words once "the", "a", "an" and "my" are set aside. Nothing is guessed:
   a different word, an extra word or a different verb never matches. Only
   jobs that can be taken back are ever saved, so a swapped order can only
   ever open the wrong thing, never send it. */
const FILLER = new Set(["the", "a", "an", "my"]);
function wordSet(key) {
  return String(key || "").split(" ").filter((w) => w && !FILLER.has(w)).sort().join(" ");
}
function findSkill(store, key) {
  if (!key || !store) return { key: "", skill: null };
  if (store[key]) return { key, skill: store[key] };
  const verb = key.split(" ")[0];
  const want = wordSet(key);
  for (const k of Object.keys(store)) {
    if (k.split(" ")[0] === verb && wordSet(k) === want) return { key: k, skill: store[k] };
  }
  return { key: "", skill: null };
}

/* By intent, with the details swapped in (6 Oct). A saved job is a shape plus
   a detail: "play some lofi on youtube" is "play <what> on youtube", with
   "lofi" as the what. "Put on jazz on YouTube" or "play arijit on youtube" is
   the same intent with a different detail, so it reuses the job instantly
   with the new detail filled in, instead of being thought through again.
   Only the detail that the saved steps actually used can change: every other
   word of the shape has to be there, so "play jazz on spotify" never runs the
   YouTube job. Only jobs that can be taken back are ever saved. */
const VERBS = [
  [/^(?:put on|start playing|play me)\b/, "play"],
  [/^(?:show me|find me|get me|search for|look for|look up|search)\b/, "show"],
  [/^(?:launch|pull up|bring up|take me to|go to)\b/, "open"],
];
const SLOT_FILLER = new Set(["some", "a", "an", "the", "few", "me", "my", "any", "good", "nice", "please"]);
function intentWords(key) {
  let t = String(key || "").trim();
  for (const [re, verb] of VERBS) t = t.replace(re, verb);
  return t.split(" ").filter((w) => w && !SLOT_FILLER.has(w));
}
const SLOT_FIELDS = ["query", "q", "search", "text", "songQuery", "song", "track", "name", "subject", "term", "product"];
/* A search address carries its detail in the query: pinterest.com/search/pins/?q=dashboard%20ui. */
const URL_PARAMS = ["q", "query", "search_query", "k", "keywords", "search", "text", "term"];
function urlQuery(url) {
  try {
    const u = new URL(String(url || ""));
    for (const p of URL_PARAMS) if (u.searchParams.get(p)) return { param: p, value: u.searchParams.get(p) };
  } catch (_) {}
  return null;
}
const stem = (w) => w.replace(/(?:ies)$/, "y").replace(/(?:es|s)$/, "");
const words = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g, " ").split(/\s+/).filter((w) => w && !SLOT_FILLER.has(w));
/* Where the saved detail sits in the sentence: the span of the sentence that
   holds the detail's words, by root ("inspiration" = "inspirations"), in any
   order, with at most two extra words inside it. */
function slotOf(skillKey, steps) {
  const shape = intentWords(skillKey);
  const roots = shape.map(stem);
  for (const step of steps || []) {
    const args = step?.args || {};
    const cands = SLOT_FIELDS.filter((f) => typeof args[f] === "string" && args[f]).map((f) => ({ field: f, value: args[f] }));
    for (const f of ["url", "target"]) { const q = urlQuery(args[f]); if (q) cands.push({ field: f, param: q.param, value: q.value }); }
    for (const c of cands) {
      const want = words(c.value).map(stem);
      if (!want.length) continue;
      const at = want.map((w) => roots.indexOf(w));
      if (at.some((x) => x < 0)) continue;
      const start = Math.min(...at), end = Math.max(...at);
      if (end - start + 1 > want.length + 2) continue;
      return { ...c, start, end, stepIndex: (steps || []).indexOf(step) };
    }
  }
  return null;
}
function fillSlot(steps, slot, detail) {
  return (steps || []).map((step, i) => {
    if (i !== slot.stepIndex) return step;
    const args = { ...(step.args || {}) };
    if (slot.param) {
      try { const u = new URL(String(args[slot.field])); u.searchParams.set(slot.param, detail); args[slot.field] = u.toString(); } catch (_) {}
    } else args[slot.field] = detail;
    return { ...step, args };
  });
}
function findSkillByIntent(store, key) {
  const said = intentWords(key);
  if (!said.length || !store) return null;
  let best = null;
  for (const [k, skill] of Object.entries(store)) {
    const slot = slotOf(k, skill?.steps);
    if (!slot) continue;
    const shape = intentWords(k);
    const before = shape.slice(0, slot.start), after = shape.slice(slot.end + 1);
    // The fixed part has to say something: the verb plus at least one more real
    // word ("play … on youtube"), never a shape that is all detail.
    const fixed = [...before, ...after].filter((w) => !/^(?:on|in|at|for|to|of|from|with|and)$/.test(w));
    if (fixed.length < 2) continue;
    if (said.length <= before.length + after.length) continue;
    if (said.slice(0, before.length).map(stem).join(" ") !== before.map(stem).join(" ")) continue;
    if (after.length && said.slice(said.length - after.length).map(stem).join(" ") !== after.map(stem).join(" ")) continue;
    const detail = said.slice(before.length, said.length - after.length).join(" ");
    if (!detail || detail.split(" ").length > 8) continue;
    if (detail === shape.slice(slot.start, slot.end + 1).join(" ")) continue;
    // The most specific shape wins.
    if (!best || fixed.length > best.fixed) best = { fixed: fixed.length, key: k, skill: { ...skill, steps: fillSlot(skill.steps, slot, detail) }, detail, from: slot.value };
  }
  if (!best) return null;
  const { fixed, ...hit } = best;
  return hit;
}

function addSkill(store, key, steps, done) {
  const next = { ...(store || {}) };
  if (!key) return next;
  next[key] = { steps, done: String(done || ""), uses: (next[key]?.uses || 0), savedAt: Date.now() };
  const keys = Object.keys(next);
  if (keys.length > MAX_SKILLS) {
    keys.sort((a, b) => (next[a].savedAt || 0) - (next[b].savedAt || 0)).slice(0, keys.length - MAX_SKILLS).forEach((k) => delete next[k]);
  }
  return next;
}

module.exports = { skillKey, canSaveSkill, stepsComeFromCommand, addSkill, findSkill, findSkillByIntent, MAX_SKILLS };
