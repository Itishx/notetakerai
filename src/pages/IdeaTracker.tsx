import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './idea-tracker.css';

// ─── Braino mascot (self-contained gradients) ────────────────────────────────
function BrainSvg({ size = 44 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="it-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="it-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" /><stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <radialGradient id="it-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7, -3.7)" />
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#it-dark)" />
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#it-dark)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#it-fill)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#it-glow)" />
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#it-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="6" cy="63" r="5.5" fill="url(#it-fill)" />
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#it-fill)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="94" cy="63" r="5.5" fill="url(#it-fill)" />
      <circle cx="38" cy="48" r="6.5" fill="white" /><circle cx="38" cy="48" r="3.2" fill="#1B1713" /><circle cx="39" cy="46.6" r="1.1" fill="white" />
      <circle cx="62" cy="48" r="6.5" fill="white" /><circle cx="62" cy="48" r="3.2" fill="#1B1713" /><circle cx="63" cy="46.6" r="1.1" fill="white" />
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" /><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Scroll reveal ───────────────────────────────────────────────────────────
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.08) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('it-visible'); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

// ─── Data — this is the database. Append here (or let Idea Mode do it). ──────

type TodoState = 'todo' | 'doing' | 'done';
type Todo = { state: TodoState; tag: string; critical?: boolean; text: string; note?: string };

const HOMEWORK: Todo[] = [
  {
    state: 'todo', tag: 'Money', critical: true,
    text: 'Lifetime Founder Edition — $50, first 10 people, sent to the waitlist',
    note: 'Mesa’s one critical gap: zero financial validation. Polar checkout is already wired end to end; this is a new product in the dashboard plus one landing block. Proof = screenshot of 3 completed payments.',
  },
  {
    state: 'todo', tag: 'Build',
    text: 'WhatsApp VIP filter MLP — speak / badge / silence',
    note: '5-name VIP list + keyword regex (urgent, call me, down, questions) on top of the existing notification reader. When unsure, surface. ~50 lines, no ML. The 14-day Mesa prototype.',
  },
  {
    state: 'doing', tag: 'Fix',
    text: 'WhatsApp reader not reading on the main Mac',
    note: 'Full Disk Access looks granted but nothing is spoken. Run the built-in self-diagnosis: say “why aren’t you reading my whatsapps” — it reports reader state, DB health, and freshest row. Also check: previews “Always”, no Focus mode, WhatsApp not frontmost.',
  },
  {
    state: 'todo', tag: 'Trust',
    text: '3-step install Loom + honest permission copy',
    note: 'Show exactly what Full Disk Access reads, what stays local vs cloud. Mesa flagged OS-level trust as the real adoption barrier, and they’re right.',
  },
  {
    state: 'todo', tag: 'Test',
    text: 'Screen Time before/after with the first 10 devs',
    note: '4 from the waitlist, 3 from the Mesa cohort (Sid, Prithvi + one), 3 strangers from the demo post. Success = iPhone pickups during deep-work blocks drop to near zero, and they relaunch Braino the next morning unprompted.',
  },
  {
    state: 'doing', tag: 'Mac skill',
    text: '“Open what I just downloaded” — landed, needs a live run',
    note: 'Built into the Mac app: he scans Downloads + Desktop by arrival time (birthtime, not server mtime), skips half-finished .crdownload files, asks when two files land in the same minute, confirms when the newest is hours old, and can file it into a named folder or the Finder window you are looking at. Watch the reasoning first on /human-intelligence — two new Mac scenarios in the Loop tab.',
  },
  {
    state: 'doing', tag: 'Record',
    text: 'Instagram skit — record the take, then delete the code',
    note: 'Built and dry-run ready: double Option runs the scripted bit (monologue → WhatsApp send → close → “act natural”). Flip dryRun:false for the real take. Delete all four SKIT blocks after.',
  },
];

type IdeaStatus = 'front-runner' | 'building' | 'next' | 'seeded' | 'exploring' | 'parked' | 'icebox';
type Idea = { name: string; status: IdeaStatus; what: string; note: string };

