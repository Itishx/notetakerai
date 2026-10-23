import { useEffect, useState } from "react";
import "./architecture.css";

/* ============================================================================
   Architecture (2026-10-23): how Braino Foundry works, in five steps, for the
   founder to understand and to present. Pick a real request, press Play, and
   the request travels the five steps with what actually happens at each one.
   ============================================================================ */

type StepId = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: StepId; title: string; role: string; what: string; parts: { h: string; p: string }[] }[] = [
  {
    n: 1, title: "Frontend", role: "Where you type and click",
    what: "The screens you use: onboarding, the dashboard, the three engine pages and Approvals. It collects what you enter and sends it on.",
    parts: [
      { h: "React app", p: "affctve.com/foundry/app, the same look as the AffectiveOS site." },
      { h: "Your input", p: "A product description, your website, your LinkedIn, a pasted reply." },
    ],
  },
  {
    n: 2, title: "Backend", role: "The application logic",
    what: "Receives the request, decides what has to happen and in what order, and coordinates the services. This is where the three engines live.",
    parts: [
      { h: "Engine logic", p: "Optics, Content and Outreach, and how they feed each other through memory." },
      { h: "Server routes", p: "A Vercel route for search, and a Supabase function for the AI, so keys never reach your browser." },
    ],
  },
  {
    n: 3, title: "Services", role: "The specialists it calls",
    what: "The backend asks three kinds of specialists for help. Each does one thing well.",
    parts: [
      { h: "AI model (GPT-5.6)", p: "Reasons, classifies, extracts and writes: reads your site, judges who is a real buyer, writes posts and replies." },
      { h: "Database", p: "Keeps your projects, founder profile, memory and approvals. Supabase when signed in, this browser otherwise." },
      { h: "External APIs and tools", p: "Apify reads websites, Google results, Reddit threads and your public LinkedIn headline." },
    ],
  },
  {
    n: 4, title: "Backend", role: "Prepares the result",
    what: "Before anything reaches you, the answer is checked and cleaned.",
    parts: [
      { h: "Processes the response", p: "Matches names exactly, so ordinary words are never counted as your brand." },
      { h: "Checks for errors", p: "Repairs broken AI output, retries once, and turns failures into plain sentences." },
      { h: "Formats the output", p: "Turns raw data into scores, charts, cards and ready-to-post text." },
    ],
  },
  {
    n: 5, title: "Frontend", role: "You get the result",
    what: "The result appears on screen: your score, the people asking, the posts to approve. Nothing goes out until you say yes.",
    parts: [
      { h: "Shown to you", p: "Dashboard, charts, Approvals and the activity feed." },
      { h: "Your yes", p: "Approve copies the text and opens the site. Posting for you comes next, through n8n." },
    ],
  },
];

/* Real requests, and what each step does for them. */
const FLOWS: { id: string; label: string; say: Record<StepId, string>; uses: ("ai" | "db" | "api")[] }[] = [
  {
    id: "site", label: "Read my website", uses: ["api", "ai", "db"],
    say: {
      1: "You paste rentontime.in and tap Read my website.",
      2: "The backend asks Apify to crawl up to 5 pages of your site.",
      3: "Apify returns the page text. GPT-5.6 pulls out the product, buyer, pricing and proof. The card is saved.",
      4: "Long pages are trimmed, broken output repaired, and the card is shaped into fields.",
      5: "Your product card appears, ready for you to correct.",
    },
  },
  {
    id: "optics", label: "Check if AI names me", uses: ["ai", "api", "db"],
    say: {
      1: "You tap Run on Get found.",
      2: "Optics takes your 8 buyer questions and runs two checks at once.",
      3: "GPT-5.6 answers the questions like ChatGPT would. Apify searches Google. Results are saved to memory.",
      4: "Your name is matched exactly, rivals are counted, and each gap becomes a fix.",
      5: "You see the score ring, the rivals chart and the fixes to publish.",
    },
  },
  {
    id: "reply", label: "Someone replied", uses: ["ai", "db"],
    say: {
      1: "You paste Riya's reply: does it work with UPI?",
      2: "Outreach loads her thread and your product memory.",
      3: "GPT-5.6 drafts your answer and spots the objection. Memory saves UPI as something buyers ask.",
      4: "The draft is checked, Riya moves to Replied, and UPI becomes a Content topic and an Optics fix.",
      5: "Your answer waits in Approvals, and the activity feed shows what changed.",
    },
  },
];

