import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter } from "@/components/affPage";
import "./affective.css";
import "./foundry-app.css";

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

  return (
    <div className="aff fd" data-theme={theme}>
      <AffNav theme={theme} onToggle={toggle} links={[["How it works", "#how"], ["Braino", "/braino"]]} />
      <main className="aff-wrap fd-main">
        <header className="fd-hero">
          <div className="aff-kicker">Foundry · Get found</div>
          <h1 className="fd-h1">Get your product <em>seen</em>.</h1>
          <p className="fd-lede">Tell Foundry what you're building. It finds where buyers can't find you, writes the posts that fix it, and brings you people asking for it. You only approve.</p>
          <div className="fd-engines" id="how">
            <span className="fd-chip o">Optics</span><span className="fd-arrow">→</span><span className="fd-chip c">Content</span><span className="fd-arrow">→</span><span className="fd-chip r">Outreach</span>
          </div>
        </header>

        {err && <div className="fd-err" role="alert">{err} <button onClick={() => setErr("")}>Dismiss</button></div>}

        {(answers || leads) && brief && (
          <section className="fd-moment" aria-live="polite">
            <div className="aff-kicker">Your week, found</div>
            <p>
              We asked GPT-5.6 the {answers?.length || 0} questions your buyers ask. You were named in <b>{namedCount}</b>.
              {rivals[0] ? <> {rivals[0][0]} was named in <b>{rivals[0][1]}</b>.</> : null}
              {google ? <> On Google, you're on page one for <b>{googleHits}</b> of {google.length}.</> : null}
              {posts ? <> Here are <b>5 posts</b> that answer them</> : null}
              {leads ? <>{posts ? "," : " Here are"} and <b>{leads.length} people</b> asking for it on Reddit, each with a reply in your voice.</> : posts ? "." : null}
            </p>
            {approved > 0 && <div className="fd-moment-sub">{approved} approved so far.</div>}
          </section>
        )}

        {/* 1. Brief */}
        <section className="fd-step">
          <div className="fd-step-head"><span className="fd-n">1</span><div><h2>Your brief</h2><p>In your own words. Jargon is fine; Foundry will play it back plainly.</p></div></div>
          {!brief && (
            <div className="fd-form">
              <label>What are you building?<textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="An app that reminds PG tenants to pay and collects rent on UPI…" /></label>
              <div className="fd-row">
                <label>Any link (site, GitHub, doc)<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>
                <label>A line about you<input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Solo founder, 5 hours a week for marketing" /></label>
              </div>
              <button className="fd-go" disabled={!desc.trim() || !!busy.brief} onClick={makeBrief}>{busy.brief ? `${busy.brief}…` : "Make my brief"}</button>
            </div>
          )}
          {brief && (
            <div className="fd-brief">
              <div className="fd-brief-name">{brief.product}</div>
              <p className="fd-brief-line">{brief.oneLine}</p>
              <dl><div><dt>Buyer</dt><dd>{brief.buyer}</dd></div><div><dt>Their problem</dt><dd>{brief.problem}</dd></div><div><dt>Your voice</dt><dd>{brief.voice}</dd></div></dl>
              {!confirmed ? (
                <div className="fd-confirm"><span>Does this match what you have in mind?</span><button className="fd-go" onClick={confirmBrief}>Yes, that's it</button><button className="fd-ghost" onClick={() => setBrief(null)}>Edit</button></div>
              ) : (
                <div className="fd-confirm done"><span>Brief confirmed.</span><button className="fd-ghost" onClick={reset}>Start over</button></div>
              )}
            </div>
          )}
        </section>

        {confirmed && brief && (
          <>
            {/* 2. Optics */}
            <section className="fd-step">
              <div className="fd-step-head"><span className="fd-n o">2</span><div><h2>Optics: where you're invisible</h2><p>Your buyers' questions, asked to an AI assistant and to Google.</p></div></div>
              {busy.optics && <div className="fd-busy">{busy.optics}…</div>}
              {answers && (
                <div className="fd-table">
                  <div className="fd-tr fd-th"><span>Buyer question</span><span>Who the AI names</span><span>You?</span></div>
                  {answers.map((a) => {
                    const yes = a.names.some((n) => mentions(n, brief));
                    return (
                      <div className="fd-tr" key={a.question}>
                        <span>{a.question}</span>
                        <span className="fd-names">{a.names.map((n) => <i key={n} className={mentions(n, brief) ? "me" : ""}>{n}</i>)}</span>
                        <span className={yes ? "fd-yes" : "fd-no"}>{yes ? "Named" : "Missing"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {google && google.length > 0 && (
                <div className="fd-google">
                  <div className="aff-kicker">Google, page one</div>
                  {google.map((g) => (
                    <div className="fd-g" key={g.query}>
                      <b>{g.query}</b>
                      <span>{g.results.slice(0, 3).map((r) => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch (_) { return r.title; } }).join(" · ")}</span>
                      <em className={g.results.some((r) => mentions(`${r.title} ${r.url}`, brief)) ? "fd-yes" : "fd-no"}>{g.results.some((r) => mentions(`${r.title} ${r.url}`, brief)) ? "You're there" : "Not on page one"}</em>
                    </div>
                  ))}
                </div>
              )}
              {fixes && (
                <div className="fd-fixes">
                  <div className="aff-kicker">Fix list, sent to Content</div>
                  {fixes.map((f) => <div className="fd-fix" key={f.question}><b>{f.where}</b><span>{f.what}</span><small>For: {f.question}</small></div>)}
                </div>
              )}
            </section>

            {/* 3. Content */}
            <section className="fd-step">
              <div className="fd-step-head"><span className="fd-n c">3</span><div><h2>Content: posts that fix it</h2><p>Public posts for everyone, in your voice. Approve copies the post and opens the platform.</p></div></div>
              {busy.content && <div className="fd-busy">{busy.content}…</div>}
              <div className="fd-ask">
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Or: write a post about… (what you shipped today)" />
                <button className="fd-ghost" disabled={!topic.trim() || !!busy.content} onClick={() => { void runContent(brief, fixes, topic.trim()); setTopic(""); }}>Write it</button>
              </div>
              <div className="fd-cards">
                {postCards.map((c) => (
                  <article className={`fd-card ${done[`post-${c.id}`] || ""}`} key={c.id}>
                    <header><b>{c.label}</b>{done[`post-${c.id}`] && <span>{done[`post-${c.id}`]}</span>}</header>
                    <p>{c.text}</p>
                    <footer>
                      <button className="fd-go sm" onClick={() => act(`post-${c.id}`, "approved", c.text, c.url)}>Approve</button>
                      <button className="fd-ghost sm" onClick={() => act(`post-${c.id}`, "skipped")}>Skip</button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>

            {/* 4. Outreach */}
            <section className="fd-step">
              <div className="fd-step-head"><span className="fd-n r">4</span><div><h2>Outreach: people asking today</h2><p>Reddit threads from the past year where people describe your problem, read one by one. One message each, to one person. Approve copies it and opens the thread.</p></div></div>
              {busy.outreach && <div className="fd-busy">{busy.outreach}…</div>}
              {leads && leads.length === 0 && !busy.outreach && <p className="fd-muted">Nobody found asking about this on Reddit. Try a broader brief.</p>}
              <div className="fd-leads">
                {(leads || []).map((l) => (
                  <article className={`fd-lead ${done[`lead-${l.url}`] || ""}`} key={l.url}>
                    <header>
                      <span className="fd-intent" style={{ ["--p" as string]: `${l.intent}%` }}>{l.intent}</span>
                      <div><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a><small>r/{l.community.replace(/^r\//, "")} · {l.why}</small></div>
                    </header>
                    <p>{l.message}</p>
                    <footer>
                      <button className="fd-go sm" onClick={() => act(`lead-${l.url}`, "approved", l.message, l.url)}>Approve</button>
                      <button className="fd-ghost sm" onClick={() => act(`lead-${l.url}`, "skipped")}>Skip</button>
                      {done[`lead-${l.url}`] && <span className="fd-state">{done[`lead-${l.url}`]}</span>}
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
        <p className="fd-foot">Foundry never posts or sends on its own. Every post and message waits for you.</p>
      </main>
      <AffFooter />
    </div>
  );
}
