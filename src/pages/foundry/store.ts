import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "./lib";

/* Braino Foundry state (2026-10-23). Everything lives on this device, in
   localStorage. One record per project, and inside each project one shared
   memory that all three engines read from and write to. */

export type Engine = "optics" | "content" | "outreach";
export type ActorKind = Engine | "memory" | "you";

export type ProductCard = { name: string; oneLiner: string; buyer: string; problem: string; pricing: string; proof: string; tone: string; missing: string[]; site: string };
export type FounderCard = { who: string; whyTrust: string; voice: string; linkedin: string; why: string };
export type BuyerCard = { buyer: string; questions: string[]; redditPhrases: string[] };

export type Quote = { id: string; text: string; url: string; community: string; at: number };
export type Gap = { id: string; question: string; rivals: string[]; at: number };
export type TopicSource = "reddit" | "optics" | "objection" | "founder";
export type Topic = { id: string; title: string; source: TopicSource; sourceText: string; at: number; article?: string; articleStatus?: Status };
export type Objection = { id: string; text: string; person: string; answer: string; at: number };
export type Activity = { id: string; at: number; who: ActorKind; text: string };

export type Memory = {
  product: ProductCard;
  founder: FounderCard;
  buyer: BuyerCard;
  quotes: Quote[];
  gaps: Gap[];
  topics: Topic[];
  objections: Objection[];
  activity: Activity[];
};

export type AiAnswer = { question: string; names: string[] };
export type GoogleRow = { query: string; found: string; results: { title: string; url: string; description: string }[] };
export type Fix = { id: string; question: string; where: string; what: string; from?: "optics" | "objection"; done?: boolean };
export type Made = { title: string; content: string; where: string; link: string; steps: string[] };
export type Optics = { at: number; answers: AiAnswer[]; google: GoogleRow[]; googleNote: string; fixes: Fix[]; made: Record<string, Made> } | null;

export type Platform = "x" | "linkedin" | "reddit" | "instagram" | "threads";
export type Status = "waiting" | "approved" | "skipped";
export type Post = { id: string; platform: Platform; text: string; title?: string; visual?: string; topicId: string; day: number; time: string; status: Status; opened?: boolean; at: number };

export type Stage = "found" | "messaged" | "replied" | "talking" | "paid";
export const STAGES: Stage[] = ["found", "messaged", "replied", "talking", "paid"];
export const STAGE_LABEL: Record<Stage, string> = { found: "Found", messaged: "Messaged", replied: "Replied", talking: "Talking", paid: "Paid" };
export type ThreadMsg = { at: number; from: "them" | "us"; text: string; note?: string };
export type Person = {
  id: string; url: string; community: string; title: string; body: string; quote: string;
  intent: number; why: string; message: string; opener: string;
  stage: Stage; stageAt: number; status: Status; thread: ThreadMsg[]; followUp: string;
};

export type Flows = { quotesToContent: number; quotesToOptics: number; gapsToContent: number; postsToOutreach: number; objections: number };
export type RunEntry = { at: number; named: number; of: number; google: number; posts: number; people: number; approved: number; flows: Flows };

export type ReadNote = { ok: boolean; note: string; pages: number };

export type Project = {
  id: string; name: string; created: number; updated: number;
  onboarded: boolean;
  draft: { desc: string; url: string; linkedin: string; why: string };
  siteRead: ReadNote | null;
  linkedinRead: ReadNote | null;
  memory: Memory;
  optics: Optics;
  posts: Post[];
  people: Person[];
  runs: RunEntry[];
  lastRun: number | null;
  autopilot: boolean;
  searchNote: string;
};

export type Settings = { name: string; photo?: string };

const KEY = "foundry-v2";
const SETTINGS = "foundry-v2-settings";
const LEGACY_LIST = "foundry-projects-v1";

export const emptyMemory = (): Memory => ({
  product: { name: "", oneLiner: "", buyer: "", problem: "", pricing: "", proof: "", tone: "", missing: [], site: "" },
  founder: { who: "", whyTrust: "", voice: "", linkedin: "", why: "" },
  buyer: { buyer: "", questions: [], redditPhrases: [] },
  quotes: [], gaps: [], topics: [], objections: [], activity: [],
});
export const newProject = (): Project => ({
  id: uid(), name: "New project", created: Date.now(), updated: Date.now(), onboarded: false,
  draft: { desc: "", url: "", linkedin: "", why: "" },
  siteRead: null, linkedinRead: null, memory: emptyMemory(), optics: null, posts: [], people: [], runs: [], lastRun: null, autopilot: false, searchNote: "",
});

export const log = (p: Project, who: ActorKind, text: string): Project => ({
  ...p, memory: { ...p.memory, activity: [{ id: uid(), at: Date.now(), who, text }, ...p.memory.activity].slice(0, 120) },
});

/* Old projects from the chat version (foundry-projects-v1 and
   foundry-project-<id>) come across once, so nothing the founder made is lost. */
