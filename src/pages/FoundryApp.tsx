import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAffTheme } from "@/components/AffTheme";
import { Link } from "react-router-dom";
import "./affective.css";
import "./foundry-app.css";
import "./foundry-dash.css";

/* Foundry (Forge AI Hackathon, 2026-10-22). One journey, Workflow 1, Get found:
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

const STORE = "foundry-session-v1";

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

export default function FoundryApp() {
  const { theme, toggle } = useAffTheme();
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (_) { return null; } }, []);

  const [desc, setDesc] = useState<string>(saved?.desc || "");
  const [link, setLink] = useState<string>(saved?.link || "");
  const [about, setAbout] = useState<string>(saved?.about || "");
  const [brief, setBrief] = useState<Brief | null>(saved?.brief || null);
  const [confirmed, setConfirmed] = useState<boolean>(saved?.confirmed || false);
  const [answers, setAnswers] = useState<AiAnswer[] | null>(saved?.answers || null);
  const [google, setGoogle] = useState<Google[] | null>(saved?.google || null);
  const [fixes, setFixes] = useState<Fix[] | null>(saved?.fixes || null);
  const [posts, setPosts] = useState<Posts | null>(saved?.posts || null);
  const [topic, setTopic] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(saved?.leads || null);
  const [done, setDone] = useState<Record<string, "approved" | "skipped">>(saved?.done || {});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string>("");
  const [tab, setTab] = useState<"overview" | "brief" | "optics" | "content" | "outreach" | "inbox">(saved?.brief ? "overview" : "brief");

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done })); } catch (_) { /* private window */ }
  }, [desc, link, about, brief, confirmed, answers, google, fixes, posts, leads, done]);
  useEffect(() => { document.title = "Foundry · Get found"; }, []);

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

  const working = Object.values(busy)[0] || "";
  const NAV: [typeof tab, string, string][] = [
    ["overview", "Overview", "M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
    ["brief", "Brief", "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"],
    ["optics", "Optics", "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    ["content", "Content", "M4 20h4L19 9l-4-4L4 16zM14 6l4 4"],
    ["outreach", "Outreach", "M4 4h16v12H8l-4 4zM8 9h8M8 12h5"],
    ["inbox", "Approvals", "M4 13h4l2 3h4l2-3h4M4 13l3-8h10l3 8v6H4z"],
  ];
  const pendingCount = postCards.filter((c) => !done[`post-${c.id}`]).length + (leads || []).filter((l) => !done[`lead-${l.url}`]).length;

  const PostCard = ({ c }: { c: typeof postCards[number] }) => (
    <article className={`fx-item ${done[`post-${c.id}`] || ""}`}>
      <header><span className="fx-tag c">{c.label}</span>{done[`post-${c.id}`] && <span className="fx-state">{done[`post-${c.id}`]}</span>}</header>
      <p>{c.text}</p>
      <footer><button className="fx-btn pri" onClick={() => act(`post-${c.id}`, "approved", c.text, c.url)}>Approve & open</button><button className="fx-btn" onClick={() => act(`post-${c.id}`, "skipped")}>Skip</button></footer>
    </article>
  );
  const LeadCard = ({ l }: { l: Lead }) => (
    <article className={`fx-item ${done[`lead-${l.url}`] || ""}`}>
      <header><span className="fx-score" style={{ ["--p" as string]: `${l.intent}%` }}><b>{l.intent}</b></span><div className="fx-lead-h"><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a><small>{l.community} · {l.why}</small></div>{done[`lead-${l.url}`] && <span className="fx-state">{done[`lead-${l.url}`]}</span>}</header>
      <p className="fx-msg">{l.message}</p>
      <footer><button className="fx-btn pri" onClick={() => act(`lead-${l.url}`, "approved", l.message, l.url)}>Approve & open thread</button><button className="fx-btn" onClick={() => act(`lead-${l.url}`, "skipped")}>Skip</button></footer>
    </article>
  );
  const Empty = ({ text }: { text: string }) => <div className="fx-empty">{working ? <><span className="fx-dot" />{working}…</> : text}</div>;

  return (
    <div className="aff fx" data-theme={theme}>
      <aside className="fx-side">
        <Link to="/foundry" className="fx-brand"><span className="fx-logo">F</span>Foundry</Link>
        <nav>
          {NAV.map(([id, label, d]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)} disabled={id !== "brief" && !confirmed}>
              <svg viewBox="0 0 24 24"><path d={d} /></svg><span>{label}</span>
              {id === "inbox" && pendingCount > 0 && <em>{pendingCount}</em>}
            </button>
          ))}
        </nav>
        <div className="fx-side-foot">
          <div className="fx-engines"><i className="o" /><i className="c" /><i className="r" /></div>
          <span>Nothing goes out without your approval.</span>
        </div>
      </aside>

      <div className="fx-main">
        <header className="fx-top">
          <div>
            <div className="fx-crumb">{brief ? brief.product : "New brief"}</div>
            <h1>{NAV.find((n) => n[0] === tab)?.[1]}</h1>
          </div>
          <div className="fx-top-r">
            {working && <span className="fx-live"><span className="fx-dot" />{working}</span>}
            <button className="fx-icon" onClick={toggle} aria-label="Theme">{theme === "dark" ? "☀" : "☾"}</button>
            {brief && <button className="fx-btn" onClick={() => { reset(); setTab("brief"); }}>New brief</button>}
          </div>
        </header>

        {err && <div className="fx-err">{err}<button onClick={() => setErr("")}>Dismiss</button></div>}

        {tab === "overview" && confirmed && brief && (
          <div className="fx-grid">
            <div className="fx-kpis">
              <div className="fx-kpi o"><span>AI answers naming you</span><b>{answers ? `${namedCount}/${answers.length}` : "…"}</b><small>{rivals[0] ? `${rivals[0][0]} named ${rivals[0][1]}×` : "checking"}</small></div>
              <div className="fx-kpi o"><span>Google page one</span><b>{google ? `${googleHits}/${google.length}` : "…"}</b><small>buyer searches</small></div>
              <div className="fx-kpi c"><span>Posts ready</span><b>{posts ? 5 : "…"}</b><small>5 platforms</small></div>
              <div className="fx-kpi r"><span>People asking</span><b>{leads ? leads.length : "…"}</b><small>Reddit, with a reply each</small></div>
            </div>
            {(answers || leads) && (
              <section className="fx-moment">
                <div className="fx-label">This week</div>
                <p>We asked AI the {answers?.length || 0} questions your buyers ask. You were named in <b>{namedCount}</b>.{rivals[0] ? <> {rivals[0][0]} was named in <b>{rivals[0][1]}</b>.</> : null}{google ? <> On Google you're on page one for <b>{googleHits}</b> of {google.length}.</> : null}{posts ? <> Here are <b>5 posts</b> that answer them</> : null}{leads ? <>{posts ? "," : " Here are"} and <b>{leads.length} people</b> asking for it on Reddit.</> : posts ? "." : null}</p>
              </section>
            )}
            <section className="fx-panel">
              <div className="fx-panel-h"><h2>Competitors in AI answers</h2><button className="fx-link" onClick={() => setTab("optics")}>Optics →</button></div>
              {rivals.length ? rivals.map(([n, c]) => <div className="fx-bar" key={n}><span>{n}</span><i style={{ width: `${(c / Math.max(1, answers?.length || 1)) * 100}%` }} /><b>{c}</b></div>) : <Empty text="No answers yet." />}
            </section>
            <section className="fx-panel">
              <div className="fx-panel-h"><h2>Waiting for you</h2><button className="fx-link" onClick={() => setTab("inbox")}>Approvals →</button></div>
              <div className="fx-mini">{postCards.slice(0, 2).map((c) => <div key={c.id}><span className="fx-tag c">{c.label}</span><p>{c.text.slice(0, 110)}…</p></div>)}{(leads || []).slice(0, 2).map((l) => <div key={l.url}><span className="fx-tag r">Reddit</span><p>{l.title}</p></div>)}{!posts && !leads && <Empty text="Nothing yet." />}</div>
            </section>
          </div>
        )}

        {tab === "brief" && (
          <div className="fx-narrow">
            {!brief ? (
              <section className="fx-panel">
                <div className="fx-panel-h"><h2>Tell Foundry what you're building</h2></div>
                <p className="fx-sub">In your own words. Jargon is fine; Foundry plays it back plainly.</p>
                <label className="fx-field">What are you building?<textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="An app that reminds PG tenants to pay and collects rent on UPI…" /></label>
                <div className="fx-two">
                  <label className="fx-field">Any link<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Website, GitHub or a doc" /></label>
                  <label className="fx-field">A line about you<input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Solo founder, 5 hours a week" /></label>
                </div>
                <button className="fx-btn pri lg" disabled={!desc.trim() || !!busy.brief} onClick={makeBrief}>{busy.brief ? `${busy.brief}…` : "Make my brief"}</button>
              </section>
            ) : (
              <section className="fx-panel">
                <div className="fx-label">{brief.product}</div>
                <p className="fx-big">{brief.oneLine}</p>
                <div className="fx-facts"><div><span>Buyer</span><p>{brief.buyer}</p></div><div><span>Their problem</span><p>{brief.problem}</p></div><div><span>Your voice</span><p>{brief.voice}</p></div></div>
                {!confirmed ? (
                  <div className="fx-confirm"><span>Does this match what you have in mind?</span><button className="fx-btn" onClick={() => setBrief(null)}>Edit</button><button className="fx-btn pri" onClick={() => { setTab("overview"); void confirmBrief(); }}>Yes, run Foundry</button></div>
                ) : <div className="fx-confirm ok"><span>Confirmed. Foundry is running.</span><button className="fx-btn" onClick={() => setTab("overview")}>See overview</button></div>}
              </section>
            )}
          </div>
        )}

        {tab === "optics" && brief && (
          <div className="fx-stack">
            <section className="fx-panel">
              <div className="fx-panel-h"><h2>AI answers</h2><span className="fx-pill o">AEO</span></div>
              {answers ? (
                <table className="fx-table"><thead><tr><th>Buyer question</th><th>Who the AI names</th><th>You</th></tr></thead><tbody>
                  {answers.map((a) => { const yes = a.names.some((n) => mentions(n, brief)); return (
                    <tr key={a.question}><td>{a.question}</td><td><div className="fx-names">{a.names.map((n) => <i key={n} className={mentions(n, brief) ? "me" : ""}>{n}</i>)}</div></td><td><span className={yes ? "fx-ok" : "fx-miss"}>{yes ? "Named" : "Missing"}</span></td></tr>
                  ); })}
                </tbody></table>
              ) : <Empty text="Waiting for your brief." />}
            </section>
            <section className="fx-panel">
              <div className="fx-panel-h"><h2>Google, page one</h2><span className="fx-pill o">SEO</span></div>
              {google && google.length ? (
                <table className="fx-table"><thead><tr><th>Search</th><th>Top results</th><th>You</th></tr></thead><tbody>
                  {google.map((g) => { const yes = g.results.some((r) => mentions(`${r.title} ${r.url}`, brief)); return (
                    <tr key={g.query}><td>{g.query}</td><td className="fx-hosts">{g.results.slice(0, 3).map((r) => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch (_) { return r.title; } }).join(" · ")}</td><td><span className={yes ? "fx-ok" : "fx-miss"}>{yes ? "On page one" : "Not there"}</span></td></tr>
                  ); })}
                </tbody></table>
              ) : <Empty text="Google results appear here." />}
            </section>
            <section className="fx-panel">
              <div className="fx-panel-h"><h2>Fix list</h2><button className="fx-link" onClick={() => setTab("content")}>Sent to Content →</button></div>
              {fixes ? <div className="fx-fixes">{fixes.map((f) => <div key={f.question}><span className="fx-tag o">{f.where}</span><p>{f.what}</p><small>For: {f.question}</small></div>)}</div> : <Empty text="Fixes appear after the check." />}
            </section>
          </div>
        )}

        {tab === "content" && brief && (
          <div className="fx-stack">
            <div className="fx-ask"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Write a post about… (something you shipped today)" /><button className="fx-btn pri" disabled={!topic.trim() || !!busy.content} onClick={() => { void runContent(brief, fixes, topic.trim()); setTopic(""); }}>Write it</button></div>
            {posts ? <div className="fx-cards">{postCards.map((c) => <PostCard key={c.id} c={c} />)}</div> : <Empty text="Posts appear after the Optics check." />}
          </div>
        )}

        {tab === "outreach" && brief && (
          <div className="fx-stack">
            {leads && leads.length ? <div className="fx-list">{leads.map((l) => <LeadCard key={l.url} l={l} />)}</div> : <Empty text={leads ? "Nobody found asking about this. Try a broader brief." : "People appear here."} />}
          </div>
        )}

        {tab === "inbox" && (
          <div className="fx-stack">
            <p className="fx-sub">Every post and message waits here. Approve copies the text and opens the platform. Foundry never posts on its own.</p>
            <div className="fx-list">
              {postCards.map((c) => <PostCard key={c.id} c={c} />)}
              {(leads || []).map((l) => <LeadCard key={l.url} l={l} />)}
              {!posts && !leads && <Empty text="Nothing waiting yet." />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
