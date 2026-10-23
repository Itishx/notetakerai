import React, { useState } from "react";
import { PERSON_PLATFORMS, PERSON_PLATFORM_LABEL, whereOf, type PersonPlatform, type Status } from "./store";
import type { PageProps } from "./types";
import { approveArticle, approvePerson, approvePost, setPerson, setPost, setTopic } from "./actions";
import { PLATFORM_LABEL } from "./components/previews";
import { Empty, Note } from "./components/ui";
import { ItemTable, StatusTabs, type TableRow } from "./components/table";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* Approvals as one table (2026-10-23). The pill filters stacked three
   "selected" states on top of each other; now there is one filter (status)
   and a Type column you can read at a glance. */
export default function Approvals({ p, up, go }: PageProps) {
  const [status, setStatus] = useState<Status | "all">("waiting");
  // Messages can be filtered by where the person is. Posts keep their own platform.
  const [plat, setPlat] = useState<PersonPlatform | "all">("all");

  const rows: TableRow[] = [
    ...p.posts.map((x): TableRow => ({
      id: x.id, kind: "Post", site: PLATFORM_LABEL[x.platform], title: x.title || undefined, text: x.text, when: `${DAYS[x.day]} ${x.time}`,
      status: x.status, opened: x.opened,
      approve: () => approvePost(up, x), skip: () => setPost(up, x.id, { status: "skipped" }), undo: () => setPost(up, x.id, { status: "waiting" }),
      edit: (text) => setPost(up, x.id, { text }),
    })),
    ...p.people.filter((x) => x.message && (plat === "all" || (x.platform || "reddit") === plat)).map((x): TableRow => ({
      id: x.id, kind: "Message", site: whereOf(x), title: x.title, link: x.url, text: x.message,
      status: x.status,
      approve: () => approvePerson(up, x), skip: () => setPerson(up, x.id, { status: "skipped" }), undo: () => setPerson(up, x.id, { status: "waiting" }),
      edit: (message) => setPerson(up, x.id, { message }),
    })),
    ...p.memory.topics.filter((t) => t.article).map((t): TableRow => ({
      id: t.id, kind: "Article", site: "Blog or Medium", title: t.title, text: t.article || "",
      status: t.articleStatus || "waiting",
      approve: () => approveArticle(up, t), skip: () => setTopic(up, t.id, { articleStatus: "skipped" }), undo: () => setTopic(up, t.id, { articleStatus: "waiting" }),
      edit: (article) => setTopic(up, t.id, { article }),
    })),
  ];
  const counts = { waiting: 0, approved: 0, skipped: 0, all: rows.length } as Record<Status | "all", number>;
  rows.forEach((r) => { counts[r.status] += 1; });
  const shown = rows.filter((r) => status === "all" || r.status === status);

  return (
    <div className="fx-page">
      <header className="fx-head">
        <div className="fx-head-t">
          <span className="fx-eyebrow">One inbox</span>
          <h1>Approvals</h1>
          <p>Every post, message and article waits here for your yes. Nothing goes out without it.</p>
        </div>
        <div className="fx-head-m">
          <div className="fx-head-b">
            <button className="fx-btn" disabled={!counts.waiting} onClick={() => rows.filter((r) => r.status === "waiting").forEach((r, i) => setTimeout(r.approve, i * 350))}>Approve all{counts.waiting ? ` (${counts.waiting})` : ""}</button>
          </div>
        </div>
      </header>
      <Note>Approve copies the text and opens the right page with it, so you post it yourself. Articles are only copied, so you can paste them wherever you publish.</Note>
      <StatusTabs value={status} onChange={setStatus} counts={counts} />
      <div className="fx-tabs" role="tablist" aria-label="Where messages go">
        {(["all", ...PERSON_PLATFORMS] as (PersonPlatform | "all")[]).map((k) => (
          <button key={k} role="tab" aria-selected={plat === k} className={plat === k ? "on" : ""} onClick={() => setPlat(k)}>{k === "all" ? "All messages" : PERSON_PLATFORM_LABEL[k]}<em>{p.people.filter((x) => x.message && (k === "all" || (x.platform || "reddit") === k)).length}</em></button>
        ))}
      </div>
      <ItemTable
        rows={shown}
        empty={rows.length
          ? <Empty title="Nothing here">{status === "waiting" ? "Everything waiting has been handled." : "Try another tab."}</Empty>
          : <Empty title="Nothing to approve yet" action={<button className="fx-btn" onClick={() => go("dashboard")}>Go to the dashboard</button>}>When the engines run, posts, messages and articles land here.</Empty>}
      />
    </div>
  );
}
