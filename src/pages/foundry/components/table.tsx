import React, { useState } from "react";
import type { Status } from "../store";
import { Chip } from "./ui";

/* A calm table, Notion style (2026-10-23). Approvals as a wall of filter pills
   and cards was "heavy on the eyes": Me, All and Waiting all looked selected at
   once. One row per item, the text readable in place, one filter on top. */

export type TableRow = {
  id: string;
  kind: string;          // Post, Message, Article
  site: string;          // X, LinkedIn, Reddit, Blog
  title?: string;        // a short line above the text, when there is one
  text: string;          // the words that go out
  when?: string;         // when to post it
  status: Status;
  opened?: boolean;
  link?: string;         // where it came from (a Reddit thread)
  approve: () => void;
  skip?: () => void;
  undo?: () => void;
  edit?: (text: string) => void;
};

export function ItemTable({ rows, showKind = true, empty }: { rows: TableRow[]; showKind?: boolean; empty: React.ReactNode }) {
  const [open, setOpen] = useState<string>("");
  const [editing, setEditing] = useState<string>("");
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="fx-table" role="table">
      <div className={`fx-tr fx-th ${showKind ? "" : "nokind"}`} role="row">
        {showKind && <span role="columnheader">Type</span>}
        <span role="columnheader">Where</span>
        <span role="columnheader">What it says</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="fx-td-a">Action</span>
      </div>
      {rows.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className={`fx-tr ${showKind ? "" : "nokind"} ${r.status}`} role="row">
            {showKind && <span className="fx-td-k" role="cell">{r.kind}</span>}
            <span className="fx-td-s" role="cell"><b>{r.site}</b>{r.when && <small>{r.when}</small>}</span>
            <div className="fx-td-t" role="cell">
              {r.title && <b className="fx-td-title">{r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}</b>}
              {editing === r.id && r.edit ? (
                <textarea className="fx-td-edit" rows={8} value={r.text} onChange={(e) => r.edit!(e.target.value)} />
              ) : (
                <p className={isOpen ? "open" : ""}>{r.text}</p>
              )}
              <span className="fx-td-more">
                {r.text.length > 220 && editing !== r.id && <button className="fx-link" onClick={() => setOpen(isOpen ? "" : r.id)}>{isOpen ? "Show less" : "Read all"}</button>}
                {r.edit && r.status !== "approved" && <button className="fx-link" onClick={() => setEditing(editing === r.id ? "" : r.id)}>{editing === r.id ? "Done editing" : "Edit"}</button>}
              </span>
            </div>
            <span className="fx-td-st" role="cell"><Chip status={r.status} opened={r.opened} /></span>
            <span className="fx-td-a" role="cell">
              {r.status === "approved" ? (
                <button className="fx-ghost sm" onClick={r.approve}>Copy again</button>
              ) : (
                <>
                  <button className="fx-btn sm" onClick={() => { setEditing(""); r.approve(); }}>Approve</button>
                  {r.status === "skipped"
                    ? r.undo && <button className="fx-link" onClick={r.undo}>Undo</button>
                    : r.skip && <button className="fx-link" onClick={r.skip}>Skip</button>}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* One filter, one row of tabs: what is selected is never in doubt. */
export function StatusTabs({ value, onChange, counts }: { value: Status | "all"; onChange: (v: Status | "all") => void; counts: Record<Status | "all", number> }) {
  const tabs: [Status | "all", string][] = [["waiting", "Waiting"], ["approved", "Approved"], ["skipped", "Skipped"], ["all", "All"]];
  return (
    <div className="fx-tabs" role="tablist" aria-label="Status">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{l}<em>{counts[k]}</em></button>
      ))}
    </div>
  );
}
