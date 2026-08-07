import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMAND_STATUS, EI_COUNT, EI_GROUPS, FIXED_COUNT, HI_COUNT, HI_GROUPS, TESTED_COUNT, type CommandGroup } from "@/lib/testCommands";
import "./commands.css";

/* ============================================================================
   /commands — the tuning corpus, with a button on every line.

   Test it navigates to the layer's own page carrying the command in the URL,
   which auto-fills the input and runs it. Nothing is simulated here: the run
   happens on the real surface, against the real endpoint, and lands in
   /engine-log like any other. This page is a launcher, not a third lab.

   The groups are ordered so the ones designed to be FAILED come first. A
   corpus of things he already handles teaches nothing.
   ============================================================================ */

type Layer = "hi" | "ei";

export default function Commands() {
  const navigate = useNavigate();
  const [layer, setLayer] = useState<Layer>("hi");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => { document.title = "Commands — Braino"; }, []);

  const groups = layer === "hi" ? HI_GROUPS : EI_GROUPS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, commands: g.commands.filter((c) => c.toLowerCase().includes(q)) }))
      .filter((g) => g.commands.length > 0);
  }, [groups, query]);

  const shown = filtered.reduce((n, g) => n + g.commands.length, 0);

  // The whole point of the page: hand the command to the layer's own surface
  // and let it run there, so the result is a real logged run and not a copy of
  // one. preset rides along because half of what the loop must get right is
  // whether the thing is already on screen.
  const test = (command: string, group: CommandGroup) => {
    const params = new URLSearchParams({ run: command });
    if (group.preset) params.set("preset", group.preset);
    navigate(`${layer === "hi" ? "/human-intelligence" : "/emotional-intelligence"}?${params}`);
  };

  return (
    <div className="cm-page">
      <header className="cm-head">
        <div>
          <p className="cm-eyebrow">The tuning corpus</p>
          <h1 className="cm-title">Commands</h1>
          <p className="cm-sub">
            {HI_COUNT + EI_COUNT} commands to run at him, grouped by the behaviour each one probes.{" "}
            <strong>{TESTED_COUNT} run so far, {FIXED_COUNT} already fixed</strong> — open "what went wrong" on any
            marked row to see the answer that caused the change.
            Test it opens the layer's own page, fills the input, and runs it for real. Every run lands
            in the log.
          </p>
        </div>
        <Link className="cm-loglink" to="/engine-log">Run log</Link>
      </header>

      <div className="cm-controls">
        <div className="cm-layers">
          <button className={layer === "hi" ? "on" : ""} onClick={() => { setLayer("hi"); setOpenGroup(null); }}>
            Human Intelligence <span>{HI_COUNT}</span>
          </button>
          <button className={layer === "ei" ? "on" : ""} onClick={() => { setLayer("ei"); setOpenGroup(null); }}>
            Emotional Intelligence <span>{EI_COUNT}</span>
          </button>
        </div>
        <input
          className="cm-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every command..."
        />
      </div>

      <p className="cm-count">
        {shown} command{shown === 1 ? "" : "s"} in {filtered.length} group{filtered.length === 1 ? "" : "s"}
        {layer === "hi" ? " · runs in the Loop" : " · runs in Reply"}
      </p>

      <div className="cm-groups">
        {filtered.map((group) => {
          const open = openGroup === group.id || Boolean(query.trim());
          return (
            <section key={group.id} className={"cm-group" + (open ? " open" : "")}>
              <button className="cm-group-head" onClick={() => setOpenGroup(open && !query ? null : group.id)}>
                <span className="cm-group-title">{group.title}</span>
                <span className="cm-group-n">{group.commands.length}</span>
                {group.preset && group.preset !== "empty" && (
                  <span className="cm-preset">starts on {group.preset.replace("-", " ")}</span>
                )}
                <span className="cm-chev">{open ? "hide" : "show"}</span>
              </button>
              <p className="cm-why">{group.why}</p>
              {open && (
                <ul className="cm-list">
                  {group.commands.map((command) => {
                    const status = COMMAND_STATUS[command];
                    return (
                      <li key={command} className={`cm-row${status ? " is-tested" : ""}`}>
                        <span className="cm-text">{command}</span>
                        {status && (
                          <span className={`cm-badge${status.fixed ? " is-fixed" : ""}`}>
                            {status.fixed ? "tested · fixed" : "tested"}
                          </span>
                        )}
                        <button className="cm-test" onClick={() => test(command, group)}>Test it</button>
                        {status && (
                          <details className="cm-diff">
                            <summary>what went wrong</summary>
                            <p className="cm-diff-label">He said</p>
                            <pre className="cm-diff-before">{status.before}</pre>
                            <p className="cm-diff-label">You said</p>
                            <p className="cm-diff-note">{status.feedback}</p>
                            {status.change && (<>
                              <p className="cm-diff-label">{status.fixed ? "What changed" : "Not changed yet"}</p>
                              <p className="cm-diff-note">{status.change}</p>
                            </>)}
                            {status.after && (<>
                              <p className="cm-diff-label">He says now</p>
                              <pre className="cm-diff-after">{status.after}</pre>
                            </>)}
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <footer className="cm-foot">
        <Link className="cm-link" to="/human-intelligence">Human Intelligence</Link>
        <Link className="cm-link" to="/emotional-intelligence">Emotional Intelligence</Link>
        <Link className="cm-link" to="/engine-log">Run log</Link>
      </footer>
    </div>
  );
}