function migrate(): Project[] {
  let list: { id: string; name: string; updated: number }[] = [];
  try { list = JSON.parse(localStorage.getItem(LEGACY_LIST) || "[]"); } catch (_) { return []; }
  if (!Array.isArray(list)) return [];
  return list.map((m) => {
    let s: any = null;
    try { s = JSON.parse(localStorage.getItem(`foundry-project-${m.id}`) || "null"); } catch (_) { s = null; }
    const p = newProject();
    p.id = m.id; p.name = m.name || "Project"; p.updated = m.updated || Date.now(); p.created = m.updated || Date.now();
    if (!s) return p;
    p.draft = { desc: s.desc || "", url: s.link || "", linkedin: s.linkedin || "", why: s.about || "" };
    const b = s.brief;
    if (b) {
      p.onboarded = !!s.confirmed;
      p.memory.product = { ...p.memory.product, name: b.product || "", oneLiner: b.oneLine || "", buyer: b.buyer || "", problem: b.problem || "", tone: b.voice || "", site: b.site || s.link || "" };
      p.memory.founder = { ...p.memory.founder, who: b.founder || "", voice: b.voice || "", linkedin: s.linkedin || "", why: s.about || "" };
      p.memory.buyer = { buyer: b.buyer || "", questions: b.questions || [], redditPhrases: b.redditPhrases || [] };
      p.name = b.product || p.name;
    }
    const at = s.lastRun || p.updated;
    if (s.answers) {
      const made: Record<string, any> = (() => { try { return JSON.parse(localStorage.getItem(`foundry-project-${m.id}-made`) || "{}"); } catch (_) { return {}; } })();
      const fixes: Fix[] = (s.fixes || []).map((f: any) => ({ id: uid(), question: f.question, where: f.where, what: f.what, from: "optics" }));
      const madeById: Record<string, Made> = {};
      fixes.forEach((f) => { if (made[f.question]) madeById[f.id] = made[f.question]; });
      p.optics = { at, answers: s.answers, google: (s.google || []).map((g: any) => ({ query: g.query, found: "", results: g.results || [] })), googleNote: "", fixes, made: madeById };
    }
    const done = s.done || {};
    if (s.posts) {
      const t = { id: uid(), title: "Your first posts", source: "optics" as TopicSource, sourceText: "From the first Optics check", at };
      p.memory.topics = [t];
      const mk = (platform: Platform, text: string, extra: Partial<Post> = {}): Post => ({ id: uid(), platform, text, topicId: t.id, day: 0, time: "9:00", status: done[`post-${platform}`] || "waiting", at, ...extra });
      p.posts = [
        mk("x", s.posts.x || ""), mk("linkedin", s.posts.linkedin || ""),
        mk("reddit", s.posts.reddit?.body || "", { title: s.posts.reddit?.title || "" }),
        mk("instagram", s.posts.instagram?.caption || "", { visual: s.posts.instagram?.visual || "" }), mk("threads", s.posts.threads || ""),
      ];
    }
    p.people = (s.leads || []).map((l: any) => ({
      id: uid(), url: l.url, community: l.community, title: l.title, body: l.body, quote: l.title, intent: l.intent, why: l.why, message: l.message, opener: "",
      stage: done[`lead-${l.url}`] === "approved" ? "messaged" : "found", stageAt: at, status: done[`lead-${l.url}`] || "waiting", thread: [], followUp: "",
    }));
    p.lastRun = s.lastRun || null;
    p.autopilot = !!s.autopilot;
    p.runs = (s.history || []).map((h: any) => ({ at: h.at, named: h.named, of: h.of, google: 0, posts: h.postsOk, people: h.leadsOk, approved: (h.postsOk || 0) + (h.leadsOk || 0), flows: { quotesToContent: 0, quotesToOptics: 0, gapsToContent: 0, postsToOutreach: 0, objections: 0 } }));
    return log(p, "memory", "Brought this project over from the earlier version");
  });
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const v = JSON.parse(raw); if (Array.isArray(v)) return v; }
  } catch (_) { /* private window */ }
  const old = migrate();
  return old;
}

export function useFoundryStore() {
  const [projects, setProjects] = useState<Project[]>(load);
  const [activeId, setActiveId] = useState<string>(() => { try { return localStorage.getItem(`${KEY}-active`) || ""; } catch (_) { return ""; } });
  const [settings, setSettings] = useState<Settings>(() => { try { return { name: "", ...JSON.parse(localStorage.getItem(SETTINGS) || "{}") }; } catch (_) { return { name: "" }; } });
  const ref = useRef(projects);
  ref.current = projects;

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(projects)); } catch (_) { /* full or private */ } }, [projects]);
  useEffect(() => { try { localStorage.setItem(`${KEY}-active`, activeId); } catch (_) { /* private */ } }, [activeId]);
  useEffect(() => { try { localStorage.setItem(SETTINGS, JSON.stringify(settings)); } catch (_) { /* private */ } }, [settings]);

  const update = useCallback((id: string, fn: (p: Project) => Project) => {
    // Written to the ref at once, so an engine that reads right after it writes sees its own change.
    const next = ref.current.map((p) => (p.id === id ? { ...fn(p), updated: Date.now() } : p));
    ref.current = next;
    setProjects(next);
  }, []);
  const get = useCallback((id: string) => ref.current.find((p) => p.id === id) || null, []);
  const create = useCallback(() => { const p = newProject(); setProjects((l) => [p, ...l]); setActiveId(p.id); return p.id; }, []);
  const remove = useCallback((id: string) => { setProjects((l) => l.filter((p) => p.id !== id)); setActiveId((a) => (a === id ? "" : a)); }, []);
  const clearAll = useCallback(() => {
    setProjects([]); setActiveId("");
    try { Object.keys(localStorage).filter((k) => k.startsWith("foundry-")).forEach((k) => localStorage.removeItem(k)); } catch (_) { /* private */ }
  }, []);
  const bytes = (() => { try { return new Blob([JSON.stringify(projects)]).size; } catch (_) { return 0; } })();

  return { projects, activeId, setActiveId, update, get, create, remove, clearAll, settings, setSettings, bytes };
}
export type Store = ReturnType<typeof useFoundryStore>;
