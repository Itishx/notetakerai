import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import "./affective.css";
import "./trace.css";

/* ============================================================================
   /trace — how a command is understood, step by step (2026-10-03).

   Talks to the Mac app's trace endpoint on 127.0.0.1:47824 (main.cjs,
   startTraceServer). "Show me" runs the real chain on the real screen and does
   nothing: Laya, the quick shortcuts, the HIL router, HIL's first thinking
   turn, each with its time. "Run it for real" hands the command to Braino and
   streams every step he takes, live. Only works on this Mac, from localhost.
   ============================================================================ */

const API = "http://127.0.0.1:47824";

type Stage = Record<string, any> & { name: string; ms: number };
type Think = { command: string; totalMs: number; stages: Stage[]; working: string; end: null | { totalMs?: number; path?: string; note?: string; error?: string }; error?: string };
type RunEvent = { kind: string; t: number; tag?: string; text?: string; event?: string; payload?: any; ok?: boolean; say?: string; source?: string };

const KIND_LABEL: Record<string, string> = { chat: "Just talking", one_tool: "One action", multi_step: "Several steps", ask: "Unclear, ask again", ignore: "Not for him" };
const STAGE_TITLE: Record<string, string> = { context: "Fills in what you meant", shortcuts: "Quick checks, in the real order", laya: "Laya sorts it", router: "HIL router, first call", hil: "HIL thinks it through" };
const STAGE_COLOR: Record<string, string> = { context: "#7a8a4a", shortcuts: "#b8842a", laya: "#d9645b", router: "#3b7dd8", hil: "#6a4cd8" };