const IDEAS: Idea[] = [
  {
    name: 'Idea Mode', status: 'next',
    what: 'Speak an idea anywhere; Braino transcribes it Wispr-style, saves it to this page, drafts a plan grounded in the real GitHub repo (no made-up files), and “approve” dispatches it to a Claude agent to build.',
    note: 'The meta-idea: an internal workflow tracker where speech becomes shipped code. This page is its v0 — curated by hand today, written by Braino himself tomorrow.',
  },
  {
    name: 'Braino Foundry OS', status: 'front-runner',
    what: 'The AI cofounder. Braino interviews you Mesa-style (pushback included), then actually ships the output: a deployed landing page + waitlist + payment link to test willingness-to-pay. Then he stays your cofounder — memory, follow-ups, next steps.',
    note: 'Aviate reborn with hands. Lovable builds what you tell it; Foundry figures out what you should build, then builds it. Level 1 = interview → live landing page in 20 minutes.',
  },
  {
    name: 'WhatsApp VIP filter', status: 'building',
    what: 'The Mesa wedge: three tiers — speak the urgent, badge the ambiguous, silence the noise. Kills the glance that costs 10 minutes of flow.',
    note: 'The decision to look at a notification is the interruption. This deletes the decision. In the homework list above.',
  },
  {
    name: 'Braino Hera (Wispr Flow, but ours)', status: 'seeded',
    what: 'System-wide voice dictation as its own product — talk into any app, Braino types. Differentiated by computer use on top: he doesn’t just transcribe, he can act on what you said.',
    note: 'Yap Mode (double Option) already ships the core. Productizing = cheaper transcription models + polish. Cost per minute is the known dragon; park until it matters.',
  },
  {
    name: 'Voice-first site builder (narrow Lovable)', status: 'exploring',
    what: 'Describe a site, get it deployed in minutes, then edit by voice: “make the header darker” and watch it change. One opinionated stack, one deploy target.',
    note: 'Mostly folds into Foundry Level 1–2. Full Lovable clone rejected: sandbox infra war + BYOK dies with non-dev users. Narrow and voice-first is the play.',
  },
  {
    name: 'Braino drives Claude Code', status: 'parked',
    what: 'Voice-command headless Claude agents in your repos: “fix the failing test” from the couch; Braino narrates, gates the push, handles the aftermath.',
    note: 'Itish’s verdict: redundant — “I’d rather just speak into Claude.” Parked, not dead; the screen-context version (“fix this error”) may return inside Foundry.',
  },
  {
    name: 'Braino Code (IDE extension)', status: 'parked',
    what: 'A Copilot/Cursor-style extension: BYOK, multi-model, voice built in so no Wispr Flow needed.',
    note: 'The bloodiest market in software; an extension throws away the OS-layer edge. Revisit only with a differentiator the incumbents structurally can’t copy.',
  },
  {
    name: 'Grammarly clone', status: 'icebox',
    what: 'A writing-correction layer, Braino-flavored, everywhere you type.',
    note: 'Real demand, zero urgency. One wedge at a time.',
  },
  {
    name: 'iLovePDF clone', status: 'icebox',
    what: 'PDF tools (merge, compress, sign, convert) by just asking Braino.',
    note: 'Great party-trick surface for later. Icebox until the dev beachhead is won.',
  },
];

const STATS: { value: string; label: string }[] = [
  { value: '3 months', label: 'since the May pivot to Braino' },
  { value: '950+', label: 'commits since' },
  { value: 'v12.0.41', label: 'Mac app, building daily' },
  { value: '51/100', label: 'Mesa Clarity score — verdict: prove payment' },
];

const STATUS_LABEL: Record<IdeaStatus, string> = {
  'front-runner': 'Front-runner',
  building: 'Building',
  next: 'Next up',
  seeded: 'Seed shipped',
  exploring: 'Exploring',
  parked: 'Parked',
  icebox: 'Icebox',
};

// ─── Idea inbox: capture bar + local persistence ─────────────────────────────
// v0 storage is this browser's localStorage; Idea Mode v1 replaces the save
// with Braino transcribing, organizing, and filing these automatically.
type InboxItem = { id: string; text: string; at: number };
const INBOX_KEY = 'braino-idea-inbox';

function loadInbox(): InboxItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && typeof i.text === 'string') : [];
  } catch (_) {
    return [];
  }
}

function useIdeaInbox() {
  const [inbox, setInbox] = useState<InboxItem[]>(loadInbox);
  const save = useCallback((items: InboxItem[]) => {
    setInbox(items);
    try { localStorage.setItem(INBOX_KEY, JSON.stringify(items)); } catch (_) {}
  }, []);
  const add = useCallback((text: string) => {
    const line = text.trim();
    if (!line) return;
    save([{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: line, at: Date.now() }, ...loadInbox()]);
  }, [save]);
  const remove = useCallback((id: string) => save(loadInbox().filter((i) => i.id !== id)), [save]);
  return { inbox, add, remove };
}

