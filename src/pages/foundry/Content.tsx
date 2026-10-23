import React, { useEffect, useRef, useState } from "react";
import "./components/brandmap.css";
import type { Topic, TopicSource } from "./store";
import type { PageProps } from "./types";
import { approvePost, setPost, setTopic } from "./actions";
import { checkClaims, writeArticle } from "./engines";
import { copy } from "./lib";
import { ItemTable, type TableRow } from "./components/table";
import { WeekStrip } from "./components/charts";
import { PLATFORM_LABEL } from "./components/previews";
import { Busy, Empty, Hint, PageHead, Section } from "./components/ui";

export const SOURCE_LABEL: Record<TopicSource, string> = { reddit: "from a Reddit post", optics: "from an Optics gap", objection: "from a buyer's reply", founder: "you asked for it" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* A topic, and the article written from it. "Where are the written
   articles?" (2026-10-23): one tap writes it, it shows right here, and it
   waits in Approvals too. */
function TopicItem({ t, p, up }: { t: Topic; p: PageProps["p"]; up: PageProps["up"] }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  async function write() {
    setBusy(true); setErr("");
    try {
      const article = await writeArticle(p, t);
      setTopic(up, t.id, { article, articleStatus: "waiting", claims: undefined }); setOpen(true);
      // Then every claim in it is checked, so nothing invented goes out.
      const claims = await checkClaims(p, article).catch(() => undefined);
      if (claims) setTopic(up, t.id, { claims });
    }
    catch (_) { setErr("Could not write it right now. Try again in a moment."); }
    finally { setBusy(false); }
  }
  return (
    <li className={t.article ? "has-article" : ""}>
      <b>{t.title}</b>
      <span className={`fx-src ${t.source}`}>{SOURCE_LABEL[t.source]}</span>
      <small>"{t.sourceText}"</small>
      {t.article ? (
        <>
          <div className="fx-topic-acts">
            <button className="fx-link" onClick={() => setOpen((o) => !o)}>{open ? "Hide the article" : "Read the article"}</button>
            <button className="fx-link" onClick={() => void copy(t.article || "")}>Copy</button>
            <button className="fx-link" disabled={busy} onClick={() => void write()}>{busy ? "Rewriting" : "Rewrite"}</button>
          </div>
          {t.claims && (() => {
            const need = t.claims.filter((c) => c.basis === "source");
            return (
              <div className={`fx-claims ${need.length ? "warn" : "ok"}`}>
                <b>{t.claims.length} claim{t.claims.length === 1 ? "" : "s"} checked. {need.length ? `${need.length} need${need.length === 1 ? "s" : ""} a source before you publish.` : "All stand on your details or common knowledge."}</b>
                {need.length > 0 && <ul>{need.map((c, i) => <li key={i}>{c.text}<small>{c.why}</small></li>)}</ul>}
              </div>
            );
          })()}
          {open && <div className="fx-article">{t.article.split("\n").map((ln, i) => {
            const x = ln.trim();
            if (!x) return null;
            if (/^#\s/.test(x)) return <h3 key={i}>{x.replace(/^#\s*/, "")}</h3>;
            if (/^#{2,6}\s/.test(x)) return <h4 key={i}>{x.replace(/^#+\s*/, "")}</h4>;
            return <p key={i}>{x.replace(/\*\*/g, "")}</p>;
          })}</div>}
        </>
      ) : (
        <button className="fx-btn sm" disabled={busy} onClick={() => void write()}>{busy ? <Busy text="Writing the article" /> : "Write the article"}</button>
      )}
      {err && <small className="fx-err-t">{err}</small>}
    </li>
  );
}

export default function Content({ p, up, busy, run }: PageProps) {
  const [ask, setAsk] = useState("");
  const topics = p.memory.topics;
  const live = p.posts.filter((x) => x.status !== "skipped");
  const last = p.posts.reduce((m, x) => Math.max(m, x.at), 0) || null;
  const topicOf = (id: string) => topics.find((t) => t.id === id);
  /* Arriving from Reach people: show just the posts that message mentions,
     highlighted, until "Show all posts". */
  const [focus, setFocus] = useState<string>(() => { try { const f = sessionStorage.getItem("foundry-focus-topic") || ""; sessionStorage.removeItem("foundry-focus-topic"); return f; } catch (_) { return ""; } });
  const focusTopic = focus ? topicOf(focus) : undefined;
  const postsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focusTopic) window.setTimeout(() => postsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = focusTopic ? p.posts.filter((x) => x.topicId === focus) : p.posts;

  return (
    <div className="fx-page">
      <PageHead engine="content" title="Be seen" status={p.posts.length ? `${p.posts.filter((x) => x.status === "waiting").length} posts waiting` : "No posts yet"} last={last} onRun={() => run.content()} running={busy.content} explainData={{ topics: topics.slice(0, 5).map((t) => `${t.title} (${SOURCE_LABEL[t.source]})`), posts: p.posts.length }} />

      <Section title="Topics" hint="What the posts are about. Each one comes from something real in memory: a buyer's words on Reddit, a question AI answers without you, or a doubt a buyer raised." explain={topics.slice(0, 6).map((t) => ({ title: t.title, source: SOURCE_LABEL[t.source], from: t.sourceText }))}>
        {topics.length ? (
          <ul className="fx-topics">
            {topics.slice(0, 8).map((t) => <TopicItem key={t.id} t={t} p={p} up={up} />)}
          </ul>
        ) : <Empty title="No topics yet">Topics come from Outreach and Optics. Run the engines, or ask for a post below.</Empty>}
        <form className="fx-ask" onSubmit={(e) => { e.preventDefault(); if (ask.trim()) { run.content(ask.trim()); setAsk(""); } }}>
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask for a post about anything, like what you shipped this week" />
          <button className="fx-btn sm" disabled={!ask.trim() || !!busy.content}>{busy.content ? "Writing" : "Write it"}</button>
        </form>
      </Section>

      <Section title="This week" hint="When to post each one. Times are when that platform's audience is usually around. Approve on the day, or earlier and schedule it yourself.">
        {live.length ? <WeekStrip items={live.map((x) => ({ day: x.day, time: x.time, label: PLATFORM_LABEL[x.platform], status: x.status }))} /> : <Empty title="Nothing planned">Once posts are written, they show up on the day to post them.</Empty>}
      </Section>

      <div ref={postsRef} />
      <Section title="Posts" hint="Shown the way each platform shows them. Approve copies the text and opens the platform with it filled in where it can. Nothing is posted for you yet.">
        {busy.content && !p.posts.length && <Busy text={busy.content} />}
        {focusTopic && (
          <div className="fx-focus">
            <p><b>The post your message mentions</b> · "{focusTopic.title}". {shown.some((x) => x.status === "approved") ? "It is out." : "Approve it and post it, then send the message."}</p>
            <button className="fx-link" onClick={() => setFocus("")}>Show all posts</button>
          </div>
        )}
        {shown.length ? (
          <div className={focusTopic ? "fx-focused" : ""}><ItemTable showKind={false} empty={null} rows={[...shown].sort((a, z) => (a.status === "waiting" ? 0 : 1) - (z.status === "waiting" ? 0 : 1) || a.day - z.day).map((x): TableRow => ({
            id: x.id, kind: "Post", site: PLATFORM_LABEL[x.platform], when: `${DAYS[x.day]} at ${x.time}`,
            title: x.title || topicOf(x.topicId)?.title, text: x.text, status: x.status, opened: x.opened,
            approve: () => approvePost(up, x), skip: () => setPost(up, x.id, { status: "skipped" }), undo: () => setPost(up, x.id, { status: "waiting" }),
            edit: (text) => setPost(up, x.id, { text }),
          }))} /></div>
        ) : !busy.content && <Empty title="No posts yet" action={<button className="fx-btn" onClick={() => run.content()}>Write this week's posts</button>}>Braino writes one post for each of X, LinkedIn, Reddit, Instagram and Threads.</Empty>}
      </Section>
      <p className="fx-small">Content only writes public posts. A message to one person lives in Reach people.<Hint>Keeping them apart keeps each engine honest: posts are for everyone, messages are for one person.</Hint></p>
    </div>
  );
}
