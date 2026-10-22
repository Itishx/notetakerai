import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAffTheme } from "@/components/AffTheme";
import { Link } from "react-router-dom";
import { BrainoMascot } from "@/components/BrainoMascot";
import { useBrainoVoice } from "@/hooks/useBrainoVoice";
import "./affective.css";
import "./onboarding-flow.css";
import "./foundry-app.css";

/* Braino Foundry (Forge AI Hackathon, 2026-10-22). One journey, Workflow 1, Get found:
   your brief -> where you are invisible (Optics) -> posts that fix it (Content)
   -> people asking today, a message each (Outreach) -> you approve.
   Language: GPT-5.6 through the chat-about-notes edge function (the model and
   its key stay on the server). Search: Apify through /api/foundry-apify. */

type Brief = { product: string; oneLine: string; buyer: string; problem: string; site: string; questions: string[]; redditPhrases: string[]; voice: string };
type AiAnswer = { question: string; names: string[] };
type Google = { query: string; results: { title: string; url: string; description: string }[] };
type Fix = { question: string; where: string; what: string };
type Posts = { x: string; linkedin: string; reddit: { title: string; body: string }; instagram: { caption: string; visual: string }; threads: string };
type RedditPost = { title: string; body: string; url: string; community: string; upVotes: number | null; comments: number | null; createdAt: string };
type Lead = RedditPost & { intent: number; why: string; message: string };

const LEGACY = "foundry-session-v1";
/* A plain "hi" gets a plain question back; anything longer is taken as the answer to it. */
const isHi = (t: string) => /^(hi|hey|hello|yo|sup|hola|namaste|ready|start|let's go)\b/i.test(t.trim()) && t.trim().split(/\s+/).length <= 4;
const READY = ["Ready when you are.", "What are we getting seen today?", "Tell me what you're building.", "Fresh page. Your move.", "I'm listening."];
const LIST = "foundry-projects-v1";
const keyOf = (id: string) => `foundry-project-${id}`;

export type ProjectMeta = { id: string; name: string; updated: number; named: number; of: number; postsOk: number; leadsOk: number; running: boolean };

async function ask(message: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("chat-about-notes", {
    body: { notes: "", chatHistory: [], responseMedium: "text", message },
  });
  if (error) throw new Error(error.message || "The model did not answer");
  return String((data as { reply?: string })?.reply || "");
}
/* The model sometimes sends JSON with a stray comma or quote. Repair what is
   safe to repair, and if it still will not parse, ask once more. */
function parseLoose<T>(reply: string): T {
  const start = reply.search(/[[{]/);
  const end = Math.max(reply.lastIndexOf("}"), reply.lastIndexOf("]"));
  const raw = reply.slice(start, end + 1);
  try { return JSON.parse(raw) as T; } catch (_) { /* try a repair */ }
  const fixed = raw
    .replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u001f]+/g, " ");
  return JSON.parse(fixed) as T;
}
async function askJson<T>(message: string): Promise<T> {
  const prompt = `${message}\n\nReply with valid JSON only. No markdown, no commentary. Escape any double quotes inside strings.`;
  try { return parseLoose<T>(await ask(prompt)); }
  catch (_) { return parseLoose<T>(await ask(prompt)); }
}

async function apifyStart(kind: "google" | "reddit", list: string[]) {
  const r = await fetch("/api/foundry-apify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(kind === "google" ? { kind, queries: list } : { kind, searches: list }),
  });
  const j = await r.json();
  if (!r.ok || !j.runId) throw new Error(j.error || "Search did not start");
  return j.runId as string;
}
async function apifyWait<T>(kind: "google" | "reddit", runId: string, onTick?: (s: number) => void): Promise<T> {
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    onTick?.(Math.round((Date.now() - started) / 1000));
    const j = await fetch(`/api/foundry-apify?run=${runId}&kind=${kind}`).then((r) => r.json());
    if (j.status === "SUCCEEDED") return j.items as T;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(j.status)) throw new Error(`Search ${j.status.toLowerCase()}`);
    if (Date.now() - started > 9 * 60 * 1000) throw new Error("Search took too long");
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function mentions(text: string, brief: Brief) {
  const t = norm(text);
  const name = norm(brief.product);
  const host = norm((brief.site || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0]);
  return (name.length > 2 && t.includes(name)) || (host.length > 2 && t.includes(host));
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard blocked: the composer still opens */ }
}
const enc = encodeURIComponent;

/* Pure pieces of the chat, kept outside the component so they never remount. */
const Dots = () => <span className="ob-loop-dots" aria-hidden><i /><i /><i /></span>;
const Bot = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <div className={`fc-msg bot${wide ? " wide" : ""}`}><div className="fc-body">{children}</div></div>
);
const Me = ({ children }: { children: React.ReactNode }) => <div className="fc-msg me"><div className="fc-bubble">{children}</div></div>;
const Wait = ({ text }: { text: string }) => <div className="fc-wait"><Dots /><span>{text}</span></div>;
const Engine = ({ k, name, sub }: { k: "o" | "c" | "r"; name: string; sub: string }) => <div className={`fc-eng ${k}`}><i />{name}<span>{sub}</span></div>;

const Ring = ({ n, of }: { n: number; of: number }) => {
  const r = 46, c = 2 * Math.PI * r, p = of ? n / of : 0;
  return (
    <svg className="fc-ring" viewBox="0 0 120 120" role="img" aria-label={`Named in ${n} of ${of}`}>
      <circle cx="60" cy="60" r={r} className="track" />
      <circle cx="60" cy="60" r={r} className="val" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" className="big">{n}</text>
      <text x="60" y="78" className="small">of {of}</text>
    </svg>
  );
};


type RunEntry = { at: number; named: number; of: number; postsOk: number; leadsOk: number };
const WEEK = 7 * 24 * 60 * 60 * 1000;
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });

type ProjectProps = { id: string; name?: string; active: boolean; seed: string; theme: string; toggle: () => void; onMeta: (m: Partial<ProjectMeta> & { id: string }) => void; onHome: () => void };

