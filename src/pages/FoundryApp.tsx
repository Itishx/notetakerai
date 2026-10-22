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
const GREETING = "Hi, I'm Braino Foundry. I help get what you're building seen. Three quick questions.";
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
async function askJson<T>(message: string): Promise<T> {
  const reply = await ask(`${message}\n\nReply with valid JSON only. No markdown, no commentary.`);
  const start = reply.search(/[[{]/);
  const end = Math.max(reply.lastIndexOf("}"), reply.lastIndexOf("]"));
  return JSON.parse(reply.slice(start, end + 1)) as T;
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
  <div className={`fc-msg bot${wide ? " wide" : ""}`}><span className="fc-av" aria-hidden><BrainoMascot variant="foundry" size={24} /></span><div className="fc-body">{children}</div></div>
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


type ProjectProps = { id: string; active: boolean; seed: string; theme: string; toggle: () => void; onMeta: (m: Partial<ProjectMeta> & { id: string }) => void; onHome: () => void };

function FoundryProject({ id, active, seed, theme, toggle, onMeta, onHome }: ProjectProps) {
  const STORE = keyOf(id);
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (_) { return null; } }, [STORE]);

  const [desc, setDesc] = useState<string>(saved?.desc || seed || "");
  const [link, setLink] = useState<string>(saved?.link || "");
  const [about, setAbout] = useState<string>(saved?.about || "");
  const [brief, setBrief] = useState<Brief | null>(saved?.brief || null);
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

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done, started, hello })); } catch (_) { /* private window */ }
  }, [desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done, started, hello]);

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
For the 4 questions that matter most, say what the founder should publish and where so AI assistants and Google start naming them. Places: a Reddit answer, a LinkedIn post, an X thread, a comparison page, an FAQ page.
Return: [{"question": "...", "where": "...", "what": "one concrete sentence"}]`);
      setFixes(fx);
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
    setConfirmed(true); setErr("");
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
    if (kind === "approved") { void copy(text); if (url) window.open(url, "_blank", "noopener"); }
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
  const pendingCount = postCards.filter((c) => !done[`post-${c.id}`]).length + (leads || []).filter((l) => !done[`lead-${l.url}`]).length;
  const postsOk = postCards.filter((c) => done[`post-${c.id}`] === "approved").length;
  const leadsOk = (leads || []).filter((l) => done[`lead-${l.url}`] === "approved").length;
  useEffect(() => {
    onMeta({ id, name: brief?.product || (desc ? desc.slice(0, 40) : "New project"), named: answers ? namedCount : -1, of: answers ? answers.length : 0, postsOk, leadsOk, running: !!working });
  }, [brief, desc, answers, namedCount, postsOk, leadsOk, working]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (!started) { if (!draft.trim()) return; setHello(draft.trim()); setStarted(true); setDraft(""); return; }
    if (asking) return answer(draft);
    if (confirmed && brief && draft.trim() && !busy.content) { void runContent(brief, fixes, draft.trim()); setDraft(""); }
  }
  /* Voice: speech lands in the same flow as typed text, and he answers out
     loud. Uses the /chat voice hook (browser speech in, Fish voice out). */
  const turnRef = useRef<(t: string) => Promise<string>>(async () => "");
  turnRef.current = async (text: string) => {
    const t = text.trim();
    if (!started) { setHello(t); setStarted(true); return `${GREETING} ${QUESTIONS[0].ask}`; }
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
  const voice = useBrainoVoice({ onTranscript });
  useEffect(() => { if (!active && voice.active) voice.stop(); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  function editBrief() { setBrief(null); setStep(0); setDraft(desc); }

  /* ── Small pieces ── */
  // The run as a timeline: what is done, what is live, what is next.
  const stages: { name: string; state: "done" | "live" | "wait"; note: string }[] = [
    { name: "Brief", state: "done", note: "Confirmed" },
    { name: "Optics", state: answers && fixes ? "done" : busy.optics ? "live" : "wait", note: busy.optics || (fixes ? `${fixes.length} fixes` : "Next") },
    { name: "Content", state: posts && !busy.content ? "done" : busy.content ? "live" : "wait", note: busy.content || (posts ? "5 posts" : "After Optics") },
    { name: "Outreach", state: leads && !busy.outreach ? "done" : busy.outreach ? "live" : "wait", note: busy.outreach || (leads ? `${leads.length} people` : "Next") },
    { name: "You approve", state: posts && leads ? (approved ? "done" : "live") : "wait", note: approved ? `${approved} approved` : "Waiting" },
  ];
  const Timeline = () => (
    <ol className="fc-time">
      {stages.map((s) => <li key={s.name} className={s.state}><i>{s.state === "done" ? <svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg> : null}</i><b>{s.name}</b><span>{s.note}</span></li>)}
    </ol>
  );

  const host = (u: string, fallback: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return fallback; } };
  const handle = brief ? brief.product.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "you" : "you";
  const initial = brief ? brief.product.trim().charAt(0).toUpperCase() || "B" : "B";

  const Preview = ({ id, text }: { id: string; text: string }) => {
    if (id === "x" || id === "threads") return (
      <div className={`pv pv-x ${id}`}>
        <span className="pv-av">{initial}</span>
        <div className="pv-main">
          <div className="pv-who"><b>{brief?.product}</b><span>@{handle} · now</span></div>
          {text.split(/\n\s*\n/).map((t, i) => <p key={i} className={i ? "pv-thread" : ""}>{t}</p>)}
          <div className="pv-acts"><span>Reply</span><span>Repost</span><span>Like</span><span>Share</span></div>
        </div>
      </div>
    );
    if (id === "linkedin") return (
      <div className="pv pv-li">
        <div className="pv-head"><span className="pv-av sq">{initial}</span><div><b>{brief?.product}</b><span>Founder · now</span></div></div>
        <p>{text}</p>
        <div className="pv-acts"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div>
      </div>
    );
    if (id === "reddit") {
      const [title, ...rest] = text.split(/\n\s*\n/);
      return (
        <div className="pv pv-rd">
          <div className="pv-vote"><span>▲</span><b>1</b><span>▼</span></div>
          <div className="pv-main"><small>Posted by u/{handle}</small><h4>{title}</h4><p>{rest.join("\n\n")}</p><div className="pv-acts"><span>Comment</span><span>Share</span><span>Save</span></div></div>
        </div>
      );
    }
    const [cap, vis] = text.split(/\n\s*\n\[Visual: /);
    return (
      <div className="pv pv-ig">
        <div className="pv-head"><span className="pv-av ring">{initial}</span><b>{handle}</b></div>
        <div className="pv-img"><span>Image idea</span><p>{(vis || posts?.instagram.visual || "").replace(/\]$/, "")}</p></div>
        <p><b>{handle}</b> {cap}</p>
      </div>
    );
  };

  const Actions = ({ id, text, url, label }: { id: string; text: string; url: string; label: string }) => (
    <footer className="fc-acts">
      <button className="ob-btn is-coral fc-sm" onClick={() => { setEditing(""); act(id, "approved", text, url); }}>{label}</button>
      <button className="ob-btn is-outline fc-sm" onClick={() => setEditing(editing === id ? "" : id)}>{editing === id ? "Done editing" : "Edit"}</button>
      <button className="ob-skip" onClick={() => act(id, "skipped")}>Skip</button>
      {done[id] && <span className="fc-state">{done[id] === "approved" ? "Copied and opened" : "Skipped"}</span>}
    </footer>
  );

  const PostCard = ({ c }: { c: typeof postCards[number] }) => {
    const id = `post-${c.id}`; const text = edits[id] ?? c.text;
    return (
      <article className={`fc-item ${done[id] || ""}`}>
        <div className="fc-item-h"><span className="fc-plat">{c.label}</span><span className="fc-len">{text.length} characters</span></div>
        {editing === id ? <textarea className="fc-edit" value={text} rows={7} onChange={(e) => setEdits((m) => ({ ...m, [id]: e.target.value }))} /> : Preview({ id: c.id, text })}
        {Actions({ id, text, url: c.url, label: `Approve, open ${c.label}` })}
      </article>
    );
  };
  const LeadCard = ({ l }: { l: Lead }) => {
    const id = `lead-${l.url}`; const text = edits[id] ?? l.message;
    return (
      <article className={`fc-item ${done[id] || ""}`}>
        <div className="fc-thread">
          <div className="fc-op">
            <small>{l.community.startsWith("r/") ? l.community : `r/${l.community}`}{l.upVotes != null ? ` · ${l.upVotes} upvotes` : ""}{l.comments != null ? ` · ${l.comments} comments` : ""}</small>
            <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
            {l.body && <p>{l.body.slice(0, 220)}{l.body.length > 220 ? "..." : ""}</p>}
          </div>
          <div className="fc-meter"><span>How ready they are</span><i><em style={{ width: `${l.intent}%` }} /></i><b>{l.intent}</b></div>
          <p className="fc-why">{l.why}</p>
          <div className="fc-reply">
            <span className="pv-av sm">{initial}</span>
            {editing === id ? <textarea className="fc-edit" value={text} rows={5} onChange={(e) => setEdits((m) => ({ ...m, [id]: e.target.value }))} /> : <p>{text}</p>}
          </div>
        </div>
        {Actions({ id, text, url: l.url, label: "Approve, open thread" })}
      </article>
    );
  };

  const placeholder = !started ? "Say hi whenever you're ready" : q ? q.ph : !brief ? "Reading what you wrote" : !confirmed ? "Check the brief above first" : "Ask for a post about something you shipped today";
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
                            <p>Here is what to publish, and where, so they start naming you.</p>
                            <ol className="fc-fixes">{fixes.map((f) => <li key={f.question}><span className="fc-where">{f.where}</span><p>{f.what}</p><small>For "{f.question}"</small></li>)}</ol>
                          </>
                        )}
                      </>
  ) : null;

  return (
    <>
      <main className="fc-main" hidden={!active}>
        <header className="fc-top">
          <button className="fc-icon fc-only-m" onClick={onHome} aria-label="All projects"><svg className="fc-ic" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
          <span className="fc-title">{brief ? brief.product : "New project"}</span>
          <div className="fc-tabs" role="tablist">
            <button role="tab" aria-selected={view === "chat"} className={view === "chat" ? "on" : ""} onClick={() => setView("chat")}>Chat</button>
            <button role="tab" aria-selected={view === "overview"} className={view === "overview" ? "on" : ""} onClick={() => setView("overview")}>Overview</button>
            <button role="tab" aria-selected={view === "approvals"} className={view === "approvals" ? "on" : ""} onClick={() => setView("approvals")}>Approvals{pendingCount > 0 ? <em>{pendingCount}</em> : null}</button>
          </div>
          <div className="fc-top-r">
            {working && <span className="fc-live"><i />{working}</span>}
            <button className="fc-icon" onClick={toggle} aria-label="Switch theme">{theme === "dark" ? "☀" : "☾"}</button>
          </div>
        </header>

        {view === "chat" ? (<>
        <div className="fc-scroll">
          <div className="fc-col">
            {!started && !brief ? (
              <div className="fc-ready">
                <div className="fc-mascot"><BrainoMascot variant="foundry" size={120} /></div>
                <p className="fc-ready-line">{line}</p>
                <p className="fc-ready-sub">Type below, or tap the mic and talk.</p>
              </div>
            ) : (
              <>
                {hello && <Me>{hello}</Me>}
                <Bot><p className="fc-hello">{GREETING}</p></Bot>
              </>
            )}

            {started && QUESTIONS.map((qq, i) => (i < step || brief) ? (
              <div key={qq.key} className="fc-pair">
                <Bot><p className="fc-q">{qq.ask}</p></Bot>
                <Me>{values[qq.key] || <em>Skipped</em>}</Me>
              </div>
            ) : null)}

            {started && q && (
              <Bot>
                <div className="ob-step fc-ask" key={q.key}>
                  <p className="ob-eyebrow">{q.eyebrow}</p>
                  <div className="ob-progress fc-prog"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
                  <p className="fc-q big">{q.ask}</p>
                  <p className="fc-note">{q.note}</p>
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

                <Bot wide>
                  <p>On it. Here is where things are.</p>
                  {Timeline()}
                </Bot>

                {(answers || busy.optics) && (
                  <Bot wide>
                    <Engine k="o" name="Optics" sub="Where you are invisible" />
                    {answers ? opticsBlock : null}
                    {busy.optics && <Wait text={busy.optics} />}
                  </Bot>
                )}

                {(posts || busy.content) && (
                  <Bot wide>
                    <Engine k="c" name="Content" sub="Posts that fix it" />
                    {posts && <p>Five posts, one per platform, in your voice. This is roughly how each one will look. Approve copies the text and opens the platform.</p>}
                    {posts && <div className="fc-list">{postCards.map((c) => <div key={c.id}>{PostCard({ c })}</div>)}</div>}
                    {busy.content && <Wait text={busy.content} />}
                  </Bot>
                )}

                {(leads || busy.outreach) && (
                  <Bot wide>
                    <Engine k="r" name="Outreach" sub="People asking today" />
                    {leads && (leads.length ? <p>{leads.length} people on Reddit are asking for this right now, most ready first. I wrote a reply for each.</p> : <p>Nobody found asking about this today. Try a broader brief.</p>)}
                    {leads && leads.length > 0 && <div className="fc-list">{leads.map((l) => <div key={l.url}>{LeadCard({ l })}</div>)}</div>}
                    {busy.outreach && <Wait text={busy.outreach} />}
                  </Bot>
                )}

                {posts && leads && !working && <Bot><p>That is everything for now. Ask me below for a post about anything, like something you shipped today.</p></Bot>}
              </>
            )}

            {err && <div className="fc-err"><span>{err}</span><button onClick={() => setErr("")}>Dismiss</button></div>}
            <div ref={endRef} className="fc-end" />
          </div>
        </div>

        <div className="fc-dock">
          <form className="fc-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={started && !asking && !confirmed}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button type="button" className={`fc-mic${voice.active ? " on" : ""}`} aria-label="Talk to Braino" onClick={() => voice.toggle()}>
              <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <button type="submit" className="fc-send" aria-label="Send" disabled={!started || asking ? !draft.trim() : (!confirmed || !draft.trim() || !!busy.content)}>
              <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </form>
          <p className="fc-fine">Braino Foundry never posts on its own. You approve everything.</p>
        </div>
        </>) : (
        <div className="fc-scroll">
          <div className="fc-col fc-ov">
            {view === "approvals" && confirmed && brief ? (
              <>
                <div className="fc-ov-h"><p className="ob-eyebrow">Approvals</p><h1>{pendingCount ? `${pendingCount} waiting for your yes.` : "All caught up."}</h1><p className="fc-note">Approve copies the text and opens the platform. Braino Foundry never posts on its own.</p></div>
                <section className="fc-sec"><Engine k="c" name="Posts" sub="Content" />
                  {posts ? <div className="fc-list">{[...postCards].sort((a, z) => Number(!!done[`post-${a.id}`]) - Number(!!done[`post-${z.id}`])).map((c) => <div key={c.id}>{PostCard({ c })}</div>)}</div> : <Wait text={busy.content || "Posts land here after Optics"} />}
                </section>
                <section className="fc-sec"><Engine k="r" name="Replies" sub="Outreach" />
                  {leads ? (leads.length ? <div className="fc-list">{[...leads].sort((a, z) => Number(!!done[`lead-${a.url}`]) - Number(!!done[`lead-${z.url}`])).map((l) => <div key={l.url}>{LeadCard({ l })}</div>)}</div> : <p className="fc-note">Nobody found asking about this today.</p>) : <Wait text={busy.outreach || "Waiting"} />}
                </section>
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
                <div className="fc-kpi-row">
                  <div><span>AI answers naming you</span><b>{answers ? <>{namedCount}<small> of {answers.length}</small></> : "..."}</b></div>
                  <div><span>Google page one</span><b>{google ? <>{googleHits}<small> of {google.length}</small></> : "..."}</b></div>
                  <div><span>Posts approved</span><b>{postsOk}<small> of {postCards.length || 5}</small></b></div>
                  <div><span>Replies approved</span><b>{leadsOk}<small> of {leads ? leads.length : "..."}</small></b></div>
                </div>
                {working && <Wait text={working} />}
                <section className="fc-sec"><Engine k="o" name="Optics" sub="Where you are invisible" />{opticsBlock || <Wait text={busy.optics || "Waiting"} />}</section>
                <section className="fc-sec fc-next">
                  <div><Engine k="c" name="Content" sub={posts ? `${postCards.length} posts written` : "Posts that fix it"} /><Engine k="r" name="Outreach" sub={leads ? `${leads.length} people asking` : "People asking today"} /></div>
                  <p>{pendingCount ? <><b>{pendingCount}</b> {pendingCount === 1 ? "thing is" : "things are"} waiting for your yes.</> : posts || leads ? "Nothing waiting. You are all caught up." : busy.content || busy.outreach || "Posts and people land in Approvals."}</p>
                  <button className="ob-btn is-coral" onClick={() => setView("approvals")}>Open Approvals</button>
                </section>
              </>
            )}
          </div>
        </div>
        )}
        {voice.active && (
          <div className="fc-voice" role="dialog" aria-label="Voice mode">
            <div className={`fc-mascot big ${voice.status}`}><BrainoMascot variant="foundry" size={170} /></div>
            <p className="fc-v-status">{voice.status === "listening" ? "Listening" : voice.status === "thinking" ? "Thinking" : voice.status === "speaking" ? "Speaking" : voice.status === "connecting" ? "Getting ready" : voice.status === "error" ? "Something went wrong" : "Here"}</p>
            {voice.userText && <p className="fc-v-you">{voice.userText}</p>}
            {voice.brainoText && <p className="fc-v-him">{voice.brainoText}</p>}
            {voice.error && <p className="fc-v-err">{voice.error}</p>}
            <button className="ob-btn" onClick={() => voice.stop()}>End voice</button>
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

  useEffect(() => { try { localStorage.setItem(LIST, JSON.stringify(list)); } catch (_) { /* private window */ } }, [list]);
  useEffect(() => { if (!active) document.title = "Braino Foundry"; }, [active]);
  useEffect(() => { const close = () => setMenu(""); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, []);

  function open(id: string) { setActive(id); setOpened((o) => o.includes(id) ? o : [...o, id]); }
  function create(seed = "") {
    const id = newId();
    setSeeds((s) => ({ ...s, [id]: seed }));
    setList((l) => [{ id, name: seed ? seed.slice(0, 40) : "New project", updated: Date.now(), named: -1, of: 0, postsOk: 0, leadsOk: 0, running: false }, ...l]);
    open(id); setDraft("");
  }
  function rename(id: string) {
    const cur = list.find((p) => p.id === id);
    const name = window.prompt("Rename project", cur?.name || "");
    if (name && name.trim()) setList((l) => l.map((p) => p.id === id ? { ...p, name: name.trim(), custom: true } as ProjectMeta : p));
  }
  function remove(id: string) {
    if (!window.confirm("Delete this project? Its chat, results and approvals go too.")) return;
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
              <button className="fc-pbtn" onClick={() => open(p.id)}>
                <span>{p.running && <i className="fc-run" />}{p.name}</span><small>{ago(p.updated)}</small>
              </button>
              <button className="fc-more" aria-label="Project menu" onClick={(e) => { e.stopPropagation(); setMenu(menu === p.id ? "" : p.id); }}>...</button>
              {menu === p.id && (
                <div className="fc-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setMenu(""); rename(p.id); }}>Rename</button>
                  <button className="del" onClick={() => { setMenu(""); remove(p.id); }}>Delete</button>
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
              {list.length > 0 && (
                <>
                  <div className="fc-home-h"><h2>Your projects</h2><span>{list.length}</span></div>
                  <div className="fc-pgrid">
                    {sorted.map((p) => (
                      <button key={p.id} className="fc-pcard" onClick={() => open(p.id)}>
                        <div className="fc-pcard-h"><b>{p.name}</b>{p.running ? <span className="fc-tagrun"><i className="fc-run" />Running</span> : <small>{ago(p.updated)}</small>}</div>
                        <div className="fc-pstats">
                          <div><span>Named by AI</span><b>{p.named >= 0 ? <>{p.named}<small>/{p.of}</small></> : "-"}</b>{p.named >= 0 && <i className="fc-pbar"><em style={{ width: `${p.of ? (p.named / p.of) * 100 : 0}%` }} /></i>}</div>
                          <div><span>Posts approved</span><b>{p.postsOk}</b></div>
                          <div><span>Replies approved</span><b>{p.leadsOk}</b></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      )}
      {opened.filter((id) => list.some((p) => p.id === id)).map((id) => (
        <FoundryProject key={id} id={id} active={active === id} seed={seeds[id] || ""} theme={theme} toggle={toggle} onMeta={onMeta} onHome={() => setActive(null)} />
      ))}
    </div>
  );
}
