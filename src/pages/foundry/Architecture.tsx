import { useEffect, useState } from "react";
import "./architecture.css";

/* ============================================================================
   Architecture (2026-10-23): the system we actually built, drawn as one
   diagram with its real names. Click a box: what it is, why it exists, and
   one line to say when presenting. Play: one real request lights its path.
   ============================================================================ */

type Box = "app" | "logic" | "route" | "fn" | "db" | "apify" | "gpt";

const BOX: Record<Box, { name: string; tag: string; plain: string; why: string; say: string }> = {
  app: {
    name: "Foundry app", tag: "React, on Vercel",
    plain: "Every screen you see: onboarding, the dashboard, the three engines and Approvals.",
    why: "It is where the founder types, reads and says yes.",
    say: "The founder only ever touches this. Everything else happens behind it.",
  },
  logic: {
    name: "Engine logic", tag: "engines.ts, in the app",
    plain: "Decides what runs and in what order: Optics, then Content, then Outreach. Passes what one engine learns to the next.",
    why: "This is the product: three engines sharing one memory.",
    say: "The engines feed each other. What Outreach hears becomes Content's topics and Optics' searches.",
  },
  route: {
    name: "Search route", tag: "Vercel · api/foundry-apify",
    plain: "A small server that holds our Apify key and starts web searches.",
    why: "So the key never reaches anyone's browser.",
    say: "Secrets stay on the server. The browser asks, the server searches.",
  },
  fn: {
    name: "AI function", tag: "Supabase · chat-about-notes",
    plain: "A small server that holds our OpenAI key and calls GPT-5.6.",
    why: "Same reason: the AI key stays secret.",
    say: "Every AI call goes through one server function we control.",
  },
  db: {
    name: "Database", tag: "Supabase · Google sign-in",
    plain: "Saves your projects, founder profile and memory when you sign in. Without sign-in they stay in your browser.",
    why: "So your work follows you to any device.",
    say: "Sign in with Google and Braino remembers everything about you and your product.",
  },
  apify: {
    name: "Apify", tag: "the web reader",
    plain: "Reads the internet for us: up to 5 pages of your website, Google results, your public LinkedIn headline, and people asking on Reddit, X, LinkedIn, Quora and forums, found through Google.",
    why: "The AI cannot browse on its own. Apify fetches real pages.",
    say: "Apify reads the real web, so nothing is made up: real sites, real Google, real people on Reddit, X, LinkedIn, Quora and forums.",
  },
  gpt: {
    name: "GPT-5.6", tag: "OpenAI · the brain",
    plain: "Thinks and writes: your product card, how ChatGPT would answer your buyers, posts, replies, and who is a real buyer.",
    why: "It turns raw pages into decisions and words.",
    say: "GPT-5.6 is the brain. It reads what Apify found and writes in the founder's voice.",
  },
};

/* One real request, the boxes it lights in order, and what happens at each. */
const FLOWS: { id: string; label: string; path: { box: Box; text: string }[] }[] = [
  {
    id: "site", label: "Read my website",
    path: [
      { box: "app", text: "You paste your website and tap Read my website." },
      { box: "route", text: "The app asks the search route to read it." },
      { box: "apify", text: "Apify opens up to 5 pages and brings back the text." },
      { box: "fn", text: "The text goes to the AI function." },
      { box: "gpt", text: "GPT-5.6 writes your product card: what you sell, for whom, pricing, proof." },
      { box: "db", text: "The card is saved to your project." },
      { box: "app", text: "Your product card appears. You fix anything that is wrong." },
    ],
  },
  {
    id: "optics", label: "Does AI name me?",
    path: [
      { box: "app", text: "You tap Run on Get found." },
      { box: "logic", text: "Optics takes your 8 buyer questions." },
      { box: "gpt", text: "GPT-5.6 answers them like ChatGPT would, naming the products it recommends." },
      { box: "apify", text: "At the same time Apify checks who shows up on Google." },
      { box: "logic", text: "Your name is matched exactly. Each question you lose becomes a fix." },
      { box: "app", text: "You see your score, who beats you, and what to publish." },
    ],
  },
  {
    id: "reply", label: "Someone replied",
    path: [
      { box: "app", text: "You paste Riya's reply: does it work with UPI?" },
      { box: "logic", text: "Outreach loads her thread and what Braino knows about your product." },
      { box: "gpt", text: "GPT-5.6 drafts your answer and spots the question behind it: UPI." },
      { box: "db", text: "Memory saves UPI as something buyers ask." },
      { box: "logic", text: "UPI becomes a Content topic and an Optics fix too." },
      { box: "app", text: "Your answer waits in Approvals for your yes." },
    ],
  },
];

