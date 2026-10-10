// Think once, then the hands run.
//
// A plan is a list of tool calls. It comes from a recipe (known jobs, no model
// at all) or from hil-plan (one model call, about 2.5 seconds). The Mac runs
// the steps back to back; nothing asks the model again unless a step fails.
// Before this, "start a Meet and send the link to Ilu" went through the loop
// at 5 to 8 seconds of model per step: 40 to 90 seconds, and often a give-up.
//
// Pure: recipes and argument filling. main.cjs runs the tools.

/* Known jobs. Each returns steps, or null. */
const RECIPES = [
  {
    id: "meet_link_to_person",
    // "start a google meet and send the link to Ilu (on whatsapp)"
    match: /\b(?:start|create|make|set\s*up|open|begin)\b.{0,30}\b(?:google\s+)?meet(?:ing)?\b.{0,40}\b(?:send|share|text|whatsapp|forward)\b.{0,25}?\b(?:to|with)\s+([A-Za-zऀ-ॿ][\wऀ-ॿ .'-]{0,30}?)(?:\s+(?:on|via|over)\s+whats\s*app)?[.!?]*$/i,
    steps: (m) => [
      { tool: "open_url", args: { url: "https://meet.new" } },
      { tool: "wait_for_url", args: { contains: "meet.google.com/", timeoutMs: 12000 } },
      { tool: "whatsapp_send", args: { recipientRaw: m[1].trim(), message: "Join me on Google Meet: {{2}}" } },
    ],
    done: (m) => `Sent ${m[1].trim()} the Meet link.`,
  },
  {
    id: "tab_link_to_person",
    // "send this link / this page / this video to Ilu"
    match: /\b(?:send|share|forward|text)\s+(?:this|the|that)\s+(?:link|page|website|site|tab|video|article|url)\s+to\s+([A-Za-zऀ-ॿ][\wऀ-ॿ .'-]{0,30}?)(?:\s+(?:on|via|over)\s+whats\s*app)?[.!?]*$/i,
    steps: (m) => [
      { tool: "current_tab_url", args: {} },
      { tool: "whatsapp_send", args: { recipientRaw: m[1].trim(), message: "{{1}}" } },
    ],
    done: (m) => `Sent it to ${m[1].trim()}.`,
  },
  {
    id: "new_doc",
    match: /^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)?(?:(?:can|could|would)\s+you\s+)?(?:please\s+)?(?:open|create|make|start)\s+(?:a\s+)?(?:new\s+)?(?:blank\s+)?google\s+doc(?:ument)?[.!?]*$/i,
    steps: () => [{ tool: "open_url", args: { url: "https://docs.new" } }],
    done: () => "New doc's open.",
  },
];

function recipeFor(raw) {
  const text = String(raw || "").trim();
  for (const r of RECIPES) {
    const m = text.match(r.match);
    if (m) return { id: r.id, steps: r.steps(m), done: r.done(m) };
  }
  return null;
}

/* "{{2}}" is step 2's value, "{{last}}" the one before this step. Strings only,
   recursively, so a message can carry a link. */
function fillArgs(args, values) {
  const fill = (v) => {
    if (typeof v === "string") {
      return v.replace(/\{\{\s*(last|\d+)\s*\}\}/g, (_, k) => {
        const val = k === "last" ? values[values.length - 1] : values[Number(k) - 1];
        return val == null ? "" : String(val);
      });
    }
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    return v;
  };
  return fill(args || {});
}

/* What a step produced, for the steps after it: a link, an address, or what
   it said. */
function stepValue(out) {
  if (!out || typeof out !== "object") return "";
  return out.value ?? out.url ?? out.link ?? out.answer ?? out.say ?? "";
}

module.exports = { recipeFor, fillArgs, stepValue, RECIPES };
