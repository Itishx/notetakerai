import React, { useState } from "react";
import { whereOf } from "./store";
import "./components/brandmap.css";
import type { PageProps } from "./types";
import { approveArticle, approvePerson, approvePost, setPerson, setPost, setTopic } from "./actions";
import { PLATFORM_LABEL } from "./components/previews";
import { Empty } from "./components/ui";
import { ItemTable, type TableRow } from "./components/table";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* Approvals as one table (2026-10-23). The pill filters stacked three
   "selected" states on top of each other; now there is one filter (status)
   and a Type column you can read at a glance. */
export default function Approvals({ p, up, go }: PageProps) {
  /* Simplified (2026-10-23): Itish found three rows of filters confusing.
     One switch, To do or Done, then everything grouped under plain headings,
     sorted by where it goes. */
  const [done, setDone] = useState(false);

  const posts: TableRow[] = p.posts.map((x): TableRow => ({
    id: x.id, kind: "Post", site: PLATFORM_LABEL[x.platform], title: x.title || undefined, text: x.text, when: `${DAYS[x.day]} ${x.time}`,
    status: x.status, opened: x.opened,
    approve: () => approvePost(up, x), skip: () => setPost(up, x.id, { status: "skipped" }), undo: () => setPost(up, x.id, { status: "waiting" }),
    edit: (text) => setPost(up, x.id, { text }),
  }));
  const messages: TableRow[] = p.people.filter((x) => x.message).map((x): TableRow => ({
    id: x.id, kind: "Message", site: whereOf(x), title: x.title, link: x.url, text: x.message,
    status: x.status,
    approve: () => approvePerson(up, x), skip: () => setPerson(up, x.id, { status: "skipped" }), undo: () => setPerson(up, x.id, { status: "waiting" }),
    edit: (message) => setPerson(up, x.id, { message }),
  }));
  const articles: TableRow[] = p.memory.topics.filter((t) => t.article).map((t): TableRow => ({
    id: t.id, kind: "Article", site: "Blog or Medium", title: t.title, text: t.article || "",
    status: t.articleStatus || "waiting",
    approve: () => approveArticle(up, t), skip: () => setTopic(up, t.id, { articleStatus: "skipped" }), undo: () => setTopic(up, t.id, { articleStatus: "waiting" }),
    edit: (article) => setTopic(up, t.id, { article }),
  }));
  const all = [...posts, ...messages, ...articles];
  const todo = all.filter((r) => r.status === "waiting");
  const pick = (rows: TableRow[]) => rows.filter((r) => (done ? r.status !== "waiting" : r.status === "waiting")).sort((a, z) => String(a.site).localeCompare(String(z.site)));
  const groups = [
    { title: "Posts to publish", line: "Public posts, for everyone. Approve opens the site with the post ready.", rows: pick(posts) },
    { title: "Messages to people", line: "One message to one person who is asking for this. Approve opens their post so you can reply.", rows: pick(messages) },
    { title: "Articles", line: "Longer pieces for your blog or Medium. Approve copies the text.", rows: pick(articles) },
  ].filter((g) => g.rows.length);

  return (
    <div className="fx-page">
      <header className="fx-head">
        <div className="fx-head-t">
          <span className="fx-eyebrow">One inbox</span>
          <h1>{todo.length ? `${todo.length} waiting for your yes` : "Approvals"}</h1>
          <p>Every post, message and article waits here. Nothing goes out without your yes.</p>
        </div>
        <div className="fx-head-m">
          <div className="fx-head-b">
            <button className="fx-btn" disabled={!todo.length} onClick={() => todo.forEach((r, i) => setTimeout(r.approve, i * 350))}>Approve all{todo.length ? ` (${todo.length})` : ""}</button>
          </div>
        </div>
      </header>

      <div className="fx-ap-switch" role="tablist" aria-label="Show">
        <button role="tab" aria-selected={!done} className={!done ? "on" : ""} onClick={() => setDone(false)}>To do <em>{todo.length}</em></button>
        <button role="tab" aria-selected={done} className={done ? "on" : ""} onClick={() => setDone(true)}>Done <em>{all.length - todo.length}</em></button>
      </div>

      {!all.length ? (
        <Empty title="Nothing to approve yet" action={<button className="fx-btn" onClick={() => go("dashboard")}>Go to the dashboard</button>}>When the engines run, posts, messages and articles land here.</Empty>
      ) : !groups.length ? (
        <Empty title={done ? "Nothing done yet" : "All caught up"}>{done ? "What you approve or skip shows here." : "Everything waiting has been handled."}</Empty>
      ) : groups.map((g) => (
        <section key={g.title} className="fx-ap-group">
          <h2>{g.title} <span>{g.rows.length}</span></h2>
          <p>{g.line}</p>
          <ItemTable rows={g.rows} empty={null} showKind={false} />
        </section>
      ))}
    </div>
  );
}
