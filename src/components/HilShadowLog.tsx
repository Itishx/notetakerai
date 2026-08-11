// HilShadowLog — the whole shadow stage on one screen.
//
// While the router decides nothing, exactly one question matters: for each thing
// that was said, what did Braino do, and what would HIL have done instead. So
// that is the entire page. Two columns, one row per sentence, and a count at the
// top. Everything that does not answer that question was left out on purpose.
//
// The rows come from the router's own engine_runs entries, which carry both
// answers because the Mac sends the cascade's outcome along with the command.

import { useMemo } from "react";

export type ShadowRun = {
  id: string;
  created_at: string;
  engine: string;
  command: string;
  response: unknown;
  elapsed_ms: number | null;
  error: string | null;
};

type Shadow = {
  verdict?: { v?: string; t?: string; a?: Record<string, unknown>; why?: string; q?: string };
  cascade?: { source?: string; ok?: boolean; said?: string } | null;
};

// `cascade` is the half only the Mac app can supply: it is what Braino actually
// did, sent along after the command finished. A row without it was not a real
// interaction, it was something poking the endpoint directly — a curl during
// development, or anything else on the internet, since the function is public.
// Requiring it is what keeps this page a record of things the user genuinely
// said rather than a mix of that and test traffic.
function shadowOf(row: ShadowRun): Shadow | null {
  const r = row.response as Shadow | null;
  if (!r || typeof r !== "object" || !r.verdict) return null;
  return r.cascade && typeof r.cascade === "object" ? r : null;
}

// The cascade's `source` is an internal label. These are the only values that
// mean something to a person, and the rest read fine as "handled it".
const SOURCE_LABEL: Record<string, string> = {
  hil_loop: "gave up and started thinking step by step",
  mac_conversation: "just chatted back",
  web_search: "searched the web",
};

// The `rejected` string is written for a log query, not for a person: "irreversible
// rewrite_selection" is precise and means nothing at a glance. These say the same
// thing in the terms someone reading the page actually has.
function readableBlock(reason: string): string {
  const r = reason.trim();
  if (r.startsWith("irreversible")) return "wouldn't risk it, this one can't be undone";
  if (r.startsWith("unknown tool")) return "reached for something that doesn't exist";
  if (r === "unparseable" || r.startsWith("bad verdict")) return "answered in a way Braino couldn't read";
  if (r.startsWith("ask with no")) return "wanted to ask you something but didn't say what";
  return r;
}

/** A tool name and its arguments, as a sentence. The catalog lives on the server
 *  so this cannot look up a gloss; the name is written to read well unhyphenated
 *  and the arguments carry the specifics. */
function readableTool(tool: string, args?: Record<string, unknown>): string {
  const name = tool.replace(/_/g, " ");
  const values = Object.values(args || {})
    .filter((v) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .map((v) => (typeof v === "boolean" ? "" : String(v)))
    .filter(Boolean);
  return values.length ? `${name} — ${values.join(", ")}` : name;
}

function verdictLine(s: Shadow): { text: string; kind: "fire" | "think" | "ask" | "talk" } {
  const v = s.verdict || {};
  if (v.v === "fire" && v.t) return { text: readableTool(v.t, v.a), kind: "fire" };
  if (v.v === "ask") return { text: v.q || "would have asked you something first", kind: "ask" };
  if (v.v === "say") return { text: "would have just talked, no task here", kind: "talk" };
  return { text: v.why || "too big for one move, would have thought it through", kind: "think" };
}

function when(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HilShadowLog({ rows, loading }: { rows: ShadowRun[]; loading: boolean }) {
  const items = useMemo(
    () =>
      rows
        .filter((r) => r.engine === "hil-router")
        .map((r) => ({ row: r, s: shadowOf(r) }))
        .filter((x): x is { row: ShadowRun; s: Shadow } => Boolean(x.s)),
    [rows],
  );

  const totals = useMemo(() => {
    // "Braino had no answer" is the number this whole stage exists to produce:
    // those are the sentences already being handled badly, so they are where HIL
    // is allowed to decide first.
    const stuck = items.filter((x) => {
      const src = String(x.s.cascade?.source || "");
      return src === "hil_loop" || src === "web_search";
    }).length;
    const couldDo = items.filter((x) => x.s.verdict?.v === "fire").length;
    const times = items.map((x) => x.row.elapsed_ms || 0).filter(Boolean).sort((a, b) => a - b);
    return {
      total: items.length,
      stuck,
      couldDo,
      typical: times.length ? times[Math.floor(times.length / 2)] : null,
    };
  }, [items]);

  if (!loading && !items.length) {
    return (
      <div className="hs-empty">
        <h2>Nothing watched yet</h2>
        <p>
          Restart the Mac app, then talk to Braino like you normally would. Every single thing you say will show up
          here, with what Braino did and what HIL would have done instead.
        </p>
        <p className="hs-empty-note">HIL is not touching anything. It is only writing things down.</p>
      </div>
    );
  }

  return (
    <div className="hs">
      <div className="hs-top">
        <div className="hs-big">
          <span className="hs-big-n">{totals.total}</span>
          <span className="hs-big-l">things you said</span>
        </div>
        <div className="hs-big">
          <span className="hs-big-n">{totals.couldDo}</span>
          <span className="hs-big-l">HIL could do straight away</span>
        </div>
        <div className={"hs-big" + (totals.stuck ? " hs-hot" : "")}>
          <span className="hs-big-n">{totals.stuck}</span>
          <span className="hs-big-l">Braino had no answer for</span>
        </div>
        <div className="hs-big">
          <span className="hs-big-n">{totals.typical ? `${(totals.typical / 1000).toFixed(1)}s` : "—"}</span>
          <span className="hs-big-l">HIL takes to decide</span>
        </div>
      </div>

      <div className="hs-legend">
        <span className="hs-dot hs-dot-braino" /> what Braino actually did
        <span className="hs-legend-gap" />
        <span className="hs-dot hs-dot-hil" /> what HIL would have done
      </div>

      <ol className="hs-list">
        {items.map(({ row, s }) => {
          const v = verdictLine(s);
          const src = String(s.cascade?.source || "");
          const said = String(s.cascade?.said || "").trim();
          const stuck = src === "hil_loop" || src === "web_search";
          return (
            <li key={row.id} className={"hs-item" + (stuck ? " hs-item-hot" : "")}>
              <div className="hs-said">
                <span className="hs-said-label">You said</span>
                <p className="hs-said-text">{row.command}</p>
                <span className="hs-when">{when(row.created_at)}</span>
              </div>
              <div className="hs-cols">
                <div className="hs-col hs-col-braino">
                  <span className="hs-col-label">Braino did</span>
                  <p className="hs-col-text">{said || SOURCE_LABEL[src] || "handled it"}</p>
                  {said && SOURCE_LABEL[src] && <span className="hs-col-sub">{SOURCE_LABEL[src]}</span>}
                </div>
                <div className={`hs-col hs-col-hil hs-kind-${v.kind}`}>
                  <span className="hs-col-label">HIL would have</span>
                  <p className="hs-col-text">{v.text}</p>
                  {row.error && <span className="hs-col-sub hs-blocked">{readableBlock(row.error)}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
