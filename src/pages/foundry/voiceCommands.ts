import { askJson, clean, DAY, WEEK } from "./lib";
import { PERSON_PLATFORMS, PERSON_PLATFORM_LABEL, STAGES, STAGE_LABEL, whereOf, type PersonPlatform, type Project, type Stage } from "./store";
import { namedRange, waitingCount, type PageId, type Runner } from "./types";
import type { Focus } from "./focus";

/* Braino on the web, voice (2026-10-24, rebuilt the same day). No phrase
   matching: what you said, the page you are on and a small map of the app go
   to the model in ONE call, and it hands back one action plus a short line.
   The action drives the real UI (pages open already filtered). Questions are
   answered from the project's memory in two sentences. He only gets things
   ready: anything that goes out still needs your yes, and "send it" is that
   yes. Every reply is first person and short. */

export type VoiceCtx = {
  p: Project;
  page: PageId;
  run: Runner;
  /* Navigate, opening the page already filtered. */
  go: (page: PageId, focus?: Focus) => void;
  /* Approve the item the notch is about, or the person named. Returns what happened, or "" if nothing. */
  approve: (personId?: string) => string;
  /* Copy the drafted answer to someone who replied and open their thread. */
  sendReply: (personId: string) => boolean;
};

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

const PAGES: Record<PageId, string> = {
  dashboard: "Overview: the dashboard of everything",
  optics: "Get found: does AI and Google name the product",
  content: "Be seen: posts and articles Braino wrote, by topic",
  outreach: "Reach people: people found online asking for this, with messages ready; tabs by platform, filter by stage",
  approvals: "Approvals: everything waiting for a yes; tabs To do and Done",
  memory: "Product and founder: what Braino knows about the product and the founder",
  architecture: "Architecture: how Foundry is built",
};

type Intent = {
  do: "open" | "run_all" | "run_content" | "approve" | "send_reply" | "week" | "answer";
  page?: PageId;
  platform?: PersonPlatform | "all";
  stage?: Stage | "all";
  approvals?: "todo" | "done";
  topic?: string;
  person?: string;
  say?: string;
};

function appMap(p: Project, page: PageId) {
  const people = p.people.slice(0, 40).map((x) => `${x.id} | ${whereOf(x)} | ${PERSON_PLATFORM_LABEL[x.platform || "reddit"]} | ${STAGE_LABEL[x.stage]} | ${x.title.split(/\s+/).slice(0, 8).join(" ")}`).join("\n");
  const topics = p.memory.topics.slice(0, 20).map((t) => `${t.id} | ${t.title}`).join("\n");
  return [
    `Current page: ${page}.`,
    `Pages:\n${(Object.keys(PAGES) as PageId[]).map((k) => `- ${k}: ${PAGES[k]}`).join("\n")}`,
    `Reach people platforms: all, ${PERSON_PLATFORMS.join(", ")}. Stages: all, ${STAGES.join(", ")} (found means found but not messaged yet).`,
    `People (id | place | platform | stage | what they asked):\n${people || "none yet"}`,
    `Topics for Be seen (id | title):\n${topics || "none yet"}`,
  ].join("\n\n");
}

const SYSTEM = "You are the intent reader for Braino inside Braino Foundry, a web app that helps a founder get found, be seen and reach people. You turn one thing the founder said into one action on the app. Reply with JSON only.";

function prompt(raw: string, c: VoiceCtx) {
  return `The founder said: "${raw}"

${appMap(c.p, c.page)}

Project memory:
${context(c.p)}

Pick ONE action:
- {"do":"open","page":"<page id>","platform":"<platform or all>","stage":"<stage or all>","approvals":"todo|done","topic":"<topic id>","person":"<person id>"} to show something. Only include the fields that matter. "Who did you find" means outreach, platform all, stage found. "Who replied" means outreach, stage replied. A person named by place, platform or what they asked means outreach with that person id.
- {"do":"run_all"} to look for more people, run everything again.
- {"do":"run_content","topic":"<what to write about>"} to write a post about something.
- {"do":"approve","person":"<person id if named>"} to approve or send the current item ("send it", "yes, approve that").
- {"do":"send_reply","person":"<person id>"} to send the drafted answer to someone who replied.
- {"do":"week"} for how the week went.
- {"do":"answer","say":"<at most 2 short sentences>"} for any question. Answer in first person as Braino, plain words, only from the project memory; if it is not there, say you don't know yet.
Add "say" to every action: one short first person line Braino says while doing it. Never use dashes.`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function handleVoice(raw: string, c: VoiceCtx): Promise<string> {
  const text = raw.trim();
  if (!text) return "I didn't catch that.";
  let it: Intent;
  try { it = await askJson<Intent>(prompt(text, c), SYSTEM); }
  catch (_) { return "I couldn't think that through just now. Try again?"; }
  const say = twoSentences(it.say || "");
  const person = it.person ? c.p.people.find((x) => x.id === it.person) : undefined;

  switch (it.do) {
    case "open": {
      const page = (it.page && it.page in PAGES ? it.page : person ? "outreach" : "dashboard") as PageId;
      if (page === "outreach") {
        const platform = it.platform && it.platform !== "all" && PERSON_PLATFORMS.includes(it.platform) ? it.platform : undefined;
        const stage = it.stage && it.stage !== "all" && STAGES.includes(it.stage) ? it.stage : undefined;
        c.go("outreach", { platform, stage, person: person?.id });
        if (person) return `Here is ${whereOf(person)}.`;
        const n = c.p.people.filter((x) => (!platform || (x.platform || "reddit") === platform) && (!stage || x.stage === stage) && (x.status !== "skipped" || x.stage !== "found")).length;
        const where = platform ? ` on ${PERSON_PLATFORM_LABEL[platform]}` : "";
        if (!n) return stage === "replied" ? "Nobody has replied yet." : `I haven't found anyone${where} there yet.`;
        if (stage === "replied") return `Here ${n === 1 ? "is the person" : `are the ${n} people`} who replied.`;
        return `Here ${n === 1 ? "is the 1 person" : `are the ${n} people`} I found${where}.`;
      }
      if (page === "approvals") {
        c.go("approvals", { approvals: it.approvals === "done" ? "done" : "todo" });
        if (it.approvals === "done") return say || "Here is everything you said yes to.";
        const n = waitingCount(c.p);
        return n ? `${plural(n, "thing is", "things are")} waiting for your yes.` : "Nothing is waiting for your yes.";
      }
      if (page === "content") {
        const topic = it.topic && c.p.memory.topics.find((t) => t.id === it.topic);
        c.go("content", { topic: topic ? topic.id : undefined });
        return topic ? `Here are the posts about ${topic.title.toLowerCase()}.` : say || "Here are your posts.";
      }
      c.go(page);
      return say || "Here you go.";
    }
    case "run_all": c.run.all(); return say || "On it. I'll look for more people now.";
    case "run_content": {
      const topic = clean(it.topic || "").trim();
      c.run.content(topic || undefined);
      c.go("content");
      return topic ? `Writing a post about ${topic}. It'll wait for your yes.` : "Writing new posts. They'll wait for your yes.";
    }
    case "approve": return c.approve(person?.id) || "I'm not sure which one you mean. Open it in the notch first.";
    case "send_reply": {
      if (person && c.sendReply(person.id)) return `Done. I copied the answer and opened ${whereOf(person)}. Paste it there.`;
      return c.approve(person?.id) || "I don't have an answer ready for anyone right now.";
    }
    case "week": return weekSummary(c.p);
    default: return say || "I don't know that yet.";
  }
}