export default function Architecture() {
  const [sel, setSel] = useState<Box>("app");
  const [flow, setFlow] = useState(FLOWS[0].id);
  const [at, setAt] = useState(-1);
  const f = FLOWS.find((x) => x.id === flow)!;
  const playing = at >= 0 && at < f.path.length;

  useEffect(() => {
    if (!playing) return;
    setSel(f.path[at].box);
    const t = window.setTimeout(() => setAt((a) => a + 1), 2300);
    return () => window.clearTimeout(t);
  }, [at, playing, f]);

  const lit = (b: Box) => (playing ? f.path[at].box === b : sel === b);
  const seen = (b: Box) => playing && f.path.slice(0, at).some((s) => s.box === b);
  const B = ({ id }: { id: Box }) => (
    <button className={`ar-box b-${id}${lit(id) ? " lit" : ""}${seen(id) ? " seen" : ""}`} onClick={() => { setAt(-1); setSel(id); }}>
      <b>{BOX[id].name}</b><small>{BOX[id].tag}</small>
    </button>
  );
  const info = BOX[sel];

  return (
    <div className="ar">
      <header className="ar-head">
        <nav className="fx-crumb" aria-label="Breadcrumb"><span>Braino Foundry</span><span><i>/</i>Architecture</span></nav>
        <h1>What we built, and how a request moves through it.</h1>
        <p className="ar-sub">Click any box to see what it does. Or pick a request and press Play to watch it travel.</p>
      </header>

      <div className="ar-grid">
        {/* The diagram, top to bottom: the founder, the app, the servers, the outside services */}
        <div className="ar-map">
          <div className="ar-lane"><span className="ar-lane-k">Founder</span><div className="ar-you">You</div></div>
          <span className="ar-v" aria-hidden />
          <div className="ar-lane"><span className="ar-lane-k">In the browser</span><div className="ar-row two"><B id="app" /><B id="logic" /></div></div>
          <span className="ar-v" aria-hidden />
          <div className="ar-lane"><span className="ar-lane-k">Our servers</span><div className="ar-row three"><B id="route" /><B id="fn" /><B id="db" /></div></div>
          <span className="ar-v" aria-hidden />
          <div className="ar-lane"><span className="ar-lane-k">Outside services</span><div className="ar-row two"><B id="apify" /><B id="gpt" /></div></div>
          <p className="ar-key">Keys for Apify and OpenAI live only on our servers. The browser never sees them.</p>
        </div>

        {/* What the selected box is, in plain words */}
        <aside className="ar-info" key={sel}>
          <p className="ar-info-tag">{info.tag}</p>
          <h2>{info.name}</h2>
          <p>{info.plain}</p>
          <p className="ar-why"><b>Why it exists</b>{info.why}</p>
          <div className="ar-say"><b>Say this</b><p>"{info.say}"</p></div>
        </aside>
      </div>

      <section className="ar-play-sec">
        <div className="ar-controls">
          <div className="ar-seg" role="tablist" aria-label="Pick a request">
            {FLOWS.map((x) => <button key={x.id} className={flow === x.id ? "on" : ""} onClick={() => { setFlow(x.id); setAt(-1); }}>{x.label}</button>)}
          </div>
          <button className="ar-play" onClick={() => setAt(0)}>{playing ? "Playing" : "Play"}</button>
        </div>
        <ol className="ar-path">
          {f.path.map((s, i) => (
            <li key={i} className={`${i === at ? "now" : ""}${playing && i < at ? " done" : ""}`} onClick={() => { setAt(-1); setSel(s.box); }}>
              <span className="ar-path-n">{i + 1}</span>
              <span className="ar-path-box">{BOX[s.box].name}</span>
              <span className="ar-path-t">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="ar-foot"><b>In one line:</b> a React app on Vercel; secrets stay on our servers, a Vercel route for reading the web through Apify and a Supabase function for GPT-5.6; projects are saved in Supabase; the founder approves everything.</p>
    </div>
  );
}