function FoundryProject({ id, name, active, seed, theme, toggle, onMeta, onHome }: ProjectProps) {
  const STORE = keyOf(id);
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (_) { return null; } }, [STORE]);

  const [desc, setDesc] = useState<string>(saved?.desc || seed || "");
  const [link, setLink] = useState<string>(saved?.link || "");
  const [about, setAbout] = useState<string>(saved?.about || "");
  const [brief, setBrief] = useState<Brief | null>(saved?.brief || null);
  /* "Do it": for each fix, the finished piece plus where and how to publish it.
     Kept under its own key so it survives reloads. */
  type Made = { title: string; content: string; where: string; link: string; steps: string[] };
  const [made, setMade] = useState<Record<string, Made>>(() => { try { return JSON.parse(localStorage.getItem(`${STORE}-made`) || "{}"); } catch (_) { return {}; } });
  const [making, setMaking] = useState("");
  const [openFix, setOpenFix] = useState("");
  useEffect(() => { try { localStorage.setItem(`${STORE}-made`, JSON.stringify(made)); } catch (_) { /* private window */ } }, [made, STORE]);
  async function doIt(f: Fix) {
    setOpenFix(f.question);
    if (made[f.question] || !brief) return;
    setMaking(f.question);
    try {
      const m = await askJson<Made>(`You are Braino Foundry, a distribution co-founder doing the work for a first-time founder who knows nothing about marketing.
Product: ${brief.product}. ${brief.oneLine}. Buyer: ${brief.buyer}. Problem: ${brief.problem}. Website: ${brief.site || "none yet"}. Voice: ${brief.voice}.
The fix to carry out: "${f.what}" on ${f.where}, so that AI assistants and Google name this product when people ask "${f.question}".
Write the finished piece, ready to paste, in the founder's voice. If it is a page (FAQ, comparison, guide), write the full page text with headings in plain markdown. If it is a Reddit or forum answer, write the full answer, helpful first, mentioning the product once and honestly. No em-dashes.
Then say exactly where to publish it and how, for someone who has never done it: 3 to 6 short steps, starting with creating an account if one is usually needed.
JSON: {"title": string, "content": string, "where": string, "link": "the best URL to start from", "steps": [string]}`);
      setMade((d) => ({ ...d, [f.question]: m }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not write it"); }
    finally { setMaking(""); }
  }
  const [confirmed, setConfirmed] = useState<boolean>(saved?.confirmed || false);
  const [answers, setAnswers] = useState<AiAnswer[] | null>(saved?.answers || null);
  const [google, setGoogle] = useState<Google[] | null>(saved?.google || null);
  const [fixes, setFixes] = useState<Fix[] | null>(saved?.fixes || null);
  const [posts, setPosts] = useState<Posts | null>(saved?.posts || null);
  const [leads, setLeads] = useState<Lead[] | null>(saved?.leads || null);
  const [done, setDone] = useState<Record<string, "approved" | "skipped">>(saved?.done || {});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string>("");
  const [started, setStarted] = useState<boolean>(saved?.started ?? !!(saved?.brief || saved?.desc || seed));
  const [hello, setHello] = useState<string>(saved?.hello || "");
  const [opened, setOpened] = useState<Record<string, true>>(saved?.opened || {});
  const [autopilot, setAutopilot] = useState<boolean>(saved?.autopilot || false);
  const [lastRun, setLastRun] = useState<number | null>(saved?.lastRun ?? (saved?.answers ? Date.now() : null));
  const [history, setHistory] = useState<RunEntry[]>(saved?.history || []);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done, started, hello, opened, autopilot, lastRun, history })); } catch (_) { /* private window */ }
  }, [desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done, started, hello, opened, autopilot, lastRun, history]);

  const setB = (k: string, v: string) => setBusy((b) => { const n = { ...b }; if (v) n[k] = v; else delete n[k]; return n; });
  const fail = (e: unknown) => setErr(String((e as Error)?.message || e));

  async function makeBrief() {
    setErr(""); setB("brief", "Reading what you wrote");
    try {
      const b = await askJson<Brief>(`A founder described what they are building, in their own words (often jargon). Turn it into a plain brief.
What they're building: """${desc}"""
Link they shared: ${link || "none"}
About them: """${about || "not given"}"""
Return: {"product": "the product's name (make a short one if none)", "oneLine": "two plain sentences a 12-year-old understands: what it does and for whom", "buyer": "who buys it", "problem": "the problem in the buyer's own words", "site": "${link || ""}", "questions": ["8 questions a buyer would type into ChatGPT or Google when looking for a product like this, without naming it"], "redditPhrases": ["3 short phrases (2 to 4 words) buyers would use on Reddit when complaining about this problem"], "voice": "how this founder should sound in posts, one line"}`);
      setBrief({ ...b, site: link || b.site || "" }); setConfirmed(false); setAnswers(null); setGoogle(null); setFixes(null); setPosts(null); setLeads(null); setDone({});
    } catch (e) { fail(e); } finally { setB("brief", ""); }
  }

  async function runOptics(b: Brief) {
    setB("optics", "Asking your buyers' questions");
    try {
      const qs = b.questions.slice(0, 8);
      const googleRun = apifyStart("google", qs.slice(0, 3)).catch(() => "");
      const ai = await askJson<AiAnswer[]>(`You are a general AI assistant, like ChatGPT, answering everyday users. For each question below, answer as you normally would by recommending specific products, apps, companies or services. Return only the names you would recommend, best first, up to 5 per question.
Questions:
${qs.map((q, i) => `${i + 1}. ${q}`).join("\n")}
Return: [{"question": "...", "names": ["..."]}]`);
      setAnswers(ai);
      setB("optics", "Checking Google");
      const runId = await googleRun;
      let g: Google[] = [];
      if (runId) { try { g = await apifyWait<Google[]>("google", runId, (s) => setB("optics", `Checking Google · ${s}s`)); } catch (_) { g = []; } }
      setGoogle(g);
      setB("optics", "Writing your fix list");
      const lost = ai.filter((a) => !a.names.some((n) => mentions(n, b)));
      const fx = await askJson<Fix[]>(`Product: ${b.product}. ${b.oneLine}
It is not named by AI assistants for these buyer questions (who is named instead in brackets):
${lost.map((a) => `- ${a.question} [${a.names.join(", ")}]`).join("\n") || "- (named everywhere)"}
For the 5 questions that matter most, say what the founder should publish and where so AI assistants and Google start naming them. Places: a Reddit answer, a LinkedIn post, an X thread, a comparison page, an FAQ page.
Return: [{"question": "...", "where": "the place, 1 to 3 words", "what": "one short action, at most 12 words, starting with a verb"}]`);
      setFixes(fx.slice(0, 5));
    } catch (e) { fail(e); } finally { setB("optics", ""); }
  }

  async function runContent(b: Brief, fx: Fix[] | null, extra = "") {
    setB("content", "Writing your posts");
    try {
      const p = await askJson<Posts>(`Write public posts for this founder, in their voice (${b.voice}). They are posts for an audience, not messages to one person.
Product: ${b.product}. ${b.oneLine} Buyer: ${b.buyer}. Problem: ${b.problem}.
${extra ? `The founder asked: write about "${extra}".` : `Answer these questions buyers ask, where the product is currently not named:\n${(fx || []).map((f) => `- ${f.question}`).join("\n")}`}
Rules: native to each platform, useful first, no hashtag spam, no em-dashes, never invent customers or numbers.
Return: {"x": "a post or short thread, max 280 characters per part, parts separated by a blank line", "linkedin": "a LinkedIn post, 120 to 200 words", "reddit": {"title": "...", "body": "a genuinely helpful write-up, product mentioned once at the end"}, "instagram": {"caption": "...", "visual": "what the image should show"}, "threads": "a short post"}`);
      setPosts(p);
    } catch (e) { fail(e); } finally { setB("content", ""); }
  }

  async function runOutreach(b: Brief) {
    setB("outreach", "Searching Reddit for people asking");
    try {
      const runId = await apifyStart("reddit", b.redditPhrases.slice(0, 3));
      const found = await apifyWait<RedditPost[]>("reddit", runId, (s) => setB("outreach", `Searching Reddit · ${s}s (about a minute)`));
      const unique = [...new Map(found.map((p) => [p.url, p])).values()].slice(0, 24);
      if (!unique.length) { setLeads([]); return; }
      setB("outreach", "Reading each post");
      const judged = await askJson<{ i: number; fit: boolean; intent: number; why: string; message: string }[]>(`A founder sells: ${b.product}. ${b.oneLine} Buyer: ${b.buyer}.
Below are Reddit posts. Keep only real people who have this problem and are asking for help now (drop celebrations, promotions, other founders' launches, off-topic). For each kept post: intent 0 to 100 (how ready they are), why in one short line, and a reply in the founder's voice (${b.voice}) that helps first, answers their actual post, mentions the product once and only if it fits. No em-dashes.
${unique.map((p, i) => `[${i}] r/${p.community.replace(/^r\//, "")} · ${p.title}\n${p.body.slice(0, 400)}`).join("\n\n")}
Return: [{"i": 0, "fit": true, "intent": 80, "why": "...", "message": "..."}]`);
      const l = judged.filter((j) => j.fit && unique[j.i]).sort((a, z) => z.intent - a.intent).map((j) => ({ ...unique[j.i], intent: j.intent, why: j.why, message: j.message }));
      setLeads(l);
    } catch (e) { fail(e); } finally { setB("outreach", ""); }
  }

  async function confirmBrief() {
    if (!brief) return;
    setConfirmed(true); setErr(""); setLastRun(Date.now());
    const b = brief;
    // Outreach is the slow one, so it starts at the same time.
    const out = runOutreach(b);
    await runOptics(b);
    await out;
  }
  useEffect(() => {
    if (confirmed && brief && fixes && !posts && !busy.content) void runContent(brief, fixes);
  }, [confirmed, brief, fixes]); // eslint-disable-line react-hooks/exhaustive-deps

  function act(id: string, kind: "approved" | "skipped", text = "", url = "") {
    setDone((d) => ({ ...d, [id]: kind }));
    if (kind === "approved") { void copy(text); if (url) { window.open(url, "_blank", "noopener"); setOpened((o) => ({ ...o, [id]: true })); } }
  }
  // A fresh run: new checks, new posts, new people. Past runs stay in history.
  function runAgain() {
    if (!brief || Object.values(busy).some(Boolean)) return;
    setAnswers(null); setGoogle(null); setFixes(null); setPosts(null); setLeads(null); setDone({}); setOpened({});
    void confirmBrief();
  }
  function reset() {
    setDesc(""); setLink(""); setAbout(""); setBrief(null); setConfirmed(false); setAnswers(null); setGoogle(null); setFixes(null); setPosts(null); setLeads(null); setDone({}); setErr("");
  }

  const namedCount = answers && brief ? answers.filter((a) => a.names.some((n) => mentions(n, brief))).length : 0;
  const rivals = useMemo(() => {
    if (!answers || !brief) return [] as [string, number][];
    const c = new Map<string, number>();
    answers.forEach((a) => a.names.forEach((n) => { if (!mentions(n, brief)) c.set(n, (c.get(n) || 0) + 1); }));
    return [...c.entries()].sort((a, z) => z[1] - a[1]).slice(0, 4);
  }, [answers, brief]);
  const googleHits = google && brief ? google.filter((g) => g.results.some((r) => mentions(`${r.title} ${r.url}`, brief))).length : 0;
  const approved = Object.values(done).filter((v) => v === "approved").length;

  const postCards: { id: string; label: string; text: string; url: string }[] = posts ? [
    { id: "x", label: "X", text: posts.x, url: `https://x.com/intent/tweet?text=${enc(posts.x.split(/\n\s*\n/)[0].slice(0, 280))}` },
    { id: "linkedin", label: "LinkedIn", text: posts.linkedin, url: `https://www.linkedin.com/feed/?shareActive=true&text=${enc(posts.linkedin)}` },
    { id: "reddit", label: "Reddit", text: `${posts.reddit.title}\n\n${posts.reddit.body}`, url: `https://www.reddit.com/submit?type=TEXT&title=${enc(posts.reddit.title)}&text=${enc(posts.reddit.body)}` },
    { id: "instagram", label: "Instagram", text: `${posts.instagram.caption}\n\n[Visual: ${posts.instagram.visual}]`, url: "https://www.instagram.com/" },
    { id: "threads", label: "Threads", text: posts.threads, url: `https://www.threads.net/intent/post?text=${enc(posts.threads)}` },
  ] : [];


  /* ── The chat ──────────────────────────────────────────────────────────
     The conversation is derived from the session state, so a reload rebuilds
     the same thread. Questions come one at a time, in the onboarding style. */
  const QUESTIONS = [
    { key: "desc", eyebrow: "Question 1 of 3", ask: "What are you building?", note: "In your own words. Jargon is fine, I will play it back plainly.", ph: "An app that reminds PG tenants to pay and collects rent on UPI", hints: ["A tool that turns lecture audio into notes", "A marketplace for home bakers in Pune"], optional: false },
    { key: "link", eyebrow: "Question 2 of 3", ask: "Got a link I can look at?", note: "Website, GitHub or a doc. Skip if there is nothing yet.", ph: "yourproduct.com", hints: [] as string[], optional: true },
    { key: "about", eyebrow: "Question 3 of 3", ask: "And a line about you?", note: "So the posts sound like you, not like a brand.", ph: "Solo founder, 5 hours a week", hints: ["Solo founder, building nights and weekends", "Two of us, first 20 users"], optional: true },
  ];
  const values: Record<string, string> = { desc, link, about };
  const setters: Record<string, (v: string) => void> = { desc: setDesc, link: setLink, about: setAbout };
  const [line] = useState(() => READY[Math.floor(Math.random() * READY.length)]);
  const [step, setStep] = useState<number>(saved?.brief ? 3 : (!saved && seed) ? 1 : 0);
  const [draft, setDraft] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const working = Object.values(busy)[0] || "";
  const [view, setView] = useState<"chat" | "overview" | "approvals">("chat");
  // Approvals filters: what kind, which status, which site.
  const [fKind, setFKind] = useState<"all" | "posts" | "messages">("all");
  const [fStatus, setFStatus] = useState<"waiting" | "approved" | "skipped" | "all">("waiting");
  const [fSite, setFSite] = useState("all");
  const pendingCount = postCards.filter((c) => !done[`post-${c.id}`]).length + (leads || []).filter((l) => !done[`lead-${l.url}`]).length;
  const postsOk = postCards.filter((c) => done[`post-${c.id}`] === "approved").length;
  const leadsOk = (leads || []).filter((l) => done[`lead-${l.url}`] === "approved").length;
  useEffect(() => {
    onMeta({ id, name: brief?.product || (desc ? desc.slice(0, 40) : "New project"), named: answers ? namedCount : -1, of: answers ? answers.length : 0, postsOk, leadsOk, running: !!working });
  }, [brief, desc, answers, namedCount, postsOk, leadsOk, working]); // eslint-disable-line react-hooks/exhaustive-deps
  // One history entry per run, kept up to date as approvals come in.
  useEffect(() => {
    if (!lastRun || !answers) return;
    const e: RunEntry = { at: lastRun, named: namedCount, of: answers.length, postsOk, leadsOk };
    setHistory((h) => {
      const i = h.findIndex((x) => x.at === lastRun);
      if (i >= 0) { const o = h[i]; if (o.named === e.named && o.postsOk === e.postsOk && o.leadsOk === e.leadsOk && o.of === e.of) return h; const n = [...h]; n[i] = e; return n; }
      return [...h, e].slice(-26);
    });
  }, [lastRun, answers, namedCount, postsOk, leadsOk]);
  // Autopilot has no server scheduler: the weekly run happens when the app is
  // open on or after the due date.
  const nextRun = lastRun ? lastRun + WEEK : null;
  useEffect(() => {
    if (active && autopilot && confirmed && nextRun && Date.now() >= nextRun && !working) runAgain();
  }, [active, autopilot, confirmed, nextRun]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (active) document.title = `${brief?.product || "New project"} · Braino Foundry`; }, [active, brief]);
  const asking = !brief && step < 3;
  const q = asking ? QUESTIONS[step] : null;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [step, brief, confirmed, answers, fixes, posts, leads, err]);
  useEffect(() => { const t = inputRef.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 180)}px`; } }, [draft]);
  useEffect(() => { if (!brief && step === 3 && desc.trim() && !busy.brief) void makeBrief(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(v: string) {
    if (!q) return;
    if (!v.trim() && !q.optional) return;
    setters[q.key](v.trim());
    setDraft("");
    setStep((s) => s + 1);
  }
  function send() {
    if (!started) { const t = draft.trim(); if (!t) return; setStarted(true); setDraft(""); if (isHi(t)) setHello(t); else answer(t); return; }
    if (asking) return answer(draft);
    if (confirmed && brief && draft.trim() && !busy.content) { void runContent(brief, fixes, draft.trim()); setDraft(""); }
  }
  /* Voice: speech lands in the same flow as typed text, and he answers out
     loud. Uses the /chat voice hook (browser speech in, Fish voice out). */
  const turnRef = useRef<(t: string) => Promise<string>>(async () => "");
  turnRef.current = async (text: string) => {
    const t = text.trim();
    if (!started) { setStarted(true); if (isHi(t)) { setHello(t); return QUESTIONS[0].ask; } answer(t); return QUESTIONS[1].ask; }
    if (asking && q) {
      const skip = q.optional && /^(skip|no|nothing|none|not yet|nope)\b/i.test(t);
      answer(skip ? "" : t);
      return QUESTIONS[step + 1] ? QUESTIONS[step + 1].ask : "Thanks. Give me a moment to write your brief.";
    }
    if (brief && !confirmed) {
      if (/\b(yes|yeah|yep|run|go|correct|right|looks good)\b/i.test(t)) { void confirmBrief(); return "Running it now. Everything shows up here, and nothing goes out until you say yes."; }
      return `Here is what I heard. ${brief.oneLine} Say yes to run it, or tap Edit to change it.`;
    }
    if (brief && confirmed && !busy.content) { void runContent(brief, fixes, t); return "Writing that post now. It will wait for your approval."; }
    return "I am still working. Give me a moment.";
  };
  const onTranscript = useCallback((t: string) => turnRef.current(t), []);
  const voice = useBrainoVoice({ onTranscript, anonymous: true });
  useEffect(() => { if (!active && voice.active) voice.stop(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  function editBrief() { setBrief(null); setStep(0); setDraft(desc); }

  /* ── Small pieces ── */
  // The run as a timeline: what is done, what is live, what is next.
  const stages: { name: string; state: "done" | "live" | "wait"; note: string }[] = [
    { name: "Brief", state: brief && confirmed ? "done" : started ? "live" : "wait", note: confirmed ? "Confirmed" : "Answer 3 questions" },
    { name: "Optics", state: answers && fixes ? "done" : busy.optics ? "live" : "wait", note: busy.optics || (fixes ? `${fixes.length} fixes` : "Next") },
    { name: "Content", state: posts && !busy.content ? "done" : busy.content ? "live" : "wait", note: busy.content || (posts ? "5 posts" : "After Optics") },
    { name: "Outreach", state: leads && !busy.outreach ? "done" : busy.outreach ? "live" : "wait", note: busy.outreach || (leads ? `${leads.length} people` : "Next") },
    { name: "You approve", state: posts && leads ? (approved ? "done" : "live") : "wait", note: approved ? `${approved} approved` : "Waiting" },
  ];
  const curStage = Math.max(0, stages.findIndex((s) => s.state !== "done"));
  const Strip = () => (
    <ol className="fc-strip" aria-label="Run progress">
      {stages.map((s, i) => <li key={s.name} className={`${s.state}${i === (stages.every((x) => x.state === "done") ? stages.length - 1 : curStage) ? " cur" : ""}`} title={s.note}><i>{s.state === "done" ? <svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg> : null}</i><span>{s.name}</span></li>)}
    </ol>
  );

  const host = (u: string, fallback: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return fallback; } };
  const handle = brief ? brief.product.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "you" : "you";

  const initials = brief ? (brief.product.match(/[A-Z0-9]/g) || [brief.product.charAt(0)]).slice(0, 2).join("").toUpperCase() || "B" : "B";
  const [more, setMore] = useState<Record<string, true>>({});
  const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="pv-ico"><path d={d} /></svg>;
  const I = {
    reply: "M4 5h16v11H9l-5 4z", repost: "M7 7h11l-3-3M17 17H6l3 3M18 7v5M6 17v-5", like: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z", share: "M12 15V4M8 8l4-4 4 4M5 13v6h14v-6",
  };
  const Preview = ({ id, text }: { id: string; text: string }) => {
    if (id === "x") return (
      <div className="pv pv-x">
        <span className="pv-av">{initials}</span>
        <div className="pv-main">
          <div className="pv-who"><b>{brief?.product}</b><span>@{handle} · now</span></div>
          {text.split(/\n\s*\n/).map((t, i) => <p key={i} className={i ? "pv-thread" : ""}>{t}</p>)}
          <div className="pv-acts x"><Ico d={I.reply} /><Ico d={I.repost} /><Ico d={I.like} /><Ico d={I.share} /></div>
        </div>
      </div>
    );
    if (id === "linkedin") {
      const long = text.length > 240 && !more[id];
      return (
        <div className="pv pv-li">
          <div className="pv-head"><span className="pv-av">{initials}</span><div><b>{brief?.product}</b><span>Founder at {brief?.product} · now</span></div></div>
          <p>{long ? text.slice(0, 240).replace(/\s+\S*$/, "") : text}{long && <>... <button className="pv-more" onClick={() => setMore((m) => ({ ...m, [id]: true }))}>see more</button></>}</p>
          <div className="pv-acts li"><span><Ico d={I.like} />Like</span><span><Ico d={I.reply} />Comment</span><span><Ico d={I.repost} />Repost</span><span><Ico d={I.share} />Send</span></div>
        </div>
      );
    }
    if (id === "reddit") {
      const [title, ...rest] = text.split(/\n\s*\n/);
      return (
        <div className="pv pv-rd">
          <div className="pv-vote"><svg viewBox="0 0 24 24" className="pv-ico"><path d="M12 5l7 8h-4v6H9v-6H5z" /></svg><b>1</b><svg viewBox="0 0 24 24" className="pv-ico"><path d="M12 19l7-8h-4V5H9v6H5z" /></svg></div>
          <div className="pv-main"><small><b>r/your-subreddit</b> · Posted by u/{handle}</small><h4>{title}</h4><p>{rest.join("\n\n")}</p><div className="pv-acts"><span><Ico d={I.reply} />Comment</span><span><Ico d={I.share} />Share</span></div></div>
        </div>
      );
    }
    const [cap] = text.split(/\n\s*\n\[Visual: /);
    return (
      <div className={`pv pv-sq ${id}`}>
        <div className="pv-head"><span className="pv-av sm">{initials}</span><b>{handle}</b><span>{id === "threads" ? "Threads" : "Instagram"}</span></div>
        <div className="pv-tile"><span className="pv-tile-mark">{initials}</span><p>{cap.length > 140 ? cap.slice(0, 140).replace(/\s+\S*$/, "") + "..." : cap}</p></div>
        {id === "instagram" && posts?.instagram.visual && <p className="pv-vis">Image idea: {posts.instagram.visual}</p>}
        <div className="pv-acts x"><Ico d={I.like} /><Ico d={I.reply} /><Ico d={I.repost} /><Ico d={I.share} /></div>
      </div>
    );
  };

  const Chip = ({ id }: { id: string }) => <span className={`fc-chip-s ${done[id] || "waiting"}`}>{done[id] === "approved" ? (opened[id] ? "Approved, opened" : "Approved") : done[id] === "skipped" ? "Skipped" : "Waiting"}</span>;
  const Actions = ({ id, text, url, label }: { id: string; text: string; url: string; label: string }) => (
    <footer className="fc-acts">
      {done[id] === "approved" ? (
        <button className="ob-btn is-outline fc-sm" onClick={() => { void copy(text); window.open(url, "_blank", "noopener"); setOpened((o) => ({ ...o, [id]: true })); }}>{opened[id] ? "Copy and open again" : "Copy and open"}</button>
      ) : (
        <>
          <button className="ob-btn is-coral fc-sm" onClick={() => { setEditing(""); act(id, "approved", text, url); }}>{label}</button>
          <button className="ob-btn is-outline fc-sm" onClick={() => setEditing(editing === id ? "" : id)}>{editing === id ? "Done editing" : "Edit"}</button>
          {done[id] !== "skipped" ? <button className="ob-skip" onClick={() => act(id, "skipped")}>Skip</button> : <button className="ob-skip" onClick={() => setDone((d) => { const n = { ...d }; delete n[id]; return n; })}>Undo skip</button>}
        </>
      )}
    </footer>
  );

  const PostCard = ({ c }: { c: typeof postCards[number] }) => {
    const id = `post-${c.id}`; const text = edits[id] ?? c.text;
    return (
      <article className={`fc-item ${done[id] || ""}`}>
        <div className="fc-item-h"><span className="fc-plat">{c.label}</span><span className="fc-len">{text.length} characters</span><Chip id={id} /></div>
        {editing === id ? <textarea className="fc-edit" value={text} rows={7} onChange={(e) => setEdits((m) => ({ ...m, [id]: e.target.value }))} /> : Preview({ id: c.id, text })}
        {Actions({ id, text, url: c.url, label: `Approve, open ${c.label}` })}
      </article>
    );
  };
  const LeadCard = ({ l }: { l: Lead }) => {
    const id = `lead-${l.url}`; const text = edits[id] ?? l.message;
    return (
      <article className={`fc-item ${done[id] || ""}`}>
        <div className="fc-item-h"><span className="fc-plat">One person on {l.community.startsWith("r/") ? l.community : `r/${l.community}`}</span><Chip id={id} /></div>
        <div className="fc-thread">
          <div className="fc-op">
            <small>{l.community.startsWith("r/") ? l.community : `r/${l.community}`}{l.upVotes != null ? ` · ${l.upVotes} upvotes` : ""}{l.comments != null ? ` · ${l.comments} comments` : ""}</small>
            <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
            {l.body && <p>{l.body.slice(0, 220)}{l.body.length > 220 ? "..." : ""}</p>}
          </div>
          <div className="fc-meter"><span>How ready they are</span><i><em style={{ width: `${l.intent}%` }} /></i><b>{l.intent}</b></div>
          <p className="fc-why">{l.why}</p>
          <div className="fc-reply">
            <span className="pv-av sm">{initials}</span>
            {editing === id ? <textarea className="fc-edit" value={text} rows={5} onChange={(e) => setEdits((m) => ({ ...m, [id]: e.target.value }))} /> : <p>{text}</p>}
          </div>
        </div>
        {Actions({ id, text, url: l.url, label: "Approve, open their post" })}
      </article>
    );
  };

  const placeholder = !started ? "Say hi, or tell me what you're building" : q ? q.ph : !brief ? "Reading what you wrote" : !confirmed ? "Check the brief above first" : "Ask for a post about something you shipped today";
  const composer = (
          <form className="fc-composer cl" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={started && !asking && !confirmed}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <div className="fc-cl-row">
              <span className="fc-cl-hint">{voice.active ? "Listening" : "Enter to send"}</span>
            <button type="button" className={`fc-mic${voice.active ? " on" : ""}`} aria-label="Talk to Braino" onClick={() => voice.toggle()}>
              <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <button type="submit" className="fc-send" aria-label="Send" disabled={!started || asking ? !draft.trim() : (!confirmed || !draft.trim() || !!busy.content)}>
              <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
            </div>
          </form>
  );
  const maxRival = Math.max(namedCount, ...rivals.map((r) => r[1]), 1);
  const opticsBlock = answers && brief ? (
                      <>
                        <p>I asked AI the {answers.length} questions your buyers ask. You were named in <b>{namedCount}</b>.{rivals[0] ? <> {rivals[0][0]} was named in <b>{rivals[0][1]}</b>.</> : null}{google ? <> On Google you are on page one for <b>{googleHits}</b> of {google.length}.</> : null}</p>
                        <div className="fc-card fc-viz">
                          <div className="fc-viz-l">
                            <Ring n={namedCount} of={answers.length} />
                            <p className="fc-mini">AI answers naming you</p>
                            {google && <p className="fc-sub">Google page one: <b>{googleHits} of {google.length}</b></p>}
                          </div>
                          <div className="fc-viz-r">
                            <p className="fc-mini">Mentions across {answers.length} answers</p>
                            <div className="fc-bars">
                              <div className="fc-bar me"><span>You</span><i><em style={{ width: `${(namedCount / maxRival) * 100}%` }} /></i><b>{namedCount}</b></div>
                              {rivals.map(([n, c]) => <div className="fc-bar" key={n}><span title={n}>{n}</span><i><em style={{ width: `${(c / maxRival) * 100}%` }} /></i><b>{c}</b></div>)}
                            </div>
                          </div>
                        </div>
                        <div className="fc-card fc-heat">
                          <div className="fc-heat-h"><p className="fc-mini">Question by question</p><div className="fc-key"><span><i className="y" />Named</span><span><i className="n" />Missing</span><span><i className="x" />Not checked</span></div></div>
                          <div className="fc-grid">
                            <span className="h q">Buyer question</span><span className="h">AI</span><span className="h">Google</span>
                            {answers.map((a, i) => {
                              const yes = a.names.some((n) => mentions(n, brief));
                              const g = google?.find((x) => x.query === a.question) || (i < 3 ? google?.[i] : undefined);
                              const gy = g ? g.results.some((r) => mentions(`${r.title} ${r.url}`, brief)) : null;
                              return (
                                <div className="fc-grid-row" key={a.question}>
                                  <span className="q" title={`AI named: ${a.names.join(", ")}${g ? `\nGoogle top: ${g.results.slice(0, 3).map((r) => host(r.url, r.title)).join(", ")}` : ""}`}>{a.question}</span>
                                  <span className={`cell ${yes ? "y" : "n"}`} aria-label={yes ? "Named" : "Missing"} />
                                  <span className={`cell ${gy == null ? "x" : gy ? "y" : "n"}`} aria-label={gy == null ? "Not checked" : gy ? "Named" : "Missing"} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {fixes && (
                          <>
                            <p>What to publish next, so AI starts recommending you.</p>
                            <div className="fc-fixcards">{fixes.slice(0, 5).map((f) => (
                              <div key={f.question} className={`fc-fixcard${openFix === f.question ? " on" : ""}`}>
                                <span className="fc-where">{f.where}</span><b>{f.what}</b><small>Fixes: {f.question}</small>
                                <button className="fc-doit" disabled={!!making} onClick={() => void doIt(f)}>{making === f.question ? <><Dots /> Writing it</> : made[f.question] ? "Show it" : "Do it"}</button>
                              </div>
                            ))}</div>
                            {openFix && made[openFix] && (() => { const m = made[openFix]; return (
                              <div className="fc-sheet-wrap" onClick={() => setOpenFix("")}>
                                <aside className="fc-sheet" role="dialog" aria-label={m.title} onClick={(e) => e.stopPropagation()}>
                                  <header className="fc-sheet-h">
                                    <div><small>Ready to publish on {m.where}</small><h2>{m.title}</h2></div>
                                    <button className="fc-x" aria-label="Close" onClick={() => setOpenFix("")}>×</button>
                                  </header>
                                  <div className="fc-sheet-body">
                                    <section>
                                      <p className="fc-sheet-k">1. Copy this</p>
                                      <div className="fc-doc">{m.content.split("\n").map((ln, i) => {
                                        const t = ln.trim();
                                        if (!t) return null;
                                        if (/^#{1,6}\s/.test(t)) return <h4 key={i}>{t.replace(/^#+\s*/, "")}</h4>;
                                        if (/^[-*]\s/.test(t)) return <p key={i} className="li">{t.replace(/^[-*]\s*/, "")}</p>;
                                        return <p key={i}>{t.replace(/\*\*/g, "")}</p>;
                                      })}</div>
                                    </section>
                                    <section>
                                      <p className="fc-sheet-k">2. Put it here</p>
                                      <ol className="fc-steps">{m.steps.map((x, i) => <li key={x}><span>{i + 1}</span><p>{x}</p></li>)}</ol>
                                    </section>
                                  </div>
                                  <footer className="fc-sheet-f">
                                    <button className="ob-btn is-outline" onClick={() => void copy(m.content)}>Copy text</button>
                                    {m.link && <a className="ob-btn is-coral" href={m.link} target="_blank" rel="noreferrer" onClick={() => void copy(m.content)}>Copy and open {m.where}</a>}
                                  </footer>
                                </aside>
                              </div>
                            ); })()}
                          </>
                        )}
                      </>
  ) : null;

  /* ── Overview: autopilot loop, history and a few calm charts ── */
  const H = history.filter((h) => h.of > 0);
  const lineChart = (() => {
    if (H.length < 1) return null;
    const W = 300, Hh = 110, pad = 18;
    const max = Math.max(...H.map((h) => h.of), 1);
    const x = (i: number) => H.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (H.length - 1);
    const y = (v: number) => Hh - pad - (v / max) * (Hh - pad * 2);
    const pts = H.map((h, i) => `${x(i)},${y(h.named)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${W} ${Hh}`} className="fc-line" role="img" aria-label="AI answers naming you, per run">
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} className="ax" />
        <line x1={pad} x2={W - pad} y1={y(max)} y2={y(max)} className="ax dash" />
        {H.length > 1 && <polyline points={pts} className="ln" />}
        {H.map((h, i) => <g key={h.at}><circle cx={x(i)} cy={y(h.named)} r="3.5" className="pt" /><text x={x(i)} y={y(h.named) - 8} className="lb">{h.named}</text><text x={x(i)} y={Hh - 3} className="dt">{day(h.at)}</text></g>)}
      </svg>
    );
  })();
  const barChart = (() => {
    if (!H.length) return null;
    const W = 300, Hh = 110, pad = 18, max = Math.max(...H.map((h) => h.postsOk + h.leadsOk), 1);
    const bw = Math.min(28, (W - pad * 2) / H.length - 8);
    return (
      <svg viewBox={`0 0 ${W} ${Hh}`} className="fc-barsvg" role="img" aria-label="Approvals per run">
        <line x1={pad} x2={W - pad} y1={Hh - pad} y2={Hh - pad} className="ax" />
        {H.map((h, i) => {
          const cx = pad + ((i + 0.5) * (W - pad * 2)) / H.length;
          const hp = (h.postsOk / max) * (Hh - pad * 2), hl = (h.leadsOk / max) * (Hh - pad * 2);
          return <g key={h.at}><rect x={cx - bw / 2} y={Hh - pad - hp} width={bw} height={hp} className="bp" rx="2" /><rect x={cx - bw / 2} y={Hh - pad - hp - hl} width={bw} height={hl} className="bl" rx="2" /><text x={cx} y={Hh - 3} className="dt">{day(h.at)}</text></g>;
        })}
      </svg>
    );
  })();
  const autopilotPanel = (
    <section className="fc-auto">
      <div className="fc-auto-l">
        <p className="ob-eyebrow">Autopilot</p>
        <h2>Distribution keeps running itself. You only approve.</h2>
        <label className="fc-switch"><input type="checkbox" checked={autopilot} onChange={(e) => setAutopilot(e.target.checked)} /><i /><span>Run every week</span></label>
        <p className="fc-auto-next">{autopilot && nextRun ? <>Next run <b>{day(nextRun)}</b></> : lastRun ? <>Last run <b>{day(lastRun)}</b></> : "Not run yet"}</p>
        <button className="ob-btn is-outline fc-sm" disabled={!!working} onClick={runAgain}>{working ? "Running now" : "Run again now"}</button>
        <small>Runs when you open Braino Foundry each week.</small>
      </div>
      <svg className="fc-loop" viewBox="0 0 220 220" role="img" aria-label="Optics, Content, Outreach, you approve, then Optics again">
        <path id={`loop-${id}`} d="M110 30 A80 80 0 1 1 109.9 30" className="track" />
        {([["Optics", 110, 30, "o"], ["Content", 190, 110, "c"], ["Outreach", 110, 190, "r"], ["You approve", 30, 110, "y"]] as const).map(([t, cx, cy, k]) => (
          <g key={t}><circle cx={cx} cy={cy} r="7" className={`nd ${k}`} /><text x={cx} y={cy + (cy === 30 ? -14 : cy === 190 ? 24 : 4)} dx={cx === 190 ? -14 : cx === 30 ? 14 : 0} className={`tx${cx === 190 ? " r" : cx === 30 ? " l" : ""}`}>{t}</text></g>
        ))}
        <circle r="4.5" className="dot"><animateMotion dur={working ? "3s" : "8s"} repeatCount="indefinite"><mpath href={`#loop-${id}`} /></animateMotion></circle>
      </svg>
    </section>
  );
  const totalMentions = (answers || []).reduce((n, a) => n + a.names.length, 0);
  const rivalSum = rivals.reduce((n, r) => n + r[1], 0);
  const donutParts: [string, number, string][] = answers ? [["You", namedCount, "var(--o)"], ...rivals.map((r, i) => [r[0], r[1], `rgba(var(--a-shade), ${0.5 - i * 0.1})`] as [string, number, string]), ["Others", Math.max(0, totalMentions - namedCount - rivalSum), "rgba(var(--a-shade), .1)"]] : [];
  const donut = (() => {
    if (!totalMentions) return null;
    const r = 42, c = 2 * Math.PI * r; let off = 0;
    return (
      <svg viewBox="0 0 120 120" className="fc-donut" role="img" aria-label="Share of AI mentions">
        {donutParts.filter((p) => p[1] > 0).map(([n, v, col]) => { const len = (v / totalMentions) * c; const el = <circle key={n} cx="60" cy="60" r={r} stroke={col} strokeDasharray={`${len} ${c}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />; off += len; return el; })}
        <text x="60" y="58" className="big">{Math.round((namedCount / totalMentions) * 100)}%</text>
        <text x="60" y="76" className="small">is you</text>
      </svg>
    );
  })();
  const written = postCards.length + (leads || []).length;
  const approvedN = postsOk + leadsOk;
  const openedN = Object.keys(opened).filter((k) => done[k] === "approved").length;
  const funnel: [string, number][] = [["Written for you", written], ["Approved", approvedN], ["Opened to post", openedN]];
  const chartsBlock = (
    <div className="fc-charts">
      <div className="fc-card fc-chart">
        <p className="fc-mini">AI answers naming you, per run</p>
        {lineChart || <p className="fc-note">Shows up after your first run.</p>}
      </div>
      <div className="fc-card fc-chart">
        <p className="fc-mini">Approvals per run <span className="fc-k"><i className="bp" />Posts <i className="bl" />Messages</span></p>
        {barChart || <p className="fc-note">Shows up after your first run.</p>}
      </div>
      <div className="fc-card fc-chart">
        <p className="fc-mini">Share of AI mentions</p>
        {donut ? <div className="fc-donut-wrap">{donut}<ul>{donutParts.filter((p) => p[1] > 0).map(([n, v, col]) => <li key={n}><i style={{ background: col }} /><span>{n}</span><b>{v}</b></li>)}</ul></div> : <p className="fc-note">Shows up after Optics.</p>}
      </div>
      <div className="fc-card fc-chart">
        <p className="fc-mini">From written to posted</p>
        <div className="fc-funnel">{funnel.map(([n, v], i) => <div key={n}><span>{n}</span><i><em style={{ width: `${written ? (v / written) * 100 : 0}%`, opacity: 1 - i * 0.25 }} /></i><b>{v}</b></div>)}</div>
      </div>
    </div>
  );

  return (
    <>
      <main className="fc-main" hidden={!active}>
        <header className="fc-top">
          <button className="fc-icon fc-only-m" onClick={onHome} aria-label="All projects"><svg className="fc-ic" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
          <span className="fc-title">{name || (brief ? brief.product : "New project")}</span>
          <div className="fc-tabs" role="tablist">
            <button role="tab" aria-selected={view === "chat"} className={view === "chat" ? "on" : ""} onClick={() => setView("chat")}>Chat</button>
            <button role="tab" aria-selected={view === "overview"} className={view === "overview" ? "on" : ""} onClick={() => setView("overview")}>Overview</button>
            <button role="tab" aria-selected={view === "approvals"} className={view === "approvals" ? "on" : ""} onClick={() => setView("approvals")}>Approvals{pendingCount > 0 ? <em>{pendingCount}</em> : null}</button>
          </div>
          {confirmed && brief && <Strip />}
          <div className="fc-top-r">
            <button className="fc-icon" onClick={toggle} aria-label="Switch theme">{theme === "dark" ? "☀" : "☾"}</button>
          </div>
        </header>

        {view === "chat" ? (<>
        <div className="fc-scroll">
          <div className="fc-col">
            {!started && !brief ? (
              <div className="fc-ready">
                <h1 className="fc-ready-line"><span className="fc-ready-m"><BrainoMascot variant="foundry" size={44} talking={voice.status === "speaking"} /></span>{line}</h1>
                {!voice.active && composer}
              </div>
            ) : (
              <>{hello && <Me>{hello}</Me>}</>
            )}

            {started && QUESTIONS.map((qq, i) => (i < step || brief) ? (
              <div key={qq.key} className="fc-pair">
                <Bot><p className="fc-q">{qq.ask}</p></Bot>
                <Me>{values[qq.key] || <em>Skipped</em>}</Me>
              </div>
            ) : null)}

            {started && q && (
              <Bot>
                <div className="fc-ask" key={q.key}>
                  <p className="fc-q">{q.ask} <span className="fc-note">{q.note}</span></p>
                  {(q.hints.length > 0 || q.optional) && (
                    <div className="ob-suggests">
                      {q.hints.map((h) => <button key={h} className="ob-suggest" onClick={() => setDraft(h)}>{h}</button>)}
                      {q.optional && <button className="ob-suggest fc-skipq" onClick={() => answer("")}>Skip this</button>}
                    </div>
                  )}
                </div>
              </Bot>
            )}

            {!brief && busy.brief && <Bot><Wait text={busy.brief} /></Bot>}

            {brief && (
              <Bot wide>
                <p>Here is what I heard. Does this match what you have in mind?</p>
                <div className="fc-card fc-brief">
                  <p className="ob-eyebrow">{brief.product}</p>
                  <p className="fc-big">{brief.oneLine}</p>
                  <div className="ob-summary fc-sum">
                    <div><span>Buyer</span><b>{brief.buyer}</b></div>
                    <div><span>Their problem</span><b>{brief.problem}</b></div>
                    <div><span>Your voice</span><b>{brief.voice}</b></div>
                  </div>
                  {!confirmed && (
                    <div className="fc-actions">
                      <button className="ob-btn is-coral" onClick={() => void confirmBrief()}>Yes, run Braino Foundry</button>
                      <button className="ob-btn is-outline" onClick={editBrief}>Edit</button>
                    </div>
                  )}
                </div>
              </Bot>
            )}

            {confirmed && brief && (
              <>
                <Me>Yes, that is it. Run it.</Me>

                <Bot><p>On it. You can follow each step at the top.</p></Bot>

                {(answers || busy.optics) && (
                  <Bot wide>
                    <Engine k="o" name="Optics" sub="Where you are invisible" />
                    {answers ? opticsBlock : null}
                    {busy.optics && <Wait text={busy.optics} />}
                  </Bot>
                )}

                {(busy.content || busy.outreach) && <Bot><Wait text={busy.content || busy.outreach} /></Bot>}

                {(posts || (leads && leads.length > 0)) && (
                  <Bot wide>
                    <div className="fc-card fc-ready-card">
                      <div>
                        <b>Your approvals are ready</b>
                        <span>{postCards.length} {postCards.length === 1 ? "post" : "posts"} and {(leads || []).length} {(leads || []).length === 1 ? "message" : "messages"} {pendingCount ? "waiting for your yes" : "all handled"}</span>
                      </div>
                      <button className="ob-btn is-coral" onClick={() => setView("approvals")}>Open Approvals</button>
                    </div>
                    {leads && !leads.length && <p>Nobody on Reddit is asking about this today. I will look again next run.</p>}
                  </Bot>
                )}

                {posts && leads && !working && <Bot><p>That is everything for now. Ask me below for a post about anything, like something you shipped today.</p></Bot>}
              </>
            )}

            {err && <div className="fc-err"><span>{err}</span><button onClick={() => setErr("")}>Dismiss</button></div>}
            <div ref={endRef} className="fc-end" />
          </div>
        </div>

        <div className="fc-dock" hidden={!started && !brief && !voice.active}>
          {voice.active ? (
            <div className={`fc-vbar ${voice.status}`} role="status" aria-live="polite">
              <span className="fc-vbar-m"><BrainoMascot variant="foundry" size={40} talking={voice.status === "speaking"} /></span>
              <div className="fc-vbar-mid">
                <span className="fc-vbar-wave" aria-hidden>{Array.from({ length: 5 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}</span>
                <span className="fc-vbar-text">{voice.status === "error" ? (/not-allowed|denied/i.test(voice.error) ? "Allow the microphone to talk to me" : voice.error || "Something went wrong") : voice.status === "speaking" ? (voice.brainoText || "Speaking") : voice.status === "thinking" ? "Thinking" : voice.userText || (voice.status === "connecting" ? "Getting ready" : "Listening")}</span>
              </div>
              <button className="fc-vbar-end" onClick={() => voice.stop()}>End</button>
            </div>
          ) : (started || brief) && composer}
          <p className="fc-fine">Braino Foundry never posts on its own. You approve everything.</p>
        </div>
        </>) : (
        <div className="fc-scroll">
          <div className={`fc-col fc-ov${view === "approvals" ? " fc-wide" : ""}`}>
            {view === "approvals" && confirmed && brief ? (
              <>
                <div className="fc-ov-h"><p className="ob-eyebrow">Approvals</p><h1>{pendingCount ? `${pendingCount} waiting for your yes.` : "All caught up."}</h1><p className="fc-note">Approve copies the text and opens the site so you can post it. Braino Foundry never posts on its own.</p></div>
                {pendingCount > 0 && (
                  <div className="fc-allbar">
                    <span><b>{pendingCount}</b> waiting</span>
                    <button className="ob-btn is-coral fc-sm" onClick={() => setDone((d) => { const n = { ...d }; postCards.forEach((c) => { if (!n[`post-${c.id}`]) n[`post-${c.id}`] = "approved"; }); (leads || []).forEach((l) => { if (!n[`lead-${l.url}`]) n[`lead-${l.url}`] = "approved"; }); return n; })}>Approve all {pendingCount}</button>
                    <small>Marks them approved. Then open each one to post it.</small>
                  </div>
                )}
                {(() => {
                  const st = (k: string) => done[k] || "waiting";
                  const ok = (k: string) => fStatus === "all" || st(k) === fStatus;
                  const items = [
                    ...(fKind !== "messages" ? postCards.filter((c) => (fSite === "all" || fSite === c.id) && ok(`post-${c.id}`)).map((c) => ({ key: `post-${c.id}`, el: PostCard({ c }) })) : []),
                    ...(fKind !== "posts" && (fSite === "all" || fSite === "reddit-msg") ? (leads || []).filter((l) => ok(`lead-${l.url}`)).map((l) => ({ key: `lead-${l.url}`, el: LeadCard({ l }) })) : []),
                  ];
                  const all = [...postCards.map((c) => `post-${c.id}`), ...(leads || []).map((l) => `lead-${l.url}`)];
                  const count = (v: string) => all.filter((k) => v === "all" || st(k) === v).length;
                  return (
                    <>
                      <div className="fc-filters">
                        <div className="fc-seg" role="tablist" aria-label="Kind">
                          {([["all", "Everything"], ["posts", `Posts ${postCards.length}`], ["messages", `Messages ${(leads || []).length}`]] as const).map(([k, l]) => <button key={k} className={fKind === k ? "on" : ""} onClick={() => { setFKind(k); setFSite("all"); }}>{l}</button>)}
                        </div>
                        <div className="fc-seg" role="tablist" aria-label="Status">
                          {([["waiting", "Waiting"], ["approved", "Approved"], ["skipped", "Skipped"], ["all", "All"]] as const).map(([k, l]) => <button key={k} className={fStatus === k ? "on" : ""} onClick={() => setFStatus(k)}>{l}<em>{count(k)}</em></button>)}
                        </div>
                        {fKind === "posts" && (
                          <div className="fc-chips">
                            {[["all", "All sites"], ...postCards.map((c) => [c.id, c.label])].map(([k, l]) => <button key={k} className={fSite === k ? "on" : ""} onClick={() => setFSite(k)}>{l}</button>)}
                          </div>
                        )}
                      </div>
                      {!posts && !leads ? <Wait text={busy.content || busy.outreach || "Posts and messages land here after Optics"} /> : items.length ? (
                        <div className="fc-agrid">{items.map((i) => <div key={i.key} className="fc-acell">{i.el}</div>)}</div>
                      ) : <p className="fc-note fc-empty-f">Nothing here. Try another filter.</p>}
                    </>
                  );
                })()}
              </>
            ) : !confirmed || !brief ? (
              <div className="fc-empty">
                <p className="fc-big">Nothing to show yet.</p>
                <p>Answer three quick questions in Chat and confirm your brief. Your scorecard, posts and people show up here.</p>
                <button className="ob-btn" onClick={() => setView("chat")}>Go to chat</button>
              </div>
            ) : (
              <>
                <div className="fc-ov-h">
                  <p className="ob-eyebrow">{brief.product}</p>
                  <h1>{brief.oneLine}</h1>
                </div>
                {autopilotPanel}
                <div className="fc-kpi-row">
                  <div><span>AI answers naming you</span><b>{answers ? <>{namedCount}<small> of {answers.length}</small></> : "..."}</b></div>
                  <div><span>Google page one</span><b>{google ? <>{googleHits}<small> of {google.length}</small></> : "..."}</b></div>
                  <div><span>Posts approved</span><b>{postsOk}<small> of {postCards.length || 5}</small></b></div>
                  <div><span>Messages approved</span><b>{leadsOk}<small> of {leads ? leads.length : "..."}</small></b></div>
                </div>
                {working && <Wait text={working} />}
                {chartsBlock}
                <section className="fc-sec"><Engine k="o" name="Optics" sub="Where you are invisible" />{opticsBlock || <Wait text={busy.optics || "Waiting"} />}</section>
                <section className="fc-sec fc-next">
                  <div><Engine k="c" name="Content" sub={posts ? `${postCards.length} posts written` : "Posts that fix it"} /><Engine k="r" name="Outreach" sub={leads ? `${leads.length} messages written` : "People asking today"} /></div>
                  <p>{pendingCount ? <><b>{pendingCount}</b> {pendingCount === 1 ? "thing is" : "things are"} waiting for your yes.</> : posts || leads ? "Nothing waiting. You are all caught up." : busy.content || busy.outreach || "Posts and people land in Approvals."}</p>
                  <button className="ob-btn is-coral" onClick={() => setView("approvals")}>Open Approvals</button>
                </section>
              </>
            )}
          </div>
        </div>
        )}
      </main>
    </>
  );
}

/* ── Projects ────────────────────────────────────────────────────────────
   Each project is one product with its own chat, results and approvals, saved
   under its own key. Opened projects stay mounted, so a run keeps going while
   you look at another one. */
const newId = () => Math.random().toString(36).slice(2, 10);
function loadList(): ProjectMeta[] {
  try {
    const l = JSON.parse(localStorage.getItem(LIST) || "null");
    if (Array.isArray(l)) return l;
    const old = localStorage.getItem(LEGACY);
    if (old) {
      const id = newId();
      const o = JSON.parse(old);
      localStorage.setItem(keyOf(id), old);
      const first: ProjectMeta = { id, name: o?.brief?.product || "My first project", updated: Date.now(), named: -1, of: 0, postsOk: 0, leadsOk: 0, running: false };
      localStorage.setItem(LIST, JSON.stringify([first]));
      return [first];
    }
  } catch (_) { /* private window */ }
  return [];
}
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "Just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "Yesterday" : `${d} days ago`;
};

export default function FoundryApp() {
  const { theme, toggle } = useAffTheme();
  const [list, setList] = useState<ProjectMeta[]>(loadList);
  const [active, setActive] = useState<string | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  const [seeds, setSeeds] = useState<Record<string, string>>({});
  const [menu, setMenu] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [sure, setSure] = useState("");
  const [menuAt, setMenuAt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => { try { localStorage.setItem(LIST, JSON.stringify(list)); } catch (_) { /* private window */ } }, [list]);
  useEffect(() => { if (!active) document.title = "Braino Foundry"; }, [active]);
  // Every text box grows with what you write, so long messages wrap instead of scrolling.
  useEffect(() => {
    const grow = (el: Element | null) => { if (!(el instanceof HTMLTextAreaElement) || !el.closest(".fc")) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
    const onInput = (e: Event) => grow(e.target as Element);
    document.addEventListener("input", onInput);
    const t = window.setInterval(() => document.querySelectorAll(".fc textarea").forEach((el) => { if ((el as HTMLTextAreaElement).value === "") (el as HTMLTextAreaElement).style.height = ""; }), 400);
    return () => { document.removeEventListener("input", onInput); window.clearInterval(t); };
  }, []);
  useEffect(() => { const close = () => setMenu(""); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, []);

  function open(id: string) { setActive(id); setOpened((o) => o.includes(id) ? o : [...o, id]); }
  function create(seed = "") {
    const id = newId();
    setSeeds((s) => ({ ...s, [id]: seed }));
    setList((l) => [{ id, name: seed ? seed.slice(0, 40) : "New project", updated: Date.now(), named: -1, of: 0, postsOk: 0, leadsOk: 0, running: false }, ...l]);
    open(id); setDraft("");
  }
  // Rename happens in place in the sidebar, like Claude; Enter saves, Escape cancels.
  function saveName() {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name) setList((l) => l.map((p) => p.id === renaming.id ? { ...p, name, custom: true } as ProjectMeta : p));
    setRenaming(null);
  }
  function remove(id: string) {
    try { localStorage.removeItem(keyOf(id)); } catch (_) { /* fine */ }
    setList((l) => l.filter((p) => p.id !== id)); setOpened((o) => o.filter((x) => x !== id));
    if (active === id) setActive(null);
  }
  const onMeta = useCallback((m: Partial<ProjectMeta> & { id: string }) => {
    setList((l) => l.map((p) => {
      if (p.id !== m.id) return p;
      const custom = (p as ProjectMeta & { custom?: boolean }).custom;
      const changed = m.named !== p.named || m.postsOk !== p.postsOk || m.leadsOk !== p.leadsOk || (!custom && m.name !== p.name) || m.running !== p.running;
      return changed ? { ...p, ...m, name: custom ? p.name : (m.name || p.name), updated: Date.now() } : p;
    }));
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const sorted = [...list].sort((a, z) => z.updated - a.updated);

  return (
    <div className="aff fc" data-theme={theme}>
      <aside className="fc-rail">
        <Link to="/foundry" className="fc-brand"><img src="/affective-logo.png" alt="Affective" /></Link>
        <button className="fc-prod" onClick={() => setActive(null)}>Braino Foundry</button>
        <button className="fc-new" onClick={() => create()}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>New project</button>
        <div className="fc-rail-label">Projects</div>
        <div className="fc-plist">
          {sorted.map((p) => (
            <div key={p.id} className={`fc-pitem${active === p.id ? " on" : ""}`}>
              {renaming?.id === p.id ? (
                <input className="fc-pedit" autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })} onBlur={saveName} onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setRenaming(null); }} />
              ) : (
              <button className="fc-pbtn" onClick={() => open(p.id)}>
                <span>{p.running && <i className="fc-run" />}{p.name}</span><small>{ago(p.updated)}</small>
              </button>
              )}
              <button className="fc-more" aria-label="Project menu" onClick={(e) => { e.stopPropagation(); setSure(""); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuAt({ x: Math.max(8, r.right - 200), y: r.bottom + 6 }); setMenu(menu === p.id ? "" : p.id); }}><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></button>
              {menu === p.id && (
                <div className="fc-menu" style={{ position: "fixed", left: menuAt.x, top: menuAt.y, right: "auto" }} onClick={(e) => e.stopPropagation()}>
                  {sure === p.id ? (
                    <>
                      <p className="fc-menu-q">Delete this project? Its chat and results go too.</p>
                      <div className="fc-menu-row"><button onClick={() => setSure("")}>Cancel</button><button className="del solid" onClick={() => { setMenu(""); setSure(""); remove(p.id); }}>Delete</button></div>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setMenu(""); setRenaming({ id: p.id, name: p.name }); }}><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>Rename</button>
                      <button className="del" onClick={() => setSure(p.id)}><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {!list.length && <p className="fc-none">No projects yet.</p>}
        </div>
        <div className="fc-rail-foot">
          <button className="fc-theme" onClick={toggle}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
        </div>
      </aside>

      {!active && (
        <main className="fc-main">
          <header className="fc-top fc-top-home">
            <Link to="/foundry" className="fc-brand fc-only-m"><img src="/affective-logo.png" alt="Affective" /></Link>
            <span className="fc-title">Braino Foundry</span>
            <div className="fc-top-r"><button className="fc-icon" onClick={toggle} aria-label="Switch theme">{theme === "dark" ? "☀" : "☾"}</button></div>
          </header>
          <div className="fc-scroll">
            <div className="fc-home">
              <div className="fc-mascot home"><BrainoMascot variant="foundry" size={92} /></div>
              <h1 className="fc-greet">{greet}. What are you building?</h1>
              <form className="fc-composer big" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) create(draft.trim()); }}>
                <textarea rows={2} value={draft} placeholder="Describe it in your own words. Jargon is fine." onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim()) create(draft.trim()); } }} />
                <button type="submit" className="fc-send" aria-label="Start project" disabled={!draft.trim()}><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
              </form>
              <p className="fc-home-sub">Each product gets its own project: a chat, a scorecard, posts and people to reply to. You approve everything.</p>
            </div>
          </div>
        </main>
      )}
      {opened.filter((id) => list.some((p) => p.id === id)).map((id) => (
        <FoundryProject key={id} id={id} name={list.find((p) => p.id === id)?.name} active={active === id} seed={seeds[id] || ""} theme={theme} toggle={toggle} onMeta={onMeta} onHome={() => setActive(null)} />
      ))}
    </div>
  );
}
