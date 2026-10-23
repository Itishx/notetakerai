import { ask, clean, DAY, WEEK } from "./lib";
import { whereOf, type Project } from "./store";
import { namedRange, waitingCount, type PageId, type Runner } from "./types";

/* Braino on the web, voice (2026-10-24). Simple phrase matching first; if
   nothing matches he answers from the project's memory in two sentences.
   He only gets things ready: anything that goes out still needs your yes,
   and "send it" is that yes. Every reply is first person and short. */

export type VoiceCtx = {
  p: Project;
  run: Runner;
  /* Navigate, optionally focusing one person or a stage in Reach people. */
  go: (page: PageId, focus?: { person?: string; stage?: "replied" }) => void;
  /* Approve the item the notch is about. Returns what happened, or "" if nothing. */
  approve: () => string;
};

const has = (t: string, ...re: RegExp[]) => re.some((r) => r.test(t));

export function weekSummary(p: Project) {
  const since = Date.now() - WEEK;
  const msgs = p.people.filter((x) => x.stage !== "found" && x.stageAt >= since).length;
  const replies = p.people.filter((x) => ["replied", "talking", "paid"].includes(x.stage) && x.stageAt >= since).length;
  const posts = p.posts.filter((x) => x.status === "approved" && x.at >= since).length;
  const n = namedRange(p), of = p.optics?.answers.length || 0;
  const named = of ? ` AI named you in ${n.low === n.high ? n.low : `${n.low} to ${n.high}`} of ${of} questions.` : "";
  return `This week you messaged ${msgs} ${msgs === 1 ? "person" : "people"} and ${replies} replied.${named} You approved ${posts} post${posts === 1 ? "" : "s"}.`;
}

function context(p: Project) {
  const m = p.memory;
  const recent = m.activity.filter((a) => a.at >= Date.now() - 3 * DAY).slice(0, 8).map((a) => `- ${a.text}`).join("\n");
  const replied = p.people.filter((x) => x.stage === "replied").map((x) => whereOf(x)).slice(0, 3).join(", ");
  return [
    `Product: ${m.product.name || "not named yet"}. ${m.product.oneLiner}`,
    `Buyer: ${m.product.buyer || m.buyer.buyer}. Problem: ${m.product.problem}. Pricing: ${m.product.pricing}.`,
    `Founder: ${m.founder.name || ""} ${m.founder.who}`.trim(),
    `Counts: ${p.people.length} people found, ${p.people.filter((x) => x.stage !== "found").length} messaged, ${p.people.filter((x) => ["replied", "talking", "paid"].includes(x.stage)).length} replied, ${p.posts.length} posts written, ${waitingCount(p)} waiting for a yes.${replied ? ` Replied: ${replied}.` : ""}`,
    `Latest activity:\n${recent || "- nothing in the last 3 days"}`,
  ].join("\n");
}

/* Two short sentences at most. */
const twoSentences = (s: string) => (clean(s).replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [clean(s)]).slice(0, 2).join(" ").trim();

export async function handleVoice(raw: string, c: VoiceCtx): Promise<string> {
  const t = raw.toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "I didn't catch that.";

  if (has(t, /who replied/, /^replies$/, /show (me )?(the )?replies/, /any replies/)) {
    c.go("outreach", { stage: "replied" });
    const n = c.p.people.filter((x) => x.stage === "replied").length;
    return n ? `Here ${n === 1 ? "is the person" : `are the ${n} people`} who replied.` : "Nobody has replied yet. I'll show you Reach people.";
  }
  if (has(t, /show (me )?(the )?posts/, /^posts$/, /be seen/)) { c.go("content"); return "Here are your posts."; }
  if (has(t, /approval/)) { c.go("approvals"); const n = waitingCount(c.p); return n ? `${n} ${n === 1 ? "thing is" : "things are"} waiting for your yes.` : "Nothing is waiting for your yes."; }
  if (has(t, /^(send|approve) (it|that|this)/, /^yes send/, /^send it/)) {
    const done = c.approve();
    return done || "I'm not sure which one you mean. Open the notch on it first.";
  }
  const post = t.match(/(?:write|draft|make) (?:me )?(?:a )?post (?:about|on) (.+)/);
  if (post) { c.run.content(post[1]); return `Writing a post about ${post[1]}. It'll wait for your yes.`; }
  if (has(t, /run (it )?again/, /find more people/, /look for more/, /run everything/)) { c.run.all(); return "On it. I'll look for more people now."; }
  if (has(t, /how did (this|the) week go/, /how('s| is| was) (this|the) week/, /weekly summary/)) return weekSummary(c.p);

  const reply = await ask(`You are Braino, the founder's helper inside Braino Foundry. Answer the founder in first person, in at most 2 short sentences, in plain words, using only the project below. If the answer is not in it, say you don't know yet. Never use dashes.\n\nProject:\n${context(c.p)}\n\nThe founder said: "${raw}"`);
  return twoSentences(reply) || "I don't know that yet.";
}