// Browser speech engine (same SpeechRecognition family the extension's voice
// mic uses in content scripts) — Chrome/Safari on the Mac both ship it.
function useDictation(onFinal: (text: string) => void, onInterim: (text: string) => void) {
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const supported = typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch (_) {}
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let finalText = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0]?.transcript || '';
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (finalText) onFinal(finalText);
      if (interim) onInterim(interim);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch (_) { setListening(false); }
  }, [onFinal, onInterim]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch (_) {} }, []);
  return { supported, listening, start, stop };
}

function timeAgo(at: number) {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function IdeaTracker() {
  useEffect(() => { document.title = 'Idea Tracker — Braino'; }, []);
  const doneCount = HOMEWORK.filter((t) => t.state === 'done').length;

  const { inbox, add, remove } = useIdeaInbox();
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const appendFinal = useCallback((text: string) => {
    setDraft((d) => `${d}${d && !d.endsWith(' ') ? ' ' : ''}${text.trim()}`);
    setInterim('');
  }, []);
  const dictation = useDictation(appendFinal, setInterim);

  const submitDraft = useCallback(() => {
    if (dictation.listening) dictation.stop();
    add(draftRef.current);
    setDraft('');
    setInterim('');
  }, [add, dictation]);

  const heroRef = useReveal<HTMLElement>();
  const nowRef = useReveal<HTMLElement>();
  const vaultRef = useReveal<HTMLElement>();
  const liveRef = useReveal<HTMLElement>();
  const modeRef = useReveal<HTMLElement>();

  return (
    <div className="it-doc">
      <nav className="it-topbar">
        <Link to="/" className="it-crumb-home">Braino</Link>
        <span className="it-crumb-sep">/</span>
        <span className="it-crumb">Internal</span>
        <span className="it-crumb-sep">/</span>
        <span className="it-crumb it-crumb-here">💡 Idea Tracker</span>
        <span className="it-live-pill"><span className="it-live-dot" />Live</span>
      </nav>

      <main className="it-page">
        {/* ── Page header (Notion page: icon, title, properties) ── */}
        <header className="it-hero it-reveal" ref={heroRef}>
          <div className="it-hero-icon"><BrainSvg size={72} /></div>
          <h1 className="it-title">Idea Tracker</h1>
          <div className="it-props">
            <div className="it-prop"><span className="it-prop-name">☰ Owner</span><span className="it-prop-value">Itish + Braino</span></div>
            <div className="it-prop"><span className="it-prop-name">◷ Updated</span><span className="it-prop-value">Aug 4, 2026</span></div>
            <div className="it-prop"><span className="it-prop-name"># Ideas</span><span className="it-prop-value">{IDEAS.length}</span></div>
            <div className="it-prop"><span className="it-prop-name">☑ Homework</span><span className="it-prop-value">{doneCount}/{HOMEWORK.length} done</span></div>
          </div>
          <p className="it-sub">
            Everything in Itish&rsquo;s head, written down so Braino can act on it. Ideas get spoken,
            tracked, planned, and shipped &mdash; or honestly parked.
          </p>

          {/* ── Capture bar: dump an idea by voice or keyboard ── */}
          <div className={`it-capture${dictation.listening ? ' it-capture-live' : ''}`}>
            {dictation.supported && (
              <button
                type="button"
                className="it-mic"
                title={dictation.listening ? 'Stop dictating' : 'Dictate the idea'}
                onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              >
                {dictation.listening ? '◼' : '🎙'}
              </button>
            )}
            <input
              className="it-capture-input"
              value={interim ? `${draft}${draft ? ' ' : ''}${interim}` : draft}
              onChange={(e) => { setDraft(e.target.value); setInterim(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitDraft(); }}
              placeholder={dictation.listening ? 'Listening… just talk.' : 'Dump an idea — type it, or hit the mic and talk…'}
            />
            <button type="button" className="it-capture-add" onClick={submitDraft} disabled={!draft.trim() && !interim.trim()}>
              Add
            </button>
          </div>
          <p className="it-capture-hint">
            Saved in this browser for now. Idea Mode v1: Braino transcribes, organizes, and files these into the vault himself.
          </p>
          <div className="it-divider" />
        </header>

        {/* ── Inbox: raw dumps land here, newest first ── */}
        {inbox.length > 0 && (
          <section className="it-section it-section-inbox">
            <h2 className="it-h2">📥 Inbox <span className="it-count">{inbox.length}</span></h2>
            <p className="it-section-lede">Raw, unfiled dumps. Idea Mode&rsquo;s job is to empty this list into the vault.</p>
            <ul className="it-inbox">
              {inbox.map((item) => (
                <li key={item.id} className="it-inbox-row">
                  <span className="it-handle" aria-hidden>⋮⋮</span>
                  <span className="it-inbox-text">{item.text}</span>
                  <span className="it-inbox-time">{timeAgo(item.at)}</span>
                  <button type="button" className="it-inbox-del" title="Delete" onClick={() => remove(item.id)}>✕</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Now: the homework (Notion to-do list) ── */}
        <section className="it-section it-reveal" ref={nowRef}>
          <h2 className="it-h2">🔥 Now — the Mesa homework</h2>
          <p className="it-section-lede">
            Straight from the Clarity Report. The single critical gap: nobody has paid yet. Everything here serves that.
          </p>
          <ul className="it-todos">
            {HOMEWORK.map((t) => (
              <li key={t.text} className={`it-todo it-todo-${t.state}`}>
                <span className="it-handle" aria-hidden>⋮⋮</span>
                <span className="it-check" aria-hidden>{t.state === 'done' ? '✓' : t.state === 'doing' ? '–' : ''}</span>
                <div className="it-todo-body">
                  <div className="it-todo-head">
                    <span className="it-todo-text">{t.text}</span>
                    <span className={`it-pill${t.critical ? ' it-pill-red' : ' it-pill-gray'}`}>{t.tag}</span>
                    {t.state === 'doing' && <span className="it-pill it-pill-blue">In progress</span>}
                  </div>
                  {t.note && <p className="it-todo-note">{t.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Idea vault (Notion table view) ── */}
        <section className="it-section it-reveal" ref={vaultRef}>
          <h2 className="it-h2">💡 The Idea Vault</h2>
          <p className="it-section-lede">
            Every idea, with its honest status. Nothing gets deleted; bad timing goes to the icebox, not the trash.
          </p>

          <div className="it-viewbar">
            <span className="it-view it-view-active">⊞ Table</span>
            <span className="it-view">▤ Board</span>
            <span className="it-viewbar-right">
              <span className="it-viewtool">Filter</span>
              <span className="it-viewtool">Sort</span>
              <span className="it-viewtool it-viewtool-new">+ New</span>
            </span>
          </div>

          <div className="it-tablewrap">
            <table className="it-table">
              <thead>
                <tr>
                  <th className="it-col-name"><span className="it-col-icon">Aa</span> Idea</th>
                  <th className="it-col-status"><span className="it-col-icon">◍</span> Status</th>
                  <th className="it-col-what"><span className="it-col-icon">☰</span> What it is</th>
                  <th className="it-col-note"><span className="it-col-icon">☰</span> Honest note</th>
                </tr>
              </thead>
              <tbody>
                {IDEAS.map((idea) => (
                  <tr key={idea.name}>
                    <td className="it-cell-name">{idea.name}</td>
                    <td><span className={`it-pill it-status-${idea.status}`}>{STATUS_LABEL[idea.status]}</span></td>
                    <td className="it-cell-text">{idea.what}</td>
                    <td className="it-cell-text it-cell-muted">{idea.note}</td>
                  </tr>
                ))}
                <tr className="it-row-new">
                  <td colSpan={4}>+ New &mdash; Idea Mode will add rows here. Speak it, Braino writes it.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Live tracker (Notion gallery cards) ── */}
        <section className="it-section it-reveal" ref={liveRef}>
          <h2 className="it-h2">📍 Where Braino stands</h2>
          <div className="it-stats">
            {STATS.map((s) => (
              <div key={s.label} className="it-stat">
                <span className="it-stat-value">{s.value}</span>
                <span className="it-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="it-standing">
            Waitlist live on trybraino.com. The product moved from the browser to macOS, and the Mac version is
            already faster and deeper than the extension ever was. Next milestone: launch before Mesa.
          </p>
        </section>

        {/* ── Idea Mode (Notion callout) ── */}
        <section className="it-section it-reveal" ref={modeRef}>
          <div className="it-callout">
            <span className="it-callout-emoji">🌱</span>
            <div className="it-callout-body">
              <p className="it-callout-title">Where this page is going</p>
              <p>
                This page is the v0 of <strong>Idea Mode</strong>. The v1: Itish speaks an idea into Braino from
                anywhere on the Mac. Braino transcribes it, saves it here on his own, reads the actual GitHub repo,
                and drafts a grounded plan &mdash; real files, real functions, no invented information. One
                &ldquo;approve,&rdquo; spoken or clicked, sends the plan to a Claude agent that builds it.
              </p>
              <p className="it-callout-last">Speech in. Software out. This document is the queue.</p>
            </div>
          </div>
        </section>

        <footer className="it-footer">
          <Link to="/" className="it-footer-link">&larr; trybraino.com</Link>
          <span className="it-footer-note">Maintained by Braino &middot; curated with Claude</span>
        </footer>
      </main>
    </div>
  );
}
