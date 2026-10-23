import { whereOf, type Engine, type Project } from "./store";
import { waitingCount, type PageId } from "./types";

/* What Braino says in the web notch (2026-10-24). Pure: the same project and
   the same moment always give the same line. He never interrupts, so this is
   only read when the app opens, the notch is clicked, or you talk. */

export type Go =
  | { page: PageId; person?: string; stage?: "replied" }
  | { do: "run-all" }
  | { do: "send"; person: string }
  | { do: "later" };
export type BrainoAction = { label: string; go: Go };
/* `about`: the item "send it" or "approve it" means right now. */
export type BrainoLine = { text: string; actions: BrainoAction[]; about?: { person: string } };

type Busy = Partial<Record<Engine | "setup", string>>;
export type LineOpts = { greeting?: boolean; finished?: boolean; now?: Date };

export const partOfDay = (d: Date) => (d.getHours() < 12 ? "Morning" : d.getHours() < 17 ? "Afternoon" : "Evening");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const short = (s: string, words = 6) => {
  const w = String(s || "").replace(/[.?!]+$/, "").trim().split(/\s+/).filter(Boolean);
  return w.length > words ? `${w.slice(0, words).join(" ")}...` : w.join(" ");
};

/* People asking, posts and messages ready, and anyone who replied. */
export function counts(p: Project) {
  const asking = p.people.filter((x) => x.stage === "found" && x.status === "waiting" && x.message);
  const posts = p.posts.filter((x) => x.status === "waiting").length;
  const replied = p.people.filter((x) => x.stage === "replied" && x.thread.some((m) => m.from === "us"));
  return { asking, posts, messages: asking.length, replied, waiting: waitingCount(p) };
}

export function topicOf(p: Project) {
  return short(p.memory.topics[0]?.title || p.memory.product.problem || p.memory.buyer.questions[0] || "what you build").toLowerCase();
}

export function brainoLine(p: Project, busy: Busy, opts: LineOpts = {}): BrainoLine {
  const now = opts.now || new Date();
  const c = counts(p);

  if (!p.onboarded) return { text: "Hi, I'm Braino. Tell me what you're building.", actions: [] };

  const running = (["outreach", "content", "optics", "setup"] as const).map((k) => busy[k]).find(Boolean);
  if (running) {
    const label = running.replace(/,\s*\d+s$/, "");
    return { text: `${label}... ${plural(c.asking.length, "person", "people")} so far.`, actions: [] };
  }

  if (opts.finished && c.waiting) {
    return { text: `Done. ${plural(c.posts, "post")} and ${plural(c.messages, "reply", "replies")} are ready for your yes.`, actions: [{ label: "Open Approvals", go: { page: "approvals" } }] };
  }

  const r = c.replied[0];
  if (r) {
    return { text: `${whereOf(r)} replied. I wrote an answer. Send it?`, actions: [{ label: "Send it", go: { do: "send", person: r.id } }, { label: "Edit", go: { page: "outreach", person: r.id, stage: "replied" } }], about: { person: r.id } };
  }

  if (opts.greeting && c.waiting) {
    const hi = partOfDay(now);
    if (c.asking.length) {
      const top = [...c.asking].sort((a, z) => z.intent - a.intent)[0].id;
      return { text: `${hi}. I found ${plural(c.asking.length, "person", "people")} asking about ${topicOf(p)}. Want to see them?`, actions: [{ label: "Show me", go: { page: "outreach", person: top } }, { label: "Later", go: { do: "later" } }], about: { person: top } };
    }
    return { text: `${hi}. ${plural(c.waiting, "thing is", "things are")} ready for your yes. Want to see them?`, actions: [{ label: "Show me", go: { page: "approvals" } }, { label: "Later", go: { do: "later" } }] };
  }

  if (c.waiting) {
    return { text: `${plural(c.posts, "post")} and ${plural(c.messages, "reply", "replies")} are ready for your yes.`, actions: [{ label: "Open Approvals", go: { page: "approvals" } }] };
  }

  return { text: "All caught up. Want me to look for more people?", actions: [{ label: "Run again", go: { do: "run-all" } }] };
}