export default function Architecture() {
  const [flow, setFlow] = useState(FLOWS[0].id);
  const [at, setAt] = useState<StepId | 0>(0);
  const [playing, setPlaying] = useState(false);
  const f = FLOWS.find((x) => x.id === flow)!;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      if (at >= 5) { setPlaying(false); return; }
      setAt((a) => ((a || 0) + 1) as StepId);
    }, at === 0 ? 200 : 2200);
    return () => window.clearTimeout(t);
  }, [playing, at]);

  const play = () => { setAt(0); setPlaying(true); };
  const pick = (id: string) => { setFlow(id); setAt(0); setPlaying(false); };
  const show = (at || 1) as StepId;

  return (
    <div className="ar">
      <header className="ar-head">
        <div>
          <p className="ar-kicker">Architecture</p>
          <h1>How Braino Foundry works, in five steps.</h1>
          <p className="ar-sub">Every request takes the same path: from your screen, through the logic and the services, and back to your screen. Pick one and press Play.</p>
        </div>
      </header>

      <div className="ar-controls">
        <div className="ar-seg" role="tablist" aria-label="Pick a request">
          {FLOWS.map((x) => <button key={x.id} className={flow === x.id ? "on" : ""} onClick={() => pick(x.id)}>{x.label}</button>)}
        </div>
        <button className="ar-play" onClick={play}>{playing ? "Playing" : at === 5 ? "Play again" : "Play"}</button>
      </div>

      {/* The path: five stations, a packet travelling between them */}
      <div className="ar-track" aria-label="The five steps">
        {STEPS.map((s, i) => (
          <div key={s.n} className="ar-track-cell">
            <button className={`ar-node s${s.n}${at === s.n ? " live" : ""}${at > s.n ? " done" : ""}`} onClick={() => { setPlaying(false); setAt(s.n); }}>
              <span className="ar-node-n">{s.n}</span>
              <b>{s.title}</b>
              <small>{s.role}</small>
            </button>
            {i < 4 && <span className={`ar-link${at > s.n ? " done" : ""}${at === s.n && playing ? " flow" : ""}`} aria-hidden><i /></span>}
          </div>
        ))}
      </div>

      {/* The services row, lit when this request uses them */}
      <div className={`ar-services${show === 3 ? " live" : ""}`}>
        {([["ai", "AI model", "GPT-5.6 reasons and writes"], ["db", "Database", "Supabase or this browser"], ["api", "External APIs", "Apify: sites, Google, Reddit"]] as const).map(([k, h, p]) => (
          <div key={k} className={`ar-svc${f.uses.includes(k) ? " used" : ""}`}><b>{h}</b><small>{p}</small></div>
        ))}
      </div>

      {/* What happens right now, for this request */}
      <div className="ar-now" key={`${flow}-${show}`}>
        <span className="ar-now-n">Step {show}</span>
        <p>{f.say[show]}</p>
      </div>

      {/* The full explanation of each step */}
      <ol className="ar-steps">
        {STEPS.map((s) => (
          <li key={s.n} className={`ar-step${at === s.n ? " live" : ""}`}>
            <div className="ar-step-h"><span className={`ar-dot s${s.n}`}>{s.n}</span><div><b>{s.title}</b><small>{s.role}</small></div></div>
            <p className="ar-step-what">{s.what}</p>
            <ul>{s.parts.map((p) => <li key={p.h}><b>{p.h}</b><span>{p.p}</span></li>)}</ul>
          </li>
        ))}
      </ol>

      <p className="ar-foot">In one line: your screen sends a request, the backend decides what to do, the AI, the database and outside tools do the work, the backend checks and shapes the answer, and your screen shows it for your yes.</p>
    </div>
  );
}
