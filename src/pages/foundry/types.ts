import type { AiAnswer, Engine, Project, Settings } from "./store";
import { DAY, mentions } from "./lib";

export type PageId = "dashboard" | "optics" | "content" | "outreach" | "approvals" | "memory";
export type Runner = { all: () => void; optics: () => void; content: (extra?: string) => void; outreach: () => void };
export type PageProps = {
  p: Project;
  up: (fn: (p: Project) => Project) => void;
  busy: Partial<Record<Engine | "setup", string>>;
  run: Runner;
  go: (page: PageId) => void;
  me: Settings;
};

/* Named or not, per question. With several runs, "named" means most of them;
   the range below says how sure that is. */
export const isNamed = (p: Project, a: AiAnswer) => a.runs ? (a.hits || 0) * 2 > a.runs : a.names.some((n) => mentions(n, p.memory.product.name, p.memory.product.site));
export const namedCount = (p: Project) => p.optics ? p.optics.answers.filter((a) => isNamed(p, a)).length : 0;
/* AI answers change every time you ask. Low: named in every run. High: named
   in at least one. The truth is somewhere between, and we say so. */
export function namedRange(p: Project) {
  const ans = p.optics?.answers || [];
  if (!ans.some((a) => a.runs)) { const n = namedCount(p); return { low: n, high: n, runs: 1 }; }
  return { low: ans.filter((a) => (a.hits || 0) >= (a.runs || 1)).length, high: ans.filter((a) => (a.hits || 0) > 0).length, runs: Math.max(...ans.map((a) => a.runs || 1)) };
}
/* Share of voice: of every name AI gave across all runs, how many were you. */
export function shareOfVoice(p: Project) {
  const c = new Map<string, number>();
  let total = 0, you = 0;
  (p.optics?.answers || []).forEach((a) => a.names.forEach((n, i) => {
    const k = a.counts?.[i] ?? 1;
    total += k;
    if (mentions(n, p.memory.product.name, p.memory.product.site)) you += k;
    else c.set(n, (c.get(n) || 0) + k);
  }));
  const board = [{ name: p.memory.product.name || "You", value: you, you: true }, ...[...c.entries()].map(([name, value]) => ({ name, value, you: false }))].sort((a, z) => z.value - a.value);
  return { total, you, pct: total ? Math.round((you / total) * 100) : 0, board };
}
export const waitingCount = (p: Project) => p.posts.filter((x) => x.status === "waiting").length + p.people.filter((x) => x.status === "waiting" && x.message && x.stage === "found").length + p.memory.topics.filter((t) => t.article && (t.articleStatus || "waiting") === "waiting").length;
export const followUpDue = (p: Project) => p.people.filter((x) => x.stage === "messaged" && Date.now() - x.stageAt >= 3 * DAY);

export type Move = { id: string; engine: Engine | "approvals"; text: string; why: string; page: PageId; weight: number };

/* This week's moves, ranked by how close each one is to money. */
export function moves(p: Project): Move[] {
  const out: Move[] = [];
  const replied = p.people.filter((x) => x.stage === "replied" || x.stage === "talking");
  replied.forEach((x) => out.push({ id: `r-${x.id}`, engine: "outreach", page: "outreach", weight: x.stage === "talking" ? 100 : 90, text: x.stage === "talking" ? `Ask r/${x.community} to pay or book a call` : `Answer the reply from r/${x.community}`, why: "They are talking to you. This is the closest thing to a paying customer." }));
  const due = followUpDue(p);
  if (due.length) out.push({ id: "fu", engine: "outreach", page: "outreach", weight: 80, text: `Send ${due.length} follow-up${due.length === 1 ? "" : "s"}`, why: "Messaged 3 or more days ago with no reply." });
  const msgs = p.people.filter((x) => x.status === "waiting" && x.message && x.stage === "found");
  if (msgs.length) out.push({ id: "msg", engine: "approvals", page: "approvals", weight: 70 + Math.min(9, msgs.length), text: `Approve ${msgs.length} message${msgs.length === 1 ? "" : "s"} to people asking today`, why: "Real people with this problem, waiting on an answer." });
  const posts = p.posts.filter((x) => x.status === "waiting");
  if (posts.length) out.push({ id: "posts", engine: "content", page: "content", weight: 50, text: `Approve ${posts.length} post${posts.length === 1 ? "" : "s"} for this week`, why: "Public posts that answer what buyers are asking." });
  const fixes = (p.optics?.fixes || []).filter((f) => !f.done);
  fixes.slice(0, 2).forEach((f, i) => out.push({ id: `f-${f.id}`, engine: "optics", page: "optics", weight: 40 - i, text: `${f.what} (${f.where})`, why: `So AI and Google name you for "${f.question}".` }));
  if (!p.lastRun) out.push({ id: "run", engine: "optics", page: "dashboard", weight: 200, text: "Run all three engines for the first time", why: "Nothing to rank until Braino has looked." });
  return out.sort((a, z) => z.weight - a.weight);
}