function ms(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`; }

function Card({ s }: { s: Stage }) {
  const color = STAGE_COLOR[s.name] || "#888";
  return (
    <li className="tr-card" style={{ ["--c" as string]: color }}>
      <div className="tr-card-head"><span className="tr-dot" /><h3>{STAGE_TITLE[s.name] || s.name}</h3><span className="tr-ms">{ms(s.ms)}</span></div>
      {s.name === "context" && <div className="tr-body"><p>“{s.from}” becomes <b>“{s.to}”</b></p></div>}
      {s.name === "laya" && (s.offline ? <p className="tr-muted">{s.why || "Laya did not answer"}, so the real run goes on without it.</p> : (
        <div className="tr-body">
          <p><b>{KIND_LABEL[s.kind] || s.kind}</b> <span className="tr-muted">({s.kind})</span></p>
          <div className="tr-bar"><i style={{ width: `${Math.round((s.confidence || 0) * 100)}%` }} /></div>
          <p className="tr-muted">{Math.round((s.confidence || 0) * 100)}% sure, decided in {ms(s.modelMs || 0)} on the Mac. Route: <b>{s.route === "normal" ? "goes on normally" : s.route === "plan" ? "straight to a plan" : s.route === "ask" ? "asks you again" : s.route}</b></p>
          {s.realSkips && <p className="tr-warn">In the real run Laya is skipped here: {s.why}.</p>}
        </div>
      ))}
      {s.name === "shortcuts" && (
        <div className="tr-body">
          {s.takenBy
            ? <><p><b>Taken by {s.takenBy}</b>: {s.what}</p><p className="tr-muted">Check {s.checked} of {s.of}, in {ms(s.ms)}. The real run stops here; no model is asked.</p></>
            : <p>All {s.of} checks passed it on in {ms(s.ms)}, so it goes to the thinking layer.</p>}
        </div>
      )}
      {s.name === "router" && (s.offline ? <p className="tr-muted">The router did not answer.</p> : (
        <div className="tr-body">
          <p><b>{s.decision === "fire" ? "Fire a tool right away" : s.decision === "loop" ? "Hand it to the step-by-step loop" : s.decision === "ask" ? "Ask a question first" : s.decision === "chat" ? "Just answer" : s.decision}</b>{s.tool ? <> with <code>{s.tool}</code></> : null}</p>
          {s.args && Object.keys(s.args).length > 0 && <pre className="tr-pre">{JSON.stringify(s.args, null, 1)}</pre>}
          {s.question && <p className="tr-say">“{s.question}”</p>}
          {s.why && <p className="tr-muted">{s.why}</p>}
        </div>
      ))}
      {s.name === "hil" && (
        <div className="tr-body">
          <p className="tr-muted">Looked at your screen in {ms(s.observeMs || 0)}: {s.screen?.app || "unknown app"}, {s.screen?.elements || 0} things it can act on{s.screen?.url ? `, ${s.screen.url}` : ""}.</p>
          {s.thinking && <p className="tr-think">{s.thinking}</p>}
          {s.goal && <p><span className="tr-k">Goal</span>{s.goal}</p>}
          {s.plan?.length > 0 && <ol className="tr-plan">{s.plan.map((m: string, i: number) => <li key={i}>{m}</li>)}</ol>}
          <p>
            <span className="tr-k">Decides</span><b>{s.decision === "step" ? "Take a step" : s.decision === "answer" ? "Answer you" : s.decision === "ask" ? "Ask you" : s.decision || "nothing"}</b>
            {s.action && <> · <code>{s.action.type === "tool" ? s.action.tool : s.action.type}{s.action.index != null ? ` [${s.action.index}]` : ""}{s.action.url ? ` ${s.action.url}` : ""}</code></>}
            {s.gated && <span className="tr-gate">would ask you first</span>}
          </p>
          {s.intent && <p className="tr-muted">{s.intent}</p>}
          {s.says && <p className="tr-say">“{s.says}”</p>}
          {s.parse && <p className="tr-warn">The reply came back unreadable: {s.parse.failure}</p>}
          <div className="tr-split">
            <span className="tr-k">Where the {ms(s.ms + (s.observeMs || 0))} went</span>
            <span><i style={{ background: "#7a8a4a" }} />reading your screen {ms(s.observeMs || 0)}</span>
            <span><i style={{ background: "#b8842a" }} />server loading memory and lessons {ms(s.prepMs || 0)}</span>
            <span><i style={{ background: "#6a4cd8" }} />{s.model || "the model"} thinking {ms(s.modelMs || 0)}</span>
            <span><i style={{ background: "#999" }} />network there and back {ms(Math.max(0, s.ms - (s.prepMs || 0) - (s.modelMs || 0)))}</span>
          </div>
        </div>
      )}
    </li>
  );
}

function Timing({ t }: { t: Think }) {
  const total = Math.max(1, t.stages.reduce((n, s) => n + s.ms, 0));
  return (
    <div className="tr-timing">
      <div className="tr-stack">{t.stages.map((s) => <i key={s.name} title={`${STAGE_TITLE[s.name]}: ${ms(s.ms)}`} style={{ width: `${(s.ms / total) * 100}%`, background: STAGE_COLOR[s.name] }} />)}</div>
      <div className="tr-legend">{t.stages.map((s) => <span key={s.name}><i style={{ background: STAGE_COLOR[s.name] }} />{STAGE_TITLE[s.name]} {ms(s.ms)}</span>)}</div>
      <p className="tr-muted">All of it took {ms(t.totalMs)}. In a real run the router and the thinking turn are the slow parts; the Mac parts are milliseconds.</p>
    </div>
  );
}

/* ── The machine, drawn: every part of Braino in the order a command meets
   them. While a command flows, the part working now pulses with a live clock,
   parts it passed fill in with their time, the part that takes it glows, and
   parts it never reached go grey. Show me and Run it for real drive the same
   map: Show me from its stages, the real run from the real step lines. */
const PARTS = [
  { id: "you", label: "You said it" },
  { id: "context", label: "Fill in it / that" },
  { id: "shortcuts", label: "Quick checks" },
  { id: "laya", label: "Laya" },
  { id: "router", label: "HIL router" },
  { id: "hil", label: "HIL loop" },
  { id: "hands", label: "Hands" },
  { id: "done", label: "Done" },
] as const;
type PartState = { state: "idle" | "now" | "passed" | "took" | "skipped"; ms?: number; note?: string };
const CHECK_NAMES = ["memory view", "small talk", "battery", "chrome profile", "type and search", "instant controls", "localhost", "tab switch", "forms", "spoken web address", "old fast path", "stop words", "close all tabs", "one word", "send a page link", "recipe", "learned skill", "shortcut", "timetable"];

function mapFromThink(t: Think, nowMs: number): Record<string, PartState> {
  const m: Record<string, PartState> = { you: { state: "passed", ms: 0 } };
  const order: string[] = PARTS.map((p) => p.id);
  let last = "you";
  for (const st of t.stages) {
    m[st.name] = { state: "passed", ms: st.ms };
    if (st.name === "shortcuts" && st.takenBy) m.shortcuts = { state: "took", ms: st.ms, note: st.takenBy };
    if (st.name === "laya" && (st.offline || st.realSkips)) m.laya = { state: "skipped", ms: st.ms, note: "skipped in the real run" };
    if (st.name === "router" && st.decision) m.router = { state: st.decision === "loop" ? "passed" : "took", ms: st.ms, note: st.decision === "fire" ? st.tool : st.decision };
    if (st.name === "hil") m.hil = { state: "took", ms: st.ms, note: st.decision };
    last = st.name;
  }
  if (t.working) m[t.working] = { state: "now", ms: nowMs };
  if (t.end) {
    const reached = order.indexOf(t.working || last);
    for (const id of order) if (!m[id]) m[id] = { state: order.indexOf(id) > reached ? "skipped" : "idle" };
    if (t.end.path?.startsWith("fires")) m.hands = { state: "took", note: "would fire the tool" };
    m.done = { state: "passed", ms: t.totalMs, note: "would happen here" };
  }
  if (!m.context && t.stages.some((s) => s.name === "shortcuts")) m.context = { state: "skipped", note: "nothing to fill in" };
  return m;
}

function mapFromRun(events: RunEvent[], nowMs: number, running: boolean): Record<string, PartState> {
  const m: Record<string, PartState> = { you: { state: "passed", ms: 0 } };
  let current = "";
  const touch = (id: string, t: number, note?: string, took = false) => {
    if (current && current !== id && m[current]?.state === "now") m[current] = { ...m[current], state: "passed" };
    m[id] = { state: took ? "took" : "now", ms: t, note: note || m[id]?.note };
    current = id;
  };
  for (const e of events) {
    const tag = String(e.tag || ""); const ev = String(e.event || "");
    if (/CONTEXT|context_resolved/i.test(tag + ev)) touch("context", e.t);
    else if (/SHORTCUT|INSTANT|ONE WORD|instant_fire|STOP/i.test(tag + ev)) touch("shortcuts", e.t, tag.replace(/[^\w ]/g, "").trim() || ev, true);
    else if (/LAYA/i.test(tag) || ev === "laya.kind") touch("laya", e.t, e.payload?.kind || undefined);
    else if (/HIL-FIRST|router/i.test(tag + ev)) touch("router", e.t);
    else if (/HIL-LOOP|hil\.loop|PLAN|STEP|RUN|FAST/i.test(tag + ev)) touch("hil", e.t);
    else if (/^(?:app\.|file\.|whatsapp\.|contacts\.|google_doc|tool\.|dev_servers|plan\.ran)/.test(ev)) touch("hands", e.t, ev.split(".")[0]);
    else if (e.kind === "done") { if (current && m[current]?.state === "now") m[current].state = "passed"; m.done = { state: e.ok ? "took" : "skipped", ms: e.t, note: e.ok ? "finished" : "did not finish" }; current = ""; }
  }
  if (running && current && m[current]) m[current] = { ...m[current], state: "now", ms: nowMs };
  return m;
}

function ArchMap({ parts, checksLit }: { parts: Record<string, PartState>; checksLit?: { upTo: number; took: boolean } }) {
  return (
    <div className="tr-map" role="img" aria-label="How the command moves through Braino">
      {PARTS.map((p, i) => {
        const st = parts[p.id] || { state: "idle" };
        return (
          <div key={p.id} className={`tr-node is-${st.state}`}>
            {i > 0 && <span className="tr-wire" />}
            <div className="tr-node-box">
              <span className="tr-node-label">{p.label}</span>
              {p.id === "shortcuts" && (
                <span className="tr-checks">{CHECK_NAMES.map((c, k) => <i key={c} title={c} className={checksLit && k < checksLit.upTo ? (checksLit.took && k === checksLit.upTo - 1 ? "took" : "passed") : ""} />)}</span>
              )}
              <span className="tr-node-ms">{st.ms != null && st.state !== "idle" ? ms(st.ms) : ""}</span>
              {st.note && <span className="tr-node-note">{st.note}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* The real run, drawn top to bottom: each box is one thing that happened,
   in order, with its time. Built only from the events the Mac sends while it
   works, so it shows exactly the path the command took. */
type Box = { id: string; part: string; title: string; detail?: string; sub?: string; ms?: number; ok?: boolean; at: number };
function runBoxes(events: RunEvent[]): Box[] {
  const out: Box[] = [];
  const push = (b: Box) => out.push(b);
  for (const e of events) {
    const p = e.payload || {}; const ev = String(e.event || ""); const tag = String(e.tag || "");
    if (e.kind === "start") push({ id: "start", part: "you", title: "You said it", detail: `“${(e as any).command || ""}”`, at: e.t });
    else if (e.kind === "trace" && /SHORTCUT|INSTANT|ONE WORD|STOP|MODE/.test(tag)) push({ id: `sc${e.t}`, part: "shortcuts", title: "A quick rule took it", detail: e.text, sub: "no model needed", at: e.t });
    else if (e.kind === "trace" && /CONTEXT/.test(tag)) push({ id: `cx${e.t}`, part: "context", title: "Filled in what you meant", detail: e.text, at: e.t });
    else if (ev === "laya.kind") push({ id: `ly${e.t}`, part: "laya", title: `Laya: ${KIND_LABEL[p.kind] || p.kind}`, detail: `${Math.round((p.confidence || 0) * 100)}% sure`, sub: p.route === "plan" ? "sends it straight to a plan" : p.route === "ask" ? "asks you again" : "passes it on", ms: p.ms, at: e.t });
    else if (ev === "hil.first") push({ id: `rt${e.t}`, part: "router", title: `HIL router: ${p.kind === "fire" ? `fire ${p.tool}` : p.kind === "loop" ? "hand it to the loop" : p.kind}`, detail: p.why || "", ms: p.ms, at: e.t });
    else if (ev === "plan.ran") push({ id: `pl${e.t}`, part: "hands", title: "Ran the plan", detail: Array.isArray(p.steps) ? p.steps.join("  >  ") : "", ms: p.ms, ok: true, at: e.t });
    else if (ev === "hil.loop.start") push({ id: `ls${e.t}`, part: "hil", title: "The step-by-step loop starts", detail: p.fast ? "long-job mode" : "", at: e.t });
    else if (ev === "hil.loop.turn") push({ id: `t${p.step}-${e.t}`, part: "hil", title: `Turn ${p.step}: ${p.decision === "step" ? "decides a step" : p.decision === "answer" ? "answers" : p.decision === "ask" ? "asks you" : p.decision === "all_done" || p.decision === "task_done" ? "says it is done" : p.decision || "thinks"}`, detail: p.thinking || p.says || "", sub: `server ${ms(p.prepMs || 0)} + model ${ms(p.modelMs || 0)}`, ms: p.ms, at: e.t });
    else if (ev === "hil.loop.acted") push({ id: `a${p.step}-${e.t}`, part: "hands", title: `Hands: ${p.tool || p.action}${p.target ? ` "${p.target}"` : ""}`, detail: p.ok ? p.intent : `failed: ${p.error}`, ms: p.handsMs, ok: p.ok, at: e.t });
    else if (ev === "hil.tool.done") push({ id: `tl${e.t}`, part: "hands", title: `Tool ${p.tool}`, ok: p.ok, at: e.t });
    else if (ev === "hil.page_read" || ev === "hil.observed") { const last = out[out.length - 1]; if (last?.part !== "look") push({ id: `lk${e.t}`, part: "look", title: "Looked at the screen again", detail: `${p.app || ""}${p.elements != null ? `, ${p.elements} things it can act on` : ""}`, at: e.t }); }
    else if (ev === "hil.loop.speed") push({ id: `sp${e.t}`, part: "hil", title: "Loop finished", detail: `${p.turns} turns, thinking ${ms(p.thinkMs || 0)} of ${ms(p.totalMs || 0)}`, at: e.t });
    else if (e.kind === "done") push({ id: "done", part: "done", title: e.ok ? "Done" : "Did not finish", detail: e.say ? `“${e.say}”` : "", sub: e.source ? `via ${e.source}` : "", ok: e.ok, ms: e.t, at: e.t });
  }
  return out;
}

function RunFlow({ events, running, nowMs }: { events: RunEvent[]; running: boolean; nowMs: number }) {
  const boxes = runBoxes(events);
  return (
    <ol className="tr-flowv">
      {boxes.map((b, i) => {
        const live = running && i === boxes.length - 1 && b.part !== "done";
        return (
          <li key={b.id} className={`tr-fbox part-${b.part}${live ? " is-live" : ""}${b.ok === false ? " is-bad" : ""}`} style={{ ["--c" as string]: STAGE_COLOR[b.part] || (b.part === "hands" ? "#2f8f5b" : b.part === "look" ? "#7a8a4a" : b.part === "done" ? "#111" : "#888") }}>
            <span className="tr-fbox-t">+{ms(b.at)}</span>
            <div className="tr-fbox-body">
              <div className="tr-fbox-head"><b>{b.title}</b>{b.ms != null && <span className="tr-ms">{ms(b.ms)}</span>}{b.ok === true && <span className="tr-ok">worked</span>}{live && <span className="tr-ms">running {ms(nowMs - b.at)}</span>}</div>
              {b.detail && <p>{b.detail}</p>}
              {b.sub && <p className="tr-muted">{b.sub}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function runLine(e: RunEvent) {
  if (e.kind === "trace") return { who: e.tag || "", what: e.text || "" };
  if (e.kind === "event") {
    const p = e.payload || {};
    const bits = ["kind", "confidence", "route", "tool", "steps", "name", "recipient", "query", "verdict", "goal", "responded"].filter((k) => p[k] !== undefined && p[k] !== "").map((k) => `${k}: ${Array.isArray(p[k]) ? p[k].join(" > ") : typeof p[k] === "number" ? p[k] : String(p[k]).slice(0, 80)}`);
    return { who: e.event || "", what: bits.join(" · ") };
  }
  return { who: e.kind, what: e.say || "" };
}

export default function Trace() {
  const { theme, toggle } = useAffTheme();
  const [command, setCommand] = useState("");
  const [mac, setMac] = useState<"checking" | "on" | "off">("checking");
  const [think, setThink] = useState<Think | null>(null);
  const [busy, setBusy] = useState<"" | "think" | "run">("");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [confirmRun, setConfirmRun] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [, setTick] = useState(0);
  // A running clock on the step in progress, so the wait itself is visible.
  useEffect(() => { if (!busy) return; const id = window.setInterval(() => setTick((n) => n + 1), 100); return () => window.clearInterval(id); }, [busy]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Trace · Braino";
    fetch(`${API}/trace`).then((r) => r.ok ? setMac("on") : setMac("off")).catch(() => setMac("off"));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [events.length]);

  const showMe = async () => {
    if (!command.trim() || busy) return;
    setBusy("think"); setEvents([]);
    setThink({ command, totalMs: 0, stages: [], working: "", end: null });
    const t0 = performance.now(); setStartedAt(t0);
    try {
      const r = await fetch(`${API}/trace/think`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
      if (!r.body) throw new Error("no stream");
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines.filter(Boolean)) {
          let e: any; try { e = JSON.parse(line); } catch { continue; }
          setThink((cur) => {
            if (!cur) return cur;
            if (e.kind === "working") return { ...cur, working: e.name };
            if (e.kind === "stage") return { ...cur, working: "", stages: [...cur.stages, e as Stage] };
            if (e.kind === "end") return { ...cur, working: "", end: e, totalMs: e.totalMs || 0 };
            return cur;
          });
        }
      }
    } catch { setMac("off"); }
    setBusy("");
  };

  const runIt = async () => {
    if (!command.trim() || busy) return;
    setConfirmRun(false); setBusy("run"); setEvents([]); setThink(null); setStartedAt(performance.now());
    try {
      const r = await fetch(`${API}/trace/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
      if (!r.body) throw new Error("no stream");
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        const parsed = lines.filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as RunEvent[];
        if (parsed.length) setEvents((cur) => [...cur, ...parsed]);
      }
    } catch { setMac("off"); }
    setBusy("");
  };

  const done = events.find((e) => e.kind === "done");

  return (
    <div className="aff tr" data-theme={theme}>
      <nav className="aff-nav"><div className="aff-nav-in">
        <Link to="/" className="aff-logo" aria-label="Affective"><img src="/affective-logo.png" alt="Affective" width={1000} height={207} /></Link>
        <div className="aff-nav-links"><span className={`tr-mac is-${mac}`}><i />{mac === "on" ? "Braino Mac connected" : mac === "off" ? "Braino Mac not running" : "Looking for Braino Mac"}</span><AffThemeToggle theme={theme} onToggle={toggle} /></div>
      </div></nav>

      <main className="aff-wrap tr-main">
        <p className="ah-kicker">Trace</p>
        <h1 className="tr-h1">How Braino understands a command.</h1>
        <p className="tr-lede">Type what you would say to him. <b>Show me</b> runs the real thinking on your real screen and does nothing. <b>Run it for real</b> lets him actually do it, and shows every step as it happens.</p>

        <div className="tr-input">
          <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void showMe(); }} placeholder="Send hi to Riya on WhatsApp" aria-label="Command" />
          <button className="aff-cta" onClick={() => void showMe()} disabled={!command.trim() || !!busy || mac !== "on"}>{busy === "think" ? "Thinking…" : "Show me"}</button>
          {!confirmRun
            ? <button className="aff-cta aff-cta-ghost" onClick={() => setConfirmRun(true)} disabled={!command.trim() || !!busy || mac !== "on"}>{busy === "run" ? "Running…" : "Run it for real"}</button>
            : <button className="aff-cta tr-danger" onClick={() => void runIt()}>Yes, really do it</button>}
        </div>
        {confirmRun && <p className="tr-warn tr-confirm">This will actually happen on your Mac: apps open, messages send. Press again to go, or change the command to cancel.</p>}
        {mac === "off" && <p className="tr-muted">Start the Mac app (npm run mac:fast) and reload this page. It only works on the Mac Braino is running on.</p>}

        {think && !think.error && events.length === 0 && (() => {
          const sc = think.stages.find((st) => st.name === "shortcuts");
          const elapsed = performance.now() - startedAt - think.stages.reduce((n, st) => n + st.ms, 0);
          return <ArchMap parts={mapFromThink(think, Math.max(0, elapsed))} checksLit={sc ? { upTo: sc.checked || CHECK_NAMES.length, took: Boolean(sc.takenBy) } : think.working === "shortcuts" ? { upTo: 0, took: false } : undefined} />;
        })()}
        {events.length > 0 && <ArchMap parts={mapFromRun(events, performance.now() - startedAt, busy === "run")} />}
        {think && !think.error && (
          <section className="tr-flow">
            <div className="tr-said"><span className="tr-k">You said</span>“{think.command}”</div>
            <ol className="tr-cards">
              {think.stages.map((s) => <Card key={s.name} s={s} />)}
              {think.working && (
                <li className="tr-card tr-working" style={{ ["--c" as string]: STAGE_COLOR[think.working] || "#888" }}>
                  <div className="tr-card-head"><span className="tr-dot" /><h3>{STAGE_TITLE[think.working] || think.working}</h3><span className="tr-ms">{ms(performance.now() - startedAt - think.stages.reduce((n, st) => n + st.ms, 0))}</span></div>
                  <p className="tr-muted">working on it now…</p>
                </li>
              )}
            </ol>
            {think.end && (
              <div className="tr-end"><span className="tr-k">Real path</span><b>{think.end.path || think.end.error}</b>{think.end.note ? <p className="tr-muted">{think.end.note}</p> : null}</div>
            )}
            {think.end && think.stages.length > 0 && <Timing t={think} />}
          </section>
        )}
        {think?.error && <p className="tr-warn">{think.error}</p>}

        {events.length > 0 && (
          <section className="tr-run">
            <h2>Live, as he does it</h2>
            <RunFlow events={events} running={busy === "run"} nowMs={performance.now() - startedAt} />
            <details className="tr-raw"><summary>Every line, as it came in</summary>
            <ol className="tr-timeline">
              {events.filter((e) => e.kind !== "done").map((e, i) => {
                const l = runLine(e);
                return <li key={i} className={`is-${e.kind}`}><span className="tr-t">+{ms(e.t)}</span><span className="tr-who">{l.who}</span><span className="tr-what">{l.what}</span></li>;
              })}
            </ol>
            </details>
            {done && <div className={`tr-result ${done.ok ? "is-ok" : "is-bad"}`}><span className="tr-k">{done.ok ? "Finished" : "Did not finish"} in {ms(done.t)}</span>{done.say ? `“${done.say}”` : "(nothing said)"}{done.source ? <span className="tr-muted"> · via {done.source}</span> : null}</div>}
            <div ref={endRef} />
          </section>
        )}
      </main>
    </div>
  );
}
